import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyAction } from '../../core/engine'
import { getRecommendedDeck } from '../../core/data/deckBuilder'
import { ENEMY_IDS } from '../../core/data/enemies'
import { GOD_IDS } from '../../core/data/gods'
import { getCardDef } from '../../core/data/cards'
import type { GameAction, GameEvent, GameState } from '../../core/types'
import { SPECIAL_IMPACT_MS } from './enemyVfxTiming'
import { VOICE_LAYER } from './feelTier'

/**
 * Official Voice Crisis Pilot v1 — Lane 4 独立 QA（docs/OFFICIAL_VOICE_CRISIS_PILOT_V1_QA.md）。
 *
 * `useCrisisVoice` フック本体（純関数 planCrisisVoice ではなく、firedRef／seed リセット／巻き戻し／
 * setTimeout 予約／unmount 解除／onStart→duckBgm の配線）を、**実 engine の固定 seed crisis-003** の
 * バッチで駆動して確かめる。react は「同じ順序で呼ばれる useRef／useEffect」だけの最小ランナーに
 * 差し替える（この環境に DOM・testing-library が無いため）。runtime のコードは一切変えない。
 */

// ---- 最小フックランナー（react の useRef／useEffect だけ） ----
const h = vi.hoisted(() => ({
  refs: [] as { current: unknown }[],
  effects: [] as { deps: unknown[] | undefined; cleanup: (() => void) | void }[],
  ri: 0,
  ei: 0,
}))
vi.mock('react', () => ({
  useRef: (init: unknown) => {
    const i = h.ri++
    if (!h.refs[i]) h.refs[i] = { current: init }
    return h.refs[i]
  },
  useEffect: (fn: () => (() => void) | void, deps?: unknown[]) => {
    const i = h.ei++
    const prev = h.effects[i]
    const changed = !prev || !deps || !prev.deps || deps.length !== prev.deps.length || deps.some((d, k) => !Object.is(d, prev.deps![k]))
    if (!changed) return
    if (prev?.cleanup) prev.cleanup()
    h.effects[i] = { deps, cleanup: fn() }
  },
}))

// ---- 音・BGM はスパイ（実際の AudioContext は無い）。hasOfficialVoice・OFFICIAL_VOICES は本物 ----
const audio = vi.hoisted(() => ({
  muted: false,
  plays: [] as { godId: string; scene: string; at: number }[],
  ducks: [] as number[],
  durationMs: 8858,
}))
vi.mock('./sound', async (importOriginal) => {
  const orig = await importOriginal<typeof import('./sound')>()
  return {
    ...orig,
    playVoice: (godId: string, scene: string, opts: { onStart?: (ms: number) => void } = {}) => {
      // 本物と同じ：ミュート中は false を返して何も始めない
      if (audio.muted) return false
      audio.plays.push({ godId, scene, at: Date.now() })
      opts.onStart?.(audio.durationMs)
      return true
    },
  }
})
vi.mock('./bgm', () => ({
  duckBgm: (holdMs: number) => {
    audio.ducks.push(holdMs)
    return true
  },
}))

const { useCrisisVoice } = await import('./crisisVoice')

function render(log: GameEvent[], state: GameState | null, visual = 'heavy') {
  h.ri = 0
  h.ei = 0
  // test 専用：react を上の最小ランナー（useRef／useEffect のみ）に差し替えて hook 本体を直接駆動する。
  // 実コンポーネント外からの呼び出しは意図したもの（CI oxlint RL-03 の rules-of-hooks を行単位で抑止）。
  // oxlint-disable-next-line react-hooks/rules-of-hooks
  useCrisisVoice(log, state, visual)
}
function unmount() {
  for (const e of h.effects) if (e?.cleanup) e.cleanup()
  h.refs = []
  h.effects = []
}

// ---- crisis-seed.mjs と同じ構成・方策（大耀 × 蒼海の龍神・おすすめデッキ・ふつう・guardian・左端から使う） ----
type Commit = { state: GameState; log: GameEvent[]; round: number; kind: 'start' | 'card' | 'endRound'; prevHp: number }
function playSeed(seed: string): Commit[] {
  const deck = getRecommendedDeck(GOD_IDS.taiyo)
  let r = applyAction(null, { type: 'START_GAME', seed, godId: GOD_IDS.taiyo, enemyId: ENEMY_IDS.ryujin, deck, difficulty: 'normal', otomoGrowthPath: 'guardian' })
  let state = r.state
  let log = [...r.events]
  const commits: Commit[] = [{ state, log, round: state.round, kind: 'start', prevHp: state.player.hp }]
  const step = (action: GameAction, kind: 'card' | 'endRound') => {
    const prevHp = state.player.hp
    const round = state.round
    r = applyAction(state, action)
    state = r.state
    log = [...log, ...r.events]
    commits.push({ state, log, round, kind, prevHp })
  }
  let guard = 0
  while (state.status === 'playing' && guard++ < 200) {
    const round = state.round
    for (;;) {
      if (state.status !== 'playing' || state.phase !== 'playerTurn') break
      const card = state.hand.find((c) => getCardDef(c.defId).cost + (c.costModifier ?? 0) <= state.ap.current)
      if (!card) break
      step({ type: 'PLAY_CARD', uid: card.uid }, 'card')
    }
    if (state.status !== 'playing') break
    step({ type: 'END_ROUND' }, 'endRound')
    if (round >= 7 && state.round === round) break
  }
  return commits
}

/** commit ごとに 1 回レンダー（useGameEngine の setState＋setLog と同じ）。commit 間は十分な時間を進める */
function drive(commits: Commit[], gapMs = 5000) {
  const fireAt: { round: number; kind: string; afterCommitMs: number }[] = []
  for (const c of commits) {
    const before = audio.plays.length
    const t0 = Date.now()
    render(c.log, c.state)
    vi.advanceTimersByTime(gapMs)
    if (audio.plays.length > before) fireAt.push({ round: c.round, kind: c.kind, afterCommitMs: audio.plays[audio.plays.length - 1]!.at - t0 })
  }
  return fireAt
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('window', globalThis)
  audio.muted = false
  audio.plays = []
  audio.ducks = []
  h.refs = []
  h.effects = []
})
afterEach(() => {
  unmount()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('固定 seed crisis-003（実 engine）× useCrisisVoice フック本体', () => {
  const commits = playSeed('crisis-003')

  it('決定論：同じ seed を 2 回回すと HP 経路・ログ長が完全一致し、HP 経路は §5-1 の期待値（R1 26／R2 26／R3 30／R4 10／R5 7・R6 撃破）', () => {
    const again = playSeed('crisis-003')
    expect(again.map((c) => [c.log.length, c.state.player.hp])).toEqual(commits.map((c) => [c.log.length, c.state.player.hp]))
    const afterEndRound = commits.filter((c) => c.kind === 'endRound').map((c) => c.state.player.hp)
    expect(afterEndRound.slice(0, 5)).toEqual([26, 26, 30, 10, 7])
    const last = commits[commits.length - 1]!.state
    expect(last.status).toBe('won')
    expect(last.round).toBe(6)
  })

  it('1 戦で 1 回だけ、R4 のラウンド終了（大海嘯 30→10）の commit から 1,560ms（必殺着弾 1,260 ＋ 300）に鳴る', () => {
    const fired = drive(commits)
    expect(fired).toEqual([{ round: 4, kind: 'endRound', afterCommitMs: SPECIAL_IMPACT_MS + VOICE_LAYER.afterImpactMs.crisis }])
    expect(audio.plays).toEqual([expect.objectContaining({ godId: 'taiyo', scene: 'crisis' })])
  })

  it('予約は着弾＋300 の 1ms 前には鳴っておらず、ちょうどで鳴る（setTimeout 1 本）', () => {
    const i = commits.findIndex((c) => c.round === 4 && c.kind === 'endRound')
    for (const c of commits.slice(0, i)) {
      render(c.log, c.state)
      vi.advanceTimersByTime(5000)
    }
    render(commits[i]!.log, commits[i]!.state)
    vi.advanceTimersByTime(1559)
    expect(audio.plays).toHaveLength(0)
    vi.advanceTimersByTime(1)
    expect(audio.plays).toHaveLength(1)
  })

  it('BGM duck：onStart（声の長さ 8,858ms）＋ duckTailMs 300 ＝ 9,158ms を 1 回だけ要求する（決定257 の duckBgm 経路）', () => {
    drive(commits)
    expect(audio.ducks).toEqual([audio.durationMs + VOICE_LAYER.duckTailMs])
    expect(audio.ducks[0]).toBe(9158)
  })

  it('R5 で HP がさらに 10→7 に落ちても 2 回目は鳴らない（prevHp が閾値以下＝planCrisisVoice が null）', () => {
    const r5 = commits.find((c) => c.round === 5 && c.kind === 'endRound')!
    expect(r5.prevHp).toBe(10)
    expect(r5.state.player.hp).toBe(7)
    drive(commits)
    expect(audio.plays).toHaveLength(1)
  })

  it('再戦（同じ seed で「同じ盤面でもう一度」）：ログが短く巻き戻る → 記憶を捨て、2 戦目も 1 回だけ鳴る（合計 2・各戦 1）', () => {
    drive(commits)
    // useGameEngine.startGame は setLog([]) → START_GAME の events だけになる＝ログ長が縮む。seed は同じ
    drive(commits)
    expect(audio.plays).toHaveLength(2)
  })

  it('新しい対局（seed が変わる）：途中（R3 まで）で離れて別 seed を始めても、前戦の記憶を持ち越さない', () => {
    const r3 = commits.findIndex((c) => c.round === 3 && c.kind === 'endRound')
    drive(commits.slice(0, r3 + 1))
    expect(audio.plays).toHaveLength(0)
    const other = playSeed('crisis-001')
    drive(other)
    expect(audio.plays).toHaveLength(1)
  })

  it('予約中に新しい対局へ切り替えたら（seed 変化）予約を解除し、前戦の声は鳴らない', () => {
    const i = commits.findIndex((c) => c.round === 4 && c.kind === 'endRound')
    for (const c of commits.slice(0, i)) {
      render(c.log, c.state)
      vi.advanceTimersByTime(5000)
    }
    render(commits[i]!.log, commits[i]!.state)
    vi.advanceTimersByTime(1000) // 予約中（1,560 まで残り 560）
    const other = playSeed('crisis-002')
    render(other[0]!.log, other[0]!.state)
    vi.advanceTimersByTime(5000)
    expect(audio.plays).toHaveLength(0)
  })

  it('予約中に戦闘画面を離れたら（unmount）予約を解除し、鳴らない', () => {
    const i = commits.findIndex((c) => c.round === 4 && c.kind === 'endRound')
    for (const c of commits.slice(0, i + 1)) {
      render(c.log, c.state)
      vi.advanceTimersByTime(c === commits[i] ? 1000 : 5000)
    }
    unmount()
    vi.advanceTimersByTime(5000)
    expect(audio.plays).toHaveLength(0)
  })

  it('ミュート中に条件を満たした戦闘：鳴らず duck もしない。その戦闘中にミュートを解除しても後から鳴らない（1 戦 1 回の枠は消費済み）', () => {
    audio.muted = true
    const i = commits.findIndex((c) => c.round === 4 && c.kind === 'endRound')
    drive(commits.slice(0, i + 1))
    audio.muted = false
    drive(commits.slice(i + 1))
    expect(audio.plays).toHaveLength(0)
    expect(audio.ducks).toHaveLength(0)
  })

  it('「続きから」：既に HP ≤ 50% の盤面で再開した場合は鳴らない（再開時の HP を起点にする）', () => {
    const i = commits.findIndex((c) => c.round === 4 && c.kind === 'endRound')
    // resumeGame：setLog([]) ＋ setState(saved)。以降の commit は空ログから積み上がる
    const saved = commits[i]!.state
    render([], saved)
    let log: GameEvent[] = []
    for (const c of commits.slice(i + 1)) {
      const prev = commits[commits.indexOf(c) - 1]!
      log = [...log, ...c.log.slice(prev.log.length)]
      render(log, c.state)
      vi.advanceTimersByTime(5000)
    }
    expect(audio.plays).toHaveLength(0)
  })

  it('大耀以外（公式ボイス未配信の神）は予約もしない', () => {
    for (const c of commits) {
      render(c.log, { ...c.state, godId: 'ebisu' } as GameState)
      vi.advanceTimersByTime(5000)
    }
    expect(audio.plays).toHaveLength(0)
    expect(vi.getTimerCount()).toBe(0)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import battleSoundSrc from './useBattleSound.ts?raw'
import engineSrc from '../../hooks/useGameEngine.ts?raw'
import { SE_DEDUP_WINDOW_MS, SE_GAIN, TAP_END_ROUND_RATE } from './feelTier'
import { isDuplicateStart } from './sound'

/**
 * Tap Feedback v1（Sound lane・docs/SOUND_PREMIUM_PRE_AUDIT.md §7）の回帰テスト。
 * 押した瞬間に既存 card_play を鳴らし、commit 時の card_play を無くし、
 * 同じ音源（name@rate）が 30ms 未満に重なる再生を 1 回にまとめる。
 */
describe('Tap Feedback v1：数値', () => {
  it('押下音は feedback より大きく、最弱の打撃 L1 より小さい（master 後 0.34）', () => {
    expect(SE_GAIN.tap * SE_GAIN.master).toBeCloseTo(0.34, 5)
    expect(SE_GAIN.tap).toBeGreaterThan(SE_GAIN.feedback)
    expect(SE_GAIN.tap * SE_GAIN.master).toBeLessThan(SE_GAIN.impact[1] * SE_GAIN.master)
  })
  it('ラウンド終了の押下音は 0.85 倍速、重複窓は 30ms', () => {
    expect(TAP_END_ROUND_RATE).toBe(0.85)
    expect(SE_DEDUP_WINDOW_MS).toBe(30)
  })
})

describe('Tap Feedback v1：isDuplicateStart の境界', () => {
  it('初回は重複ではない', () => {
    expect(isDuplicateStart(undefined, 1, 30)).toBe(false)
  })
  it('29ms は重複、30ms・31ms は別の再生', () => {
    expect(isDuplicateStart(1, 1.029, 30)).toBe(true)
    expect(isDuplicateStart(1, 1.0, 30)).toBe(true)
    expect(isDuplicateStart(1, 1.03, 30)).toBe(false)
    expect(isDuplicateStart(1, 1.031, 30)).toBe(false)
  })
  it('打撃の最短間隔（110ms）は抑制されない', () => {
    expect(isDuplicateStart(2, 2.11, SE_DEDUP_WINDOW_MS)).toBe(false)
  })
})

describe('Tap Feedback v1：呼び出し元（source pin）', () => {
  it('useBattleSound は CARD_PLAYED で音を鳴らさない（commit は無音）', () => {
    expect(battleSoundSrc).not.toMatch(/case 'CARD_PLAYED'/)
    expect(battleSoundSrc).not.toMatch(/cardPlay\(/)
  })
  it('useGameEngine の playCard／endRound はクリック処理の中で押下音を鳴らす（遅延の前）', () => {
    const playCard = engineSrc.slice(engineSrc.indexOf('const playCard = useCallback'), engineSrc.indexOf('const endRound'))
    expect(playCard.indexOf('sfx.cardTap()')).toBeGreaterThan(-1)
    expect(playCard.indexOf('sfx.cardTap()')).toBeLessThan(playCard.indexOf('setTimeout'))
    const endRound = engineSrc.slice(engineSrc.indexOf('const endRound'), engineSrc.indexOf('const divine'))
    expect(endRound.indexOf('sfx.endRoundTap()')).toBeGreaterThan(-1)
    expect(endRound.indexOf('sfx.endRoundTap()')).toBeLessThan(endRound.indexOf('dispatch('))
  })
})

// ---- 振る舞い：偽の AudioContext で start() の予約を記録する ----
type Started = { at: number; rate: number; gain: number }
let started: Started[] = []
let now = 0

class FakeCtx {
  state = 'running'
  destination = {}
  get currentTime() {
    return now
  }
  resume() {
    return Promise.resolve()
  }
  decodeAudioData() {
    return Promise.resolve({ duration: 0.06 })
  }
  createGain() {
    return { gain: { value: 1 }, connect() {} }
  }
  createBufferSource() {
    const node = {
      buffer: null as unknown,
      playbackRate: { value: 1 },
      gainNode: null as null | { gain: { value: number } },
      connect(g: { gain: { value: number } }) {
        node.gainNode = g
      },
      start(at: number) {
        started.push({ at, rate: node.playbackRate.value, gain: node.gainNode?.gain.value ?? -1 })
      },
    }
    return node
  }
  createOscillator() {
    throw new Error('fallback tone must not play')
  }
}

async function freshSound() {
  vi.resetModules()
  return import('./sound')
}

describe('Tap Feedback v1：再生の振る舞い', () => {
  beforeEach(() => {
    started = []
    now = 10
    vi.stubGlobal('window', { AudioContext: FakeCtx })
    vi.stubGlobal('fetch', () => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('未ロードの押下音は鳴らさない（遅れて鳴らない・fallback も鳴らない）', async () => {
    const { sfx } = await freshSound()
    sfx.cardTap()
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    expect(started).toHaveLength(0)
  })

  it('ロード済みなら押下の瞬間（予約オフセット 0）に gain 0.34 で鳴る。ラウンド終了は 0.85 倍速', async () => {
    const { sfx, preloadSe } = await freshSound()
    preloadSe(['card_play'])
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    sfx.cardTap()
    expect(started).toEqual([{ at: 10, rate: 1, gain: expect.closeTo(0.34, 5) }])
    now = 11
    sfx.endRoundTap()
    expect(started[1]).toEqual({ at: 11, rate: 0.85, gain: expect.closeTo(0.34, 5) })
  })

  it('同じ音源が 30ms 未満に重なると 1 回だけ（ドロー×5 → 1）。rate 違いは別', async () => {
    const { sfx, preloadSe } = await freshSound()
    preloadSe(['card_draw', 'card_play'])
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    for (let i = 0; i < 5; i++) sfx.cardDrawn()
    expect(started).toHaveLength(1)
    now = 10.05
    sfx.cardDrawn()
    expect(started).toHaveLength(2)
    sfx.cardTap()
    sfx.endRoundTap()
    expect(started).toHaveLength(4)
  })

  it('ミュート中は押下音も鳴らない', async () => {
    const { sfx, preloadSe, setSoundMuted } = await freshSound()
    preloadSe(['card_play'])
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    setSoundMuted(true)
    sfx.cardTap()
    sfx.endRoundTap()
    expect(started).toHaveLength(0)
    setSoundMuted(false)
    sfx.cardTap()
    expect(started).toHaveLength(1)
  })
})

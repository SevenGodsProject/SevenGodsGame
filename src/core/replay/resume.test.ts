import { describe, it, expect } from 'vitest'
import type { GameState, GodId } from '../types'
import { GOD_IDS } from '../data/gods'
import { dailyBossFor } from '../data/dailyBoss'
import { getRecommendedDeck } from '../data/deckBuilder'
import { runReplay } from './replay'
import { applyAndRecord, appendAction, toReplayInput, type DailyRunLog } from './runLog'
import { deepEqual, resumeRunLog } from './resume'
import { playRecordedDailyRun } from './replayTestUtils'

/**
 * Phase 4.2 Step 7：中断・再開（決定29）を跨いだ行動ログの引き継ぎ。
 *
 * 「resume前までのactionsを失う」設計は禁止。したがってログは別枠で永続化し、
 * 再開時に `resumeRunLog` が**リプレイで盤面を突き合わせてから**引き継ぐ。
 */

const GODS = Object.values(GOD_IDS)
const DAILY_KEY = '2026-09-09'
const RUN_ID = 'aaaaaaaabbbbccccddddeeeeeeeeeeee'

/** 途中まで進めた状態（保存された盤面と、そこまでのログ）を作る */
function playUntil(godId: GodId, stopAfter: number): { state: GameState; log: DailyRunLog } {
  const boss = dailyBossFor(DAILY_KEY)
  const deck = getRecommendedDeck(godId)
  let acc = applyAndRecord(
    null,
    {
      type: 'START_GAME',
      seed: boss.seed,
      godId,
      enemyId: boss.enemyId,
      deck,
      difficulty: 'normal',
      mode: 'daily',
      dailyKey: DAILY_KEY,
      modifier: { enemyHpMul: 1.25, enemyAtkMul: 1.15 },
    },
    null,
    RUN_ID,
  )
  // 決定論の打ち筋で数手だけ進める
  for (let i = 0; i < stopAfter; i++) {
    const state = acc.result.state
    if (state.status !== 'playing') break
    const playable = state.hand.find((c) => c.uid)
    const action =
      i % 3 === 2 || !playable
        ? ({ type: 'END_ROUND' } as const)
        : ({ type: 'PLAY_CARD', uid: playable.uid } as const)
    try {
      acc = applyAndRecord(state, action, acc.log)
    } catch {
      acc = applyAndRecord(state, { type: 'END_ROUND' }, acc.log)
    }
  }
  return { state: acc.result.state, log: acc.log as DailyRunLog }
}

/** localStorage往復と同じ経路（JSONの往復）を通す */
const roundTrip = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

describe('deepEqual', () => {
  it('undefinedのキーと「キーが無い」を同じに扱う（JSON往復のため）', () => {
    expect(deepEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true)
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(true)
    expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false)
  })

  it('配列の順序・長さ・入れ子を見る', () => {
    expect(deepEqual([1, [2, 3]], [1, [2, 3]])).toBe(true)
    expect(deepEqual([1, 2], [2, 1])).toBe(false)
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false)
    expect(deepEqual({ a: [{ b: 1 }] }, { a: [{ b: 1 }] })).toBe(true)
    expect(deepEqual({ a: [{ b: 1 }] }, { a: [{ b: 2 }] })).toBe(false)
  })

  it('キーの並び順は結果に影響しない', () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
  })
})

describe('resume：行動ログの引き継ぎ（Step 7）', () => {
  it('7神すべてで、保存した盤面とログが一致すれば引き継げる', () => {
    for (const godId of GODS) {
      const { state, log } = playUntil(godId, 5)
      expect(state.status).toBe('playing')
      expect(log.actions.length).toBeGreaterThan(0)
      const result = resumeRunLog(roundTrip(state), roundTrip(log))
      expect(result.ok, `${godId}: ${result.ok ? '' : result.reason}`).toBe(true)
    }
  })

  it('引き継いだログに続きを記録し、決着まで進めてもリプレイが一致する', () => {
    const godId = GODS[0]
    const { state, log } = playUntil(godId, 5)

    // 「続きから」相当：JSON往復した盤面とログで再開する
    const resumed = resumeRunLog(roundTrip(state), roundTrip(log))
    expect(resumed.ok).toBe(true)
    if (!resumed.ok) return

    // 再開後、決着まで END_ROUND だけで進める
    let acc = { result: { state: roundTrip(state), events: [] }, log: resumed.log } as {
      result: { state: GameState; events: unknown[] }
      log: DailyRunLog | null
    }
    for (let i = 0; i < 20 && acc.result.state.status === 'playing'; i++) {
      acc = applyAndRecord(acc.result.state, { type: 'END_ROUND' }, acc.log) as typeof acc
    }
    expect(acc.result.state.status).not.toBe('playing')

    // 中断前のactionsが残ったまま、通しでリプレイが一致する
    const finalLog = acc.log as DailyRunLog
    expect(finalLog.actions.length).toBeGreaterThan(log.actions.length)
    expect(finalLog.actions.slice(0, log.actions.length)).toEqual(log.actions)
    expect(finalLog.clientRunId).toBe(RUN_ID)

    const replayed = runReplay(toReplayInput(finalLog))
    expect(replayed.ok).toBe(true)
    if (replayed.ok) expect(replayed.state).toEqual(acc.result.state)
  })

  it('ログが無ければ引き継がない（そのrunは提出対象外になるだけ）', () => {
    const { state } = playUntil(GODS[0], 4)
    const result = resumeRunLog(state, null)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('no-log')
  })

  it('通常モードのセーブでは引き継がない', () => {
    const { state } = playUntil(GODS[0], 4)
    const normal: GameState = { ...state, mode: 'normal' }
    const result = resumeRunLog(normal, null)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('not-daily')
  })

  it('日付・神・OTOMOの絆が食い違うログは引き継がない', () => {
    const { state, log } = playUntil(GODS[0], 4)
    for (const [patch, reason] of [
      [{ dailyKey: '2026-09-10' }, 'key-mismatch'],
      [{ godId: GODS[1] }, 'key-mismatch'],
      [{ otomoGrowthPath: 'power' as const }, 'key-mismatch'],
    ] as const) {
      const result = resumeRunLog(state, { ...log, ...patch })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.reason).toBe(reason)
    }
  })

  it('盤面と食い違うログ（改ざん・欠落）は引き継がず捨てる', () => {
    const { state, log } = playUntil(GODS[0], 6)
    expect(log.actions.length).toBeGreaterThan(2)

    // ① 途中のactionが欠けている
    const missing = { ...log, actions: log.actions.slice(0, log.actions.length - 1) }
    const a = resumeRunLog(state, missing)
    expect(a.ok).toBe(false)
    if (!a.ok) expect(a.reason).toBe('state-mismatch')

    // ② 余計なactionが混ざっている
    const extra = appendAction(log, { type: 'END_ROUND' })
    const b = resumeRunLog(state, extra)
    expect(b.ok).toBe(false)
    if (!b.ok) expect(b.reason).toBe('state-mismatch')

    // ③ そもそも再生できないログ
    const broken = { ...log, actions: [{ type: 'PLAY_CARD', uid: 'c-nope' }] } as DailyRunLog
    const c = resumeRunLog(state, broken)
    expect(c.ok).toBe(false)
    if (!c.ok) expect(c.reason).toBe('state-mismatch')
  })

  it('決着済みrunの完走ログは、途中のどの地点でも盤面と一致する（中断点を選ばない）', () => {
    const godId = GODS[2]
    const run = playRecordedDailyRun({
      dailyKey: DAILY_KEY,
      godId,
      deck: getRecommendedDeck(godId),
      policySeed: 3,
      clientRunId: RUN_ID,
    })
    // 完走ログの先頭n手だけを持つ「中断中のログ」を作り、その地点の盤面と突き合わせる
    for (let n = 1; n < run.log.actions.length; n++) {
      const partialLog: DailyRunLog = { ...run.log, actions: run.log.actions.slice(0, n) }
      const partial = runReplay(toReplayInput(partialLog), { requireFinished: false })
      expect(partial.ok).toBe(true)
      if (!partial.ok) return
      if (partial.state.status !== 'playing') break
      const result = resumeRunLog(roundTrip(partial.state), roundTrip(partialLog))
      expect(result.ok, `${n}手目で引き継げなかった`).toBe(true)
    }
  })
})

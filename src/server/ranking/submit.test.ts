import { beforeEach, describe, expect, it } from 'vitest'
import type { GodId } from '../../core/types'
import { RULES } from '../../core/data/rules'
import { GOD_IDS } from '../../core/data/gods'
import { dailyKeyOf } from '../../core/data/dailyBoss'
import { getRecommendedDeck } from '../../core/data/deckBuilder'
import { toReplayInput } from '../../core/replay'
import { playRecordedDailyRun } from '../../core/replay/replayTestUtils'
import { createMemoryRankingStore } from './store'
import { submitRun } from './submit'
import type { SubmitRequest } from './types'

/**
 * Phase 4.3：提出の受理（`submitRun`）。
 *
 * ★ここで守るべき性質
 *   1. スコアは**サーバーが計算する**。クライアントの申告は入力に存在しない
 *   2. 同じ `clientRunId` の再送は冪等（保存が増えない・枠を消費しない）
 *   3. ただし**同じIDで中身を差し替える**提出は拒否する
 *   4. 1日3回・提出試行の上限・今日のDailyのみ、が効く
 *   5. 改ざんされたログはリプレイ検証で落ちる
 */

const GOD: GodId = GOD_IDS.ebisu
const PLAYER = 'a'.repeat(32)
const OTHER_PLAYER = 'b'.repeat(32)

/** JST 2026-09-09 の正午（UTCでは前日03:00） */
const NOW = Date.parse('2026-09-09T03:00:00Z')
const DAILY_KEY = dailyKeyOf(new Date(NOW))

const store = createMemoryRankingStore()
const deps = { store, now: NOW }

let runCounter = 0
function makeRequest(overrides: Partial<SubmitRequest> = {}, godId: GodId = GOD): SubmitRequest {
  runCounter++
  const run = playRecordedDailyRun({
    dailyKey: DAILY_KEY,
    godId,
    deck: getRecommendedDeck(godId),
    policySeed: runCounter,
    clientRunId: 'c'.repeat(32),
  })
  return {
    playerId: PLAYER,
    clientRunId: String(runCounter).padStart(32, '0'),
    input: toReplayInput(run.log),
    ...overrides,
  }
}

beforeEach(() => {
  store.clear()
  runCounter = 0
})

describe('submitRun：検証と保存', () => {
  it('正当な提出を受理し、スコアをサーバー側で計算する', async () => {
    const request = makeRequest()
    const result = await submitRun(request, deps)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.accepted).toBe('stored')
    expect(result.run.score).toBe(result.outcome.score)
    expect(result.run.playerId).toBe(PLAYER)
    expect(result.runsUsed).toBe(1)
    expect(result.bestScore).toBe(result.outcome.score)
    // 保存されたのは計算値のみ
    expect(new Set(Object.keys(result.run))).toEqual(
      new Set([
        'dailyKey',
        'playerId',
        'clientRunId',
        'godId',
        'score',
        'win',
        'round',
        'rngCursor',
        'actionCount',
        'submittedAt',
      ]),
    )
  })

  it('クライアントがscoreを申告しても無視される（受け取る場所が無い）', async () => {
    const request = makeRequest()
    const honest = await submitRun(request, deps)
    expect(honest.ok).toBe(true)
    if (!honest.ok) return

    store.clear()
    const withClaims = {
      ...request,
      score: 999_999,
      win: true,
      bestScore: 999_999,
      input: { ...request.input, score: 999_999, win: true },
    } as unknown as SubmitRequest
    const result = await submitRun(withClaims, deps)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.run.score).toBe(honest.run.score)
    expect(result.run.score).not.toBe(999_999)
  })

  it('7神すべてで受理でき、保存されたscoreがリプレイ結果と一致する', async () => {
    for (const godId of Object.values(GOD_IDS)) {
      store.clear()
      const request = makeRequest({ clientRunId: 'd'.repeat(32) }, godId)
      const result = await submitRun(request, deps)
      expect(result.ok, `${godId}`).toBe(true)
      if (!result.ok) continue
      expect(result.run.godId).toBe(godId)
      expect(result.run.rngCursor).toBe(result.outcome.rngCursor)
      expect(result.run.actionCount).toBe(result.outcome.actionCount)
    }
  })
})

describe('submitRun：冪等性と使い回し', () => {
  it('同じclientRunIdの再送は保存を増やさず、枠も消費しない', async () => {
    const request = makeRequest()
    const first = await submitRun(request, deps)
    expect(first.ok).toBe(true)

    for (let i = 0; i < 5; i++) {
      const again = await submitRun(request, deps)
      expect(again.ok).toBe(true)
      if (!again.ok) return
      expect(again.accepted).toBe('duplicate')
      expect(again.runsUsed).toBe(1)
    }
    expect((await store.listPlayerRuns(DAILY_KEY, PLAYER)).length).toBe(1)
    // 再送は提出試行としても数えない
    expect(await store.countAttempts(DAILY_KEY, PLAYER)).toBe(1)
  })

  it('同じclientRunIdで中身の違う内容を出すと拒否する', async () => {
    const request = makeRequest()
    expect((await submitRun(request, deps)).ok).toBe(true)

    const different = makeRequest({ clientRunId: request.clientRunId })
    const result = await submitRun(different, deps)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('RUN_ID_CONFLICT')
    expect((await store.listPlayerRuns(DAILY_KEY, PLAYER)).length).toBe(1)
  })

  it('他人のclientRunIdを名乗る提出を拒否する', async () => {
    const request = makeRequest()
    expect((await submitRun(request, deps)).ok).toBe(true)

    const result = await submitRun({ ...request, playerId: OTHER_PLAYER }, deps)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('BAD_IDENTITY')
  })
})

describe('submitRun：制限', () => {
  it('1日の挑戦回数を超える提出を拒否する', async () => {
    for (let i = 0; i < RULES.daily.attemptsPerDay; i++) {
      const result = await submitRun(makeRequest(), deps)
      expect(result.ok, `${i + 1}回目`).toBe(true)
      if (result.ok) expect(result.runsUsed).toBe(i + 1)
    }
    const extra = await submitRun(makeRequest(), deps)
    expect(extra.ok).toBe(false)
    if (!extra.ok) expect(extra.code).toBe('ATTEMPTS_EXCEEDED')
    expect((await store.listPlayerRuns(DAILY_KEY, PLAYER)).length).toBe(
      RULES.daily.attemptsPerDay,
    )
  })

  it('提出試行の上限で総当たりを止める', async () => {
    for (let i = 0; i < RULES.ranking.maxSubmitAttemptsPerDay; i++) {
      await store.recordAttempt(DAILY_KEY, PLAYER)
    }
    const result = await submitRun(makeRequest(), deps)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('RATE_LIMITED')
  })

  it('別プレイヤーの制限は独立している', async () => {
    for (let i = 0; i < RULES.daily.attemptsPerDay; i++) {
      expect((await submitRun(makeRequest(), deps)).ok).toBe(true)
    }
    const other = await submitRun(makeRequest({ playerId: OTHER_PLAYER }), deps)
    expect(other.ok).toBe(true)
  })

  it('今日以外のDailyを拒否する', async () => {
    const yesterday = '2026-09-08'
    const run = playRecordedDailyRun({
      dailyKey: yesterday,
      godId: GOD,
      deck: getRecommendedDeck(GOD),
      policySeed: 3,
      clientRunId: 'e'.repeat(32),
    })
    const result = await submitRun(
      { playerId: PLAYER, clientRunId: 'e'.repeat(32), input: toReplayInput(run.log) },
      deps,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('STALE_DAILY_KEY')
  })

  it('JST境界で「今日」が切り替わる（15:00Zで翌日）', async () => {
    const request = makeRequest()
    // 2026-09-09T14:59:59Z はまだJST 2026-09-09
    const sameDay = await submitRun(request, { store, now: Date.parse('2026-09-09T14:59:59Z') })
    expect(sameDay.ok).toBe(true)

    store.clear()
    // 15:00:00Z はJST 2026-09-10 → 前日の提出は期限切れ
    const nextDay = await submitRun(request, { store, now: Date.parse('2026-09-09T15:00:00Z') })
    expect(nextDay.ok).toBe(false)
    if (!nextDay.ok) expect(nextDay.code).toBe('STALE_DAILY_KEY')
  })
})

describe('submitRun：不正な入力', () => {
  it('識別子の形式が不正な提出を拒否する', async () => {
    const base = makeRequest()
    for (const patch of [
      { playerId: 'short' },
      { playerId: '' },
      { clientRunId: 'nope' },
      { playerId: 'user@example.com'.padEnd(32, 'x') },
    ]) {
      const result = await submitRun({ ...base, ...patch } as SubmitRequest, deps)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.code).toBe('BAD_IDENTITY')
    }
  })

  it('改ざんされた行動ログはリプレイ検証で落ちる', async () => {
    const base = makeRequest()
    // actionを1つ削る＝別の結果になるか、そもそも決着しない
    const tampered: SubmitRequest = {
      ...base,
      input: { ...base.input, actions: base.input.actions.slice(0, 2) },
    }
    const result = await submitRun(tampered, deps)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('REPLAY_REJECTED')
      expect(result.replayCode).toBe('NOT_FINISHED')
    }
  })

  it('存在しないカードを使うログを拒否する', async () => {
    const base = makeRequest()
    const tampered: SubmitRequest = {
      ...base,
      input: {
        ...base.input,
        actions: [{ type: 'PLAY_CARD', uid: 'c-hacked' as never }, ...base.input.actions],
      },
    }
    const result = await submitRun(tampered, deps)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('REPLAY_REJECTED')
      expect(result.replayCode).toBe('ENGINE_REJECTED')
    }
  })

  it('報酬ボーナス前提の3枚積みデッキを拒否する（Dailyの公平性がサーバー側でも効く）', async () => {
    const base = makeRequest()
    const deck = [...base.input.deck]
    const target = deck[0]
    for (let i = 1; i < deck.length; i++) {
      if (deck[i] !== target) {
        deck[i] = target
        break
      }
    }
    const result = await submitRun({ ...base, input: { ...base.input, deck } }, deps)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('REPLAY_REJECTED')
      expect(result.replayCode).toBe('DECK')
    }
  })

  it('日付キーが壊れた入力を拒否する', async () => {
    const base = makeRequest()
    const result = await submitRun(
      { ...base, input: { ...base.input, dailyKey: 'nope' } },
      deps,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.replayCode).toBe('DAILY_KEY')
  })
})

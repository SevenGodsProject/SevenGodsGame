import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { GodId } from '../../core/types'
import { RULES } from '../../core/data/rules'
import { GOD_IDS } from '../../core/data/gods'
import { dailyKeyOf } from '../../core/data/dailyBoss'
import { getRecommendedDeck } from '../../core/data/deckBuilder'
import { getGameVersion, toReplayInput } from '../../core/replay'
import { playRecordedDailyRun } from '../../core/replay/replayTestUtils'
import { createMemoryRankingStore } from './store'
import { startRun } from './start'
import { submitRun } from './submit'
import { issueTicket, makeIdentity, runId, type TestIdentity } from './rankingTestUtils'
import type { SubmitRequest } from './types'

/**
 * Phase 4.3〜4.6：提出の受理（`submitRun`）。
 *
 * ★ここで守るべき性質
 *   1. スコアは**サーバーが計算する**。クライアントの申告は入力に存在しない
 *   2. 同じ `clientRunId` の再送は冪等（保存が増えない・枠を消費しない）
 *   3. ただし**同じIDで中身を差し替える**提出は拒否する
 *   4. 提出には ticket が要る。ticket 無しでは1件も保存されない（Phase 4.6）
 *   5. 改ざんされたログはリプレイ検証で落ちる
 */

const GOD: GodId = GOD_IDS.ebisu

/** JST 2026-09-09 の正午（UTCでは同日03:00） */
const NOW = Date.parse('2026-09-09T03:00:00Z')
const DAILY_KEY = dailyKeyOf(new Date(NOW))

const store = createMemoryRankingStore()
const deps = { store, now: NOW }

let me: TestIdentity
let other: TestIdentity

beforeAll(async () => {
  me = await makeIdentity('player-me')
  other = await makeIdentity('player-other')
})

let runCounter = 0

/** 行動ログ付きの提出リクエストを作る（ticketはまだ取らない） */
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
    playerId: me.playerId,
    playerSecret: me.playerSecret,
    clientRunId: runId(runCounter),
    input: toReplayInput(run.log),
    ...overrides,
  }
}

/** 枠を取ってから提出リクエストを作る（本番と同じ start → submit の順） */
async function prepared(
  overrides: Partial<SubmitRequest> = {},
  godId: GodId = GOD,
): Promise<SubmitRequest> {
  const request = makeRequest(overrides, godId)
  await issueTicket(
    { playerId: request.playerId, playerSecret: request.playerSecret },
    request.clientRunId,
    deps,
  )
  return request
}

beforeEach(() => {
  store.clear()
  runCounter = 0
})

describe('submitRun：検証と保存', () => {
  it('正当な提出を受理し、スコアをサーバー側で計算する', async () => {
    const request = await prepared()
    const result = await submitRun(request, deps)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.accepted).toBe('stored')
    expect(result.run.score).toBe(result.outcome.score)
    expect(result.run.playerId).toBe(me.playerId)
    expect(result.runsUsed).toBe(1)
    expect(result.bestScore).toBe(result.outcome.score)
    // 番号は ticket が決めたもの。版は検証時のコードのもの
    expect(result.run.attemptNo).toBe(1)
    expect(result.run.gameVersion).toBe(getGameVersion())
    // 保存されたのは計算値のみ（秘密はどこにも入らない）
    expect(new Set(Object.keys(result.run))).toEqual(
      new Set([
        'dailyKey',
        'playerId',
        'clientRunId',
        'attemptNo',
        'gameVersion',
        'godId',
        'score',
        'win',
        'round',
        'rngCursor',
        'actionCount',
        'submittedAt',
      ]),
    )
    expect(JSON.stringify(result.run)).not.toContain(me.playerSecret)
  })

  it('クライアントがscoreを申告しても無視される（受け取る場所が無い）', async () => {
    const request = await prepared()
    const honest = await submitRun(request, deps)
    expect(honest.ok).toBe(true)
    if (!honest.ok) return

    store.clear()
    const replayed = await prepared({ clientRunId: request.clientRunId })
    const withClaims = {
      ...replayed,
      input: { ...request.input, score: 999_999, win: true },
      score: 999_999,
      win: true,
      bestScore: 999_999,
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
      const request = await prepared({}, godId)
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
    const request = await prepared()
    const first = await submitRun(request, deps)
    expect(first.ok).toBe(true)

    for (let i = 0; i < 5; i++) {
      const again = await submitRun(request, deps)
      expect(again.ok).toBe(true)
      if (!again.ok) return
      expect(again.accepted).toBe('duplicate')
      expect(again.runsUsed).toBe(1)
    }
    expect((await store.listPlayerRuns(DAILY_KEY, me.playerId)).length).toBe(1)
    // 再送は提出試行としても数えない
    expect(await store.countAttempts(DAILY_KEY, me.playerId)).toBe(1)
  })

  it('同じclientRunIdで中身の違う内容を出すと拒否する', async () => {
    const request = await prepared()
    expect((await submitRun(request, deps)).ok).toBe(true)

    const different = makeRequest({ clientRunId: request.clientRunId })
    const result = await submitRun(different, deps)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('RUN_ID_CONFLICT')
    expect((await store.listPlayerRuns(DAILY_KEY, me.playerId)).length).toBe(1)
  })

  it('他人のclientRunIdを名乗る提出を拒否する', async () => {
    const request = await prepared()
    expect((await submitRun(request, deps)).ok).toBe(true)

    const result = await submitRun(
      { ...request, playerId: other.playerId, playerSecret: other.playerSecret },
      deps,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('BAD_IDENTITY')
  })
})

describe('submitRun：制限', () => {
  it('1日の枠を使い切ると、それ以上は開始できず提出もできない', async () => {
    for (let i = 0; i < RULES.daily.attemptsPerDay; i++) {
      const result = await submitRun(await prepared(), deps)
      expect(result.ok, `${i + 1}回目`).toBe(true)
      if (result.ok) expect(result.runsUsed).toBe(i + 1)
    }
    // 4回目の開始は拒否される
    const fourth = await startRun(
      { ...me, clientRunId: runId('fourth') },
      deps,
    )
    expect(fourth.ok).toBe(false)
    if (!fourth.ok) expect(fourth.code).toBe('ATTEMPTS_EXCEEDED')
    // 開始せずに提出しようとしても ticket が無い
    const extra = await submitRun(makeRequest(), deps)
    expect(extra.ok).toBe(false)
    if (!extra.ok) expect(extra.code).toBe('NO_TICKET')
    expect((await store.listPlayerRuns(DAILY_KEY, me.playerId)).length).toBe(
      RULES.daily.attemptsPerDay,
    )
  })

  it('提出試行の上限で総当たりを止める', async () => {
    const request = await prepared()
    for (let i = 0; i < RULES.ranking.maxSubmitAttemptsPerDay; i++) {
      await store.recordAttempt(DAILY_KEY, me.playerId)
    }
    const result = await submitRun(request, deps)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('RATE_LIMITED')
  })

  it('別プレイヤーの制限は独立している', async () => {
    for (let i = 0; i < RULES.daily.attemptsPerDay; i++) {
      expect((await submitRun(await prepared(), deps)).ok).toBe(true)
    }
    const theirs = await prepared({ playerId: other.playerId, playerSecret: other.playerSecret })
    expect((await submitRun(theirs, deps)).ok).toBe(true)
  })

  it('ticketを持たない提出は、どれだけ来てもDBへ何も書かない', async () => {
    for (let i = 0; i < 20; i++) {
      const result = await submitRun(makeRequest(), deps)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.code).toBe('NO_TICKET')
    }
    expect(await store.countAttempts(DAILY_KEY, me.playerId)).toBe(0)
    expect((await store.listDayRuns(DAILY_KEY)).length).toBe(0)
    expect((await store.listTickets(DAILY_KEY, me.playerId)).length).toBe(0)
  })

  it('別の日を名乗った提出は ticket が見つからず拒否される（端末時計を信じない）', async () => {
    const request = await prepared()
    for (const dailyKey of ['2026-09-08', '2026-09-10']) {
      const result = await submitRun(
        { ...request, input: { ...request.input, dailyKey } },
        deps,
      )
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.code).toBe('NO_TICKET')
    }
  })

  it('JST境界で「今日」が切り替わる（15:00Zで翌日の枠になる）', async () => {
    const before = await startRun(
      { ...me, clientRunId: runId('jst-a') },
      { store, now: Date.parse('2026-09-09T14:59:59Z') },
    )
    expect(before.ok).toBe(true)
    if (before.ok) expect(before.ticket.dailyKey).toBe('2026-09-09')

    const after = await startRun(
      { ...me, clientRunId: runId('jst-b') },
      { store, now: Date.parse('2026-09-09T15:00:00Z') },
    )
    expect(after.ok).toBe(true)
    if (after.ok) {
      expect(after.ticket.dailyKey).toBe('2026-09-10')
      // 前日の枠とは独立に数え直す
      expect(after.ticket.attemptNo).toBe(1)
    }
  })
})

describe('submitRun：不正な入力', () => {
  it('識別子の形式が不正な提出を拒否する', async () => {
    const base = await prepared()
    for (const patch of [
      { playerId: 'short' },
      { playerId: '' },
      { clientRunId: 'nope' },
      { playerId: 'user@example.com'.padEnd(32, 'x') },
      { playerSecret: 'short' },
    ]) {
      const result = await submitRun({ ...base, ...patch } as SubmitRequest, deps)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.code).toBe('BAD_IDENTITY')
    }
  })

  it('改ざんされた行動ログはリプレイ検証で落ちる', async () => {
    const base = await prepared()
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
    const base = await prepared()
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
    const base = await prepared()
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
    const base = await prepared()
    const result = await submitRun({ ...base, input: { ...base.input, dailyKey: 'nope' } }, deps)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.replayCode).toBe('DAILY_KEY')
  })
})

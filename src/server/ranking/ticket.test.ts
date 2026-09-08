import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { RULES } from '../../core/data/rules'
import { GOD_IDS } from '../../core/data/gods'
import { dailyKeyOf } from '../../core/data/dailyBoss'
import { getRecommendedDeck } from '../../core/data/deckBuilder'
import { getGameVersion, toReplayInput } from '../../core/replay'
import { playRecordedDailyRun } from '../../core/replay/replayTestUtils'
import { createMemoryRankingStore } from './store'
import { startRun, type StartResult } from './start'
import { submitRun } from './submit'
import { dayEndOf, shiftDailyKey, ticketStateOf } from './ticket'
import { makeIdentity, runId, type TestIdentity } from './rankingTestUtils'
import type { SubmitRequest } from './types'

/**
 * Phase 4.6：run ticket 状態機械を**本番コード**に対して検証する。
 *
 * Phase 4.5（決定139 §15-1）では `scripts/phase45-psf/` のリファレンスモデルに対して
 * 37シナリオを確かめた。ここではそれと同じ筋書きを、実際に出荷する
 * `startRun` / `submitRun` / `createMemoryRankingStore` に対して再現する。
 *
 * 並列start・並列submitは `concurrency.test.ts`、身元まわりは `identity.test.ts`、
 * bodyの大きさは `http.test.ts` が担当する。
 */

const GOD = GOD_IDS.ebisu
const MIN = 60_000
/** JST 2026-09-09 12:00 */
const NOON = Date.parse('2026-09-09T03:00:00Z')
const DAY = dailyKeyOf(new Date(NOON))
const TTL = RULES.ranking.ticketTtlMinutes
const GRACE = RULES.ranking.dayEndGraceMinutes

const store = createMemoryRankingStore()

let me: TestIdentity
let other: TestIdentity

beforeAll(async () => {
  me = await makeIdentity('ticket-me')
  other = await makeIdentity('ticket-other')
})

beforeEach(() => store.clear())

const deps = (now: number, gameVersion?: string) => ({ store, now, ...(gameVersion ? { gameVersion } : {}) })

const start = (clientRunId: string, now = NOON, who = () => me, gameVersion?: string) =>
  startRun({ ...who(), clientRunId }, deps(now, gameVersion))

function ok(result: StartResult) {
  if (!result.ok) throw new Error(`start が拒否されました: ${result.code}`)
  return result
}

let seq = 0
function request(clientRunId: string, who: TestIdentity = me, dailyKey = DAY): SubmitRequest {
  seq++
  const run = playRecordedDailyRun({
    dailyKey,
    godId: GOD,
    deck: getRecommendedDeck(GOD),
    policySeed: seq,
    clientRunId: 'c'.repeat(32),
  })
  return {
    playerId: who.playerId,
    playerSecret: who.playerSecret,
    clientRunId,
    input: toReplayInput(run.log),
  }
}

// ---------------------------------------------------------------------------

describe('S1 正常系：1日3回勝負', () => {
  it('start→submit を3回：番号は1,2,3。4回目のstartは拒否される', async () => {
    for (let i = 1; i <= RULES.daily.attemptsPerDay; i++) {
      const started = ok(await start(runId(`s1-${i}`)))
      expect(started.ticket.attemptNo).toBe(i)
      expect(started.reused).toBe(false)
      expect(started.attemptsUsed).toBe(i)

      const result = await submitRun(request(runId(`s1-${i}`)), deps(NOON))
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.accepted).toBe('stored')
      expect(result.run.attemptNo).toBe(i)
      expect(result.runsUsed).toBe(i)
    }
    const fourth = await start(runId('s1-4'))
    expect(fourth.ok).toBe(false)
    if (!fourth.ok) expect(fourth.code).toBe('ATTEMPTS_EXCEEDED')
    expect((await store.listPlayerRuns(DAY, me.playerId)).length).toBe(RULES.daily.attemptsPerDay)
  })

  it('★遊んだだけで提出しなくても枠は減る（提出回数ではなく挑戦回数を数える）', async () => {
    ok(await start(runId('s1b-1')))
    ok(await start(runId('s1b-2')))
    ok(await start(runId('s1b-3')))
    const fourth = await start(runId('s1b-4'))
    expect(fourth.ok).toBe(false)
    if (!fourth.ok) expect(fourth.code).toBe('ATTEMPTS_EXCEEDED')
    // 1件も提出していないのに枠は尽きている＝best-of-Nができない
    expect(await store.listPlayerRuns(DAY, me.playerId)).toEqual([])
    const tickets = await store.listTickets(DAY, me.playerId)
    expect(tickets.map((t) => t.closedReason)).toEqual(['abandoned', 'abandoned', null])
  })

  it('4回目の拒否ではDBに何も書かない', async () => {
    for (let i = 1; i <= RULES.daily.attemptsPerDay; i++) ok(await start(runId(`s1c-${i}`)))
    const before = JSON.stringify(await store.listTickets(DAY, me.playerId))
    await start(runId('s1c-4'))
    expect(JSON.stringify(await store.listTickets(DAY, me.playerId))).toBe(before)
  })
})

describe('S2 二重start・新しい挑戦', () => {
  it('同じclientRunIdで2回startしても同じticketが返り、枠は1つしか減らない', async () => {
    const first = ok(await start(runId('s2-a')))
    const again = ok(await start(runId('s2-a'), NOON + MIN))
    expect(again.reused).toBe(true)
    expect(again.ticket).toEqual(first.ticket)
    expect(again.attemptsUsed).toBe(1)
    expect((await store.listTickets(DAY, me.playerId)).length).toBe(1)
  })

  it('別のclientRunIdでstartすると前の挑戦は放棄され、その提出は通らない', async () => {
    const first = ok(await start(runId('s2-b1')))
    const second = ok(await start(runId('s2-b2'), NOON + MIN))
    expect(second.abandoned).toBe(first.ticket.clientRunId)
    expect(second.ticket.attemptNo).toBe(2)

    const stale = await submitRun(request(runId('s2-b1')), deps(NOON + 2 * MIN))
    expect(stale.ok).toBe(false)
    if (!stale.ok) expect(stale.code).toBe('TICKET_CLOSED')

    expect((await submitRun(request(runId('s2-b2')), deps(NOON + 2 * MIN))).ok).toBe(true)
  })

  it('★枠が残っていないときは進行中の挑戦を放棄しない（最後の1回を再開できる）', async () => {
    ok(await start(runId('s2-c1')))
    await submitRun(request(runId('s2-c1')), deps(NOON))
    ok(await start(runId('s2-c2')))
    await submitRun(request(runId('s2-c2')), deps(NOON))
    const third = ok(await start(runId('s2-c3')))

    const blocked = await start(runId('s2-c4'))
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) expect(blocked.code).toBe('ATTEMPTS_EXCEEDED')

    // 3枚目はまだ open のまま＝再開して提出できる
    const resumed = ok(await start(runId('s2-c3')))
    expect(resumed.state).toBe('open')
    expect(resumed.ticket).toEqual(third.ticket)
    expect((await submitRun(request(runId('s2-c3')), deps(NOON))).ok).toBe(true)
  })
})

describe('S3 通信断・reload・resume', () => {
  it('startの応答を失っても、同じclientRunIdなら同じ枠が返る', async () => {
    const first = ok(await start(runId('s3-a')))
    const retry = ok(await start(runId('s3-a'), NOON + MIN))
    expect(retry.reused).toBe(true)
    expect(retry.ticket.attemptNo).toBe(first.ticket.attemptNo)
    expect(retry.attemptsUsed).toBe(1)
  })

  it('reload：openのまま同じticketが返り、提出できる', async () => {
    const first = ok(await start(runId('s3-b')))
    const reloaded = ok(await start(runId('s3-b'), NOON + 5 * MIN))
    expect(reloaded.state).toBe('open')
    expect(reloaded.ticket).toEqual(first.ticket)
    expect((await submitRun(request(runId('s3-b')), deps(NOON + 6 * MIN))).ok).toBe(true)
  })

  it('resume：TTL内なら再開して提出できる。TTLを過ぎたら期限切れ', async () => {
    ok(await start(runId('s3-c')))
    const within = ok(await start(runId('s3-c'), NOON + (TTL - 1) * MIN))
    expect(within.state).toBe('open')
    expect((await submitRun(request(runId('s3-c')), deps(NOON + (TTL - 1) * MIN))).ok).toBe(true)

    store.clear()
    ok(await start(runId('s3-d')))
    const late = ok(await start(runId('s3-d'), NOON + (TTL + 1) * MIN))
    expect(late.state).toBe('expired')
    const result = await submitRun(request(runId('s3-d')), deps(NOON + (TTL + 1) * MIN))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('TICKET_EXPIRED')
  })

  it('submitの応答を失った再送は duplicate（保存も枠も増えない）', async () => {
    ok(await start(runId('s3-e')))
    const body = request(runId('s3-e'))
    const first = await submitRun(body, deps(NOON))
    expect(first.ok && first.accepted).toBe('stored')
    for (let i = 0; i < 3; i++) {
      const again = await submitRun(body, deps(NOON + i * MIN))
      expect(again.ok && again.accepted).toBe('duplicate')
    }
    expect((await store.listPlayerRuns(DAY, me.playerId)).length).toBe(1)
    expect(await store.countAttempts(DAY, me.playerId)).toBe(1)
  })

  it('★受理済みなら、期限を過ぎたあとの再送でも duplicate として受け取れる', async () => {
    ok(await start(runId('s3-f')))
    const body = request(runId('s3-f'))
    expect((await submitRun(body, deps(NOON))).ok).toBe(true)
    const late = await submitRun(body, deps(NOON + (TTL + 30) * MIN))
    expect(late.ok && late.accepted).toBe('duplicate')
  })
})

describe('S4 期限切れ', () => {
  it('期限切れは枠を消費する（次のstartは番号2）', async () => {
    ok(await start(runId('s4-a')))
    const later = NOON + (TTL + 1) * MIN
    const expired = await submitRun(request(runId('s4-a')), deps(later))
    expect(expired.ok).toBe(false)
    if (!expired.ok) expect(expired.code).toBe('TICKET_EXPIRED')

    const next = ok(await start(runId('s4-b'), later))
    expect(next.ticket.attemptNo).toBe(2)
    // 期限切れは open ではないので、放棄の対象にならない
    expect(next.abandoned).toBeNull()
  })

  it('expiresAt は TTL と 日末+grace の早い方', async () => {
    const noon = ok(await start(runId('s4-c'), NOON))
    expect(noon.ticket.expiresAt).toBe(NOON + TTL * MIN)

    store.clear()
    const lateNight = Date.parse('2026-09-09T14:59:00Z') // JST 23:59
    const night = ok(await start(runId('s4-d'), lateNight))
    expect(night.ticket.expiresAt).toBe(dayEndOf(DAY) + GRACE * MIN)
    expect(night.ticket.expiresAt).toBeLessThan(lateNight + TTL * MIN)
  })
})

describe('S5 日付跨ぎ（PSF-4）', () => {
  const T2359 = Date.parse('2026-09-09T14:59:00Z')
  const T0001 = T2359 + 2 * MIN
  const T0020 = T2359 + 21 * MIN

  it('23:59に開始したticketは前日のdailyKeyを持つ', async () => {
    const started = ok(await start(runId('s5-a'), T2359))
    expect(started.ticket.dailyKey).toBe('2026-09-09')
  })

  it('★00:01の提出は前日のボードに入る', async () => {
    ok(await start(runId('s5-b'), T2359))
    const result = await submitRun(request(runId('s5-b'), me, '2026-09-09'), deps(T0001))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.run.dailyKey).toBe('2026-09-09')
  })

  it('graceを過ぎた00:20の提出は期限切れ', async () => {
    ok(await start(runId('s5-c'), T2359))
    const result = await submitRun(request(runId('s5-c'), me, '2026-09-09'), deps(T0020))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('TICKET_EXPIRED')
  })

  it('00:01の開始は翌日の枠になり、前日の枠とは独立に数える', async () => {
    for (let i = 1; i <= RULES.daily.attemptsPerDay; i++) {
      ok(await start(runId(`s5-y${i}`), T2359 - 60 * MIN))
    }
    const blocked = await start(runId('s5-y4'), T2359 - 30 * MIN)
    expect(blocked.ok).toBe(false)

    const tomorrow = ok(await start(runId('s5-t1'), T0001))
    expect(tomorrow.ticket.dailyKey).toBe('2026-09-10')
    expect(tomorrow.ticket.attemptNo).toBe(1)
  })

  it('端末時計を偽装して別日を名乗ってもticketが無い（書き込み0）', async () => {
    ok(await start(runId('s5-z')))
    const before = await store.countAttempts(DAY, me.playerId)
    for (const dailyKey of ['2026-09-08', '2026-09-10']) {
      const result = await submitRun(request(runId('s5-z'), me, dailyKey), deps(NOON))
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.code).toBe('NO_TICKET')
    }
    expect(await store.countAttempts(DAY, me.playerId)).toBe(before)
  })
})

describe('S6 複数端末（同じcredentialを2台で使う）', () => {
  it('端末Bが新しい挑戦を始めると端末Aの挑戦は放棄される', async () => {
    const deviceA = ok(await start(runId('s6-a')))
    const deviceB = ok(await start(runId('s6-b'), NOON + MIN))
    expect(deviceB.abandoned).toBe(deviceA.ticket.clientRunId)

    const fromA = await submitRun(request(runId('s6-a')), deps(NOON + 5 * MIN))
    expect(fromA.ok).toBe(false)
    if (!fromA.ok) expect(fromA.code).toBe('TICKET_CLOSED')
    expect((await submitRun(request(runId('s6-b')), deps(NOON + 5 * MIN))).ok).toBe(true)
    // 2台で2枠を消費した（best-of-2 にはならない）
    expect((await store.listTickets(DAY, me.playerId)).length).toBe(2)
  })

  it('同じclientRunIdを共有すれば1つの挑戦を2台で続けられる', async () => {
    const deviceA = ok(await start(runId('s6-c')))
    const deviceB = ok(await start(runId('s6-c'), NOON + MIN))
    expect(deviceB.ticket).toEqual(deviceA.ticket)
    expect((await store.listTickets(DAY, me.playerId)).length).toBe(1)
  })

  it('他人のclientRunIdをstartで名乗っても拒否される', async () => {
    ok(await start(runId('s6-d'), NOON, () => other))
    const stolen = await start(runId('s6-d'), NOON, () => me)
    expect(stolen.ok).toBe(false)
    if (!stolen.ok) expect(stolen.code).toBe('BAD_IDENTITY')
  })
})

describe('S7 day-lock と版の不一致（PSF-3）', () => {
  it('その日の最初のticketが版を固定し、deploy後の新規開始は拒否される', async () => {
    ok(await start(runId('s7-a'), NOON, () => me, 'v1'))
    const locked = await start(runId('s7-b'), NOON + MIN, () => me, 'v2')
    expect(locked.ok).toBe(false)
    if (!locked.ok) expect(locked.code).toBe('RULES_VERSION_LOCKED')

    // 翌日は新しい版で普通に始まる
    const nextDay = ok(await start(runId('s7-c'), NOON + 24 * 60 * MIN, () => me, 'v2'))
    expect(nextDay.ticket.gameVersion).toBe('v2')
  })

  it('★deployを跨いだ提出は不受理だが、枠は返還される（voided）', async () => {
    ok(await start(runId('s7-d'), NOON, () => me, 'v1'))
    const result = await submitRun(request(runId('s7-d')), deps(NOON + 5 * MIN, 'v2'))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('RULES_VERSION_MISMATCH')

    const tickets = await store.listTickets(DAY, me.playerId)
    expect(tickets[0].closedReason).toBe('voided')

    // rollbackでv1へ戻れば、返還された番号1を使い直せる
    const again = ok(await start(runId('s7-e'), NOON + 10 * MIN, () => me, 'v1'))
    expect(again.ticket.attemptNo).toBe(1)
    expect(again.attemptsUsed).toBe(1)
  })

  it('保存されたrunには検証時の版が残る', async () => {
    ok(await start(runId('s7-f')))
    const result = await submitRun(request(runId('s7-f')), deps(NOON))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.run.gameVersion).toBe(getGameVersion())
  })
})

describe('S8 乱用の抑止（PSF-5）', () => {
  it('不正なリプレイの連打は提出試行の上限で止まり、runは1件も入らない', async () => {
    ok(await start(runId('s8-a')))
    const broken = request(runId('s8-a'))
    broken.input = { ...broken.input, actions: broken.input.actions.slice(0, 1) }

    let rejected = 0
    let limited = 0
    for (let i = 0; i < RULES.ranking.maxSubmitAttemptsPerDay + 5; i++) {
      const result = await submitRun(broken, deps(NOON))
      if (!result.ok && result.code === 'REPLAY_REJECTED') rejected++
      if (!result.ok && result.code === 'RATE_LIMITED') limited++
    }
    expect(rejected).toBe(RULES.ranking.maxSubmitAttemptsPerDay)
    expect(limited).toBe(5)
    expect(await store.listDayRuns(DAY)).toEqual([])
  })

  it('正当な1日（3挑戦・3提出）の書き込みは少数に収まる', async () => {
    let writes = 0
    const counting = {
      ...store,
      async insertTicket(...args: Parameters<typeof store.insertTicket>) {
        writes++
        return store.insertTicket(...args)
      },
      async insertRun(...args: Parameters<typeof store.insertRun>) {
        writes++
        return store.insertRun(...args)
      },
      async recordAttempt(...args: Parameters<typeof store.recordAttempt>) {
        writes++
        return store.recordAttempt(...args)
      },
      async closeTicket(...args: Parameters<typeof store.closeTicket>) {
        writes++
        return store.closeTicket(...args)
      },
    }
    for (let i = 1; i <= RULES.daily.attemptsPerDay; i++) {
      await startRun({ ...me, clientRunId: runId(`s8-b${i}`) }, { store: counting, now: NOON })
      await submitRun(request(runId(`s8-b${i}`)), { store: counting, now: NOON })
    }
    // ticket 3 + attempt 3 + run 3。放棄は起きない（毎回提出しているため）
    expect(writes).toBe(RULES.daily.attemptsPerDay * 3)
  })

  it('剪定は古い日だけを消し、当日には触れない', async () => {
    ok(await start(runId('s8-c')))
    await submitRun(request(runId('s8-c')), deps(NOON))
    const cutoff = shiftDailyKey(DAY, -RULES.daily.retentionDays)
    await store.pruneBefore(cutoff)
    expect((await store.listPlayerRuns(DAY, me.playerId)).length).toBe(1)

    // 未来の基準日で剪定すれば当日ぶんも消える（剪定そのものが効いている証拠）
    await store.pruneBefore(shiftDailyKey(DAY, 1))
    expect(await store.listPlayerRuns(DAY, me.playerId)).toEqual([])
    expect(await store.listTickets(DAY, me.playerId)).toEqual([])
  })

  it('shiftDailyKey は月・年をまたいでも正しい', () => {
    expect(shiftDailyKey('2026-09-09', -30)).toBe('2026-08-10')
    expect(shiftDailyKey('2026-01-01', -1)).toBe('2025-12-31')
    expect(shiftDailyKey('2024-03-01', -1)).toBe('2024-02-29')
    expect(shiftDailyKey('2026-09-09', 1)).toBe('2026-09-10')
  })
})

describe('S9 状態機械の網羅', () => {
  it('open / submitted / expired / abandoned / voided の5状態がすべて現れる', async () => {
    // abandoned と submitted
    ok(await start(runId('s9-a')))
    ok(await start(runId('s9-b'), NOON + MIN)) // s9-a を放棄
    await submitRun(request(runId('s9-b')), deps(NOON + 2 * MIN))
    // expired
    ok(await start(runId('s9-c'), NOON + 3 * MIN))

    const later = NOON + (TTL + 5) * MIN
    const runs = await store.listPlayerRuns(DAY, me.playerId)
    const tickets = await store.listTickets(DAY, me.playerId)
    const states = tickets.map((t) =>
      ticketStateOf(t, runs.some((r) => r.clientRunId === t.clientRunId), later),
    )
    expect(states).toEqual(['abandoned', 'submitted', 'expired'])

    // voided（deploy跨ぎでのみ発生する）
    store.clear()
    ok(await start(runId('s9-d'), NOON, () => me, 'v1'))
    await submitRun(request(runId('s9-d')), deps(NOON + MIN, 'v2'))
    const voided = await store.listTickets(DAY, me.playerId)
    expect(ticketStateOf(voided[0], false, NOON)).toBe('voided')
  })

  it('submitted は期限を過ぎても submitted のまま（受理済みは覆らない）', async () => {
    ok(await start(runId('s9-e')))
    await submitRun(request(runId('s9-e')), deps(NOON))
    const [ticket] = await store.listTickets(DAY, me.playerId)
    expect(ticketStateOf(ticket, true, NOON + (TTL + 100) * MIN)).toBe('submitted')
  })

  it('一度閉じたticketの理由は上書きされない', async () => {
    ok(await start(runId('s9-f')))
    await store.closeTicket(DAY, runId('s9-f'), 'abandoned')
    await store.closeTicket(DAY, runId('s9-f'), 'voided')
    const [ticket] = await store.listTickets(DAY, me.playerId)
    expect(ticket.closedReason).toBe('abandoned')
  })
})

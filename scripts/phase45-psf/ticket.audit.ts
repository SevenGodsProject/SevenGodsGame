import { beforeEach, describe, expect, it } from 'vitest'
import { dailyKeyOf } from '../../src/core/data/dailyBoss'
import {
  ATTEMPTS_PER_DAY,
  MAX_SUBMIT_ATTEMPTS_PER_DAY,
  MemoryTicketStore,
  PROPOSED,
  createIdentity,
  dayEndOf,
  runIdOf,
  startRun,
  submitRun,
  ticketStateOf,
  type StartResult,
} from './ticketModel'

/**
 * Phase 4.5 PSF-2/3/4：run ticket 状態機械の検証。
 *
 * CEO指示の状態遷移（正常3プレイ／4回目start／二重start／reload／resume／通信断／
 * submit retry／期限切れ／23:59→00:01／同一credential複数端末／並列start）を
 * リファレンスモデルに対して機械検証する。あわせて PSF-1（偽装）と PSF-5（書き込み量）を
 * 同じモデル上で確認する。
 */

const MIN = 60_000
/** 2026-09-09 12:00 JST */
const NOON = Date.parse('2026-09-09T03:00:00Z')
const DAY = dailyKeyOf(new Date(NOON))
const V1 = 'v1'

const store = new MemoryTicketStore()
const me = createIdentity()

const deps = (now: number, rulesVersion = V1) => ({ store, now, rulesVersion })
const start = (runId: string, now = NOON, id = me, rulesVersion = V1) =>
  startRun({ playerId: id.playerId, playerSecret: id.secret, clientRunId: runId }, deps(now, rulesVersion))
const submit = (runId: string, now = NOON, id = me, dailyKey = DAY, payload = `run:${runId}`, rulesVersion = V1) =>
  submitRun(
    { playerId: id.playerId, playerSecret: id.secret, clientRunId: runId, input: { dailyKey, payload } },
    deps(now, rulesVersion),
  )

function okStart(r: StartResult) {
  if (!r.ok) throw new Error(`start rejected: ${r.code}`)
  return r
}

/** 「事前の読み取り直後に他のリクエストが割り込む」状況を必ず作る */
class RacyStore extends MemoryTicketStore {
  yields = 5
  override async listTickets(dailyKey: string, playerId: string) {
    const r = await super.listTickets(dailyKey, playerId)
    for (let i = 0; i < this.yields; i++) await Promise.resolve()
    return r
  }
  override async findTicket(dailyKey: string, clientRunId: string) {
    const r = await super.findTicket(dailyKey, clientRunId)
    for (let i = 0; i < this.yields; i++) await Promise.resolve()
    return r
  }
  override async findRun(dailyKey: string, clientRunId: string) {
    const r = await super.findRun(dailyKey, clientRunId)
    for (let i = 0; i < this.yields; i++) await Promise.resolve()
    return r
  }
}

beforeEach(() => store.clear())

describe('S1 正常系：1日3回勝負', () => {
  it('start→submit を3回：attempt_no 1,2,3 で保存され、4回目の start は拒否', async () => {
    for (let i = 1; i <= ATTEMPTS_PER_DAY; i++) {
      const s = okStart(await start(runIdOf(i)))
      expect(s.ticket.attemptNo).toBe(i)
      expect(s.reused).toBe(false)
      const r = await submit(runIdOf(i))
      expect(r.ok && r.accepted).toBe('stored')
      expect(r.ok && r.attemptNo).toBe(i)
      expect(r.ok && r.runsUsed).toBe(i)
    }
    const writesBefore = store.writes
    const fourth = await start(runIdOf(4))
    expect(fourth).toEqual({ ok: false, code: 'ATTEMPTS_EXCEEDED' })
    expect(store.writes, '拒否はDBに何も書かない').toBe(writesBefore)
    expect(store.runs).toHaveLength(ATTEMPTS_PER_DAY)
  })

  it('プレイせずに放置した ticket も枠を消費する（提出回数ではなく挑戦回数を数える）', async () => {
    okStart(await start(runIdOf(1)))
    okStart(await start(runIdOf(2))) // 1 を放棄
    okStart(await start(runIdOf(3))) // 2 を放棄
    expect(await start(runIdOf(4))).toEqual({ ok: false, code: 'ATTEMPTS_EXCEEDED' })
    expect(store.runs).toHaveLength(0)
    expect(store.tickets.map((t) => t.closedReason)).toEqual(['abandoned', 'abandoned', null])
  })
})

describe('S2 二重start', () => {
  it('同じ clientRunId で2回 start：同じ ticket が返り、枠は1つしか減らない', async () => {
    const a = okStart(await start(runIdOf(1)))
    const b = okStart(await start(runIdOf(1)))
    expect(b.reused).toBe(true)
    expect(b.ticket).toEqual(a.ticket)
    expect(b.attemptsUsed).toBe(1)
    expect(store.tickets).toHaveLength(1)
  })

  it('別の clientRunId で start：前の open ticket は放棄（消費）され、新しい枠が出る', async () => {
    const a = okStart(await start(runIdOf(1)))
    const b = okStart(await start(runIdOf(2)))
    expect(b.abandoned).toBe(a.ticket.clientRunId)
    expect(b.ticket.attemptNo).toBe(2)
    // 放棄した run を後から submit しても通らない
    expect(await submit(runIdOf(1))).toEqual({ ok: false, code: 'TICKET_CLOSED' })
    expect((await submit(runIdOf(2))).ok).toBe(true)
  })

  it('枠が残っていないときの新規 start は open ticket を放棄しない（resume できる）', async () => {
    okStart(await start(runIdOf(1)))
    await submit(runIdOf(1))
    okStart(await start(runIdOf(2)))
    await submit(runIdOf(2))
    const third = okStart(await start(runIdOf(3)))
    expect(await start(runIdOf(4))).toEqual({ ok: false, code: 'ATTEMPTS_EXCEEDED' })
    const again = okStart(await start(runIdOf(3)))
    expect(again.state).toBe('open')
    expect(again.ticket).toEqual(third.ticket)
    expect((await submit(runIdOf(3))).ok).toBe(true)
  })
})

describe('S3 並列start（同時刻に複数リクエスト）', () => {
  for (const n of [2, 3, 5, 10]) {
    it(`同じ clientRunId ×${n} 並列（通信断後のretry嵐）：ticket は1枚、全員同じ ticket を受け取る`, async () => {
      const racy = new RacyStore()
      const results = await Promise.all(
        Array.from({ length: n }, () =>
          startRun(
            { playerId: me.playerId, playerSecret: me.secret, clientRunId: runIdOf('same') },
            { store: racy, now: NOON, rulesVersion: V1 },
          ),
        ),
      )
      const oks = results.map(okStart)
      expect(racy.tickets).toHaveLength(1)
      expect(new Set(oks.map((r) => r.ticket.clientRunId)).size).toBe(1)
      expect(oks.every((r) => r.ticket.attemptNo === 1)).toBe(true)
    })

    it(`異なる clientRunId ×${n} 並列（多重クリック）：ticket は1枚に畳まれ、全員同じ ticket を受け取る`, async () => {
      const racy = new RacyStore()
      const results = await Promise.all(
        Array.from({ length: n }, (_, i) =>
          startRun(
            { playerId: me.playerId, playerSecret: me.secret, clientRunId: runIdOf(`click-${i}`) },
            { store: racy, now: NOON, rulesVersion: V1 },
          ),
        ),
      )
      const oks = results.map(okStart)
      const live = racy.tickets.filter((t) => !t.closedReason)
      expect(live, '生きている ticket は常に1枚').toHaveLength(1)
      expect(new Set(oks.map((r) => r.ticket.clientRunId)).size, '全応答が同じ ticket').toBe(1)
      // 畳まれた結果、消費された枠は1つだけ
      expect(racy.tickets.filter((t) => t.closedReason !== 'voided')).toHaveLength(1)
    })
  }
})

describe('S4 reload / resume / 通信断', () => {
  it('reload：同じ clientRunId で start し直すと open のまま同じ ticket が返り、submit できる', async () => {
    const a = okStart(await start(runIdOf(1)))
    const b = okStart(await start(runIdOf(1), NOON + 5 * MIN))
    expect(b.state).toBe('open')
    expect(b.ticket).toEqual(a.ticket)
    expect((await submit(runIdOf(1), NOON + 6 * MIN)).ok).toBe(true)
  })

  it('resume：TTL内の中断→再開→submit は通る。TTLを過ぎた resume は期限切れ', async () => {
    okStart(await start(runIdOf(1)))
    const within = okStart(await start(runIdOf(1), NOON + (PROPOSED.ticketTtlMinutes - 1) * MIN))
    expect(within.state).toBe('open')
    expect((await submit(runIdOf(1), NOON + (PROPOSED.ticketTtlMinutes - 1) * MIN)).ok).toBe(true)

    okStart(await start(runIdOf(2), NOON))
    const late = okStart(await start(runIdOf(2), NOON + (PROPOSED.ticketTtlMinutes + 1) * MIN))
    expect(late.state).toBe('expired')
    expect(await submit(runIdOf(2), NOON + (PROPOSED.ticketTtlMinutes + 1) * MIN)).toEqual({
      ok: false,
      code: 'TICKET_EXPIRED',
    })
  })

  it('通信断（startの応答が届かなかった）：同じ clientRunId で retry すれば同じ枠。枠は増えない', async () => {
    const first = okStart(await start(runIdOf(1)))
    // 応答を失ったクライアントが同じ ID で再送
    const retry = okStart(await start(runIdOf(1), NOON + MIN))
    expect(retry.reused).toBe(true)
    expect(retry.ticket.attemptNo).toBe(first.ticket.attemptNo)
    expect(retry.attemptsUsed).toBe(1)
  })

  it('通信断（submitの応答が届かなかった）：再送は duplicate で受理され、保存は増えない', async () => {
    okStart(await start(runIdOf(1)))
    const a = await submit(runIdOf(1))
    const b = await submit(runIdOf(1), NOON + MIN)
    expect(a.ok && a.accepted).toBe('stored')
    expect(b.ok && b.accepted).toBe('duplicate')
    expect(store.runs).toHaveLength(1)
    // 期限が切れたあとの再送でも、受理済みなら duplicate（枠も失わない）
    const c = await submit(runIdOf(1), NOON + (PROPOSED.ticketTtlMinutes + 10) * MIN)
    expect(c.ok && c.accepted).toBe('duplicate')
  })

  it('同じ ticket への並列 submit：保存は1件、片方は duplicate', async () => {
    const racy = new RacyStore()
    await startRun(
      { playerId: me.playerId, playerSecret: me.secret, clientRunId: runIdOf(1) },
      { store: racy, now: NOON, rulesVersion: V1 },
    )
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        submitRun(
          {
            playerId: me.playerId,
            playerSecret: me.secret,
            clientRunId: runIdOf(1),
            input: { dailyKey: DAY, payload: 'same' },
          },
          { store: racy, now: NOON, rulesVersion: V1 },
        ),
      ),
    )
    expect(results.every((r) => r.ok)).toBe(true)
    expect(results.filter((r) => r.ok && r.accepted === 'stored')).toHaveLength(1)
    expect(racy.runs).toHaveLength(1)
  })

  it('submit retry で中身を差し替えても通らない（RUN_ID_CONFLICT）', async () => {
    okStart(await start(runIdOf(1)))
    await submit(runIdOf(1), NOON, me, DAY, 'original')
    expect(await submit(runIdOf(1), NOON, me, DAY, 'tampered')).toEqual({ ok: false, code: 'RUN_ID_CONFLICT' })
  })
})

describe('S5 期限切れ ticket', () => {
  it('期限切れは枠を消費する（再startは次の番号）', async () => {
    okStart(await start(runIdOf(1)))
    const t = NOON + (PROPOSED.ticketTtlMinutes + 1) * MIN
    expect(await submit(runIdOf(1), t)).toEqual({ ok: false, code: 'TICKET_EXPIRED' })
    const next = okStart(await start(runIdOf(2), t))
    expect(next.ticket.attemptNo).toBe(2)
    expect(next.abandoned, '期限切れは open ではないので放棄処理は起きない').toBeNull()
  })
})

describe('S6 日付跨ぎ（PSF-4）', () => {
  /** 2026-09-09 23:59 JST */
  const T2359 = Date.parse('2026-09-09T14:59:00Z')
  const T0001 = T2359 + 2 * MIN
  const T0020 = T2359 + 21 * MIN

  it('23:59 に start した ticket は前日の dailyKey を持ち、期限は 翌日 00:00 + grace', async () => {
    const s = okStart(await start(runIdOf(1), T2359))
    expect(s.ticket.dailyKey).toBe('2026-09-09')
    expect(s.ticket.expiresAt).toBe(dayEndOf('2026-09-09') + PROPOSED.dayEndGraceMinutes * MIN)
    expect(s.ticket.expiresAt).toBeLessThan(T2359 + PROPOSED.ticketTtlMinutes * MIN)
  })

  it('00:01 の submit は前日のボードに入る。grace を過ぎた 00:20 は期限切れ', async () => {
    okStart(await start(runIdOf(1), T2359))
    const r = await submit(runIdOf(1), T0001, me, '2026-09-09')
    expect(r.ok && r.accepted).toBe('stored')
    expect(store.runs[0].dailyKey).toBe('2026-09-09')

    okStart(await start(runIdOf(2), T2359))
    expect(await submit(runIdOf(2), T0020, me, '2026-09-09')).toEqual({ ok: false, code: 'TICKET_EXPIRED' })
  })

  it('00:01 の start は翌日の dailyKey になり、前日の枠とは独立に数える', async () => {
    for (let i = 1; i <= ATTEMPTS_PER_DAY; i++) okStart(await start(runIdOf(`y${i}`), T2359 - 60 * MIN))
    expect(await start(runIdOf('y4'), T2359 - 30 * MIN)).toEqual({ ok: false, code: 'ATTEMPTS_EXCEEDED' })
    const s = okStart(await start(runIdOf('t1'), T0001))
    expect(s.ticket.dailyKey).toBe('2026-09-10')
    expect(s.ticket.attemptNo).toBe(1)
  })

  it('端末時計を偽装して別日の dailyKey を名乗っても ticket と一致せず拒否（書き込み0）', async () => {
    okStart(await start(runIdOf(1)))
    const writes = store.writes
    expect(await submit(runIdOf(1), NOON, me, '2026-09-10')).toEqual({ ok: false, code: 'NO_TICKET' })
    expect(await submit(runIdOf(1), NOON, me, '2026-09-08')).toEqual({ ok: false, code: 'NO_TICKET' })
    expect(store.writes).toBe(writes)
  })
})

describe('S7 同一credential・複数端末', () => {
  it('端末Bが新しい run を start すると端末Aの open ticket は放棄され、Aの submit は通らない', async () => {
    const a = okStart(await start(runIdOf('device-a')))
    const b = okStart(await start(runIdOf('device-b'), NOON + MIN))
    expect(b.abandoned).toBe(a.ticket.clientRunId)
    expect(await submit(runIdOf('device-a'), NOON + 5 * MIN)).toEqual({ ok: false, code: 'TICKET_CLOSED' })
    expect((await submit(runIdOf('device-b'), NOON + 5 * MIN)).ok).toBe(true)
    expect(store.tickets.filter((t) => t.closedReason !== 'voided')).toHaveLength(2)
  })

  it('端末Bが同じ clientRunId を知っていれば同じ ticket を共有できる（Aの盤面を引き継ぐ想定）', async () => {
    const a = okStart(await start(runIdOf('shared')))
    const b = okStart(await start(runIdOf('shared'), NOON + MIN))
    expect(b.ticket).toEqual(a.ticket)
    expect(store.tickets).toHaveLength(1)
  })
})

describe('S8 PSF-1 身元', () => {
  it('secret が違えば start も submit も BAD_IDENTITY（書き込み0）', async () => {
    const impostor = { playerId: me.playerId, secret: createIdentity().secret }
    const writes = store.writes
    expect(await start(runIdOf(1), NOON, impostor)).toEqual({ ok: false, code: 'BAD_IDENTITY' })
    expect(await submit(runIdOf(1), NOON, impostor)).toEqual({ ok: false, code: 'BAD_IDENTITY' })
    expect(store.writes).toBe(writes)
  })

  it('他人の clientRunId を自分の身元で名乗っても通らない', async () => {
    const other = createIdentity()
    okStart(await start(runIdOf('theirs'), NOON, other))
    expect(await start(runIdOf('theirs'), NOON, me)).toEqual({ ok: false, code: 'BAD_IDENTITY' })
    expect(await submit(runIdOf('theirs'), NOON, me)).toEqual({ ok: false, code: 'BAD_IDENTITY' })
  })

  it('公開 playerId だけを知っていても（リーダーボードに載る値）他人の枠は消費できない', async () => {
    const victim = createIdentity()
    okStart(await start(runIdOf('v1'), NOON, victim))
    const attacker = { playerId: victim.playerId, secret: createIdentity().secret }
    for (let i = 0; i < 10; i++) {
      expect(await start(runIdOf(`atk-${i}`), NOON, attacker)).toEqual({ ok: false, code: 'BAD_IDENTITY' })
    }
    expect(store.tickets.filter((t) => t.playerId === victim.playerId)).toHaveLength(1)
    expect(store.tickets[0].closedReason).toBeNull()
  })

  it('【残余リスク】identity を量産すれば枠も量産できる（ログイン無しでは原理的に防げない）', async () => {
    const ids = Array.from({ length: 20 }, () => createIdentity())
    for (const id of ids) okStart(await start(runIdOf(id.playerId), NOON, id))
    expect(store.tickets).toHaveLength(20)
    // 1 identity ＝ 1 write（players行）＋1 write（ticket）。IP/JA4 単位の edge rate limit が唯一の緩和策
  })
})

describe('S9 PSF-3 rulesVersion', () => {
  it('その日の最初の ticket が rulesVersion を固定し、deploy 後の start は拒否される', async () => {
    okStart(await start(runIdOf(1), NOON, me, 'v1'))
    expect(await start(runIdOf(2), NOON + MIN, me, 'v2')).toEqual({ ok: false, code: 'RULES_VERSION_LOCKED' })
    // 翌日は新しい版で普通に始まる
    const next = okStart(await start(runIdOf(3), NOON + 24 * 60 * MIN, me, 'v2'))
    expect(next.ticket.rulesVersion).toBe('v2')
  })

  it('deploy を跨いだ open ticket の submit は不受理、ただし枠は返還される（void）', async () => {
    okStart(await start(runIdOf(1), NOON, me, 'v1'))
    const r = await submit(runIdOf(1), NOON + 5 * MIN, me, DAY, 'x', 'v2')
    expect(r).toEqual({ ok: false, code: 'RULES_VERSION_MISMATCH', refunded: true })
    expect(store.tickets[0].closedReason).toBe('voided')
    // rollback で v1 に戻った場合、返還された番号 1 が再利用できる
    const again = okStart(await start(runIdOf(2), NOON + 10 * MIN, me, 'v1'))
    expect(again.ticket.attemptNo).toBe(1)
    expect(again.attemptsUsed).toBe(1)
  })

  it('保存済み run には検証時の rulesVersion が残る', async () => {
    okStart(await start(runIdOf(1)))
    await submit(runIdOf(1))
    expect(store.runs[0].rulesVersion).toBe(V1)
  })
})

describe('S10 PSF-5 書き込み量（Neon Free 保護）', () => {
  it('ticket を持たない submit は何件来ても DB に書かない', async () => {
    const writes = store.writes
    for (let i = 0; i < 200; i++) {
      const id = createIdentity()
      const r = await submit(runIdOf(i), NOON, id)
      expect(r).toEqual({ ok: false, code: 'NO_TICKET' })
    }
    expect(store.writes).toBe(writes)
  })

  it('ticket 保持者の不正リプレイ連打は maxSubmitAttemptsPerDay で止まり、run は1件も入らない', async () => {
    okStart(await start(runIdOf(1)))
    let rejected = 0
    let limited = 0
    for (let i = 0; i < MAX_SUBMIT_ATTEMPTS_PER_DAY + 5; i++) {
      const r = await submit(runIdOf(1), NOON, me, DAY, `bad-${i}`)
      if (!r.ok && r.code === 'REPLAY_REJECTED') rejected++
      if (!r.ok && r.code === 'RATE_LIMITED') limited++
    }
    expect(rejected).toBe(MAX_SUBMIT_ATTEMPTS_PER_DAY)
    expect(limited).toBe(5)
    expect(store.runs).toHaveLength(0)
  })

  it('正当な1日（3 start ＋ 3 submit）の書き込みは高々 1＋3×2 回', async () => {
    store.clear()
    for (let i = 1; i <= ATTEMPTS_PER_DAY; i++) {
      okStart(await start(runIdOf(i)))
      await submit(runIdOf(i))
    }
    // lockDayRules 1 + insertTicket 3 + recordSubmitAttempt 3 + insertRun 3
    expect(store.writes).toBe(1 + ATTEMPTS_PER_DAY * 3)
  })
})

describe('状態機械の網羅', () => {
  it('open / submitted / expired / abandoned / voided の5状態しか存在しない', async () => {
    okStart(await start(runIdOf('open')))
    okStart(await start(runIdOf('sub'), NOON + MIN)) // open を放棄 → abandoned
    await submit(runIdOf('sub'), NOON + 2 * MIN)
    okStart(await start(runIdOf('exp'), NOON + 3 * MIN))
    const late = NOON + (PROPOSED.ticketTtlMinutes + 5) * MIN
    const states = store.tickets.map((t) =>
      ticketStateOf(t, store.runs.some((r) => r.clientRunId === t.clientRunId), late),
    )
    expect(states).toEqual(['abandoned', 'submitted', 'expired'])
    // voided は deploy 跨ぎでのみ発生する
    const fresh = new MemoryTicketStore()
    await startRun(
      { playerId: me.playerId, playerSecret: me.secret, clientRunId: runIdOf('void') },
      { store: fresh, now: NOON, rulesVersion: 'v1' },
    )
    await submitRun(
      { playerId: me.playerId, playerSecret: me.secret, clientRunId: runIdOf('void'), input: { dailyKey: DAY, payload: 'x' } },
      { store: fresh, now: NOON, rulesVersion: 'v2' },
    )
    expect(ticketStateOf(fresh.tickets[0], false, NOON)).toBe('voided')
  })
})

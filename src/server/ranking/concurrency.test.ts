import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { RULES } from '../../core/data/rules'
import { GOD_IDS } from '../../core/data/gods'
import { dailyKeyOf } from '../../core/data/dailyBoss'
import { getRecommendedDeck } from '../../core/data/deckBuilder'
import { toReplayInput } from '../../core/replay'
import { playRecordedDailyRun } from '../../core/replay/replayTestUtils'
import { buildRankingSchemaSql, ATTEMPTS_PER_DAY } from './schema'
import { createMemoryRankingStore, type RankingStore } from './store'
import { startRun } from './start'
import { submitRun } from './submit'
import { makeIdentity, runId, type TestIdentity } from './rankingTestUtils'
import type { SubmitRequest } from './types'

/**
 * Phase 4.4 Step 4・6 ／ Phase 4.6：同時アクセスでも不変条件が壊れないこと。
 *
 * ★何をどう検証しているか（正直に）
 * この検証は**実DBではなくメモリ実装**の上で行っている。ただし検証している性質は
 * 実装非依存で意味がある：
 *
 *   「判定は『読んでから書く』の隙間に依存せず、**挿入の戻り値が最終権限**になっている」
 *
 * これを確かめるために、**事前の読み取り直後に必ず割り込みが入る**ようストアを包む。
 * もし判定が事前の読み取りに依存していれば、この条件下で必ず上限を超える。
 * 超えないなら判定は挿入側に移っている＝Postgres実装でも
 * CHECK / 部分UNIQUE / PRIMARY KEY が同じ役割を果たす（`schema.ts`）。
 *
 * ★Phase 4.6 で主役が移った
 * 3回制限を守るのは `insertRun` ではなく **`insertTicket`** になった。
 * 枠を消費するのは開始であって提出ではないため（決定139 §4）。
 * `insertRun` は「1つの枠に1件だけ」を守る役に変わっている。
 *
 * 実DB（Neon）での再検証は `postgres.integration.test.ts` が担当し、
 * `RANKING_DATABASE_URL` が設定されているときだけ実行される。
 */

const GOD = GOD_IDS.ebisu
const NOW = Date.parse('2026-09-09T03:00:00Z')
const DAILY_KEY = dailyKeyOf(new Date(NOW))

let me: TestIdentity
let others: TestIdentity[]

beforeAll(async () => {
  me = await makeIdentity('conc-me')
  others = [await makeIdentity('conc-a'), await makeIdentity('conc-b'), await makeIdentity('conc-c')]
})

let seq = 0
function makeRequest(identity: TestIdentity, clientRunId?: string): SubmitRequest {
  seq++
  const run = playRecordedDailyRun({
    dailyKey: DAILY_KEY,
    godId: GOD,
    deck: getRecommendedDeck(GOD),
    policySeed: seq,
    clientRunId: 'c'.repeat(32),
  })
  return {
    playerId: identity.playerId,
    playerSecret: identity.playerSecret,
    clientRunId: clientRunId ?? runId(seq),
    input: toReplayInput(run.log),
  }
}

/**
 * 「事前の読み取りの直後に他のリクエストが割り込む」状況を必ず作るラッパー。
 *
 * 判定に使う読み取り（`listTickets` / `listPlayerRuns` / `findTicket` / `findRun`）の
 * あとにマイクロタスクを挟むことで、並行して走っている別の処理が必ずその隙間に入り込む。
 * `insertTicket` / `insertRun` 自体は包まない（実DBの1文INSERTと同じく不可分のまま）。
 */
function withRaceWindow(store: RankingStore, yields = 5): RankingStore {
  const gap = async () => {
    for (let i = 0; i < yields; i++) await Promise.resolve()
  }
  return {
    ...store,
    async listTickets(dailyKey, playerId) {
      const result = await store.listTickets(dailyKey, playerId)
      await gap()
      return result
    },
    async listPlayerRuns(dailyKey, playerId) {
      const result = await store.listPlayerRuns(dailyKey, playerId)
      await gap()
      return result
    },
    async findTicket(dailyKey, clientRunId) {
      const result = await store.findTicket(dailyKey, clientRunId)
      await gap()
      return result
    },
    async findRun(dailyKey, clientRunId) {
      const result = await store.findRun(dailyKey, clientRunId)
      await gap()
      return result
    },
  }
}

const base = createMemoryRankingStore()

beforeEach(() => {
  base.clear()
  seq = 0
})

describe('スキーマがDB側で不変条件を保証している', () => {
  it('ticketのCHECKと部分UNIQUEで1日3枠を超えられない', () => {
    const ddl = buildRankingSchemaSql()
    expect(ddl).toContain(`CHECK (attempt_no BETWEEN 1 AND ${RULES.daily.attemptsPerDay})`)
    expect(ddl).toContain('daily_tickets_attempt_unique')
    expect(ddl).toContain("WHERE closed_reason IS DISTINCT FROM 'voided'")
    expect(ddl).toContain('CONSTRAINT daily_tickets_pkey PRIMARY KEY (daily_key, client_run_id)')
  })

  it('runは必ずticketに紐づく（提出だけで枠を作れない）', () => {
    const ddl = buildRankingSchemaSql()
    expect(ddl).toContain('CONSTRAINT daily_runs_ticket_fk FOREIGN KEY (daily_key, client_run_id)')
    expect(ddl).toContain('REFERENCES daily_tickets (daily_key, client_run_id)')
    expect(ddl).toContain('CONSTRAINT daily_runs_attempt_unique UNIQUE (daily_key, player_id, attempt_no)')
    expect(ddl).toContain('CONSTRAINT daily_runs_pkey PRIMARY KEY (daily_key, client_run_id)')
  })

  it('上限の数値は RULES から生成される（DDLに直書きしない）', () => {
    expect(ATTEMPTS_PER_DAY).toBe(RULES.daily.attemptsPerDay)
    expect(buildRankingSchemaSql()).toContain(`1 AND ${RULES.daily.attemptsPerDay}`)
  })

  it('テーブルは players / daily_days / daily_tickets / daily_runs の4つだけ', () => {
    const tables = [...buildRankingSchemaSql().matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map(
      (m) => m[1],
    )
    expect(tables.sort()).toEqual(['daily_days', 'daily_runs', 'daily_tickets', 'players'])
  })

  it('個人情報・秘密の列を持たない', () => {
    const ddl = buildRankingSchemaSql().toLowerCase()
    for (const forbidden of [
      'email',
      'name',
      'ip_',
      'ip ',
      'user_agent',
      'cookie',
      'fingerprint',
      'secret',
      'password',
    ]) {
      expect(ddl, `列に ${forbidden} が含まれている`).not.toContain(forbidden)
    }
  })
})

describe('同時開始（Phase 4.6：枠の予約が競合しても壊れない）', () => {
  for (const parallel of [2, 3, 4, 5, 10]) {
    it(`異なるclientRunId ${parallel}並列でも、進行中のticketは常に1枚・枠は上限を超えない`, async () => {
      const store = withRaceWindow(base)
      const results = await Promise.all(
        Array.from({ length: parallel }, (_, i) =>
          startRun({ ...me, clientRunId: runId(`click-${i}`) }, { store, now: NOW }),
        ),
      )

      const tickets = await base.listTickets(DAILY_KEY, me.playerId)
      const live = tickets.filter((t) => t.closedReason === null)
      // ★不変条件1：進行中の挑戦は identity につき常に1つ
      expect(live.length, '進行中のticketが複数ある').toBe(1)
      // ★不変条件2：どれだけ並列に来ても枠は上限を超えない
      expect(tickets.filter((t) => t.closedReason !== 'voided').length).toBeLessThanOrEqual(
        ATTEMPTS_PER_DAY,
      )
      // 上限を超えたぶんは拒否されている（黙って枠を増やさない）
      for (const r of results) {
        if (!r.ok) expect(r.code).toBe('ATTEMPTS_EXCEEDED')
      }
      // 進行中でない ticket は必ず放棄済み（宙に浮いた ticket が残らない）
      for (const t of tickets) {
        if (t.clientRunId !== live[0].clientRunId) expect(t.closedReason).toBe('abandoned')
      }
    })

    it(`同じclientRunId ${parallel}並列（通信断後の再送嵐）でもticketは1枚`, async () => {
      const store = withRaceWindow(base)
      const results = await Promise.all(
        Array.from({ length: parallel }, () =>
          startRun({ ...me, clientRunId: runId('same') }, { store, now: NOW }),
        ),
      )
      expect(results.every((r) => r.ok)).toBe(true)
      expect((await base.listTickets(DAILY_KEY, me.playerId)).length).toBe(1)
      expect(results.every((r) => r.ok && r.ticket.attemptNo === 1)).toBe(true)
    })
  }

  it('順番に開始し直しても4枠目は取れない（事前判定に依存していない）', async () => {
    const store = withRaceWindow(base, 50)
    for (let i = 0; i < ATTEMPTS_PER_DAY; i++) {
      const started = await startRun({ ...me, clientRunId: runId(`seq-${i}`) }, { store, now: NOW })
      expect(started.ok, `${i + 1}回目`).toBe(true)
    }
    const fourth = await startRun({ ...me, clientRunId: runId('seq-4') }, { store, now: NOW })
    expect(fourth.ok).toBe(false)
    if (!fourth.ok) expect(fourth.code).toBe('ATTEMPTS_EXCEEDED')
    expect((await base.listTickets(DAILY_KEY, me.playerId)).length).toBe(ATTEMPTS_PER_DAY)
  })

  it('別プレイヤーの同時開始は互いに影響しない', async () => {
    const store = withRaceWindow(base)
    await Promise.all(
      others.flatMap((identity) =>
        Array.from({ length: 5 }, (_, i) =>
          startRun({ ...identity, clientRunId: runId(`${identity.playerId}-${i}`) }, { store, now: NOW }),
        ),
      ),
    )
    for (const identity of others) {
      const tickets = await base.listTickets(DAILY_KEY, identity.playerId)
      expect(tickets.filter((t) => t.closedReason === null).length).toBe(1)
      expect(tickets.length).toBeLessThanOrEqual(ATTEMPTS_PER_DAY)
    }
  })
})

describe('同時提出（Step 4：1つの枠に1件だけ）', () => {
  it('同じticketへ6並列で提出しても保存は1件、片方以外はduplicate', async () => {
    const store = withRaceWindow(base)
    const request = makeRequest(me, runId('one'))
    await startRun({ ...me, clientRunId: request.clientRunId }, { store, now: NOW })

    const results = await Promise.all(
      Array.from({ length: 6 }, () => submitRun(request, { store, now: NOW })),
    )
    const stored = await base.listPlayerRuns(DAILY_KEY, me.playerId)
    expect(stored.length).toBe(1)
    expect(results.every((r) => r.ok)).toBe(true)
    expect(results.filter((r) => r.ok && r.accepted === 'stored').length).toBe(1)
  })

  it('start→submit を3回まわしても保存は3件、番号は ticket が決めた 1/2/3', async () => {
    const store = withRaceWindow(base)
    const requests: SubmitRequest[] = []
    for (let i = 0; i < ATTEMPTS_PER_DAY; i++) {
      // ★1つの挑戦を提出してから次を始める。提出せずに次を始めると前の枠は放棄される
      const request = makeRequest(me, runId(`slot-${i}`))
      await startRun({ ...me, clientRunId: request.clientRunId }, { store, now: NOW })
      expect((await submitRun(request, { store, now: NOW })).ok, `${i + 1}回目`).toBe(true)
      requests.push(request)
    }
    const stored = await base.listPlayerRuns(DAILY_KEY, me.playerId)
    expect(stored.length).toBe(ATTEMPTS_PER_DAY)
    expect(stored.map((s) => s.attemptNo).sort()).toEqual([1, 2, 3])
    expect(new Set(stored.map((s) => s.clientRunId)).size).toBe(stored.length)

    // 3件すべてを同時に再送しても増えない（全部 duplicate）
    const again = await Promise.all(requests.map((r) => submitRun(r, { store, now: NOW })))
    expect(again.every((r) => r.ok && r.accepted === 'duplicate')).toBe(true)
    expect((await base.listPlayerRuns(DAILY_KEY, me.playerId)).length).toBe(ATTEMPTS_PER_DAY)
  })
})

describe('3回制限（Step 6）', () => {
  it('1回目PASS / 2回目PASS / 3回目PASS / 4回目REJECT', async () => {
    for (let i = 1; i <= ATTEMPTS_PER_DAY; i++) {
      const request = makeRequest(me, runId(`n-${i}`))
      const started = await startRun(
        { ...me, clientRunId: request.clientRunId },
        { store: base, now: NOW },
      )
      expect(started.ok, `${i}回目の開始`).toBe(true)
      if (started.ok) expect(started.ticket.attemptNo).toBe(i)

      const result = await submitRun(request, { store: base, now: NOW })
      expect(result.ok, `${i}回目の提出`).toBe(true)
      if (result.ok) {
        expect(result.accepted).toBe('stored')
        expect(result.runsUsed).toBe(i)
      }
    }
    const fourth = await startRun({ ...me, clientRunId: runId('n-4') }, { store: base, now: NOW })
    expect(fourth.ok).toBe(false)
    if (!fourth.ok) expect(fourth.code).toBe('ATTEMPTS_EXCEEDED')
    expect((await base.listPlayerRuns(DAILY_KEY, me.playerId)).length).toBe(ATTEMPTS_PER_DAY)
  })

  it('使い切ったあとの再送（既存run）は受理され続ける＝枠を余分に消費しない', async () => {
    const requests: SubmitRequest[] = []
    for (let i = 0; i < ATTEMPTS_PER_DAY; i++) {
      const request = makeRequest(me, runId(`r-${i}`))
      await startRun({ ...me, clientRunId: request.clientRunId }, { store: base, now: NOW })
      expect((await submitRun(request, { store: base, now: NOW })).ok).toBe(true)
      requests.push(request)
    }
    const retry = await submitRun(requests[0], { store: base, now: NOW })
    expect(retry.ok).toBe(true)
    if (retry.ok) expect(retry.accepted).toBe('duplicate')
    expect((await base.listPlayerRuns(DAILY_KEY, me.playerId)).length).toBe(ATTEMPTS_PER_DAY)
  })
})

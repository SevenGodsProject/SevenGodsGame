import { beforeEach, describe, expect, it } from 'vitest'
import { RULES } from '../../core/data/rules'
import { GOD_IDS } from '../../core/data/gods'
import { dailyKeyOf } from '../../core/data/dailyBoss'
import { getRecommendedDeck } from '../../core/data/deckBuilder'
import { toReplayInput } from '../../core/replay'
import { playRecordedDailyRun } from '../../core/replay/replayTestUtils'
import { buildRankingSchemaSql, ATTEMPTS_PER_DAY } from './schema'
import { createMemoryRankingStore, type RankingStore } from './store'
import { submitRun } from './submit'
import type { SubmitRequest } from './types'

/**
 * Phase 4.4 Step 4・6：同時提出でも1日3runを超えないこと（Known Risk #3 の解消）。
 *
 * ★何をどう検証しているか（正直に）
 * この検証は**実DBではなくメモリ実装**の上で行っている（Neonの接続情報がまだ無いため。
 * 最終報告の Step 1 を参照）。ただし検証している性質は実装非依存で意味がある：
 *
 *   「`submitRun` は事前のcountに依存せず、`insertRun` の戻り値を最終権限にしている」
 *
 * これを確かめるために、**事前countの直後に必ず割り込みが入る**ようストアを包む。
 * もし上限判定が事前countに依存していれば、この条件下で必ず4件以上入る。
 * 入らないなら、判定は挿入側に移っている＝Postgres実装でも
 * CHECK / UNIQUE 制約が同じ役割を果たす（`schema.ts`）。
 *
 * 実DB（Neon）での再検証は `postgres.integration.test.ts` が担当し、
 * `RANKING_DATABASE_URL` が設定されているときだけ実行される。
 */

const GOD = GOD_IDS.ebisu
const NOW = Date.parse('2026-09-09T03:00:00Z')
const DAILY_KEY = dailyKeyOf(new Date(NOW))
const PLAYER = 'a'.repeat(32)

let seq = 0
function makeRequest(playerId = PLAYER): SubmitRequest {
  seq++
  const run = playRecordedDailyRun({
    dailyKey: DAILY_KEY,
    godId: GOD,
    deck: getRecommendedDeck(GOD),
    policySeed: seq,
    clientRunId: 'c'.repeat(32),
  })
  return {
    playerId,
    clientRunId: String(seq).padStart(32, '0'),
    input: toReplayInput(run.log),
  }
}

/**
 * 「事前countの直後に他の提出が割り込む」状況を必ず作るラッパー。
 *
 * `listPlayerRuns`（事前判定に使う読み取り）のあとにマイクロタスクを挟むことで、
 * 並行して走っている別の `submitRun` が必ずその隙間に入り込む。
 * `insertRun` 自体は包まない（実DBの1文INSERTと同じく不可分のまま）。
 */
function withRaceWindow(store: RankingStore, yields = 5): RankingStore {
  return {
    ...store,
    async listPlayerRuns(dailyKey, playerId) {
      const result = await store.listPlayerRuns(dailyKey, playerId)
      for (let i = 0; i < yields; i++) await Promise.resolve()
      return result
    },
  }
}

const base = createMemoryRankingStore()

beforeEach(() => {
  base.clear()
  seq = 0
})

describe('スキーマがDB側で上限を保証している', () => {
  it('CHECK と UNIQUE の組み合わせで1日3runを超えられない', () => {
    const ddl = buildRankingSchemaSql()
    expect(ddl).toContain(`CHECK (attempt_no BETWEEN 1 AND ${RULES.daily.attemptsPerDay})`)
    expect(ddl).toContain('UNIQUE (daily_key, player_id, attempt_no)')
    expect(ddl).toContain('PRIMARY KEY (daily_key, client_run_id)')
  })

  it('上限の数値は RULES から生成される（DDLに直書きしない）', () => {
    expect(ATTEMPTS_PER_DAY).toBe(RULES.daily.attemptsPerDay)
    expect(buildRankingSchemaSql()).toContain(`1 AND ${RULES.daily.attemptsPerDay}`)
  })

  it('テーブルは players と daily_runs の2つだけ', () => {
    const tables = [...buildRankingSchemaSql().matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map(
      (m) => m[1],
    )
    expect(tables.sort()).toEqual(['daily_runs', 'players'])
  })

  it('個人情報の列を持たない', () => {
    const ddl = buildRankingSchemaSql().toLowerCase()
    for (const forbidden of ['email', 'name', 'ip_', 'ip ', 'user_agent', 'cookie', 'fingerprint']) {
      expect(ddl, `列に ${forbidden} が含まれている`).not.toContain(forbidden)
    }
  })
})

describe('同時提出（Step 4）', () => {
  for (const parallel of [2, 3, 4, 10]) {
    it(`${parallel}並列で提出しても、保存は最大${ATTEMPTS_PER_DAY}件を超えない`, async () => {
      const store = withRaceWindow(base)
      const requests = Array.from({ length: parallel }, () => makeRequest())

      const results = await Promise.all(
        requests.map((request) => submitRun(request, { store, now: NOW })),
      )

      const stored = await base.listPlayerRuns(DAILY_KEY, PLAYER)
      expect(stored.length, `${parallel}並列で${stored.length}件入った`).toBeLessThanOrEqual(
        ATTEMPTS_PER_DAY,
      )
      expect(stored.length).toBe(Math.min(parallel, ATTEMPTS_PER_DAY))

      const accepted = results.filter((r) => r.ok)
      const rejected = results.filter((r) => !r.ok)
      expect(accepted.length).toBe(Math.min(parallel, ATTEMPTS_PER_DAY))
      for (const r of rejected) {
        if (!r.ok) expect(r.code).toBe('ATTEMPTS_EXCEEDED')
      }
      // 受理されたrunはすべて別物（同じrunが二重に数えられていない）
      expect(new Set(stored.map((s) => s.clientRunId)).size).toBe(stored.length)
    })
  }

  it('事前countに依存していない（割り込みを最大化しても4件目が入らない）', async () => {
    const store = withRaceWindow(base, 50)
    const requests = Array.from({ length: 8 }, () => makeRequest())
    await Promise.all(requests.map((request) => submitRun(request, { store, now: NOW })))
    expect((await base.listPlayerRuns(DAILY_KEY, PLAYER)).length).toBe(ATTEMPTS_PER_DAY)
  })

  it('別プレイヤーの同時提出は互いに影響しない', async () => {
    const store = withRaceWindow(base)
    const players = ['a', 'b', 'c'].map((c) => c.repeat(32))
    await Promise.all(
      players.flatMap((playerId) =>
        Array.from({ length: 5 }, () => submitRun(makeRequest(playerId), { store, now: NOW })),
      ),
    )
    for (const playerId of players) {
      expect((await base.listPlayerRuns(DAILY_KEY, playerId)).length).toBe(ATTEMPTS_PER_DAY)
    }
    expect((await base.listDayRuns(DAILY_KEY)).length).toBe(players.length * ATTEMPTS_PER_DAY)
  })

  it('同じclientRunIdを同時に送っても1件しか入らない', async () => {
    const store = withRaceWindow(base)
    const request = makeRequest()
    const results = await Promise.all(
      Array.from({ length: 6 }, () => submitRun(request, { store, now: NOW })),
    )
    const stored = await base.listPlayerRuns(DAILY_KEY, PLAYER)
    expect(stored.length).toBe(1)
    // すべて成功として返るが、保存されたのは1件（冪等）
    expect(results.every((r) => r.ok)).toBe(true)
    expect(results.filter((r) => r.ok && r.accepted === 'stored').length).toBe(1)
  })
})

describe('3回制限（Step 6）', () => {
  it('1回目PASS / 2回目PASS / 3回目PASS / 4回目REJECT', async () => {
    const store = base
    for (let i = 1; i <= ATTEMPTS_PER_DAY; i++) {
      const result = await submitRun(makeRequest(), { store, now: NOW })
      expect(result.ok, `${i}回目`).toBe(true)
      if (result.ok) {
        expect(result.accepted).toBe('stored')
        expect(result.runsUsed).toBe(i)
      }
    }
    const fourth = await submitRun(makeRequest(), { store, now: NOW })
    expect(fourth.ok).toBe(false)
    if (!fourth.ok) expect(fourth.code).toBe('ATTEMPTS_EXCEEDED')
    expect((await store.listPlayerRuns(DAILY_KEY, PLAYER)).length).toBe(ATTEMPTS_PER_DAY)
  })

  it('使い切ったあとの再送（既存run）は受理され続ける＝枠を余分に消費しない', async () => {
    const requests = Array.from({ length: ATTEMPTS_PER_DAY }, () => makeRequest())
    for (const request of requests) {
      expect((await submitRun(request, { store: base, now: NOW })).ok).toBe(true)
    }
    // 3回使い切ったあとでも、既に受理済みのrunの再送は通る
    const retry = await submitRun(requests[0], { store: base, now: NOW })
    expect(retry.ok).toBe(true)
    if (retry.ok) expect(retry.accepted).toBe('duplicate')
    expect((await base.listPlayerRuns(DAILY_KEY, PLAYER)).length).toBe(ATTEMPTS_PER_DAY)
  })
})

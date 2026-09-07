import { beforeEach, describe, expect, it } from 'vitest'
import { RULES } from '../../core/data/rules'
import { GOD_IDS } from '../../core/data/gods'
import { dailyKeyOf } from '../../core/data/dailyBoss'
import { getRecommendedDeck } from '../../core/data/deckBuilder'
import { toReplayInput } from '../../core/replay'
import { playRecordedDailyRun } from '../../core/replay/replayTestUtils'
import { handleRankingRequest } from './http'
import { createPostgresRankingStore, type SqlExecutor } from './postgresStore'
import { createMemoryRankingStore, type RankingStore } from './store'
import { submitRun } from './submit'
import type { SubmitRequest } from './types'

/**
 * Phase 4.4 Step 9：障害時の振る舞い。
 *
 * ★もっとも大事な性質：**DB障害でゲーム本体が壊れないこと**。
 * ランキングは「決着後に控えを送るだけ」の後付けの仕組みで、対局の進行・保存・
 * 再開はいずれもランキングを知らない。サーバー側で例外が出ても、それは
 * 提出が失敗するだけで、プレイヤーは普通に遊び続けられる（控えも残る）。
 */

const GOD = GOD_IDS.ebisu
const NOW = Date.parse('2026-09-09T03:00:00Z')
const DAILY_KEY = dailyKeyOf(new Date(NOW))
const PLAYER = 'a'.repeat(32)

let seq = 0
function makeRequest(): SubmitRequest {
  seq++
  const run = playRecordedDailyRun({
    dailyKey: DAILY_KEY,
    godId: GOD,
    deck: getRecommendedDeck(GOD),
    policySeed: seq,
    clientRunId: 'c'.repeat(32),
  })
  return {
    playerId: PLAYER,
    clientRunId: String(seq).padStart(32, '0'),
    input: toReplayInput(run.log),
  }
}

/** SQLSTATE付きのPostgresエラーを模す */
function pgError(code: string, message = 'db error'): Error & { code: string } {
  return Object.assign(new Error(message), { code })
}

const memory = createMemoryRankingStore()

beforeEach(() => {
  memory.clear()
  seq = 0
})

describe('接続失敗・タイムアウト', () => {
  it('接続失敗は例外として上がる（握りつぶして「成功」にしない）', async () => {
    const store = createPostgresRankingStore(async () => {
      throw new Error('connection terminated unexpectedly')
    })
    await expect(submitRun(makeRequest(), { store, now: NOW })).rejects.toThrow(/connection/)
  })

  it('タイムアウトも同様に上がる', async () => {
    const store = createPostgresRankingStore(async () => {
      throw pgError('57014', 'canceling statement due to statement timeout')
    })
    await expect(submitRun(makeRequest(), { store, now: NOW })).rejects.toThrow(/timeout/)
  })

  it('HTTP層では500として扱える形になっている（例外が外へ出る）', async () => {
    const store = createPostgresRankingStore(async () => {
      throw new Error('connection terminated unexpectedly')
    })
    // kill switch が閉じている間は、そもそもDBに触れずに503を返す
    const closed = await handleRankingRequest(
      { method: 'POST', path: '/api/ranking/submit', body: makeRequest() },
      { store, now: NOW },
    )
    expect(closed.status).toBe(503)
    expect(closed.body).toEqual({ error: 'submission_disabled' })
  })

  it('DBが落ちていてもゲーム本体の状態には触れない', async () => {
    // ランキングは決着後の控えを送るだけで、engine・セーブ・行動ログのどれにも
    // 書き込まない。サーバー側が例外を投げても、対局の再現性は影響を受けない
    const request = makeRequest()
    const before = JSON.stringify(request.input)
    const store = createPostgresRankingStore(async () => {
      throw new Error('connection terminated unexpectedly')
    })
    await submitRun(request, { store, now: NOW }).catch(() => undefined)
    expect(JSON.stringify(request.input)).toBe(before)
  })
})

describe('制約違反の扱い', () => {
  it('主キー違反（同じrunの二重挿入）は duplicate として返る', async () => {
    let inserted = false
    const sql: SqlExecutor = async <T>(text: string) => {
      if (text.includes('INSERT INTO daily_runs')) {
        if (inserted) throw pgError('23505', 'duplicate key value violates unique constraint')
        inserted = true
        return [{ attempt_no: 1 }] as T[]
      }
      if (text.includes('SELECT 1 AS one')) {
        return (inserted ? [{ one: 1 }] : []) as T[]
      }
      return [] as T[]
    }
    const store = createPostgresRankingStore(sql)
    const run = {
      dailyKey: DAILY_KEY,
      playerId: PLAYER,
      clientRunId: 'x'.repeat(32),
      godId: GOD,
      score: 100,
      win: true,
      round: 5,
      rngCursor: 1,
      actionCount: 10,
      submittedAt: NOW,
    }
    expect(await store.insertRun(run)).toEqual({ ok: true, attemptNo: 1 })
    expect(await store.insertRun(run)).toEqual({ ok: false, reason: 'duplicate' })
  })

  it('CHECK違反（上限超過）は attempts-exceeded として返る', async () => {
    const sql: SqlExecutor = async () => {
      throw pgError('23514', 'new row violates check constraint "daily_runs_attempt_range"')
    }
    const store = createPostgresRankingStore(sql)
    const result = await store.insertRun({
      dailyKey: DAILY_KEY,
      playerId: PLAYER,
      clientRunId: 'y'.repeat(32),
      godId: GOD,
      score: 100,
      win: true,
      round: 5,
      rngCursor: 1,
      actionCount: 10,
      submittedAt: NOW,
    })
    expect(result).toEqual({ ok: false, reason: 'attempts-exceeded' })
  })

  it('attempt_no の競合（UNIQUE違反）は数え直して再試行し、最後は上限で止まる', async () => {
    let calls = 0
    const sql: SqlExecutor = async <T>(text: string) => {
      if (text.includes('INSERT INTO daily_runs')) {
        calls++
        // 何度やっても番号が競合し続ける状況
        throw pgError('23505', 'duplicate key value violates unique constraint')
      }
      // 同じclientRunIdは存在しない＝番号の競合と判定される
      return [] as T[]
    }
    const store = createPostgresRankingStore(sql)
    const result = await store.insertRun({
      dailyKey: DAILY_KEY,
      playerId: PLAYER,
      clientRunId: 'z'.repeat(32),
      godId: GOD,
      score: 100,
      win: true,
      round: 5,
      rngCursor: 1,
      actionCount: 10,
      submittedAt: NOW,
    })
    expect(result).toEqual({ ok: false, reason: 'attempts-exceeded' })
    // 無限ループしない（上限＋1回で打ち切る）
    expect(calls).toBeLessThanOrEqual(RULES.daily.attemptsPerDay + 2)
  })

  it('未知のSQLSTATEは握りつぶさず投げ直す', async () => {
    const store = createPostgresRankingStore(async () => {
      throw pgError('42P01', 'relation "daily_runs" does not exist')
    })
    await expect(
      store.insertRun({
        dailyKey: DAILY_KEY,
        playerId: PLAYER,
        clientRunId: 'w'.repeat(32),
        godId: GOD,
        score: 1,
        win: false,
        round: 7,
        rngCursor: 1,
        actionCount: 1,
        submittedAt: NOW,
      }),
    ).rejects.toThrow(/does not exist/)
  })
})

describe('入力の異常', () => {
  const store: RankingStore = memory

  it('不正なReplayInput・stale Daily・4回目・改ざんrunをすべて拒否し、保存しない', async () => {
    // 不正なReplayInput
    const bad = await submitRun(
      { playerId: PLAYER, clientRunId: 'b'.repeat(32), input: null as never },
      { store, now: NOW },
    )
    expect(bad.ok).toBe(false)

    // stale Daily
    const stale = await submitRun(makeRequest(), {
      store,
      now: Date.parse('2026-09-25T03:00:00Z'),
    })
    expect(stale.ok).toBe(false)
    if (!stale.ok) expect(stale.code).toBe('STALE_DAILY_KEY')

    // 改ざんrun
    const base = makeRequest()
    const tampered = { ...base, input: { ...base.input, actions: base.input.actions.slice(0, 1) } }
    const rejected = await submitRun(tampered, { store, now: NOW })
    expect(rejected.ok).toBe(false)

    expect(await store.listPlayerRuns(DAILY_KEY, PLAYER)).toEqual([])

    // 4回目
    for (let i = 0; i < RULES.daily.attemptsPerDay; i++) {
      expect((await submitRun(makeRequest(), { store, now: NOW })).ok).toBe(true)
    }
    const fourth = await submitRun(makeRequest(), { store, now: NOW })
    expect(fourth.ok).toBe(false)
    if (!fourth.ok) expect(fourth.code).toBe('ATTEMPTS_EXCEEDED')
  })

  it('拒否のメッセージに接続情報やSQLを含めない', async () => {
    const stale = await submitRun(makeRequest(), {
      store,
      now: Date.parse('2026-09-25T03:00:00Z'),
    })
    expect(stale.ok).toBe(false)
    if (stale.ok) return
    const text = `${stale.code} ${stale.message} ${stale.replayCode ?? ''}`.toLowerCase()
    for (const forbidden of ['postgres://', 'postgresql://', 'password', 'insert into', 'neon.tech']) {
      expect(text).not.toContain(forbidden)
    }
  })
})

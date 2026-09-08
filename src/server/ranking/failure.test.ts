import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { RULES } from '../../core/data/rules'
import { GOD_IDS } from '../../core/data/gods'
import { dailyKeyOf } from '../../core/data/dailyBoss'
import { getRecommendedDeck } from '../../core/data/deckBuilder'
import { getGameVersion, toReplayInput } from '../../core/replay'
import { playRecordedDailyRun } from '../../core/replay/replayTestUtils'
import { handleRankingRequest } from './http'
import { createPostgresRankingStore, type SqlExecutor } from './postgresStore'
import { createMemoryRankingStore, type RankingStore } from './store'
import { startRun } from './start'
import { submitRun } from './submit'
import { issueTicket, makeIdentity, runId, type TestIdentity } from './rankingTestUtils'
import type { RankingRun, SubmitRequest } from './types'

/**
 * Phase 4.4 Step 9 ／ Phase 4.6：障害時の振る舞い。
 *
 * ★もっとも大事な性質：**DB障害でゲーム本体が壊れないこと**。
 * ランキングは「決着後に控えを送るだけ」の後付けの仕組みで、対局の進行・保存・
 * 再開はいずれもランキングを知らない。サーバー側で例外が出ても、それは
 * 提出が失敗するだけで、プレイヤーは普通に遊び続けられる（控えも残る）。
 *
 * ★Phase 4.6 での変更点
 * `insertRun` は番号を数え直さなくなった（番号は ticket が決める）。そのため
 * 「UNIQUE違反で数え直して再試行」というループが無くなり、
 * `attempt-taken` / `duplicate` のどちらかを1回で返す。
 * `daily_runs` 側の CHECK 違反は「ticketが不正な番号を持っていた」ことを意味する
 * 内部矛盾なので、**握りつぶさず投げ直す**（利用者に「回数超過」と嘘をつかない）。
 */

const GOD = GOD_IDS.ebisu
const NOW = Date.parse('2026-09-09T03:00:00Z')
const DAILY_KEY = dailyKeyOf(new Date(NOW))

let me: TestIdentity
beforeAll(async () => {
  me = await makeIdentity('failure-me')
})

let seq = 0
function makeRequest(clientRunId?: string): SubmitRequest {
  seq++
  const run = playRecordedDailyRun({
    dailyKey: DAILY_KEY,
    godId: GOD,
    deck: getRecommendedDeck(GOD),
    policySeed: seq,
    clientRunId: 'c'.repeat(32),
  })
  return {
    playerId: me.playerId,
    playerSecret: me.playerSecret,
    clientRunId: clientRunId ?? runId(seq),
    input: toReplayInput(run.log),
  }
}

/** 枠を取ってから提出リクエストを作る */
async function prepared(store: RankingStore): Promise<SubmitRequest> {
  const request = makeRequest()
  await issueTicket(me, request.clientRunId, { store, now: NOW })
  return request
}

function sampleRun(overrides: Partial<RankingRun> = {}): RankingRun {
  return {
    dailyKey: DAILY_KEY,
    playerId: me.playerId,
    clientRunId: 'x'.repeat(32),
    attemptNo: 1,
    gameVersion: getGameVersion(),
    godId: GOD,
    score: 100,
    win: true,
    round: 5,
    rngCursor: 1,
    actionCount: 10,
    submittedAt: NOW,
    ...overrides,
  }
}

/** SQLSTATE付きのPostgresエラーを模す */
function pgError(code: string, message = 'db error', constraint?: string): Error & { code: string } {
  return Object.assign(new Error(message), { code, ...(constraint ? { constraint } : {}) })
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

  it('開始（start）でDBが落ちていても例外として上がる', async () => {
    const store = createPostgresRankingStore(async () => {
      throw new Error('connection terminated unexpectedly')
    })
    await expect(
      startRun({ ...me, clientRunId: runId('boom') }, { store, now: NOW }),
    ).rejects.toThrow(/connection/)
  })

  it('HTTP層では500として扱える形になっている（例外が外へ出る）', async () => {
    const store = createPostgresRankingStore(async () => {
      throw new Error('connection terminated unexpectedly')
    })
    // kill switch が閉じている間は、そもそもDBに触れずに503を返す
    for (const path of ['/api/ranking/submit', '/api/ranking/start']) {
      const closed = await handleRankingRequest(
        { method: 'POST', path, body: makeRequest() },
        { store, now: NOW },
      )
      expect(closed.status).toBe(503)
      expect(closed.body).toEqual({ error: 'submission_disabled' })
    }
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

describe('制約違反の扱い（run）', () => {
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
    expect(await store.insertRun(sampleRun())).toEqual({ ok: true, attemptNo: 1 })
    expect(await store.insertRun(sampleRun())).toEqual({ ok: false, reason: 'duplicate' })
  })

  it('同じ枠に別のrunが入っていた場合は attempt-taken として返る', async () => {
    const sql: SqlExecutor = async <T>(text: string) => {
      if (text.includes('INSERT INTO daily_runs')) {
        throw pgError('23505', 'duplicate key', 'daily_runs_attempt_unique')
      }
      return [] as T[]
    }
    const store = createPostgresRankingStore(sql)
    expect(await store.insertRun(sampleRun())).toEqual({ ok: false, reason: 'attempt-taken' })
  })

  it('制約名が取れないドライバでも、読み直して duplicate / attempt-taken を判別する', async () => {
    let exists = false
    const sql: SqlExecutor = async <T>(text: string) => {
      if (text.includes('INSERT INTO daily_runs')) throw pgError('23505', 'duplicate key')
      if (text.includes('SELECT 1 AS one')) return (exists ? [{ one: 1 }] : []) as T[]
      return [] as T[]
    }
    const store = createPostgresRankingStore(sql)
    expect(await store.insertRun(sampleRun())).toEqual({ ok: false, reason: 'attempt-taken' })
    exists = true
    expect(await store.insertRun(sampleRun())).toEqual({ ok: false, reason: 'duplicate' })
  })

  it('数え直しのループが存在しない（INSERTは1回だけ試みる）', async () => {
    let calls = 0
    const sql: SqlExecutor = async <T>(text: string) => {
      if (text.includes('INSERT INTO daily_runs')) {
        calls++
        throw pgError('23505', 'duplicate key', 'daily_runs_attempt_unique')
      }
      return [] as T[]
    }
    const store = createPostgresRankingStore(sql)
    await store.insertRun(sampleRun())
    expect(calls, '番号は ticket が決めるので、数え直して再試行しない').toBe(1)
  })

  it('runのCHECK違反は内部矛盾として投げ直す（「回数超過」と嘘をつかない）', async () => {
    const store = createPostgresRankingStore(async () => {
      throw pgError('23514', 'violates check constraint "daily_runs_attempt_range"')
    })
    await expect(store.insertRun(sampleRun())).rejects.toThrow(/check constraint/)
  })

  it('未知のSQLSTATEは握りつぶさず投げ直す', async () => {
    const store = createPostgresRankingStore(async () => {
      throw pgError('42P01', 'relation "daily_runs" does not exist')
    })
    await expect(store.insertRun(sampleRun())).rejects.toThrow(/does not exist/)
  })
})

describe('制約違反の扱い（ticket）', () => {
  const ticket = {
    dailyKey: DAILY_KEY,
    clientRunId: 't'.repeat(32),
    attemptNo: 1,
    issuedAt: NOW,
    expiresAt: NOW + 60_000,
    gameVersion: getGameVersion(),
    closedReason: null,
  }

  it('CHECK違反（枠の上限）は attempts-exceeded として返る', async () => {
    const store = createPostgresRankingStore(async () => {
      throw pgError('23514', 'violates check constraint "daily_tickets_attempt_range"')
    })
    expect(await store.insertTicket({ ...ticket, playerId: me.playerId })).toEqual({
      ok: false,
      reason: 'attempts-exceeded',
    })
  })

  it('主キー違反は duplicate-run-id、部分UNIQUE違反は attempt-taken として返る', async () => {
    const byConstraint = (constraint: string) =>
      createPostgresRankingStore(async () => {
        throw pgError('23505', 'duplicate key', constraint)
      })
    expect(
      await byConstraint('daily_tickets_pkey').insertTicket({ ...ticket, playerId: me.playerId }),
    ).toEqual({ ok: false, reason: 'duplicate-run-id' })
    expect(
      await byConstraint('daily_tickets_attempt_unique').insertTicket({
        ...ticket,
        playerId: me.playerId,
      }),
    ).toEqual({ ok: false, reason: 'attempt-taken' })
  })

  it('未知のSQLSTATEは投げ直す', async () => {
    const store = createPostgresRankingStore(async () => {
      throw pgError('42P01', 'relation "daily_tickets" does not exist')
    })
    await expect(store.insertTicket({ ...ticket, playerId: me.playerId })).rejects.toThrow(
      /does not exist/,
    )
  })
})

describe('入力の異常', () => {
  const store: RankingStore = memory

  it('不正なReplayInput・別日・改ざんrun・枠切れをすべて拒否し、保存しない', async () => {
    // 不正なReplayInput（ticketも無い）
    const bad = await submitRun(
      { ...me, clientRunId: runId('bad'), input: null as never },
      { store, now: NOW },
    )
    expect(bad.ok).toBe(false)

    // 別の日（＝ticketが見つからない）
    const stale = await submitRun(makeRequest(), { store, now: Date.parse('2026-09-25T03:00:00Z') })
    expect(stale.ok).toBe(false)
    if (!stale.ok) expect(stale.code).toBe('NO_TICKET')

    // 改ざんrun（ticketはある）
    const base = await prepared(store)
    const tampered = { ...base, input: { ...base.input, actions: base.input.actions.slice(0, 1) } }
    const rejected = await submitRun(tampered, { store, now: NOW })
    expect(rejected.ok).toBe(false)

    expect(await store.listPlayerRuns(DAILY_KEY, me.playerId)).toEqual([])

    // 枠を使い切る（改ざんで消費した1枠を含めて3枠）
    for (let i = 1; i < RULES.daily.attemptsPerDay; i++) {
      expect((await submitRun(await prepared(store), { store, now: NOW })).ok).toBe(true)
    }
    const fourth = await startRun({ ...me, clientRunId: runId('4th') }, { store, now: NOW })
    expect(fourth.ok).toBe(false)
    if (!fourth.ok) expect(fourth.code).toBe('ATTEMPTS_EXCEEDED')
  })

  it('拒否のメッセージに接続情報やSQL・秘密を含めない', async () => {
    const noTicket = await submitRun(makeRequest(), { store, now: NOW })
    expect(noTicket.ok).toBe(false)
    if (noTicket.ok) return
    const text = `${noTicket.code} ${noTicket.message} ${noTicket.replayCode ?? ''}`
    for (const forbidden of ['postgres://', 'postgresql://', 'password', 'insert into', 'neon.tech']) {
      expect(text.toLowerCase()).not.toContain(forbidden)
    }
    expect(text).not.toContain(me.playerSecret)
  })

  it('startの拒否メッセージにも秘密が出てこない', async () => {
    const wrong = await startRun(
      { playerId: me.playerId, playerSecret: 'f'.repeat(64), clientRunId: runId('nope') },
      { store, now: NOW },
    )
    expect(wrong.ok).toBe(false)
    if (wrong.ok) return
    expect(wrong.message).not.toContain(me.playerSecret)
    expect(wrong.message).not.toContain('f'.repeat(64))
  })
})

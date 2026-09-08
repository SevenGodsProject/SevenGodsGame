import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { RULES } from '../../src/core/data/rules'
import { GOD_IDS } from '../../src/core/data/gods'
import { getRecommendedDeck } from '../../src/core/data/deckBuilder'
import { getGameVersion, toReplayInput } from '../../src/core/replay'
import { playRecordedDailyRun } from '../../src/core/replay/replayTestUtils'
import { getLeaderboard } from '../../src/server/ranking/leaderboard'
import { createPostgresRankingStore } from '../../src/server/ranking/postgresStore'
import {
  CONSTRAINT_NAMES,
  buildRankingSchemaStatements,
} from '../../src/server/ranking/schema'
import { startRun } from '../../src/server/ranking/start'
import { submitRun } from '../../src/server/ranking/submit'
import { makeIdentity, runId, type TestIdentity } from '../../src/server/ranking/rankingTestUtils'
import type { SubmitRequest } from '../../src/server/ranking/types'
import {
  LEGACY_GAME_VERSION,
  NAMES,
  buildMigrationSql,
  buildMigrationStatements,
  buildPostflightSql,
  buildPreflightSql,
} from './migration'
import {
  applyMigrationStatements,
  applyMigrationTransactional,
  applyPhase44,
  catalog,
  executorOf,
  failing,
  freshDb,
  insertLegacyRun,
  runPostflight,
  runPreflight,
  ticketFkValidated,
  valueOf,
  type Db,
} from './pgliteHarness'

/**
 * Phase 4.7 DB Migration Gate — Dry Run（本物の Postgres／PGlite 上で実行）。
 *
 * 本番 Neon には**接続しない**。ここで確かめるのは：
 *   A. 空DB           … migration は失敗して何も残さない（fresh DDL を使うべき状態）
 *   B. 4.4 schema      … migration → target と**形が同一**
 *   C. 4.4 + legacy   … 既存行を消さず・偽 ticket を作らず・番兵版で区別
 *   D. 途中失敗→再実行 … どの地点で止まっても再実行で収束
 *   E. 完了後の再実行  … no-op
 *   ＋ preflight / postflight の正負、制約の実挙動、本番コードでの並列・上限・void・day-lock
 *
 * 併せて `sql/*.sql` をこのファイルから生成する（TS が唯一の情報源）。
 */

const OUT = path.resolve(__dirname, 'sql')
const NOW = Date.parse('2026-09-09T03:00:00Z')
const DAY = '2026-09-09'
const GOD = GOD_IDS.ebisu

let db: Db
afterEach(async () => {
  await db?.close().catch(() => undefined)
})

beforeAll(() => {
  mkdirSync(OUT, { recursive: true })
  writeFileSync(path.join(OUT, '001_phase46_tickets.sql'), buildMigrationSql())
  writeFileSync(
    path.join(OUT, '001_phase46_tickets.statements.json'),
    JSON.stringify(buildMigrationStatements(), null, 2),
  )
  writeFileSync(path.join(OUT, 'preflight.sql'), buildPreflightSql())
  writeFileSync(path.join(OUT, 'postflight.sql'), buildPostflightSql())
})

let seq = 0
function makeRequest(identity: TestIdentity, clientRunId: string, dailyKey = DAY): SubmitRequest {
  seq++
  const run = playRecordedDailyRun({
    dailyKey,
    godId: GOD,
    deck: getRecommendedDeck(GOD),
    policySeed: seq,
    clientRunId: 'c'.repeat(32),
  })
  return { ...identity, clientRunId, input: toReplayInput(run.log) }
}

// ---------------------------------------------------------------------------

describe('MIG-1 schema差分：migration 後の形が fresh DDL と一致する', () => {
  it('B. Phase 4.4 schema → migration ＝ Phase 4.6 fresh DDL（列・制約・index が同一）', async () => {
    const migrated = await freshDb()
    await applyPhase44(migrated)
    await applyMigrationTransactional(migrated)

    const fresh = await freshDb()
    for (const s of buildRankingSchemaStatements()) await fresh.exec(s)

    const a = await catalog(migrated)
    const b = await catalog(fresh)
    expect(a.columns).toEqual(b.columns)
    expect(a.constraints).toEqual(b.constraints)
    expect(a.indexes).toEqual(b.indexes)
    // 唯一の意図的な差：migration 由来の FK は NOT VALID（legacy 行を検査しない）
    expect(await ticketFkValidated(migrated)).toBe(false)
    expect(await ticketFkValidated(fresh)).toBe(true)
    await fresh.close()
    db = migrated
  })

  it('制約名が schema.ts / migration.ts / postgresStore の3者で一致している', () => {
    expect(NAMES.ticketsPkey).toBe(CONSTRAINT_NAMES.ticketsPkey)
    expect(NAMES.ticketsAttemptRange).toBe(CONSTRAINT_NAMES.ticketsAttemptRange)
    expect(NAMES.ticketsClosedReason).toBe(CONSTRAINT_NAMES.ticketsClosedReason)
    expect(NAMES.ticketsAttemptUnique).toBe(CONSTRAINT_NAMES.ticketsAttemptUnique)
    expect(NAMES.runsPkey).toBe(CONSTRAINT_NAMES.runsPkey)
    expect(NAMES.runsAttemptRange).toBe(CONSTRAINT_NAMES.runsAttemptRange)
    expect(NAMES.runsAttemptUnique).toBe(CONSTRAINT_NAMES.runsAttemptUnique)
    expect(NAMES.runsTicketFk).toBe(CONSTRAINT_NAMES.runsTicketFk)
    // 上限は RULES から埋め込まれている
    expect(buildMigrationSql()).toContain(`BETWEEN 1 AND ${RULES.daily.attemptsPerDay}`)
  })

  it('生成した SQL に接続情報・エンドポイント・秘密が無い', () => {
    const all = buildMigrationSql() + buildPreflightSql() + buildPostflightSql()
    // 接続文字列・Neonのホスト・ロールパスワード形式・エンドポイントID・URL埋め込みパスワード。
    // 「secret」「password」という**語**は列名の検査パターンとして正当に現れるので対象にしない
    expect(all).not.toMatch(/postgres(ql)?:\/\//i)
    expect(all).not.toMatch(/neon\.tech/i)
    expect(all).not.toMatch(/npg_[A-Za-z0-9]{8,}/)
    expect(all).not.toMatch(/ep-[a-z0-9]+-[a-z0-9]+-[a-z0-9]{8}/)
    expect(all).not.toMatch(/[?&]password=/i)
  })

  it('A. 空DB：migration は失敗して**何も残さない**（transaction）。fresh DDL は通る', async () => {
    db = await freshDb()
    await expect(applyMigrationTransactional(db)).rejects.toThrow()
    const cat = await catalog(db)
    expect(cat.columns, '途中まで作られたテーブルが残っている').toEqual([])
    // 空DBには fresh DDL を使う。その後 migration を流しても no-op
    for (const s of buildRankingSchemaStatements()) await db.exec(s)
    const before = await catalog(db)
    await applyMigrationTransactional(db)
    expect(await catalog(db)).toEqual(before)
    expect(failing(await runPostflight(db))).toEqual([])
  })
})

describe('MIG-2 legacy data互換', () => {
  it('C. legacy run を消さず、偽 ticket を作らず、番兵版で区別する', async () => {
    db = await freshDb()
    await applyPhase44(db)
    const p1 = 'a'.repeat(32)
    const p2 = 'b'.repeat(32)
    for (let i = 0; i < 3; i++) await insertLegacyRun(db, { dailyKey: DAY, playerId: p1, clientRunId: runId(`l1-${i}`), score: 500 + i })
    await insertLegacyRun(db, { dailyKey: '2026-09-08', playerId: p2, clientRunId: runId('l2'), score: 700 })
    const rowsBefore = (await db.query(`SELECT daily_key, player_id, client_run_id, attempt_no, score FROM daily_runs ORDER BY 1,2,4`)).rows

    const pre = await runPreflight(db)
    expect(valueOf(pre, 'migration_state')).toBe('NOT_MIGRATED')
    expect(valueOf(pre, 'runs_row_count')).toBe('4')
    expect(failing(pre)).toEqual([])

    await applyMigrationTransactional(db)

    // 行は1件も消えず、内容も変わらない
    const rowsAfter = (await db.query(`SELECT daily_key, player_id, client_run_id, attempt_no, score FROM daily_runs ORDER BY 1,2,4`)).rows
    expect(rowsAfter).toEqual(rowsBefore)
    // 版は番兵値。現行の版とは一致しない
    const versions = (await db.query<{ v: string }>(`SELECT DISTINCT game_version AS v FROM daily_runs`)).rows
    expect(versions).toEqual([{ v: LEGACY_GAME_VERSION }])
    expect(LEGACY_GAME_VERSION).not.toMatch(/^\d+\.[0-9a-f]{16}$/)
    expect(LEGACY_GAME_VERSION).not.toBe(getGameVersion())
    // 偽の ticket は作られていない
    expect((await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM daily_tickets`)).rows[0].n).toBe(0)
    // FK は NOT VALID＝legacy 行は検査対象外
    expect(await ticketFkValidated(db)).toBe(false)

    const post = await runPostflight(db)
    expect(failing(post)).toEqual([])
    expect(valueOf(post, 'legacy_rows_kept')).toBe('4')
    expect(valueOf(post, 'runs_ticket_fk_validated')).toBe('false')
  })

  it('C. legacy run はリーダーボードに残り、新しい run は ticket 経由でだけ入る', async () => {
    db = await freshDb()
    await applyPhase44(db)
    const legacy = 'a'.repeat(32)
    await insertLegacyRun(db, { dailyKey: DAY, playerId: legacy, clientRunId: runId('lg'), score: 900 })
    await applyMigrationTransactional(db)

    const store = createPostgresRankingStore(executorOf(db))
    const me = await makeIdentity('mig-c')
    const started = await startRun({ ...me, clientRunId: runId('new-1') }, { store, now: NOW })
    expect(started.ok).toBe(true)
    const submitted = await submitRun(makeRequest(me, runId('new-1')), { store, now: NOW })
    expect(submitted.ok).toBe(true)
    if (submitted.ok) expect(submitted.run.gameVersion).toBe(getGameVersion())

    const board = await getLeaderboard(DAY, store)
    expect(board.totalPlayers).toBe(2)
    expect(board.rows.map((r) => r.playerId)).toContain(legacy)

    // ticket 無しの直接 INSERT は FK が拒否する（23503）
    await expect(
      db.query(
        `INSERT INTO daily_runs (daily_key, player_id, client_run_id, attempt_no, game_version, god_id, score, win, round, rng_cursor, action_count)
         VALUES ($1, $2, $3, 2, $4, 'ebisu', 1, false, 7, 1, 1)`,
        [DAY, me.playerId, runId('no-ticket'), getGameVersion()],
      ),
    ).rejects.toMatchObject({ code: '23503', constraint: NAMES.runsTicketFk })
    expect(failing(await runPostflight(db))).toEqual([])
  })

  it('C. Known Risk：legacy 行と同じ日・同じ player の新 ticket は attempt_no が衝突しうる', async () => {
    db = await freshDb()
    await applyPhase44(db)
    const me = await makeIdentity('mig-collide')
    // Phase 4.4 時代に同じ公開IDで attempt 1 を提出していた、という仮定
    await insertLegacyRun(db, { dailyKey: DAY, playerId: me.playerId, clientRunId: runId('old'), score: 100 })
    await applyMigrationTransactional(db)
    const store = createPostgresRankingStore(executorOf(db))
    const started = await startRun({ ...me, clientRunId: runId('new') }, { store, now: NOW })
    expect(started.ok && started.ticket.attemptNo).toBe(1) // ticket は legacy を知らない
    const submitted = await submitRun(makeRequest(me, runId('new')), { store, now: NOW })
    // 保存は UNIQUE(daily_key, player_id, attempt_no) で弾かれ、RUN_ID_CONFLICT になる
    expect(submitted.ok).toBe(false)
    if (!submitted.ok) expect(submitted.code).toBe('RUN_ID_CONFLICT')
    // → runbook：legacy 行のある日付には新 ticket を発行しない（適用日は legacy 行の無い日にする）
  })
})

describe('MIG-3 constraint correctness（実 Postgres での挙動）', () => {
  async function migratedDb(): Promise<Db> {
    const d = await freshDb()
    await applyPhase44(d)
    await applyMigrationTransactional(d)
    return d
  }

  it('attempt_no は 1..3 のみ（CHECK・制約名つき）', async () => {
    db = await migratedDb()
    await db.query(`INSERT INTO players (player_id) VALUES ($1)`, ['p'.repeat(32)])
    await db.query(`INSERT INTO daily_days VALUES ($1, 'v')`, [DAY])
    const ins = (n: number, id: string) =>
      db.query(
        `INSERT INTO daily_tickets (daily_key, player_id, client_run_id, attempt_no, issued_at, expires_at, game_version)
         VALUES ($1, $2, $3, $4, now(), now() + interval '1 hour', 'v')`,
        [DAY, 'p'.repeat(32), id, n],
      )
    await expect(ins(0, runId('t0'))).rejects.toMatchObject({ code: '23514', constraint: NAMES.ticketsAttemptRange })
    await expect(ins(4, runId('t4'))).rejects.toMatchObject({ code: '23514', constraint: NAMES.ticketsAttemptRange })
    for (let n = 1; n <= 3; n++) await ins(n, runId(`t${n}`))
  })

  it('部分UNIQUE：同じ番号は取れないが、voided は番号を返す', async () => {
    db = await migratedDb()
    await db.query(`INSERT INTO players (player_id) VALUES ($1)`, ['p'.repeat(32)])
    await db.query(`INSERT INTO daily_days VALUES ($1, 'v')`, [DAY])
    const ins = (n: number, id: string) =>
      db.query(
        `INSERT INTO daily_tickets (daily_key, player_id, client_run_id, attempt_no, issued_at, expires_at, game_version)
         VALUES ($1, $2, $3, $4, now(), now() + interval '1 hour', 'v')`,
        [DAY, 'p'.repeat(32), id, n],
      )
    await ins(1, runId('a'))
    await expect(ins(1, runId('b'))).rejects.toMatchObject({ code: '23505', constraint: NAMES.ticketsAttemptUnique })
    await db.query(`UPDATE daily_tickets SET closed_reason = 'voided' WHERE client_run_id = $1`, [runId('a')])
    await ins(1, runId('b')) // 返還された番号を再利用できる
    // closed_reason は2値のみ
    await expect(
      db.query(`UPDATE daily_tickets SET closed_reason = 'nope' WHERE client_run_id = $1`, [runId('b')]),
    ).rejects.toMatchObject({ code: '23514', constraint: NAMES.ticketsClosedReason })
  })

  it('同じ clientRunId の ticket は二重に作れない（PK）', async () => {
    db = await migratedDb()
    await db.query(`INSERT INTO players (player_id) VALUES ($1)`, ['p'.repeat(32)])
    await db.query(`INSERT INTO daily_days VALUES ($1, 'v')`, [DAY])
    const ins = () =>
      db.query(
        `INSERT INTO daily_tickets (daily_key, player_id, client_run_id, attempt_no, issued_at, expires_at, game_version)
         VALUES ($1, $2, $3, 1, now(), now() + interval '1 hour', 'v')`,
        [DAY, 'p'.repeat(32), runId('same')],
      )
    await ins()
    await expect(ins()).rejects.toMatchObject({ code: '23505', constraint: NAMES.ticketsPkey })
  })

  it('day-lock：daily_days は1日1行で、後から別の版を入れられない（ON CONFLICT DO NOTHING が既存を返す）', async () => {
    db = await migratedDb()
    const store = createPostgresRankingStore(executorOf(db))
    expect(await store.lockDayVersion(DAY, 'v1')).toBe('v1')
    expect(await store.lockDayVersion(DAY, 'v2')).toBe('v1')
    await expect(db.query(`INSERT INTO daily_days VALUES ($1, 'v3')`, [DAY])).rejects.toMatchObject({ code: '23505' })
  })

  it('CASCADE：daily_days を消すと ticket と run が消え、players は残る', async () => {
    db = await migratedDb()
    const store = createPostgresRankingStore(executorOf(db))
    const me = await makeIdentity('cascade')
    await startRun({ ...me, clientRunId: runId('c1') }, { store, now: NOW })
    await submitRun(makeRequest(me, runId('c1')), { store, now: NOW })
    await store.pruneBefore('2026-09-10')
    const count = async (t: string) => (await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${t}`)).rows[0].n
    expect(await count('daily_days')).toBe(0)
    expect(await count('daily_tickets')).toBe(0)
    expect(await count('daily_runs')).toBe(0)
    expect(await count('players')).toBe(1) // created_at が1日未満なので剪定対象外
  })
})

describe('MIG-3 concurrency safety（本番コード × 実 Postgres）', () => {
  async function migratedStore() {
    db = await freshDb()
    await applyPhase44(db)
    await applyMigrationTransactional(db)
    return createPostgresRankingStore(executorOf(db))
  }

  it('同identity同日：3枠まで、4枠目は ATTEMPTS_EXCEEDED（CHECK 制約名で判別）', async () => {
    const store = await migratedStore()
    const me = await makeIdentity('cc-1')
    for (let i = 1; i <= 3; i++) {
      const r = await startRun({ ...me, clientRunId: runId(`s${i}`) }, { store, now: NOW })
      expect(r.ok && r.ticket.attemptNo).toBe(i)
    }
    const fourth = await startRun({ ...me, clientRunId: runId('s4') }, { store, now: NOW })
    expect(fourth.ok).toBe(false)
    if (!fourth.ok) expect(fourth.code).toBe('ATTEMPTS_EXCEEDED')
  })

  it('並列start ×10（別ID）：進行中1・消費≤3・超過分は拒否', async () => {
    const store = await migratedStore()
    const me = await makeIdentity('cc-2')
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => startRun({ ...me, clientRunId: runId(`p${i}`) }, { store, now: NOW })),
    )
    const tickets = await store.listTickets(DAY, me.playerId)
    expect(tickets.filter((t) => t.closedReason === null).length).toBe(1)
    expect(tickets.filter((t) => t.closedReason !== 'voided').length).toBeLessThanOrEqual(3)
    for (const r of results) if (!r.ok) expect(r.code).toBe('ATTEMPTS_EXCEEDED')
  })

  it('並列start ×10（同ID）：ticket 1枚', async () => {
    const store = await migratedStore()
    const me = await makeIdentity('cc-3')
    const results = await Promise.all(
      Array.from({ length: 10 }, () => startRun({ ...me, clientRunId: runId('same') }, { store, now: NOW })),
    )
    expect(results.every((r) => r.ok)).toBe(true)
    expect((await store.listTickets(DAY, me.playerId)).length).toBe(1)
  })

  it('void refund：版跨ぎで voided → 同じ番号を取り直せる', async () => {
    const store = await migratedStore()
    const me = await makeIdentity('cc-4')
    await startRun({ ...me, clientRunId: runId('v1') }, { store, now: NOW, gameVersion: 'old' })
    const mismatch = await submitRun(makeRequest(me, runId('v1')), { store, now: NOW, gameVersion: 'new' })
    expect(mismatch.ok).toBe(false)
    if (!mismatch.ok) expect(mismatch.code).toBe('RULES_VERSION_MISMATCH')
    const again = await startRun({ ...me, clientRunId: runId('v2') }, { store, now: NOW, gameVersion: 'old' })
    expect(again.ok && again.ticket.attemptNo).toBe(1)
    expect(failing(await runPostflight(db))).toEqual([])
  })

  it('同 ticket submit ×4：保存1件、残りは duplicate', async () => {
    const store = await migratedStore()
    const me = await makeIdentity('cc-5')
    await startRun({ ...me, clientRunId: runId('d1') }, { store, now: NOW })
    const req = makeRequest(me, runId('d1'))
    const results = await Promise.all(Array.from({ length: 4 }, () => submitRun(req, { store, now: NOW })))
    expect(results.every((r) => r.ok)).toBe(true)
    expect(results.filter((r) => r.ok && r.accepted === 'stored').length).toBe(1)
    expect((await store.listPlayerRuns(DAY, me.playerId)).length).toBe(1)
  })

  it('day-lock：別の版での開始は RULES_VERSION_LOCKED', async () => {
    const store = await migratedStore()
    const me = await makeIdentity('cc-6')
    await startRun({ ...me, clientRunId: runId('k1') }, { store, now: NOW, gameVersion: 'v1' })
    const locked = await startRun({ ...me, clientRunId: runId('k2') }, { store, now: NOW, gameVersion: 'v2' })
    expect(locked.ok).toBe(false)
    if (!locked.ok) expect(locked.code).toBe('RULES_VERSION_LOCKED')
  })
})

describe('MIG-4 migration idempotency', () => {
  it('D. どの地点で止まっても、再実行で target へ収束する', async () => {
    const total = buildMigrationStatements().length
    const reference = await (async () => {
      const d = await freshDb()
      await applyPhase44(d)
      await applyMigrationTransactional(d)
      const c = await catalog(d)
      await d.close()
      return c
    })()
    for (let stopAt = 1; stopAt < total; stopAt++) {
      const d = await freshDb()
      await applyPhase44(d)
      await insertLegacyRun(d, { dailyKey: DAY, playerId: 'a'.repeat(32), clientRunId: runId('x'), score: 1 })
      await applyMigrationStatements(d, stopAt) // ここで「落ちた」ことにする
      const pre = await runPreflight(d)
      // 途中状態は PARTIAL として止まる（NOT_MIGRATED/MIGRATED 以外）… ただし
      // 1〜3文目までは daily_runs が無変更なので NOT_MIGRATED に見えることがある。
      // どちらでも再実行が正しい行動で、結果は同じ
      // 7文目（FK）まで進んでいれば index は 4.4 由来で既にあるため MIGRATED に見える。
      // いずれの表示でも「再実行」が正しい行動で、結果は同じ
      expect(['NOT_MIGRATED', 'PARTIAL', 'MIGRATED']).toContain(valueOf(pre, 'migration_state'))
      await applyMigrationTransactional(d)
      expect(await catalog(d), `stopAt=${stopAt}`).toEqual(reference)
      expect(failing(await runPostflight(d)), `stopAt=${stopAt}`).toEqual([])
      expect((await d.query<{ n: number }>(`SELECT count(*)::int AS n FROM daily_runs`)).rows[0].n).toBe(1)
      await d.close()
    }
    db = await freshDb()
  })

  it('E. 完了後の再実行は no-op（形もデータも変わらず、エラーも出ない）', async () => {
    db = await freshDb()
    await applyPhase44(db)
    await insertLegacyRun(db, { dailyKey: DAY, playerId: 'a'.repeat(32), clientRunId: runId('e'), score: 42 })
    await applyMigrationTransactional(db)
    const before = await catalog(db)
    const dataBefore = (await db.query(`SELECT * FROM daily_runs`)).rows
    await applyMigrationTransactional(db)
    await applyMigrationStatements(db) // 1文ずつ流す経路でも no-op
    expect(await catalog(db)).toEqual(before)
    expect((await db.query(`SELECT * FROM daily_runs`)).rows).toEqual(dataBefore)
    expect(valueOf(await runPreflight(db), 'migration_state')).toBe('MIGRATED')
    expect(failing(await runPostflight(db))).toEqual([])
  })

  it('1文ずつ流す経路（Neon HTTP ドライバ相当）でも transaction 経路と同じ形になる', async () => {
    const a = await freshDb()
    await applyPhase44(a)
    await applyMigrationTransactional(a)
    const b = await freshDb()
    await applyPhase44(b)
    await applyMigrationStatements(b)
    expect(await catalog(b)).toEqual(await catalog(a))
    await a.close()
    db = b
  })
})

describe('preflight / postflight の正負', () => {
  it('preflight：4.4 のみ → NOT_MIGRATED・全 ok', async () => {
    db = await freshDb()
    await applyPhase44(db)
    const pre = await runPreflight(db)
    expect(valueOf(pre, 'migration_state')).toBe('NOT_MIGRATED')
    expect(failing(pre)).toEqual([])
  })

  it('preflight：空DB（Phase 4.4 未適用）はエラーで止まる＝適用させない', async () => {
    db = await freshDb()
    await expect(runPreflight(db)).rejects.toThrow()
  })

  it('preflight：想定外の列（drift）を検出して止める', async () => {
    db = await freshDb()
    await applyPhase44(db)
    await db.exec(`ALTER TABLE daily_runs ADD COLUMN mystery text`)
    const pre = await runPreflight(db)
    expect(failing(pre)).toContain('runs_unexpected_columns=mystery')
  })

  it('preflight：途中状態（列はあるが NULL が残る）を PARTIAL として止める', async () => {
    db = await freshDb()
    await applyPhase44(db)
    await insertLegacyRun(db, { dailyKey: DAY, playerId: 'a'.repeat(32), clientRunId: runId('p'), score: 1 })
    await applyMigrationStatements(db, 4) // 列追加まで
    const pre = await runPreflight(db)
    expect(valueOf(pre, 'migration_state')).toBe('PARTIAL')
    expect(valueOf(pre, 'runs_null_game_version')).toBe('1')
    expect(failing(pre)).toContain('migration_state=PARTIAL')
  })

  it('postflight：部分UNIQUE が無ければ落ちる', async () => {
    db = await freshDb()
    await applyPhase44(db)
    await applyMigrationTransactional(db)
    await db.exec(`DROP INDEX ${NAMES.ticketsAttemptUnique}`)
    expect(failing(await runPostflight(db))).toContain('tickets_partial_unique=missing')
  })

  it('postflight：game_version に NULL が残れば落ちる', async () => {
    db = await freshDb()
    await applyPhase44(db)
    await insertLegacyRun(db, { dailyKey: DAY, playerId: 'a'.repeat(32), clientRunId: runId('q'), score: 1 })
    await applyMigrationTransactional(db)
    await db.exec(`ALTER TABLE daily_runs ALTER COLUMN game_version DROP NOT NULL`)
    await db.exec(`UPDATE daily_runs SET game_version = NULL`)
    const post = await runPostflight(db)
    expect(failing(post)).toContain('runs_game_version_not_null=YES')
    expect(failing(post)).toContain('runs_game_version_null_rows=1')
  })

  it('postflight：秘密らしき列があれば落ちる', async () => {
    db = await freshDb()
    await applyPhase44(db)
    await applyMigrationTransactional(db)
    await db.exec(`ALTER TABLE players ADD COLUMN player_secret text`)
    expect(failing(await runPostflight(db))).toContain('no_secret_columns=players.player_secret')
  })
})

describe('MIG-6 integration readiness', () => {
  it('integration test が適用する fresh DDL は、migration 済みDBに対して no-op', async () => {
    db = await freshDb()
    await applyPhase44(db)
    await insertLegacyRun(db, { dailyKey: DAY, playerId: 'a'.repeat(32), clientRunId: runId('i'), score: 1 })
    await applyMigrationTransactional(db)
    const before = await catalog(db)
    // postgres.integration.test.ts の beforeAll と同じ手順
    for (const s of buildRankingSchemaStatements()) await db.exec(s)
    expect(await catalog(db)).toEqual(before)
    // テスト専用日の初期化も legacy 行のある別日には触れない
    await db.query(`DELETE FROM daily_days WHERE daily_key = $1`, ['2026-09-09'])
    expect((await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM daily_runs`)).rows[0].n).toBe(1)
  })

  it('★未適用の Neon に integration test を先に流すと失敗する（順序が逆だと壊れる証拠）', async () => {
    db = await freshDb()
    await applyPhase44(db)
    for (const s of buildRankingSchemaStatements()) await db.exec(s) // IF NOT EXISTS なので daily_runs は旧形のまま
    const cols = (await db.query<{ c: string }>(`SELECT column_name AS c FROM information_schema.columns WHERE table_name='daily_runs'`)).rows.map((r) => r.c)
    expect(cols).not.toContain('game_version')
    // → runbook：必ず migration → postflight → integration test の順
  })
})

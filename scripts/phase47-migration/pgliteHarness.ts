import { PGlite } from '@electric-sql/pglite'
import type { SqlExecutor } from '../../src/server/ranking/postgresStore'
import { buildMigrationSql, buildMigrationStatements, buildPostflightSql, buildPreflightSql } from './migration'

/**
 * Phase 4.7 Dry Run 用：PGlite（PostgreSQL を WASM でプロセス内実行）のハーネス。
 *
 * ★本物の Postgres である
 * PGlite は Postgres 本体を WASM に移植したもので、DDL の解釈・制約の評価・SQLSTATE・
 * 違反した制約名の報告まで Neon（Postgres）と同じ挙動をする。
 * ネットワークもサーバーも要らず、テストごとに空のDBを作って捨てられる。
 *
 * ★本番との差（正直に）
 * - 接続は1本＝真の並列実行は起きない（`Promise.all` は直列化される）。
 *   ただし本Gateで確かめたいのは「制約が守るか」であり、並列性そのものではない
 * - Neon の HTTP ドライバ経由ではない（`transaction` の挙動は次Gateで実DB確認）
 */

export type Db = PGlite

export async function freshDb(): Promise<Db> {
  return new PGlite()
}

/** `createPostgresRankingStore` に注入する SqlExecutor（$1, $2 … の位置指定） */
export function executorOf(db: Db): SqlExecutor {
  return (async <T>(text: string, params?: unknown[]) => {
    const result = await db.query<T>(text, params ?? [])
    return result.rows
  }) as SqlExecutor
}

/** Phase 4.4 のスキーマ（git 9ebbfd6 の `schema.ts` と同一。ここに固定しておく） */
export const PHASE44_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS players (
  player_id     text        PRIMARY KEY,
  created_at    timestamptz NOT NULL DEFAULT now(),
  attempt_day   date,
  attempt_count integer     NOT NULL DEFAULT 0
)`,
  `CREATE TABLE IF NOT EXISTS daily_runs (
  daily_key     text        NOT NULL,
  player_id     text        NOT NULL REFERENCES players (player_id) ON DELETE CASCADE,
  client_run_id text        NOT NULL,
  attempt_no    smallint    NOT NULL,
  god_id        text        NOT NULL,
  score         integer     NOT NULL,
  win           boolean     NOT NULL,
  round         smallint    NOT NULL,
  rng_cursor    integer     NOT NULL,
  action_count  smallint    NOT NULL,
  submitted_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_runs_pkey PRIMARY KEY (daily_key, client_run_id),
  CONSTRAINT daily_runs_attempt_range CHECK (attempt_no BETWEEN 1 AND 3),
  CONSTRAINT daily_runs_attempt_unique UNIQUE (daily_key, player_id, attempt_no)
)`,
  `CREATE INDEX IF NOT EXISTS daily_runs_board_idx
  ON daily_runs (daily_key, score DESC, submitted_at ASC)`,
]

export async function applyPhase44(db: Db): Promise<void> {
  for (const s of PHASE44_STATEMENTS) await db.exec(s)
}

/**
 * psql（`-v ON_ERROR_STOP=1`）／ Neon SQL Editor と同じ：BEGIN〜COMMIT の1トランザクションで流す。
 * 途中で失敗したら **ROLLBACK** して例外を投げる（＝何も残らない）。
 * PGlite の `exec` は最初のエラーで止まり、トランザクションを開いたままにするので、
 * psql が接続を閉じたときに起きる暗黙の ROLLBACK をここで明示する。
 */
export async function applyMigrationTransactional(db: Db): Promise<void> {
  try {
    await db.exec(buildMigrationSql())
  } catch (error) {
    await db.exec('ROLLBACK').catch(() => undefined)
    throw error
  }
}

/** Neon HTTP ドライバと同じ：1文ずつ流す。`upto` で途中停止を再現できる */
export async function applyMigrationStatements(db: Db, upto?: number): Promise<void> {
  const statements = buildMigrationStatements()
  const n = upto ?? statements.length
  for (const s of statements.slice(0, n)) await db.exec(s)
}

export type CheckRow = { check_name: string; value: string | null; ok: boolean; note?: string }

export async function runPreflight(db: Db): Promise<CheckRow[]> {
  return (await db.query<CheckRow>(buildPreflightSql())).rows
}

export async function runPostflight(db: Db): Promise<CheckRow[]> {
  return (await db.query<CheckRow>(buildPostflightSql())).rows
}

export function failing(rows: CheckRow[]): string[] {
  return rows.filter((r) => !r.ok).map((r) => `${r.check_name}=${r.value ?? 'null'}`)
}

export function valueOf(rows: CheckRow[], name: string): string | null {
  return rows.find((r) => r.check_name === name)?.value ?? null
}

/**
 * スキーマの「形」のスナップショット。列・制約・indexを名前順に並べて比較可能にする。
 * FK の NOT VALID は migration 由来の意図的な差なので、比較のために取り除く。
 */
export type CatalogSnapshot = {
  columns: string[]
  constraints: string[]
  indexes: string[]
}

const TABLES = ['players', 'daily_days', 'daily_tickets', 'daily_runs']

export async function catalog(db: Db): Promise<CatalogSnapshot> {
  const columns = await db.query<{ t: string; c: string; ty: string; n: string; d: string | null }>(
    `SELECT table_name AS t, column_name AS c, data_type AS ty, is_nullable AS n, column_default AS d
       FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = ANY($1::text[])
      ORDER BY table_name, column_name`,
    [TABLES],
  )
  const constraints = await db.query<{ t: string; n: string; ty: string; def: string }>(
    `SELECT conrelid::regclass::text AS t, conname AS n, contype AS ty, pg_get_constraintdef(oid) AS def
       FROM pg_constraint
      WHERE conrelid::regclass::text = ANY($1::text[])
      ORDER BY 1, 2`,
    [TABLES],
  )
  const indexes = await db.query<{ t: string; n: string; def: string }>(
    `SELECT tablename AS t, indexname AS n, indexdef AS def
       FROM pg_indexes
      WHERE schemaname = current_schema() AND tablename = ANY($1::text[])
      ORDER BY 1, 2`,
    [TABLES],
  )
  return {
    columns: columns.rows.map((r) => `${r.t}.${r.c}:${r.ty}:${r.n}:${r.d ?? ''}`),
    constraints: constraints.rows.map(
      (r) => `${r.t}.${r.n}:${r.ty}:${r.def.replace(/ NOT VALID$/, '')}`,
    ),
    indexes: indexes.rows.map((r) => `${r.t}.${r.n}:${r.def}`),
  }
}

/** `daily_runs_ticket_fk` が検証済みか（legacy 行がある間は false が正しい） */
export async function ticketFkValidated(db: Db): Promise<boolean | null> {
  const rows = await db.query<{ v: boolean }>(
    `SELECT convalidated AS v FROM pg_constraint WHERE conname = 'daily_runs_ticket_fk'`,
  )
  return rows.rows.length > 0 ? rows.rows[0].v : null
}

/** Phase 4.4 時代の提出経路（MAX+1 で番号を決める古い INSERT）を模して legacy 行を作る */
export async function insertLegacyRun(
  db: Db,
  row: { dailyKey: string; playerId: string; clientRunId: string; score: number },
): Promise<void> {
  await db.query(`INSERT INTO players (player_id) VALUES ($1) ON CONFLICT DO NOTHING`, [row.playerId])
  await db.query(
    `INSERT INTO daily_runs
       (daily_key, player_id, client_run_id, attempt_no, god_id, score, win, round, rng_cursor, action_count)
     SELECT $1, $2, $3, COALESCE(MAX(attempt_no), 0) + 1, 'ebisu', $4, false, 7, 1, 10
       FROM daily_runs WHERE daily_key = $1 AND player_id = $2`,
    [row.dailyKey, row.playerId, row.clientRunId, row.score],
  )
}

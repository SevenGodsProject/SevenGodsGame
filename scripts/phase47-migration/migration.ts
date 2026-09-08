import { RULES } from '../../src/core/data/rules'

/**
 * Phase 4.7 DB Migration Gate：Phase 4.4 schema → Phase 4.6 schema の forward migration。
 *
 * ★このファイルが唯一の情報源
 * `sql/*.sql` はここから生成する（`dryrun.audit.ts` が書き出し、乖離をテストで固定）。
 * 上限値（`attemptsPerDay`）は `RULES` から埋め込む＝`src/server/ranking/schema.ts` と
 * 同じ流儀で、DDLと調整値がずれない（CLAUDE.md §3 不変ルール4）。
 *
 * ★設計方針（決定141）
 * - forward-only／idempotent／既存データ非破壊／再実行可能／途中失敗しても安全
 * - 1文ずつ実行できる形（Neon HTTP ドライバは複数文を1回で流せない）
 * - psql / Neon SQL Editor では BEGIN〜COMMIT で1トランザクションにまとめる
 * - **legacy run（Phase 4.4 で入った daily_runs）は消さず、偽の ticket も作らない**。
 *   `daily_runs → daily_tickets` の FK は `NOT VALID` で追加し、新規行だけを縛る。
 *   legacy 行の `game_version` は番兵値 `LEGACY_GAME_VERSION` で埋め、
 *   現行 `gameVersion`（`<整数>.<16進16桁>`）と決して一致しない形にする
 */

export const ATTEMPTS_PER_DAY = RULES.daily.attemptsPerDay

/**
 * Phase 4.4 以前に保存された run に刻む番兵値。
 * 形式を `<整数>.<16進16桁>` から外しておくことで、「当時の版で検証した結果」と
 * 「現在の版で検証した結果」を機械的に区別できる（偽装しない）。
 */
export const LEGACY_GAME_VERSION = 'legacy-4.4'

export const MIGRATION_ID = '001_phase46_tickets'

/** 制約・index の名前。エラー処理側（`postgresStore.ts`）はこの名前で判別する */
export const NAMES = {
  daysPkey: 'daily_days_pkey',
  ticketsPkey: 'daily_tickets_pkey',
  ticketsAttemptRange: 'daily_tickets_attempt_range',
  ticketsClosedReason: 'daily_tickets_closed_reason_check',
  ticketsAttemptUnique: 'daily_tickets_attempt_unique',
  ticketsDayFk: 'daily_tickets_daily_key_fkey',
  ticketsPlayerFk: 'daily_tickets_player_id_fkey',
  runsPkey: 'daily_runs_pkey',
  runsAttemptRange: 'daily_runs_attempt_range',
  runsAttemptUnique: 'daily_runs_attempt_unique',
  runsPlayerFk: 'daily_runs_player_id_fkey',
  runsTicketFk: 'daily_runs_ticket_fk',
  runsBoardIdx: 'daily_runs_board_idx',
} as const

/**
 * forward migration。**この順序に意味がある**：
 *
 *  1. 親テーブル（daily_days）→ 2. daily_tickets → 3. 部分UNIQUE
 *  4. daily_runs に列を**NULL許容で**追加（メタデータ変更のみ・テーブル書き換え無し）
 *  5. backfill（legacy 行だけ）→ 6. NOT NULL（全行が埋まってから）
 *  7. FK を NOT VALID で追加（既存行を検査しない＝legacy 行を許容、新規行は縛る）
 *  8. index（既存なら何もしない）
 *
 * 列追加→backfill→NOT NULL の順を崩すと、途中で NOT NULL 違反になって止まる。
 * FK を先に付けると legacy 行で即失敗する。
 */
export function buildMigrationStatements(): string[] {
  return [
    // 1. day-lock 用。1行/日
    `CREATE TABLE IF NOT EXISTS daily_days (
  daily_key    text        PRIMARY KEY,
  game_version text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
)`,

    // 2. run ticket。制約名はすべて明示する（エラー処理が名前で判別するため）
    `CREATE TABLE IF NOT EXISTS daily_tickets (
  daily_key     text        NOT NULL,
  player_id     text        NOT NULL,
  client_run_id text        NOT NULL,
  attempt_no    smallint    NOT NULL,
  issued_at     timestamptz NOT NULL,
  expires_at    timestamptz NOT NULL,
  game_version  text        NOT NULL,
  closed_reason text,
  CONSTRAINT ${NAMES.ticketsPkey} PRIMARY KEY (daily_key, client_run_id),
  CONSTRAINT ${NAMES.ticketsAttemptRange} CHECK (attempt_no BETWEEN 1 AND ${ATTEMPTS_PER_DAY}),
  CONSTRAINT ${NAMES.ticketsClosedReason} CHECK (closed_reason IN ('abandoned', 'voided')),
  CONSTRAINT ${NAMES.ticketsDayFk} FOREIGN KEY (daily_key)
    REFERENCES daily_days (daily_key) ON DELETE CASCADE,
  CONSTRAINT ${NAMES.ticketsPlayerFk} FOREIGN KEY (player_id)
    REFERENCES players (player_id) ON DELETE CASCADE
)`,

    // 3. 「非voided の枠 ≤ N」を並列startの race に依存せず保証する部分UNIQUE。
    //    voided は番号を返還するので対象から外す
    `CREATE UNIQUE INDEX IF NOT EXISTS ${NAMES.ticketsAttemptUnique}
  ON daily_tickets (daily_key, player_id, attempt_no)
  WHERE closed_reason IS DISTINCT FROM 'voided'`,

    // 4. 列追加（NULL許容・DEFAULT無し＝テーブルの書き換えを伴わない）
    `ALTER TABLE daily_runs ADD COLUMN IF NOT EXISTS game_version text`,

    // 5. backfill：legacy 行だけを番兵値で埋める。既に値がある行には触れない
    `UPDATE daily_runs SET game_version = '${LEGACY_GAME_VERSION}' WHERE game_version IS NULL`,

    // 6. 全行が埋まったので NOT NULL に。既に NOT NULL なら何もしない
    `ALTER TABLE daily_runs ALTER COLUMN game_version SET NOT NULL`,

    // 7. FK は NOT VALID：既存行（legacy）は検査せず、新規・更新行だけを縛る。
    //    冪等にするため pg_constraint を見てから追加する
    `DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = '${NAMES.runsTicketFk}' AND conrelid = 'daily_runs'::regclass
  ) THEN
    ALTER TABLE daily_runs
      ADD CONSTRAINT ${NAMES.runsTicketFk}
      FOREIGN KEY (daily_key, client_run_id)
      REFERENCES daily_tickets (daily_key, client_run_id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$`,

    // 8. リーダーボード用 index（Phase 4.4 で作成済み。無ければ作る）
    `CREATE INDEX IF NOT EXISTS ${NAMES.runsBoardIdx}
  ON daily_runs (daily_key, score DESC, submitted_at ASC)`,
  ]
}

/** psql / Neon SQL Editor 用：1トランザクションにまとめた forward migration */
export function buildMigrationSql(): string {
  return [
    `-- SEVEN GODS Daily Ranking — forward migration ${MIGRATION_ID}`,
    `-- Phase 4.4 schema -> Phase 4.6 schema（決定141）`,
    `-- 生成元: scripts/phase47-migration/migration.ts（手で編集しない）`,
    `-- 冪等：何度流しても同じ結果になる。途中で失敗したら ROLLBACK され、再実行できる。`,
    `-- 接続情報・エンドポイントはこのファイルに含めない。`,
    ``,
    `BEGIN;`,
    ``,
    ...buildMigrationStatements().map((s) => `${s};\n`),
    `COMMIT;`,
    ``,
  ].join('\n')
}

// ---------------------------------------------------------------------------
// preflight（読み取り専用）
// ---------------------------------------------------------------------------

/**
 * 適用前の検査。**1つの SELECT** にまとめてあるので、Neon SQL Editor でも
 * ドライバでも同じ形で結果が返る。各行は (check, value, ok, note)。
 * `ok = false` の行が1つでもあれば migration を実行してはいけない。
 *
 * 判定の考え方：
 * - `state` が NOT_MIGRATED か MIGRATED なら適用してよい（MIGRATED は no-op）
 * - PARTIAL（列だけある・NULL が残っている等）は前回の途中失敗。冪等なので**再実行でよい**が、
 *   人が状態を見て判断できるよう ok=false で止める
 * - DRIFT（想定外の列・制約）は STOP。手で調べる
 */
export function buildPreflightSql(): string {
  return `-- SEVEN GODS Daily Ranking — preflight for ${MIGRATION_ID}（読み取り専用）
-- 生成元: scripts/phase47-migration/migration.ts
-- ok=false の行が1つでもあれば migration を実行しない。

WITH
tables AS (
  SELECT
    to_regclass('players')       IS NOT NULL AS has_players,
    to_regclass('daily_runs')    IS NOT NULL AS has_runs,
    to_regclass('daily_days')    IS NOT NULL AS has_days,
    to_regclass('daily_tickets') IS NOT NULL AS has_tickets
),
runs_cols AS (
  SELECT column_name, is_nullable
    FROM information_schema.columns
   WHERE table_schema = current_schema() AND table_name = 'daily_runs'
),
expected_runs_cols AS (
  SELECT unnest(ARRAY[
    'daily_key','player_id','client_run_id','attempt_no','god_id','score','win',
    'round','rng_cursor','action_count','submitted_at','game_version'
  ]) AS column_name
),
runs_stats AS (
  SELECT
    (SELECT count(*) FROM daily_runs) AS row_count,
    (SELECT count(*) FROM daily_runs r
      WHERE EXISTS (SELECT 1 FROM runs_cols WHERE column_name = 'game_version')
        AND to_jsonb(r) ->> 'game_version' IS NULL) AS null_game_version,
    (SELECT count(*) FROM daily_runs r
      WHERE to_jsonb(r) ->> 'game_version' = '${LEGACY_GAME_VERSION}') AS legacy_rows,
    (SELECT count(*) FROM daily_runs r
      WHERE NOT EXISTS (SELECT 1 FROM players p WHERE p.player_id = r.player_id)) AS orphan_runs,
    (SELECT count(DISTINCT daily_key) FROM daily_runs) AS distinct_days,
    (SELECT string_agg(DISTINCT daily_key, ',' ORDER BY daily_key) FROM daily_runs) AS day_keys
),
cons AS (
  SELECT conname FROM pg_constraint WHERE conrelid = 'daily_runs'::regclass
),
idx AS (
  SELECT indexname FROM pg_indexes WHERE schemaname = current_schema()
),
state AS (
  SELECT CASE
    WHEN NOT (SELECT has_runs FROM tables) THEN 'NO_BASELINE'
    WHEN (SELECT has_days FROM tables) AND (SELECT has_tickets FROM tables)
     AND EXISTS (SELECT 1 FROM runs_cols WHERE column_name = 'game_version' AND is_nullable = 'NO')
     AND EXISTS (SELECT 1 FROM cons WHERE conname = '${NAMES.runsTicketFk}')
     AND EXISTS (SELECT 1 FROM idx WHERE indexname = '${NAMES.ticketsAttemptUnique}')
      THEN 'MIGRATED'
    WHEN NOT (SELECT has_days FROM tables) AND NOT (SELECT has_tickets FROM tables)
     AND NOT EXISTS (SELECT 1 FROM runs_cols WHERE column_name = 'game_version')
      THEN 'NOT_MIGRATED'
    ELSE 'PARTIAL'
  END AS state
)
SELECT check_name, value, ok, note FROM (
  SELECT 1 AS ord, 'migration_state' AS check_name, (SELECT state FROM state) AS value,
         (SELECT state FROM state) IN ('NOT_MIGRATED', 'MIGRATED') AS ok,
         'NOT_MIGRATED=適用可 / MIGRATED=no-op / PARTIAL=前回途中失敗（冪等なので再実行可・人が確認）/ NO_BASELINE=Phase4.4未適用' AS note
  UNION ALL
  SELECT 2, 'players_exists', (SELECT has_players::text FROM tables), (SELECT has_players FROM tables), 'Phase 4.4 baseline'
  UNION ALL
  SELECT 3, 'daily_runs_exists', (SELECT has_runs::text FROM tables), (SELECT has_runs FROM tables), 'Phase 4.4 baseline'
  UNION ALL
  SELECT 4, 'daily_days_exists', (SELECT has_days::text FROM tables), true, '報告のみ'
  UNION ALL
  SELECT 5, 'daily_tickets_exists', (SELECT has_tickets::text FROM tables), true, '報告のみ'
  UNION ALL
  SELECT 6, 'runs_row_count', (SELECT row_count::text FROM runs_stats), true, '報告のみ'
  UNION ALL
  SELECT 7, 'runs_null_game_version', (SELECT null_game_version::text FROM runs_stats), true, '適用で backfill される（報告のみ）'
  UNION ALL
  SELECT 8, 'runs_legacy_rows', (SELECT legacy_rows::text FROM runs_stats), true, '報告のみ'
  UNION ALL
  SELECT 9, 'runs_orphan_rows', (SELECT orphan_runs::text FROM runs_stats), (SELECT orphan_runs = 0 FROM runs_stats), 'players を参照しない run があれば STOP'
  UNION ALL
  SELECT 10, 'runs_distinct_days', (SELECT distinct_days::text FROM runs_stats), true, '報告のみ'
  UNION ALL
  SELECT 11, 'runs_day_keys', COALESCE((SELECT day_keys FROM runs_stats), ''), true,
         'legacy 行がある日は、同じ日に新 ticket を発行すると attempt_no が衝突しうる（Known Risk）'
  UNION ALL
  SELECT 12, 'runs_unexpected_columns',
         COALESCE((SELECT string_agg(column_name, ',') FROM runs_cols
                    WHERE column_name NOT IN (SELECT column_name FROM expected_runs_cols)), ''),
         NOT EXISTS (SELECT 1 FROM runs_cols
                      WHERE column_name NOT IN (SELECT column_name FROM expected_runs_cols)),
         '想定外の列があれば DRIFT として STOP'
  UNION ALL
  SELECT 13, 'runs_constraint_pkey', EXISTS (SELECT 1 FROM cons WHERE conname = '${NAMES.runsPkey}')::text,
         EXISTS (SELECT 1 FROM cons WHERE conname = '${NAMES.runsPkey}'), 'Phase 4.4 baseline'
  UNION ALL
  SELECT 14, 'runs_constraint_attempt_unique', EXISTS (SELECT 1 FROM cons WHERE conname = '${NAMES.runsAttemptUnique}')::text,
         EXISTS (SELECT 1 FROM cons WHERE conname = '${NAMES.runsAttemptUnique}'), 'Phase 4.4 baseline'
  UNION ALL
  SELECT 15, 'runs_constraint_attempt_range', EXISTS (SELECT 1 FROM cons WHERE conname = '${NAMES.runsAttemptRange}')::text,
         EXISTS (SELECT 1 FROM cons WHERE conname = '${NAMES.runsAttemptRange}'), 'Phase 4.4 baseline'
  UNION ALL
  SELECT 16, 'runs_constraint_player_fk', EXISTS (SELECT 1 FROM cons WHERE conname = '${NAMES.runsPlayerFk}')::text,
         EXISTS (SELECT 1 FROM cons WHERE conname = '${NAMES.runsPlayerFk}'), 'Phase 4.4 baseline（自動命名）'
  UNION ALL
  SELECT 17, 'runs_constraint_ticket_fk', EXISTS (SELECT 1 FROM cons WHERE conname = '${NAMES.runsTicketFk}')::text, true, '報告のみ（適用後は true）'
  UNION ALL
  SELECT 18, 'runs_index_board', EXISTS (SELECT 1 FROM idx WHERE indexname = '${NAMES.runsBoardIdx}')::text,
         EXISTS (SELECT 1 FROM idx WHERE indexname = '${NAMES.runsBoardIdx}'), 'Phase 4.4 baseline'
  UNION ALL
  SELECT 19, 'tickets_index_attempt_unique', EXISTS (SELECT 1 FROM idx WHERE indexname = '${NAMES.ticketsAttemptUnique}')::text, true, '報告のみ（適用後は true）'
  UNION ALL
  SELECT 20, 'players_row_count', (SELECT count(*)::text FROM players), true, '報告のみ'
) checks
ORDER BY ord;
`
}

// ---------------------------------------------------------------------------
// postflight（適用後の検査）
// ---------------------------------------------------------------------------

/**
 * 適用後の検査。**すべての行が ok=true でなければ Production API を開かない。**
 * 構造（table / column / constraint / index / FK）と、データの不変条件
 * （NULL無し・open ticket ≤ 1・非voided ≤ N・ticket無しの新規runが無い）を見る。
 */
export function buildPostflightSql(): string {
  return `-- SEVEN GODS Daily Ranking — postflight for ${MIGRATION_ID}
-- 生成元: scripts/phase47-migration/migration.ts
-- 1行でも ok=false があれば Production API を開かない。

WITH
runs_cols AS (
  SELECT column_name, is_nullable FROM information_schema.columns
   WHERE table_schema = current_schema() AND table_name = 'daily_runs'
),
tickets_cols AS (
  SELECT column_name, is_nullable FROM information_schema.columns
   WHERE table_schema = current_schema() AND table_name = 'daily_tickets'
),
runs_cons AS (
  SELECT conname, convalidated FROM pg_constraint WHERE conrelid = 'daily_runs'::regclass
),
tickets_cons AS (
  SELECT conname FROM pg_constraint WHERE conrelid = 'daily_tickets'::regclass
),
idx AS (
  SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = current_schema()
),
open_per_identity AS (
  SELECT daily_key, player_id, count(*) AS n
    FROM daily_tickets t
   WHERE closed_reason IS NULL
     AND NOT EXISTS (SELECT 1 FROM daily_runs r
                      WHERE r.daily_key = t.daily_key AND r.client_run_id = t.client_run_id)
     AND expires_at > now()
   GROUP BY daily_key, player_id
),
consumed_per_identity AS (
  SELECT daily_key, player_id, count(*) AS n
    FROM daily_tickets
   WHERE closed_reason IS DISTINCT FROM 'voided'
   GROUP BY daily_key, player_id
),
new_runs_without_ticket AS (
  SELECT count(*) AS n FROM daily_runs r
   WHERE r.game_version <> '${LEGACY_GAME_VERSION}'
     AND NOT EXISTS (SELECT 1 FROM daily_tickets t
                      WHERE t.daily_key = r.daily_key AND t.client_run_id = r.client_run_id)
)
SELECT check_name, value, ok FROM (
  SELECT 1 AS ord, 'table_daily_days' AS check_name, (to_regclass('daily_days') IS NOT NULL)::text AS value, to_regclass('daily_days') IS NOT NULL AS ok
  UNION ALL SELECT 2, 'table_daily_tickets', (to_regclass('daily_tickets') IS NOT NULL)::text, to_regclass('daily_tickets') IS NOT NULL
  UNION ALL SELECT 3, 'runs_game_version_not_null',
    (SELECT is_nullable FROM runs_cols WHERE column_name = 'game_version'),
    EXISTS (SELECT 1 FROM runs_cols WHERE column_name = 'game_version' AND is_nullable = 'NO')
  UNION ALL SELECT 4, 'runs_game_version_null_rows', (SELECT count(*)::text FROM daily_runs WHERE game_version IS NULL),
    (SELECT count(*) = 0 FROM daily_runs WHERE game_version IS NULL)
  UNION ALL SELECT 5, 'runs_ticket_fk_exists', EXISTS (SELECT 1 FROM runs_cons WHERE conname = '${NAMES.runsTicketFk}')::text,
    EXISTS (SELECT 1 FROM runs_cons WHERE conname = '${NAMES.runsTicketFk}')
  UNION ALL SELECT 6, 'runs_ticket_fk_validated',
    COALESCE((SELECT convalidated::text FROM runs_cons WHERE conname = '${NAMES.runsTicketFk}'), 'missing'),
    true  -- legacy 行がある間は false のままで正しい（報告のみ）
  UNION ALL SELECT 7, 'runs_baseline_constraints',
    (SELECT count(*)::text FROM runs_cons WHERE conname IN ('${NAMES.runsPkey}','${NAMES.runsAttemptUnique}','${NAMES.runsAttemptRange}','${NAMES.runsPlayerFk}')),
    (SELECT count(*) = 4 FROM runs_cons WHERE conname IN ('${NAMES.runsPkey}','${NAMES.runsAttemptUnique}','${NAMES.runsAttemptRange}','${NAMES.runsPlayerFk}'))
  UNION ALL SELECT 8, 'tickets_constraints',
    (SELECT count(*)::text FROM tickets_cons WHERE conname IN ('${NAMES.ticketsPkey}','${NAMES.ticketsAttemptRange}','${NAMES.ticketsClosedReason}','${NAMES.ticketsDayFk}','${NAMES.ticketsPlayerFk}')),
    (SELECT count(*) = 5 FROM tickets_cons WHERE conname IN ('${NAMES.ticketsPkey}','${NAMES.ticketsAttemptRange}','${NAMES.ticketsClosedReason}','${NAMES.ticketsDayFk}','${NAMES.ticketsPlayerFk}'))
  UNION ALL SELECT 9, 'tickets_partial_unique',
    COALESCE((SELECT indexdef FROM idx WHERE indexname = '${NAMES.ticketsAttemptUnique}'), 'missing'),
    EXISTS (SELECT 1 FROM idx WHERE indexname = '${NAMES.ticketsAttemptUnique}' AND indexdef ILIKE '%WHERE%voided%')
  UNION ALL SELECT 10, 'runs_board_index', EXISTS (SELECT 1 FROM idx WHERE indexname = '${NAMES.runsBoardIdx}')::text,
    EXISTS (SELECT 1 FROM idx WHERE indexname = '${NAMES.runsBoardIdx}')
  UNION ALL SELECT 11, 'tickets_required_columns',
    (SELECT count(*)::text FROM tickets_cols WHERE column_name IN ('daily_key','player_id','client_run_id','attempt_no','issued_at','expires_at','game_version','closed_reason')),
    (SELECT count(*) = 8 FROM tickets_cols WHERE column_name IN ('daily_key','player_id','client_run_id','attempt_no','issued_at','expires_at','game_version','closed_reason'))
  UNION ALL SELECT 12, 'no_secret_columns',
    COALESCE((SELECT string_agg(table_name || '.' || column_name, ',') FROM information_schema.columns
               WHERE table_schema = current_schema()
                 AND table_name IN ('players','daily_days','daily_tickets','daily_runs')
                 AND column_name ~* 'secret|password|token|email|ip_|user_agent|cookie'), ''),
    NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = current_schema()
                   AND table_name IN ('players','daily_days','daily_tickets','daily_runs')
                   AND column_name ~* 'secret|password|token|email|ip_|user_agent|cookie')
  UNION ALL SELECT 13, 'invariant_open_ticket_le_1', COALESCE((SELECT max(n)::text FROM open_per_identity), '0'),
    COALESCE((SELECT max(n) FROM open_per_identity), 0) <= 1
  UNION ALL SELECT 14, 'invariant_consumed_le_${ATTEMPTS_PER_DAY}', COALESCE((SELECT max(n)::text FROM consumed_per_identity), '0'),
    COALESCE((SELECT max(n) FROM consumed_per_identity), 0) <= ${ATTEMPTS_PER_DAY}
  UNION ALL SELECT 15, 'invariant_new_runs_have_ticket', (SELECT n::text FROM new_runs_without_ticket),
    (SELECT n = 0 FROM new_runs_without_ticket)
  UNION ALL SELECT 16, 'legacy_rows_kept', (SELECT count(*)::text FROM daily_runs WHERE game_version = '${LEGACY_GAME_VERSION}'), true
) checks
ORDER BY ord;
`
}

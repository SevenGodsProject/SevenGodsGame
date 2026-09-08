-- SEVEN GODS Daily Ranking — postflight for 001_phase46_tickets
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
   WHERE r.game_version <> 'legacy-4.4'
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
  UNION ALL SELECT 5, 'runs_ticket_fk_exists', EXISTS (SELECT 1 FROM runs_cons WHERE conname = 'daily_runs_ticket_fk')::text,
    EXISTS (SELECT 1 FROM runs_cons WHERE conname = 'daily_runs_ticket_fk')
  UNION ALL SELECT 6, 'runs_ticket_fk_validated',
    COALESCE((SELECT convalidated::text FROM runs_cons WHERE conname = 'daily_runs_ticket_fk'), 'missing'),
    true  -- legacy 行がある間は false のままで正しい（報告のみ）
  UNION ALL SELECT 7, 'runs_baseline_constraints',
    (SELECT count(*)::text FROM runs_cons WHERE conname IN ('daily_runs_pkey','daily_runs_attempt_unique','daily_runs_attempt_range','daily_runs_player_id_fkey')),
    (SELECT count(*) = 4 FROM runs_cons WHERE conname IN ('daily_runs_pkey','daily_runs_attempt_unique','daily_runs_attempt_range','daily_runs_player_id_fkey'))
  UNION ALL SELECT 8, 'tickets_constraints',
    (SELECT count(*)::text FROM tickets_cons WHERE conname IN ('daily_tickets_pkey','daily_tickets_attempt_range','daily_tickets_closed_reason_check','daily_tickets_daily_key_fkey','daily_tickets_player_id_fkey')),
    (SELECT count(*) = 5 FROM tickets_cons WHERE conname IN ('daily_tickets_pkey','daily_tickets_attempt_range','daily_tickets_closed_reason_check','daily_tickets_daily_key_fkey','daily_tickets_player_id_fkey'))
  UNION ALL SELECT 9, 'tickets_partial_unique',
    COALESCE((SELECT indexdef FROM idx WHERE indexname = 'daily_tickets_attempt_unique'), 'missing'),
    EXISTS (SELECT 1 FROM idx WHERE indexname = 'daily_tickets_attempt_unique' AND indexdef ILIKE '%WHERE%voided%')
  UNION ALL SELECT 10, 'runs_board_index', EXISTS (SELECT 1 FROM idx WHERE indexname = 'daily_runs_board_idx')::text,
    EXISTS (SELECT 1 FROM idx WHERE indexname = 'daily_runs_board_idx')
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
  UNION ALL SELECT 14, 'invariant_consumed_le_3', COALESCE((SELECT max(n)::text FROM consumed_per_identity), '0'),
    COALESCE((SELECT max(n) FROM consumed_per_identity), 0) <= 3
  UNION ALL SELECT 15, 'invariant_new_runs_have_ticket', (SELECT n::text FROM new_runs_without_ticket),
    (SELECT n = 0 FROM new_runs_without_ticket)
  UNION ALL SELECT 16, 'legacy_rows_kept', (SELECT count(*)::text FROM daily_runs WHERE game_version = 'legacy-4.4'), true
) checks
ORDER BY ord;

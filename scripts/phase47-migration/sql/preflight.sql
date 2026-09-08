-- SEVEN GODS Daily Ranking — preflight for 001_phase46_tickets（読み取り専用）
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
      WHERE to_jsonb(r) ->> 'game_version' = 'legacy-4.4') AS legacy_rows,
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
     AND EXISTS (SELECT 1 FROM cons WHERE conname = 'daily_runs_ticket_fk')
     AND EXISTS (SELECT 1 FROM idx WHERE indexname = 'daily_tickets_attempt_unique')
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
  SELECT 13, 'runs_constraint_pkey', EXISTS (SELECT 1 FROM cons WHERE conname = 'daily_runs_pkey')::text,
         EXISTS (SELECT 1 FROM cons WHERE conname = 'daily_runs_pkey'), 'Phase 4.4 baseline'
  UNION ALL
  SELECT 14, 'runs_constraint_attempt_unique', EXISTS (SELECT 1 FROM cons WHERE conname = 'daily_runs_attempt_unique')::text,
         EXISTS (SELECT 1 FROM cons WHERE conname = 'daily_runs_attempt_unique'), 'Phase 4.4 baseline'
  UNION ALL
  SELECT 15, 'runs_constraint_attempt_range', EXISTS (SELECT 1 FROM cons WHERE conname = 'daily_runs_attempt_range')::text,
         EXISTS (SELECT 1 FROM cons WHERE conname = 'daily_runs_attempt_range'), 'Phase 4.4 baseline'
  UNION ALL
  SELECT 16, 'runs_constraint_player_fk', EXISTS (SELECT 1 FROM cons WHERE conname = 'daily_runs_player_id_fkey')::text,
         EXISTS (SELECT 1 FROM cons WHERE conname = 'daily_runs_player_id_fkey'), 'Phase 4.4 baseline（自動命名）'
  UNION ALL
  SELECT 17, 'runs_constraint_ticket_fk', EXISTS (SELECT 1 FROM cons WHERE conname = 'daily_runs_ticket_fk')::text, true, '報告のみ（適用後は true）'
  UNION ALL
  SELECT 18, 'runs_index_board', EXISTS (SELECT 1 FROM idx WHERE indexname = 'daily_runs_board_idx')::text,
         EXISTS (SELECT 1 FROM idx WHERE indexname = 'daily_runs_board_idx'), 'Phase 4.4 baseline'
  UNION ALL
  SELECT 19, 'tickets_index_attempt_unique', EXISTS (SELECT 1 FROM idx WHERE indexname = 'daily_tickets_attempt_unique')::text, true, '報告のみ（適用後は true）'
  UNION ALL
  SELECT 20, 'players_row_count', (SELECT count(*)::text FROM players), true, '報告のみ'
) checks
ORDER BY ord;

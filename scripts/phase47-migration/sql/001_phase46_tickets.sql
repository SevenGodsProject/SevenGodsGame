-- SEVEN GODS Daily Ranking — forward migration 001_phase46_tickets
-- Phase 4.4 schema -> Phase 4.6 schema（決定141）
-- 生成元: scripts/phase47-migration/migration.ts（手で編集しない）
-- 冪等：何度流しても同じ結果になる。途中で失敗したら ROLLBACK され、再実行できる。
-- 接続情報・エンドポイントはこのファイルに含めない。

BEGIN;

CREATE TABLE IF NOT EXISTS daily_days (
  daily_key    text        PRIMARY KEY,
  game_version text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_tickets (
  daily_key     text        NOT NULL,
  player_id     text        NOT NULL,
  client_run_id text        NOT NULL,
  attempt_no    smallint    NOT NULL,
  issued_at     timestamptz NOT NULL,
  expires_at    timestamptz NOT NULL,
  game_version  text        NOT NULL,
  closed_reason text,
  CONSTRAINT daily_tickets_pkey PRIMARY KEY (daily_key, client_run_id),
  CONSTRAINT daily_tickets_attempt_range CHECK (attempt_no BETWEEN 1 AND 3),
  CONSTRAINT daily_tickets_closed_reason_check CHECK (closed_reason IN ('abandoned', 'voided')),
  CONSTRAINT daily_tickets_daily_key_fkey FOREIGN KEY (daily_key)
    REFERENCES daily_days (daily_key) ON DELETE CASCADE,
  CONSTRAINT daily_tickets_player_id_fkey FOREIGN KEY (player_id)
    REFERENCES players (player_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS daily_tickets_attempt_unique
  ON daily_tickets (daily_key, player_id, attempt_no)
  WHERE closed_reason IS DISTINCT FROM 'voided';

ALTER TABLE daily_runs ADD COLUMN IF NOT EXISTS game_version text;

UPDATE daily_runs SET game_version = 'legacy-4.4' WHERE game_version IS NULL;

ALTER TABLE daily_runs ALTER COLUMN game_version SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'daily_runs_ticket_fk' AND conrelid = 'daily_runs'::regclass
  ) THEN
    ALTER TABLE daily_runs
      ADD CONSTRAINT daily_runs_ticket_fk
      FOREIGN KEY (daily_key, client_run_id)
      REFERENCES daily_tickets (daily_key, client_run_id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS daily_runs_board_idx
  ON daily_runs (daily_key, score DESC, submitted_at ASC);

COMMIT;

-- Phase 4.3：Daily ランキングBackend の Postgres スキーマ（Neon 想定）。
--
-- ★このDDLはまだ実行していない。Neon の契約は CEO 判断事項（CLAUDE.md §6-3 #6）で未承認のため。
--   承認後に `RankingStore`（src/server/ranking/store.ts）の Postgres 実装を書き、
--   このファイルをマイグレーションとして流す。
--
-- ★保存するのはサーバーが計算した値だけ。
--   クライアントの申告スコアや、氏名・メール・IP・端末情報は列そのものが存在しない。

CREATE TABLE IF NOT EXISTS ranking_runs (
  -- JST の日付キー 'YYYY-MM-DD'。敵と seed はここから再導出できるので列に持たない
  daily_key     text        NOT NULL,
  -- 端末が生成した匿名 ID（乱数16進）。個人を特定する情報ではない
  player_id     text        NOT NULL,
  -- run 識別子。冪等な再送のキー
  client_run_id text        NOT NULL,
  god_id        text        NOT NULL,
  -- 以下はすべて runReplay が計算した検証済みの値
  score         integer     NOT NULL,
  win           boolean     NOT NULL,
  round         smallint    NOT NULL,
  rng_cursor    integer     NOT NULL,
  action_count  smallint    NOT NULL,
  -- 受理時刻。順位には使わない（同順位内の表示順にのみ使う）
  submitted_at  timestamptz NOT NULL DEFAULT now(),

  -- 同じ run を二重に登録しない（再送の冪等性をDB側でも保証する）
  PRIMARY KEY (daily_key, client_run_id)
);

-- 1日3回の判定と、プレイヤー自身の順位照会に使う
CREATE INDEX IF NOT EXISTS ranking_runs_player_idx
  ON ranking_runs (daily_key, player_id);

-- リーダーボードの取得に使う
CREATE INDEX IF NOT EXISTS ranking_runs_board_idx
  ON ranking_runs (daily_key, score DESC, submitted_at ASC);

-- 提出「試行」の回数（受理・拒否とも数える）。総当たり対策の門番用。
-- 日次で作り直す前提の軽い表なので、古い行は運用で剪定する
CREATE TABLE IF NOT EXISTS ranking_attempts (
  daily_key text    NOT NULL,
  player_id text    NOT NULL,
  attempts  integer NOT NULL DEFAULT 0,
  PRIMARY KEY (daily_key, player_id)
);

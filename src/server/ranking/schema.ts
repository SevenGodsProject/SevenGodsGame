import { RULES } from './deps'

/**
 * Phase 4.4：Postgres（Neon）のスキーマ。
 *
 * ★なぜ `.sql` ファイルではなくTSで組み立てるのか（Step 3の再監査結果）
 * 1日の挑戦回数の上限（`RULES.daily.attemptsPerDay`）を **DBの CHECK 制約**で守るため、
 * DDLの中にその数値が現れる。`.sql` に直書きすると
 * 「調整値は `rules.ts` に集約する」（CLAUDE.md §3 不変ルール4）に違反し、
 * `rules.ts` を変えたのに DB 側の上限が古いまま、という食い違いが起こりうる。
 * DDLを `RULES` から生成すれば、上限は常に1か所にしか存在しない。
 *
 * ★テーブルは2つだけ（CEO指示：players / daily_runs のみ、不要なtable追加禁止）
 * 提出「試行」の回数（レート制限用）は独立したテーブルにせず、`players` に
 * 当日ぶんだけを持たせた（日が変われば数え直すので履歴は要らない）。
 *
 * ★保存するのはサーバーが計算した値だけ。
 * 氏名・メール・IP・端末情報・クライアント申告スコアに対応する列は**存在しない**。
 */

export const ATTEMPTS_PER_DAY = RULES.daily.attemptsPerDay

/** DDLの先頭に付ける注記。SQL文ではないので単独では実行しない */
const SCHEMA_HEADER = `-- SEVEN GODS Daily Ranking schema (generated from RULES; do not edit by hand)
-- 生成元: src/server/ranking/schema.ts`

/**
 * スキーマ本体を**1文ずつ**返す。冪等（何度流してもよい）。
 *
 * ★なぜ配列を正とするのか（Phase 4.4 follow-up）
 * Neon の HTTP ドライバ（`sql.query`）は拡張問い合わせプロトコルを使うため、
 * `;` で区切った複数文をまとめて渡せない
 * （`cannot insert multiple commands into a prepared statement`）。
 * 適用側が1文ずつ流せるよう分割済みの形を正とし、`buildRankingSchemaSql()` は
 * これを連結して返す（出力内容は従来と同一）。
 * 文字列を後から `;` で機械分割する方式は、DDL中に `;` を含む定数が入った瞬間に
 * 壊れるため採らない。
 */
export function buildRankingSchemaStatements(): string[] {
  return [
    `CREATE TABLE IF NOT EXISTS players (
  -- 端末が生成した匿名ID（乱数16進）。氏名・メール・SNS等は扱わない
  player_id     text        PRIMARY KEY,
  created_at    timestamptz NOT NULL DEFAULT now(),
  -- レート制限用。当日ぶんだけ保持し、日が変われば0から数え直す
  attempt_day   date,
  attempt_count integer     NOT NULL DEFAULT 0
)`,
    `CREATE TABLE IF NOT EXISTS daily_runs (
  -- JSTの日付キー 'YYYY-MM-DD'。敵とseedはここから再導出できるので列に持たない
  daily_key     text        NOT NULL,
  player_id     text        NOT NULL REFERENCES players (player_id) ON DELETE CASCADE,
  -- run識別子。冪等な再送のキー
  client_run_id text        NOT NULL,
  -- その日の何回目か。1〜${ATTEMPTS_PER_DAY} の範囲をDBが保証する
  attempt_no    smallint    NOT NULL,
  god_id        text        NOT NULL,
  -- 以下はすべて runReplay が計算した検証済みの値
  score         integer     NOT NULL,
  win           boolean     NOT NULL,
  round         smallint    NOT NULL,
  rng_cursor    integer     NOT NULL,
  action_count  smallint    NOT NULL,
  -- 受理時刻。順位には使わない（同順位内の表示順にのみ使う）
  submitted_at  timestamptz NOT NULL DEFAULT now(),

  -- ① 同じrunを二重に登録しない（再送の冪等性をDBが保証する）
  CONSTRAINT daily_runs_pkey PRIMARY KEY (daily_key, client_run_id),
  -- ② 1日${ATTEMPTS_PER_DAY}回を超えられない（CHECKとUNIQUEの組み合わせで、
  --    「countしてからinsert」のraceに依存せずDB側で保証する）
  CONSTRAINT daily_runs_attempt_range CHECK (attempt_no BETWEEN 1 AND ${ATTEMPTS_PER_DAY}),
  CONSTRAINT daily_runs_attempt_unique UNIQUE (daily_key, player_id, attempt_no)
)`,
    `-- リーダーボード取得用
CREATE INDEX IF NOT EXISTS daily_runs_board_idx
  ON daily_runs (daily_key, score DESC, submitted_at ASC)`,
  ]
}

/**
 * スキーマ本体をひと続きのSQLとして返す（`.sql` へ書き出す・psqlへ流す用）。
 * ドライバ経由で適用するときは `buildRankingSchemaStatements()` を1文ずつ実行する。
 */
export function buildRankingSchemaSql(): string {
  return `${SCHEMA_HEADER}

${buildRankingSchemaStatements().join(';\n\n')};
`
}

/**
 * 保存済みrunを古い日付ぶん剪定するSQL（運用タスク用）。
 * ランキングは当日ぶんしか使わないので、履歴を無限に持たない。
 */
export function buildPruneSql(retentionDays: number): string {
  return `DELETE FROM daily_runs
 WHERE daily_key < to_char(now() - interval '${retentionDays} days', 'YYYY-MM-DD');`
}

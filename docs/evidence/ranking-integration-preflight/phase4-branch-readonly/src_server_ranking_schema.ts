import { RULES } from './deps.js'

/**
 * Phase 4.4〜4.6：Postgres（Neon）のスキーマ。
 *
 * ★なぜ `.sql` ファイルではなくTSで組み立てるのか（Step 3の再監査結果）
 * 1日の挑戦回数の上限（`RULES.daily.attemptsPerDay`）を **DBの CHECK 制約**で守るため、
 * DDLの中にその数値が現れる。`.sql` に直書きすると
 * 「調整値は `rules.ts` に集約する」（CLAUDE.md §3 不変ルール4）に違反し、
 * `rules.ts` を変えたのに DB 側の上限が古いまま、という食い違いが起こりうる。
 * DDLを `RULES` から生成すれば、上限は常に1か所にしか存在しない。
 *
 * ★テーブル（Phase 4.6 で2つ増えて4つ）
 *   - `players`       … 匿名の公開ID（＝秘密のハッシュ）と、当日の提出試行カウンタ
 *   - `daily_days`    … その日の `game_version` を固定する（day-lock。決定139 §5）
 *   - `daily_tickets` … 挑戦枠の予約。**1日の上限判定の最終権限はここ**
 *   - `daily_runs`    … 検証済みの結果。必ず ticket に紐づく
 *
 * ★保存するのはサーバーが計算した値だけ。
 * 氏名・メール・IP・端末情報・`playerSecret`・クライアント申告スコアに対応する列は
 * **存在しない**（`concurrency.test.ts` が禁止列を機械検査している）。
 */

export const ATTEMPTS_PER_DAY = RULES.daily.attemptsPerDay

/**
 * 制約・indexの名前。DDL（下）とエラー処理（`postgresStore.ts`）の両方がこれを見る。
 * Postgres は違反した制約の名前をエラーに載せてくるので、**同じ SQLSTATE でも
 * どの制約が落ちたか**を名前で判別できる（23514 を無条件に「回数超過」と読まない）。
 */
export const CONSTRAINT_NAMES = {
  ticketsPkey: 'daily_tickets_pkey',
  ticketsAttemptRange: 'daily_tickets_attempt_range',
  ticketsClosedReason: 'daily_tickets_closed_reason_check',
  ticketsAttemptUnique: 'daily_tickets_attempt_unique',
  runsPkey: 'daily_runs_pkey',
  runsAttemptRange: 'daily_runs_attempt_range',
  runsAttemptUnique: 'daily_runs_attempt_unique',
  runsTicketFk: 'daily_runs_ticket_fk',
} as const

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
  -- 公開ID＝SHA-256(端末が持つ秘密)の先頭32桁。秘密そのものは保存しない
  player_id     text        PRIMARY KEY,
  created_at    timestamptz NOT NULL DEFAULT now(),
  -- レート制限用。当日ぶんだけ保持し、日が変われば0から数え直す
  attempt_day   date,
  attempt_count integer     NOT NULL DEFAULT 0
)`,
    `CREATE TABLE IF NOT EXISTS daily_days (
  -- JSTの日付キー 'YYYY-MM-DD'
  daily_key    text        PRIMARY KEY,
  -- その日の最初のticketが固定したコードの版。以後この日は他の版を混ぜない
  game_version text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
)`,
    `CREATE TABLE IF NOT EXISTS daily_tickets (
  daily_key     text        NOT NULL REFERENCES daily_days (daily_key) ON DELETE CASCADE,
  player_id     text        NOT NULL REFERENCES players (player_id) ON DELETE CASCADE,
  -- ticketの識別子は clientRunId そのもの（識別子を増やさない）
  client_run_id text        NOT NULL,
  -- その日の何回目か。1〜${ATTEMPTS_PER_DAY} の範囲をDBが保証する
  attempt_no    smallint    NOT NULL,
  issued_at     timestamptz NOT NULL,
  -- これを過ぎた ticket では提出できない（TTLと日末graceの早い方）
  expires_at    timestamptz NOT NULL,
  game_version  text        NOT NULL,
  -- NULL＝進行中。'abandoned'＝別の挑戦を始めたので放棄（枠は消費）
  -- 'voided'＝deployで無効化（枠は**返還**）
  closed_reason text
    CONSTRAINT ${CONSTRAINT_NAMES.ticketsClosedReason} CHECK (closed_reason IN ('abandoned', 'voided')),

  CONSTRAINT daily_tickets_pkey PRIMARY KEY (daily_key, client_run_id),
  CONSTRAINT daily_tickets_attempt_range CHECK (attempt_no BETWEEN 1 AND ${ATTEMPTS_PER_DAY})
)`,
    // 部分UNIQUE：'voided' は番号を返還するので衝突の対象から外す。
    // これが「1日${ATTEMPTS_PER_DAY}枠」を並列startのraceに依存せず保証する
    `CREATE UNIQUE INDEX IF NOT EXISTS daily_tickets_attempt_unique
  ON daily_tickets (daily_key, player_id, attempt_no)
  WHERE closed_reason IS DISTINCT FROM 'voided'`,
    `CREATE TABLE IF NOT EXISTS daily_runs (
  -- JSTの日付キー。敵とseedはここから再導出できるので列に持たない
  daily_key     text        NOT NULL,
  player_id     text        NOT NULL REFERENCES players (player_id) ON DELETE CASCADE,
  client_run_id text        NOT NULL,
  -- ticketが決めた番号をそのまま写す（提出順では決まらない）
  attempt_no    smallint    NOT NULL,
  -- 検証したときのコードの版
  game_version  text        NOT NULL,
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
  -- ② 1つの枠に入るrunは1件だけ
  CONSTRAINT daily_runs_attempt_range CHECK (attempt_no BETWEEN 1 AND ${ATTEMPTS_PER_DAY}),
  CONSTRAINT daily_runs_attempt_unique UNIQUE (daily_key, player_id, attempt_no),
  -- ③ ticketを持たないrunは存在できない（提出だけで枠を作れない）
  CONSTRAINT daily_runs_ticket_fk FOREIGN KEY (daily_key, client_run_id)
    REFERENCES daily_tickets (daily_key, client_run_id) ON DELETE CASCADE
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
 * 保存済みデータを古い日付ぶん剪定するSQL（`startRun` が時々呼ぶ）。
 * ランキングは当日ぶんしか使わないので、履歴を無限に持たない。
 * `daily_days` を消せば ticket も run も CASCADE で消える。
 */
export function buildPruneSql(retentionDays: number): string {
  return `DELETE FROM daily_days
 WHERE daily_key < to_char(now() - interval '${retentionDays} days', 'YYYY-MM-DD');`
}

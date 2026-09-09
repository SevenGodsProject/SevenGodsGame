import { RULES } from './deps.js'
import { CONSTRAINT_NAMES } from './schema.js'
import type { InsertRunResult, InsertTicketResult, RankingStore } from './store.js'
import type { RunTicket, TicketClosedReason } from './ticket.js'
import type { RankingRun } from './types.js'

/**
 * Phase 4.4〜4.6：`RankingStore` の Postgres（Neon）実装。
 *
 * ★ドライバに依存しない
 * このファイルは `@neondatabase/serverless` も `pg` も import しない。
 * SQLを実行する関数（`SqlExecutor`）を**注入**してもらう形にしてある。
 *   - サーバーの起動地点（Vercel Function 等）でだけドライバを触ればよい
 *   - `src/server` 全体が「外部パッケージ0件」を保てる（境界テストで検査）
 *   - ドライバを差し替えても（neon serverless / pg / postgres.js）ここは変わらない
 *
 * 接続の実体を書くのは3行で足りる（Neon serverless の場合）：
 *   import { neon } from '@neondatabase/serverless'
 *   const client = neon(<環境変数から読んだ接続文字列>)
 *   const sql: SqlExecutor = (text, params) => client.query(text, params)
 *
 * ★DB固有のコードはこのファイルだけに閉じる
 * `start.ts` / `submit.ts` / `leaderboard.ts` は SQL を1行も持たない。
 *
 * ★不変条件はすべてDBの制約が保証する（決定139 §10）
 * 「読んでから書く」の隙間に別のリクエストが割り込んでも壊れないように、
 * 判定と書き込みを**1文のINSERT**にまとめ、CHECK / 部分UNIQUE / PRIMARY KEY に
 * 判定させる。ロックもトランザクションも使わない。
 */

/** SQLを実行して行を返す関数。パラメータは `$1, $2, ...` の位置指定 */
export type SqlExecutor = <T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
) => Promise<T[]>

/** Postgresのエラーコード（SQLSTATE） */
const UNIQUE_VIOLATION = '23505'
const CHECK_VIOLATION = '23514'

function sqlStateOf(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' ? code : null
}

/** 違反した制約の名前（ドライバが載せてくれる場合のみ）。無ければ null */
function constraintOf(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null
  const name = (error as { constraint?: unknown }).constraint
  return typeof name === 'string' ? name : null
}

type RunRow = {
  daily_key: string
  player_id: string
  client_run_id: string
  attempt_no: number | string
  game_version: string
  god_id: string
  score: number | string
  win: boolean
  round: number | string
  rng_cursor: number | string
  action_count: number | string
  submitted_at: string | Date
}

type TicketRow = {
  daily_key: string
  player_id: string
  client_run_id: string
  attempt_no: number | string
  issued_at: string | Date
  expires_at: string | Date
  game_version: string
  closed_reason: string | null
}

/** Postgresは bigint/numeric を文字列で返すことがあるため、数値へ正規化する */
const num = (value: number | string): number =>
  typeof value === 'number' ? value : Number(value)

const millis = (value: string | Date): number =>
  value instanceof Date ? value.getTime() : new Date(value).getTime()

function toRun(row: RunRow): RankingRun {
  return {
    dailyKey: row.daily_key,
    playerId: row.player_id,
    clientRunId: row.client_run_id,
    attemptNo: num(row.attempt_no),
    gameVersion: row.game_version,
    godId: row.god_id as RankingRun['godId'],
    score: num(row.score),
    win: row.win,
    round: num(row.round),
    rngCursor: num(row.rng_cursor),
    actionCount: num(row.action_count),
    submittedAt: millis(row.submitted_at),
  }
}

function toTicket(row: TicketRow): RunTicket {
  return {
    dailyKey: row.daily_key,
    playerId: row.player_id,
    clientRunId: row.client_run_id,
    attemptNo: num(row.attempt_no),
    issuedAt: millis(row.issued_at),
    expiresAt: millis(row.expires_at),
    gameVersion: row.game_version,
    closedReason: (row.closed_reason as TicketClosedReason | null) ?? null,
  }
}

const RUN_COLUMNS =
  'daily_key, player_id, client_run_id, attempt_no, game_version, god_id, score, win, round, rng_cursor, action_count, submitted_at'

const TICKET_COLUMNS =
  'daily_key, player_id, client_run_id, attempt_no, issued_at, expires_at, game_version, closed_reason'

export function createPostgresRankingStore(sql: SqlExecutor): RankingStore {
  return {
    /**
     * その日の版を固定する。
     * 「無ければ入れて、あるならそれを返す」を**1文**で行う（読んでから書くと、
     * その日の最初の2件が同時に来たとき別々の版で二重に固定しうる）。
     */
    async lockDayVersion(dailyKey, gameVersion) {
      const rows = await sql<{ game_version: string }>(
        `WITH inserted AS (
           INSERT INTO daily_days (daily_key, game_version)
           VALUES ($1, $2)
           ON CONFLICT (daily_key) DO NOTHING
           RETURNING game_version
         )
         SELECT game_version FROM inserted
         UNION ALL
         SELECT game_version FROM daily_days WHERE daily_key = $1
         LIMIT 1`,
        [dailyKey, gameVersion],
      )
      return rows.length > 0 ? rows[0].game_version : gameVersion
    },

    async findTicket(dailyKey, clientRunId) {
      const rows = await sql<TicketRow>(
        `SELECT ${TICKET_COLUMNS} FROM daily_tickets
          WHERE daily_key = $1 AND client_run_id = $2`,
        [dailyKey, clientRunId],
      )
      return rows.length > 0 ? toTicket(rows[0]) : null
    },

    async listTickets(dailyKey, playerId) {
      const rows = await sql<TicketRow>(
        `SELECT ${TICKET_COLUMNS} FROM daily_tickets
          WHERE daily_key = $1 AND player_id = $2
          ORDER BY attempt_no ASC`,
        [dailyKey, playerId],
      )
      return rows.map(toTicket)
    },

    /**
     * ★1日の上限判定の最終権限。
     *
     * プレイヤー行の用意とticketの発行を1文にまとめてある（データ変更CTE）。
     * ticketのINSERTが制約で落ちれば、プレイヤー行の作成ごと巻き戻る。
     *   - `attempt_no` が範囲外        → CHECK 23514 → `attempts-exceeded`
     *   - 同じ `client_run_id`         → PK 23505    → `duplicate-run-id`
     *   - 同じ番号が既に埋まっている    → 部分UNIQUE 23505 → `attempt-taken`
     */
    async insertTicket(ticket: RunTicket): Promise<InsertTicketResult> {
      try {
        await sql(
          `WITH ensure_player AS (
             INSERT INTO players (player_id) VALUES ($2)
             ON CONFLICT (player_id) DO NOTHING
           )
           INSERT INTO daily_tickets
             (daily_key, player_id, client_run_id, attempt_no, issued_at, expires_at, game_version)
           VALUES ($1, $2, $3, $4,
                   to_timestamp($5::double precision / 1000),
                   to_timestamp($6::double precision / 1000),
                   $7)`,
          [
            ticket.dailyKey,
            ticket.playerId,
            ticket.clientRunId,
            ticket.attemptNo,
            ticket.issuedAt,
            ticket.expiresAt,
            ticket.gameVersion,
          ],
        )
        return { ok: true }
      } catch (error) {
        const state = sqlStateOf(error)
        const constraint = constraintOf(error)
        if (state === CHECK_VIOLATION) {
          // ★23514 を無条件に「回数超過」と読まない。
          // daily_tickets には CHECK が2つある（attempt_no の範囲／closed_reason の値）。
          // 名前が取れれば範囲制約のときだけ回数超過と判定し、それ以外は内部矛盾として投げ直す
          if (constraint === CONSTRAINT_NAMES.ticketsAttemptRange) {
            return { ok: false, reason: 'attempts-exceeded' }
          }
          if (constraint !== null) throw error
          // 名前を載せないドライバのための読み直し：消費済みの枠を数えて判断する
          const used = await sql<{ n: number | string }>(
            `SELECT count(*) AS n FROM daily_tickets
              WHERE daily_key = $1 AND player_id = $2
                AND closed_reason IS DISTINCT FROM 'voided'`,
            [ticket.dailyKey, ticket.playerId],
          )
          if (num(used[0].n) >= RULES.daily.attemptsPerDay) {
            return { ok: false, reason: 'attempts-exceeded' }
          }
          throw error
        }
        if (state === UNIQUE_VIOLATION) {
          if (constraint === CONSTRAINT_NAMES.ticketsAttemptUnique) return { ok: false, reason: 'attempt-taken' }
          if (constraint === CONSTRAINT_NAMES.ticketsPkey) return { ok: false, reason: 'duplicate-run-id' }
          // 制約名が取れないドライバのための読み直し
          const existing = await sql<{ one: number }>(
            `SELECT 1 AS one FROM daily_tickets WHERE daily_key = $1 AND client_run_id = $2`,
            [ticket.dailyKey, ticket.clientRunId],
          )
          return existing.length > 0
            ? { ok: false, reason: 'duplicate-run-id' }
            : { ok: false, reason: 'attempt-taken' }
        }
        throw error
      }
    },

    async closeTicket(dailyKey, clientRunId, reason) {
      // 既に閉じている ticket は変更しない（最初の理由を残す）
      await sql(
        `UPDATE daily_tickets SET closed_reason = $3
          WHERE daily_key = $1 AND client_run_id = $2 AND closed_reason IS NULL`,
        [dailyKey, clientRunId, reason],
      )
    },

    async findRun(dailyKey, clientRunId) {
      const rows = await sql<RunRow>(
        `SELECT ${RUN_COLUMNS} FROM daily_runs WHERE daily_key = $1 AND client_run_id = $2`,
        [dailyKey, clientRunId],
      )
      return rows.length > 0 ? toRun(rows[0]) : null
    },

    async listPlayerRuns(dailyKey, playerId) {
      const rows = await sql<RunRow>(
        `SELECT ${RUN_COLUMNS} FROM daily_runs
          WHERE daily_key = $1 AND player_id = $2
          ORDER BY attempt_no ASC`,
        [dailyKey, playerId],
      )
      return rows.map(toRun)
    },

    /**
     * 受理したrunを1件入れる。
     * 番号は ticket が決めたものをそのまま使う（提出順で決めない）。
     * 同じticketへ同時に2件来た場合は UNIQUE / PK が片方を落とす。
     */
    async insertRun(run: RankingRun): Promise<InsertRunResult> {
      try {
        const rows = await sql<{ attempt_no: number | string }>(
          `INSERT INTO daily_runs
             (daily_key, player_id, client_run_id, attempt_no, game_version,
              god_id, score, win, round, rng_cursor, action_count, submitted_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                   to_timestamp($12::double precision / 1000))
           RETURNING attempt_no`,
          [
            run.dailyKey,
            run.playerId,
            run.clientRunId,
            run.attemptNo,
            run.gameVersion,
            run.godId,
            run.score,
            run.win,
            run.round,
            run.rngCursor,
            run.actionCount,
            run.submittedAt,
          ],
        )
        return { ok: true, attemptNo: num(rows[0].attempt_no) }
      } catch (error) {
        const state = sqlStateOf(error)
        if (state === UNIQUE_VIOLATION) {
          const constraint = constraintOf(error)
          if (constraint === CONSTRAINT_NAMES.runsAttemptUnique) return { ok: false, reason: 'attempt-taken' }
          if (constraint === CONSTRAINT_NAMES.runsPkey) return { ok: false, reason: 'duplicate' }
          const existing = await sql<{ one: number }>(
            `SELECT 1 AS one FROM daily_runs WHERE daily_key = $1 AND client_run_id = $2`,
            [run.dailyKey, run.clientRunId],
          )
          return existing.length > 0
            ? { ok: false, reason: 'duplicate' }
            : { ok: false, reason: 'attempt-taken' }
        }
        throw error
      }
    },

    async listDayRuns(dailyKey) {
      const rows = await sql<RunRow>(
        `SELECT ${RUN_COLUMNS} FROM daily_runs WHERE daily_key = $1`,
        [dailyKey],
      )
      return rows.map(toRun)
    },

    /**
     * 提出試行の回数。`players` に当日ぶんだけ持たせている
     * （日が変われば0から数え直すので、履歴用のテーブルを作らない）。
     */
    async countAttempts(dailyKey, playerId) {
      const rows = await sql<{ attempt_count: number | string }>(
        `SELECT attempt_count FROM players
          WHERE player_id = $1 AND attempt_day = $2::date`,
        [playerId, dailyKey],
      )
      return rows.length > 0 ? num(rows[0].attempt_count) : 0
    },

    async recordAttempt(dailyKey, playerId) {
      // プレイヤー行が無ければ作り、当日ぶんのカウンタを1増やす。
      // 日付が変わっていたら1へ戻す（前日の回数を引きずらない）
      await sql(
        `INSERT INTO players (player_id, attempt_day, attempt_count)
         VALUES ($1, $2::date, 1)
         ON CONFLICT (player_id) DO UPDATE
            SET attempt_day   = EXCLUDED.attempt_day,
                attempt_count = CASE
                  WHEN players.attempt_day = EXCLUDED.attempt_day THEN players.attempt_count + 1
                  ELSE 1
                END`,
        [playerId, dailyKey],
      )
    },

    /**
     * 古い日を消す。`daily_days` を消せば ticket も run も CASCADE で消える。
     * 併せて、ticketを1枚も持たない古いプレイヤー行も片付ける
     * （identity を量産されたときに `players` だけが残り続けないように）。
     */
    async pruneBefore(cutoffDailyKey) {
      await sql(`DELETE FROM daily_days WHERE daily_key < $1`, [cutoffDailyKey])
      await sql(
        `DELETE FROM players p
          WHERE NOT EXISTS (SELECT 1 FROM daily_tickets t WHERE t.player_id = p.player_id)
            AND NOT EXISTS (SELECT 1 FROM daily_runs r WHERE r.player_id = p.player_id)
            AND (p.attempt_day IS NULL OR p.attempt_day::text < $1)
            AND p.created_at < now() - interval '1 day'`,
        [cutoffDailyKey],
      )
    },
  }
}

/**
 * `daily_tickets` / `daily_runs` は `players` を参照するので、先にプレイヤー行が要る。
 * `insertTicket` が同じ文の中で用意する設計なので通常は不要だが、
 * 明示的に用意したい場合のために公開しておく。
 */
export function ensurePlayerSql(): string {
  return `INSERT INTO players (player_id) VALUES ($1) ON CONFLICT (player_id) DO NOTHING`
}

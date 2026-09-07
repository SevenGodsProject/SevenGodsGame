import { RULES } from './deps'
import type { InsertRunResult, RankingStore } from './store'
import type { RankingRun } from './types'

/**
 * Phase 4.4 Step 2：`RankingStore` の Postgres（Neon）実装。
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
 * `submit.ts` / `leaderboard.ts` は SQL を1行も持たない。
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

type RunRow = {
  daily_key: string
  player_id: string
  client_run_id: string
  god_id: string
  score: number | string
  win: boolean
  round: number | string
  rng_cursor: number | string
  action_count: number | string
  submitted_at: string | Date
}

/** Postgresは bigint/numeric を文字列で返すことがあるため、数値へ正規化する */
const num = (value: number | string): number =>
  typeof value === 'number' ? value : Number(value)

function toRun(row: RunRow): RankingRun {
  return {
    dailyKey: row.daily_key,
    playerId: row.player_id,
    clientRunId: row.client_run_id,
    godId: row.god_id as RankingRun['godId'],
    score: num(row.score),
    win: row.win,
    round: num(row.round),
    rngCursor: num(row.rng_cursor),
    actionCount: num(row.action_count),
    submittedAt:
      row.submitted_at instanceof Date
        ? row.submitted_at.getTime()
        : new Date(row.submitted_at).getTime(),
  }
}

const RUN_COLUMNS =
  'daily_key, player_id, client_run_id, god_id, score, win, round, rng_cursor, action_count, submitted_at'

export function createPostgresRankingStore(sql: SqlExecutor): RankingStore {
  return {
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
     * ★上限判定の最終権限。
     *
     * `attempt_no` を「今あるぶんの最大＋1」としてINSERT側で決めるので、
     * 「countしてからinsert」の隙間が存在しない。同時に2つ来た場合：
     *   - 両方が同じ `attempt_no` を狙う → UNIQUE 制約で片方が 23505 → 数え直して再試行
     *   - 上限を超える番号になった → CHECK 制約で 23514 → `attempts-exceeded`
     * ロックもトランザクションも使わずにDB側で保証できる（`schema.ts` 参照）。
     */
    async insertRun(run: RankingRun): Promise<InsertRunResult> {
      // 競合で番号がぶつかった場合の数え直し。上限＋1回まで試せば必ず決着する
      const maxRetries = RULES.daily.attemptsPerDay + 1
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const rows = await sql<{ attempt_no: number | string }>(
            `INSERT INTO daily_runs
               (daily_key, player_id, client_run_id, attempt_no,
                god_id, score, win, round, rng_cursor, action_count, submitted_at)
             SELECT $1, $2, $3, COALESCE(MAX(attempt_no), 0) + 1,
                    $4, $5, $6, $7, $8, $9, to_timestamp($10::double precision / 1000)
               FROM daily_runs
              WHERE daily_key = $1 AND player_id = $2
             RETURNING attempt_no`,
            [
              run.dailyKey,
              run.playerId,
              run.clientRunId,
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
          if (state === CHECK_VIOLATION) {
            // attempt_no が上限を超えた＝この日はもう挑戦できない
            return { ok: false, reason: 'attempts-exceeded' }
          }
          if (state === UNIQUE_VIOLATION) {
            // 主キー（同じrunの二重登録）か、attempt_no の競合か
            const existing = await sql<{ one: number }>(
              `SELECT 1 AS one FROM daily_runs WHERE daily_key = $1 AND client_run_id = $2`,
              [run.dailyKey, run.clientRunId],
            )
            if (existing.length > 0) return { ok: false, reason: 'duplicate' }
            // attempt_no の競合 → 数え直して再試行
            continue
          }
          throw error
        }
      }
      // ここへ来るのは、上限ぶん競り負け続けた場合＝もう空きが無い
      return { ok: false, reason: 'attempts-exceeded' }
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
  }
}

/**
 * `daily_runs` は `players` を参照するので、runを入れる前にプレイヤー行が要る。
 * `recordAttempt` が先に呼ばれる設計（`submitRun` の手順3）なので通常は不要だが、
 * 明示的に用意したい場合のために公開しておく。
 */
export function ensurePlayerSql(): string {
  return `INSERT INTO players (player_id) VALUES ($1) ON CONFLICT (player_id) DO NOTHING`
}

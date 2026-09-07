/**
 * Phase 4.3：Daily ランキングBackend。
 *
 * ホスティング（Vercel Functions 等）の薄いラッパーは、この入口だけを import すればよい。
 * ブラウザ側からは import しない（`rankingBoundary.test.ts` が検査している）。
 */
export { handleRankingRequest } from './http'
export type { RankingHttpDeps, RankingHttpRequest, RankingHttpResponse } from './http'
export { submitRun } from './submit'
export type { SubmitDeps } from './submit'
export { getLeaderboard } from './leaderboard'
export type { LeaderboardOptions } from './leaderboard'
export { createMemoryRankingStore } from './store'
export type { InsertRunResult, RankingStore } from './store'
export { createPostgresRankingStore, ensurePlayerSql } from './postgresStore'
export type { SqlExecutor } from './postgresStore'
export { buildRankingSchemaSql, buildPruneSql, ATTEMPTS_PER_DAY } from './schema'
export type {
  Leaderboard,
  LeaderboardRow,
  RankingRun,
  SubmitRejectionCode,
  SubmitRequest,
  SubmitResult,
} from './types'

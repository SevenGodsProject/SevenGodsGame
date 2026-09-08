/**
 * Phase 4.3〜4.6：Daily ランキングBackend。
 *
 * ホスティング（Vercel Functions 等）の薄いラッパーは、この入口だけを import すればよい。
 * ブラウザ側からは import しない（`rankingBoundary.test.ts` が検査している）。
 */
export { handleRankingRequest } from './http'
export type { RankingHttpDeps, RankingHttpRequest, RankingHttpResponse } from './http'
export { startRun } from './start'
export type { StartDeps, StartRejectionCode, StartRequest, StartResult } from './start'
export { submitRun } from './submit'
export type { SubmitDeps } from './submit'
export { getLeaderboard, clearLeaderboardCache } from './leaderboard'
export type { LeaderboardOptions } from './leaderboard'
export { derivePlayerId, verifyIdentity, isPlayerId, isPlayerSecret } from './identity'
export {
  ticketStateOf,
  consumesAttempt,
  dayEndOf,
  shiftDailyKey,
  expiryOf,
} from './ticket'
export type { RunTicket, TicketClosedReason, TicketState } from './ticket'
export { createMemoryRankingStore } from './store'
export type { InsertRunResult, InsertTicketResult, RankingStore } from './store'
export { createPostgresRankingStore, ensurePlayerSql } from './postgresStore'
export type { SqlExecutor } from './postgresStore'
export {
  buildRankingSchemaSql,
  buildRankingSchemaStatements,
  buildPruneSql,
  ATTEMPTS_PER_DAY,
} from './schema'
export type {
  Leaderboard,
  LeaderboardRow,
  RankingRun,
  SubmitRejectionCode,
  SubmitRequest,
  SubmitResult,
} from './types'

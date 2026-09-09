/**
 * Phase 4.3〜4.6：Daily ランキングBackend。
 *
 * ホスティング（Vercel Functions 等）の薄いラッパーは、この入口だけを import すればよい。
 * ブラウザ側からは import しない（`rankingBoundary.test.ts` が検査している）。
 */
export { handleRankingRequest } from './http.js'
export type { RankingHttpDeps, RankingHttpRequest, RankingHttpResponse } from './http.js'
export { startRun } from './start.js'
export type { StartDeps, StartRejectionCode, StartRequest, StartResult } from './start.js'
export { submitRun } from './submit.js'
export type { SubmitDeps } from './submit.js'
export { getLeaderboard, clearLeaderboardCache } from './leaderboard.js'
export type { LeaderboardOptions } from './leaderboard.js'
export { derivePlayerId, verifyIdentity, isPlayerId, isPlayerSecret } from './identity.js'
export {
  ticketStateOf,
  consumesAttempt,
  dayEndOf,
  shiftDailyKey,
  expiryOf,
} from './ticket.js'
export type { RunTicket, TicketClosedReason, TicketState } from './ticket.js'
export { createMemoryRankingStore } from './store.js'
export type { InsertRunResult, InsertTicketResult, RankingStore } from './store.js'
export { createPostgresRankingStore, ensurePlayerSql } from './postgresStore.js'
export type { SqlExecutor } from './postgresStore.js'
export {
  buildRankingSchemaSql,
  buildRankingSchemaStatements,
  buildPruneSql,
  ATTEMPTS_PER_DAY,
} from './schema.js'
export type {
  Leaderboard,
  LeaderboardRow,
  RankingRun,
  SubmitRejectionCode,
  SubmitRequest,
  SubmitResult,
} from './types.js'

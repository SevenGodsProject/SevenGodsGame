import { rankingRoute } from '../_lib/handler.js'

/**
 * Phase 4.8：`GET /api/ranking/leaderboard?dailyKey=YYYY-MM-DD[&limit=&playerId=]`
 *
 * 中身は `src/server/ranking/leaderboard.ts`（当日のベスト1件／人 → `assignRanks`）。
 * 応答には `RULES.ranking.leaderboardCacheSeconds` ぶんの `cache-control` が付く。
 *
 * ★このGETも `RANKING_API_ENABLED=1` が無ければ 503。
 * 提出の kill switch とは別の門番なので、「読み取りだけ先に開いてしまう」事故が起きない。
 */
const route = rankingRoute('/api/ranking/leaderboard')

export const GET = route
export const POST = route

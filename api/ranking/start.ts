import { rankingRoute } from '../_lib/handler'

/**
 * Phase 4.8：`POST /api/ranking/start` — 挑戦枠の予約（run ticket の発行）。
 *
 * 中身は `src/server/ranking/start.ts`。ここは Vercel への接続口でしかない。
 * `GET` も受け取るのは、ランタイム既定の 405 ではなく
 * このAPIの契約どおりの JSON（`{ error: 'method_not_allowed' }`）を返すため。
 *
 * ★既定では閉じている：`RANKING_API_ENABLED=1` が無ければ 503 を返す（`_lib/env.ts`）。
 */
const route = rankingRoute('/api/ranking/start')

export const POST = route
export const GET = route

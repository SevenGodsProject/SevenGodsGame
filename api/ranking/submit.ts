import { rankingRoute } from '../_lib/handler'

/**
 * Phase 4.8：`POST /api/ranking/submit` — 行動ログの提出と検証。
 *
 * 中身は `src/server/ranking/submit.ts`（ticket の照合 → リプレイ再生 → 保存）。
 * スコアはサーバーが計算した値だけを返す。クライアントの申告は受け取らない。
 *
 * ★既定では閉じている：`RANKING_API_ENABLED=1` が無ければ 503 を返す（`_lib/env.ts`）。
 */
const route = rankingRoute('/api/ranking/submit')

export const POST = route
export const GET = route

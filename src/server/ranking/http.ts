import { RULES, isValidDailyKey } from './deps'
import { getLeaderboard } from './leaderboard'
import type { RankingStore } from './store'
import { submitRun } from './submit'
import type { SubmitRequest, SubmitRejectionCode } from './types'

/**
 * Phase 4.3：HTTPの受け口（フレームワーク非依存）。
 *
 * Vercel Functions・Node・Deno のどれで動かすことになっても、ホスティング側の
 * ラッパーは「Requestをこの形に詰め替えて、返ってきた `{status, body}` を返す」だけで済む。
 * **どのホスティングにも決め打ちしない**ことで、Neonの契約可否やplanの選択（§6-3 #6、CEO判断）
 * が固まる前にBackendの中身を完成させ、テストできるようにしている。
 *
 * ★このファイルは `api/` には置いていない。
 * リポジトリ直下に `api/` を作るとVercelが次のdeployで自動的にエンドポイントを公開してしまい、
 * 「deployしない」という制約を、merge時に意図せず破ることになるため。
 * 公開用の薄いラッパーはBackend本番稼働が承認された時点で追加する（docs参照）。
 */

export type RankingHttpRequest = {
  method: string
  /** '/api/ranking/submit' のようなパス */
  path: string
  /** JSONとしてパース済みのbody（GETではundefined） */
  body?: unknown
  query?: Record<string, string | undefined>
}

export type RankingHttpResponse = {
  status: number
  body: unknown
}

export type RankingHttpDeps = {
  store: RankingStore
  now: number
}

/** 拒否理由 → HTTPステータス。運用のログ・監視がそのまま使える粒度にする */
const STATUS_BY_CODE: Record<SubmitRejectionCode, number> = {
  BAD_IDENTITY: 400,
  RUN_ID_CONFLICT: 409,
  RATE_LIMITED: 429,
  ATTEMPTS_EXCEEDED: 409,
  STALE_DAILY_KEY: 409,
  REPLAY_REJECTED: 422,
}

function isSubmitRequest(value: unknown): value is SubmitRequest {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.playerId === 'string' &&
    typeof v.clientRunId === 'string' &&
    !!v.input &&
    typeof v.input === 'object'
  )
}

export async function handleRankingRequest(
  request: RankingHttpRequest,
  deps: RankingHttpDeps,
): Promise<RankingHttpResponse> {
  const path = request.path.replace(/\/+$/, '')

  if (path.endsWith('/ranking/submit')) {
    if (request.method !== 'POST') {
      return { status: 405, body: { error: 'method_not_allowed' } }
    }
    // ★kill switch：Backendの本番稼働がCEO承認されるまでは受け付けない
    if (!RULES.ranking.submissionEnabled) {
      return { status: 503, body: { error: 'submission_disabled' } }
    }
    if (!isSubmitRequest(request.body)) {
      return { status: 400, body: { error: 'bad_request' } }
    }
    const result = await submitRun(request.body, deps)
    if (!result.ok) {
      return {
        status: STATUS_BY_CODE[result.code],
        body: { error: result.code, message: result.message, replayCode: result.replayCode },
      }
    }
    return {
      status: result.accepted === 'stored' ? 201 : 200,
      body: {
        accepted: result.accepted,
        // 返すのは**サーバーが計算した値**。クライアントの申告を反射しない
        score: result.outcome.score,
        win: result.outcome.win,
        round: result.outcome.round,
        bestScore: result.bestScore,
        runsUsed: result.runsUsed,
        attemptsPerDay: RULES.daily.attemptsPerDay,
      },
    }
  }

  if (path.endsWith('/ranking/leaderboard')) {
    if (request.method !== 'GET') {
      return { status: 405, body: { error: 'method_not_allowed' } }
    }
    const dailyKey = request.query?.dailyKey
    if (!dailyKey || !isValidDailyKey(dailyKey)) {
      return { status: 400, body: { error: 'bad_daily_key' } }
    }
    const rawLimit = Number(request.query?.limit)
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(Math.floor(rawLimit), RULES.ranking.leaderboardLimit)
        : RULES.ranking.leaderboardLimit
    const board = await getLeaderboard(dailyKey, deps.store, {
      limit,
      playerId: request.query?.playerId,
    })
    return { status: 200, body: board }
  }

  return { status: 404, body: { error: 'not_found' } }
}

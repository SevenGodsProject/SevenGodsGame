import { RULES, isValidDailyKey } from './deps.js'
import { getLeaderboard } from './leaderboard.js'
import { startRun, type StartRejectionCode, type StartRequest } from './start.js'
import type { RankingStore } from './store.js'
import { submitRun } from './submit.js'
import type { SubmitRequest, SubmitRejectionCode } from './types.js'

/**
 * Phase 4.3〜4.6：HTTPの受け口（フレームワーク非依存）。
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
 *
 * ★Phase 4.6 で増えたもの
 *   - `POST /ranking/start`（挑戦枠の予約）
 *   - bodyの大きさの門番（`maxBodyBytes`）。JSON解析やリプレイ検証より**前**に切る
 *   - リーダーボードのキャッシュヘッダ（CDN・ブラウザにも同じ猶予を伝える）
 */

export type RankingHttpRequest = {
  method: string
  /** '/api/ranking/submit' のようなパス */
  path: string
  /** JSONとしてパース済みのbody（GETではundefined） */
  body?: unknown
  query?: Record<string, string | undefined>
  /**
   * 受信した生bodyのバイト数。ホスティング側のラッパーが渡す。
   * 省略された場合は大きさの検査を行わない（`maxActions` などの後段の門番は効く）。
   */
  bodyBytes?: number
}

export type RankingHttpResponse = {
  status: number
  body: unknown
  /** 応答ヘッダ（CDN・ブラウザ向け。無い場合は付けない） */
  headers?: Record<string, string>
}

export type RankingHttpDeps = {
  store: RankingStore
  now: number
  /** 現在deployされているコードの版。省略時は `getGameVersion()` */
  gameVersion?: string
  /**
   * Phase 4.8：kill switch の実効値。**省略時は `RULES.ranking.submissionEnabled`**（＝false）。
   *
   * ★なぜ注入できるようにするか
   * Preview 環境で start→submit の一連の流れを実地に検証するには、その deployment に限って
   * 提出を通す必要がある。`rules.ts` の定数を true にすると **本番にもそのまま乗ってしまう**ので、
   * コードは false のまま、**環境ごとの値**をここへ渡す形にした（`api/_lib/env.ts`）。
   * production では環境変数を読んでも開かないようにしてある（同ファイルの `submissionUnlocked`）。
   */
  submissionEnabled?: boolean
}

/** 拒否理由 → HTTPステータス。運用のログ・監視がそのまま使える粒度にする */
const STATUS_BY_CODE: Record<SubmitRejectionCode, number> = {
  BAD_IDENTITY: 400,
  RUN_ID_CONFLICT: 409,
  RATE_LIMITED: 429,
  ATTEMPTS_EXCEEDED: 409,
  NO_TICKET: 404,
  TICKET_CLOSED: 409,
  TICKET_EXPIRED: 410,
  RULES_VERSION_MISMATCH: 409,
  REPLAY_REJECTED: 422,
}

const START_STATUS_BY_CODE: Record<StartRejectionCode, number> = {
  BAD_IDENTITY: 400,
  ATTEMPTS_EXCEEDED: 409,
  RULES_VERSION_LOCKED: 423,
  RETRY: 503,
}

function isStartRequest(value: unknown): value is StartRequest {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.playerId === 'string' &&
    typeof v.playerSecret === 'string' &&
    typeof v.clientRunId === 'string'
  )
}

function isSubmitRequest(value: unknown): value is SubmitRequest {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.playerId === 'string' &&
    typeof v.playerSecret === 'string' &&
    typeof v.clientRunId === 'string' &&
    !!v.input &&
    typeof v.input === 'object'
  )
}

/** 大きすぎるbodyは、解析も検証もせずに切る（決定139 §7-2 T12） */
function tooLarge(request: RankingHttpRequest): boolean {
  return typeof request.bodyBytes === 'number' && request.bodyBytes > RULES.ranking.maxBodyBytes
}

/** kill switch の実効値。既定は `rules.ts` の定数（＝false） */
function submissionOpen(deps: RankingHttpDeps): boolean {
  return deps.submissionEnabled ?? RULES.ranking.submissionEnabled
}

export async function handleRankingRequest(
  request: RankingHttpRequest,
  deps: RankingHttpDeps,
): Promise<RankingHttpResponse> {
  const path = request.path.replace(/\/+$/, '')

  if (path.endsWith('/ranking/start')) {
    if (request.method !== 'POST') {
      return { status: 405, body: { error: 'method_not_allowed' } }
    }
    // ★kill switch：Backendの本番稼働がCEO承認されるまでは受け付けない
    if (!submissionOpen(deps)) {
      return { status: 503, body: { error: 'submission_disabled' } }
    }
    if (tooLarge(request)) {
      return { status: 413, body: { error: 'payload_too_large' } }
    }
    if (!isStartRequest(request.body)) {
      return { status: 400, body: { error: 'bad_request' } }
    }
    const result = await startRun(request.body, deps)
    if (!result.ok) {
      return {
        status: START_STATUS_BY_CODE[result.code],
        body: { error: result.code, message: result.message },
      }
    }
    return {
      status: result.reused ? 200 : 201,
      body: {
        dailyKey: result.ticket.dailyKey,
        clientRunId: result.ticket.clientRunId,
        attemptNo: result.ticket.attemptNo,
        attemptsUsed: result.attemptsUsed,
        attemptsPerDay: RULES.daily.attemptsPerDay,
        issuedAt: result.ticket.issuedAt,
        expiresAt: result.ticket.expiresAt,
        gameVersion: result.ticket.gameVersion,
        state: result.state,
        reused: result.reused,
        abandoned: result.abandoned,
        serverNow: result.serverNow,
      },
    }
  }

  if (path.endsWith('/ranking/submit')) {
    if (request.method !== 'POST') {
      return { status: 405, body: { error: 'method_not_allowed' } }
    }
    if (!submissionOpen(deps)) {
      return { status: 503, body: { error: 'submission_disabled' } }
    }
    if (tooLarge(request)) {
      return { status: 413, body: { error: 'payload_too_large' } }
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
        attemptNo: result.run.attemptNo,
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
      now: deps.now,
    })
    const seconds = RULES.ranking.leaderboardCacheSeconds
    return {
      status: 200,
      body: board,
      headers: {
        // CDN・ブラウザにも同じ猶予を伝える。集計はサーバー側でも同じ秒数だけ使い回す
        'cache-control': `public, s-maxage=${seconds}, stale-while-revalidate=${seconds * 4}`,
      },
    }
  }

  return { status: 404, body: { error: 'not_found' } }
}

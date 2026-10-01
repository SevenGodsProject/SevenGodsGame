import { RULES } from '../core/data/rules'
import type { ReplayInput } from '../core/replay'
import { getAnonymousIdentity, type AnonymousIdentity } from './anonymousPlayerId'
import { loadPendingRuns, removePendingRun, type PendingRun } from './pendingRunStorage'
import { saveTicket, type StoredTicket } from './rankingTicketStorage'

/**
 * Phase 4.3〜4.6：ランキングサーバーとのやりとり。
 *
 * ★kill switch
 * `RULES.ranking.submissionEnabled` が **false** の間、この モジュールは
 * **一切通信しない**。Backendの本番稼働がCEO承認されるまでは false のまま。
 *
 * ★通信手段は注入する（`transport`）
 * `fetch` を直接呼ばないのは、①テストで本物のネットワークに触れないため
 * ②「送信するかどうか」の判断を1か所に閉じ込めるため。
 *
 * ★秘密の扱い（決定139 §3-2）
 * `playerSecret` は **POST の body にだけ**載せる。URL（query）には決して入れない
 * ——URLはブラウザ履歴・Referer・アクセスログ・CDNログに残るため。
 * ログにも出さない（`secrets.test.ts` が機械検査している）。
 *
 * ★Phase 4.6 で増えた `startRankedRun`
 * 挑戦を始める前にサーバーへ枠を予約しに行く。ここで得た ticket を**保存してから**
 * 対局を始める（決定139 §12）。サーバーが落ちている・kill switchが閉じている場合は
 * `ranked: false` を返し、**ゲーム本体はそのまま遊べる**（ランキング対象外になるだけ）。
 */

export type RankingTransport = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ status: number; json: () => Promise<unknown> }>

const defaultTransport: RankingTransport = async (url, init) => {
  const response = await globalThis.fetch(url, init)
  return { status: response.status, json: () => response.json() as Promise<unknown> }
}

export type RankingClientOptions = {
  /** 送信先のベースURL。未設定なら同一オリジンの `/api` */
  baseUrl?: string
  transport?: RankingTransport
  /** テスト用。省略時は端末のidentityを使う */
  identity?: AnonymousIdentity
  /** テスト用の現在時刻。省略時は `Date.now()` */
  now?: number
}

// ---------------------------------------------------------------------------
// 開始（枠の予約）
// ---------------------------------------------------------------------------

/** ランキング対象にならなかった理由。UIの文言はこれで分岐する */
export type UnrankedReason =
  /** kill switch が閉じている（＝ランキング機能そのものが未稼働） */
  | 'disabled'
  /** サーバーへ届かない・5xx・想定外の応答（＝一時的な障害） */
  | 'unavailable'
  /** 本日の挑戦回数を使い切っている */
  | 'attempts-exceeded'
  /** その日は別のバージョンで進行中（deploy直後） */
  | 'version-locked'
  /** 端末のidentityを用意できなかった（乱数が使えない等） */
  | 'identity'

export type RankedStart =
  | { ranked: true; ticket: StoredTicket }
  | { ranked: false; reason: UnrankedReason }

type StartResponseBody = {
  dailyKey?: unknown
  clientRunId?: unknown
  attemptNo?: unknown
  expiresAt?: unknown
  gameVersion?: unknown
  serverNow?: unknown
}

function toTicket(body: StartResponseBody, receivedAt: number): StoredTicket | null {
  if (
    typeof body.dailyKey !== 'string' ||
    typeof body.clientRunId !== 'string' ||
    typeof body.attemptNo !== 'number' ||
    typeof body.expiresAt !== 'number' ||
    typeof body.gameVersion !== 'string' ||
    typeof body.serverNow !== 'number'
  ) {
    return null
  }
  return {
    dailyKey: body.dailyKey,
    clientRunId: body.clientRunId,
    attemptNo: body.attemptNo,
    expiresAt: body.expiresAt,
    gameVersion: body.gameVersion,
    serverNow: body.serverNow,
    receivedAt,
  }
}

/**
 * 挑戦の枠をサーバーへ予約する。
 *
 * @param clientRunId この挑戦のID。**呼び出し側が先に発行し、再試行でも同じ値を使う**。
 *   同じIDで何度呼んでも同じ ticket が返る（枠は1つしか減らない）。
 *
 * 成功した場合、ticketを**localStorageへ保存してから**返す。呼び出し側は返り値を
 * 受け取った時点で「控えは既に取れている」と考えてよい（決定139 §12）。
 */
export async function startRankedRun(
  clientRunId: string,
  options: RankingClientOptions = {},
): Promise<RankedStart> {
  if (!RULES.ranking.submissionEnabled) return { ranked: false, reason: 'disabled' }

  let identity: AnonymousIdentity
  try {
    identity = options.identity ?? (await getAnonymousIdentity())
  } catch {
    return { ranked: false, reason: 'identity' }
  }

  const transport = options.transport ?? defaultTransport
  const baseUrl = options.baseUrl ?? '/api'

  // ★新しい枠を取る前に、送り残しを片付ける。
  // 新しい挑戦を始めると進行中のticketは `abandoned` になる（決定139 §11）。
  // 「決着したが通信が途切れて送れていないrun」を控えたまま次を始めると、
  // そのticketが閉じられて**正当に遊び切った結果が二度と提出できなくなる**。
  // ここで先に流しておけば、そのticketは `submitted` になってから閉じられる。
  // 失敗しても開始は妨げない（オフラインなら控えは残り、次の機会に再送される）。
  await flushPendingRuns({ ...options, transport }).catch(() => undefined)

  try {
    const response = await transport(`${baseUrl}/ranking/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // ★秘密はbodyのみ。URLには絶対に入れない
      body: JSON.stringify({ ...identity, clientRunId }),
    })

    if (response.status === 200 || response.status === 201) {
      const ticket = toTicket((await response.json()) as StartResponseBody, options.now ?? Date.now())
      if (!ticket) return { ranked: false, reason: 'unavailable' }
      // ★保存してから返す。保存前に対局が始まると、落ちたときに枠を取り戻せない
      saveTicket(ticket)
      return { ranked: true, ticket }
    }
    if (response.status === 409) return { ranked: false, reason: 'attempts-exceeded' }
    if (response.status === 423) return { ranked: false, reason: 'version-locked' }
    return { ranked: false, reason: 'unavailable' }
  } catch {
    // 通信そのものが失敗した。ゲームは遊べる（ランキング対象外になるだけ）
    return { ranked: false, reason: 'unavailable' }
  }
}

// ---------------------------------------------------------------------------
// 提出
// ---------------------------------------------------------------------------

export type SubmitOutcome =
  /** 送信していない（kill switchがoff、または控えが空） */
  | { status: 'disabled' | 'empty'; submitted: 0 }
  /** 送信した */
  | { status: 'done'; submitted: number; accepted: number; failed: number; errors: string[] }

/** 送信するpayload。ここに結果の自己申告は入らない（`ReplayInput`に存在しない） */
export type SubmitPayload = {
  playerId: string
  playerSecret: string
  clientRunId: string
  input: ReplayInput
}

export function buildSubmitPayload(run: PendingRun, identity: AnonymousIdentity): SubmitPayload {
  return { ...identity, clientRunId: run.clientRunId, input: run.input }
}

export type FlushOptions = RankingClientOptions & {
  /** 1回のflushで送る最大件数（残りは次回） */
  max?: number
}

/**
 * 控えてある未送信runを順に提出する。
 * **`RULES.ranking.submissionEnabled` が false の間は一切通信しない。**
 *
 * ★再送の考え方（Phase 4.2の設計に乗る）
 * 送るのは `pendingRuns` に控えてある `{ clientRunId, input }` だけ。
 * 同じrunを何度送っても `clientRunId` が同じなのでサーバーは冪等に扱い、
 * 受理された分だけ控えから消す。ネットワークが落ちても控えは残る。
 */
export async function flushPendingRuns(options: FlushOptions = {}): Promise<SubmitOutcome> {
  if (!RULES.ranking.submissionEnabled) return { status: 'disabled', submitted: 0 }

  const runs = loadPendingRuns()
  if (runs.length === 0) return { status: 'empty', submitted: 0 }

  let identity: AnonymousIdentity
  try {
    identity = options.identity ?? (await getAnonymousIdentity())
  } catch {
    return { status: 'disabled', submitted: 0 }
  }

  const transport = options.transport ?? defaultTransport
  const baseUrl = options.baseUrl ?? '/api'
  const batch = runs.slice(0, options.max ?? runs.length)

  let accepted = 0
  let failed = 0
  const errors: string[] = []

  for (const run of batch) {
    try {
      const response = await transport(`${baseUrl}/ranking/submit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildSubmitPayload(run, identity)),
      })
      if (response.status === 200 || response.status === 201) {
        // 受理された（新規・再送のどちらでも）ので控えから外す
        removePendingRun(run.clientRunId)
        accepted++
      } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        // 恒久的な拒否（ticket無し・期限切れ・版違い・不正）。何度送っても通らないので外す
        removePendingRun(run.clientRunId)
        failed++
        errors.push(`${run.clientRunId}: ${response.status}`)
      } else {
        // 一時的な失敗（5xx・429）。控えに残して次回また送る
        failed++
        errors.push(`${run.clientRunId}: ${response.status}`)
      }
    } catch (e) {
      // 通信そのものが失敗。控えは残す
      failed++
      errors.push(`${run.clientRunId}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return { status: 'done', submitted: batch.length, accepted, failed, errors }
}

import { RULES } from '../core/data/rules'
import type { ReplayInput } from '../core/replay'
import { getAnonymousPlayerId } from './anonymousPlayerId'
import { loadPendingRuns, removePendingRun, type PendingRun } from './pendingRunStorage'

/**
 * Phase 4.3：送信待ちrunをサーバーへ提出するクライアント。
 *
 * ★Phase 4.3 の時点では実際には送信しない。
 * `RULES.ranking.submissionEnabled` が **false**（ランキングBackendの本番環境は
 * CEO判断待ちで未契約）である限り、この関数は何もせず `disabled` を返す。
 * フラグを true にするのは、Backendの本番稼働をCEOが承認したあと。
 *
 * ★通信手段は注入する（`transport`）。
 * `fetch` を直接呼ばないのは、①テストで本物のネットワークに触れないため
 * ②「送信するかどうか」の判断を1か所（このモジュール）に閉じ込めるため。
 * 既定の transport は `globalThis.fetch` を使うが、フラグがfalseなら呼ばれない。
 *
 * ★再送の考え方（Phase 4.2の設計に乗る）
 * 送るのは `pendingRuns` に控えてある `{ clientRunId, input }` だけ。
 * 同じrunを何度送っても `clientRunId` が同じなのでサーバーは冪等に扱い、
 * 受理された分だけ控えから消す。ネットワークが落ちても控えは残る。
 */

export type SubmitOutcome =
  /** 送信していない（kill switchがoff、または控えが空） */
  | { status: 'disabled' | 'empty'; submitted: 0 }
  /** 送信した */
  | { status: 'done'; submitted: number; accepted: number; failed: number; errors: string[] }

export type RankingTransport = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ status: number; json: () => Promise<unknown> }>

export type FlushOptions = {
  /** 送信先のベースURL。未設定なら同一オリジンの `/api` */
  baseUrl?: string
  transport?: RankingTransport
  /** 1回のflushで送る最大件数（残りは次回） */
  max?: number
}

const defaultTransport: RankingTransport = async (url, init) => {
  const response = await globalThis.fetch(url, init)
  return { status: response.status, json: () => response.json() as Promise<unknown> }
}

/** 送信するpayload。ここに結果の自己申告は入らない（`ReplayInput`に存在しない） */
export type SubmitPayload = {
  playerId: string
  clientRunId: string
  input: ReplayInput
}

export function buildSubmitPayload(run: PendingRun, playerId: string): SubmitPayload {
  return { playerId, clientRunId: run.clientRunId, input: run.input }
}

/**
 * 控えてある未送信runを順に提出する。
 * **`RULES.ranking.submissionEnabled` が false の間は一切通信しない。**
 */
export async function flushPendingRuns(options: FlushOptions = {}): Promise<SubmitOutcome> {
  if (!RULES.ranking.submissionEnabled) return { status: 'disabled', submitted: 0 }

  const runs = loadPendingRuns()
  if (runs.length === 0) return { status: 'empty', submitted: 0 }

  const transport = options.transport ?? defaultTransport
  const baseUrl = options.baseUrl ?? '/api'
  const playerId = getAnonymousPlayerId()
  const batch = runs.slice(0, options.max ?? runs.length)

  let accepted = 0
  let failed = 0
  const errors: string[] = []

  for (const run of batch) {
    try {
      const response = await transport(`${baseUrl}/ranking/submit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildSubmitPayload(run, playerId)),
      })
      if (response.status === 200 || response.status === 201) {
        // 受理された（新規・再送のどちらでも）ので控えから外す
        removePendingRun(run.clientRunId)
        accepted++
      } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        // 恒久的な拒否（不正・期限切れ等）。何度送っても通らないので控えから外す
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

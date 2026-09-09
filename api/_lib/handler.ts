import { neon } from '@neondatabase/serverless'
import { RULES } from '../../src/core/data/rules.js'
import {
  createPostgresRankingStore,
  handleRankingRequest,
  type RankingStore,
  type SqlExecutor,
} from '../../src/server/ranking/index.js'
import { readRankingEnv, type RankingEnv } from './env.js'

/**
 * Phase 4.8：Daily ランキング Production API の本体（Vercel Functions）。
 *
 * ★ここは「詰め替えるだけ」の層
 * 判定・検証・順位付けは `src/server/ranking/` が全部持っている（Phase 4.3〜4.6）。
 * このファイルがやるのは、Web標準の `Request` を `RankingHttpRequest` に直し、
 * 返ってきた `{status, body, headers}` を `Response` に直すこと、それと
 * **環境変数の門番**（`env.ts`）だけ。ロジックは1行も持たない。
 *
 * ★Web標準のシグネチャを使う理由
 * `export const POST = (request: Request) => Promise<Response>` の形にすると、
 * **生bodyを自分で読める**。64KBの門番は「JSON解析より前に切る」ことに意味があるので
 * （決定139 §7-2 T12）、ランタイムに body を先読みされる形は使わない。
 *
 * ★秘密の扱い
 *   - `playerSecret` は照合に使って捨てる。DB・ログ・応答のどれにも出さない
 *   - 例外のメッセージを**そのままログへ出さない**。Neon のドライバは不正なURLを渡されると
 *     接続文字列そのものを例外メッセージに載せる（Phase 4.4 で実際に踏んだ）。
 *     だからログに出すのは例外の**名前だけ**にしてある
 *   - 応答本文に秘密が混ざっていないことを、送信の直前に機械的に確かめる（`containsSecret`）
 */

/** ルート1本ぶんの実行文脈。production は `rankingRoute()` が組み立てる */
export type RankingRouteContext = {
  /** '/api/ranking/start' のような、このルートが担当するパス */
  path: string
  env: RankingEnv
  /** 現在時刻（ミリ秒）。`src/server` 側は時刻を自分で取らない契約なので、ここで渡す */
  now: number
  /** 接続文字列から保存層を作る。production は Neon、テストはメモリ実装を差し込む */
  resolveStore: (databaseUrl: string) => RankingStore
}

const JSON_TYPE = 'application/json; charset=utf-8'

/**
 * 応答に秘密が混ざっていないかの最終確認。
 * `playerSecret` は64桁の16進なので、その形が本文に現れたら異常とみなす。
 * 正常な応答に入る16進は `clientRunId`（32桁）と `playerId`（32桁）だけで、
 * JSONの区切り（"」や「,）を挟むため64桁連続にはならない。
 */
function containsSecret(text: string): boolean {
  return /playerSecret/i.test(text) || /[0-9a-f]{64}/i.test(text)
}

function json(status: number, body: unknown, headers?: Record<string, string>): Response {
  const text = JSON.stringify(body)
  if (containsSecret(text)) {
    // ★漏らすくらいなら落とす。本文は出力しない
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { 'content-type': JSON_TYPE, 'cache-control': 'no-store' },
    })
  }
  return new Response(text, {
    status,
    headers: {
      'content-type': JSON_TYPE,
      // 既定は保存させない。leaderboard だけが下の `headers` で自分の猶予を上書きする
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      ...(headers ?? {}),
    },
  })
}

type BodyRead =
  | { ok: true; body: unknown; bytes: number }
  | { ok: false; status: number; error: string }

/**
 * 生bodyを読んで、大きさを測ってから JSON にする。
 * 順序が肝：①Content-Length で切る ②実バイト数で切る ③やっと解析する。
 */
async function readBody(request: Request): Promise<BodyRead> {
  const max = RULES.ranking.maxBodyBytes

  // ① 宣言された長さで門前払い（本文を読みもしない）
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > max) {
    return { ok: false, status: 413, error: 'payload_too_large' }
  }

  let raw: string
  try {
    raw = await request.text()
  } catch {
    return { ok: false, status: 400, error: 'bad_request' }
  }

  // ② 実際に届いたバイト数で切る（Content-Length を名乗らない／偽る相手のため）
  const bytes = new TextEncoder().encode(raw).length
  if (bytes > max) {
    return { ok: false, status: 413, error: 'payload_too_large' }
  }

  // ③ ここで初めて解析する
  if (raw.length === 0) return { ok: true, body: undefined, bytes }
  try {
    return { ok: true, body: JSON.parse(raw), bytes }
  } catch {
    return { ok: false, status: 400, error: 'bad_request' }
  }
}

function queryOf(request: Request): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {}
  try {
    const params = new URL(request.url).searchParams
    for (const [key, value] of params) out[key] = value
  } catch {
    // URL として読めない場合はクエリ無しとして扱う（後段が 400 を返す）
  }
  return out
}

export async function handleRankingHttp(
  request: Request,
  ctx: RankingRouteContext,
): Promise<Response> {
  // --- 門番1：API 全体が閉じている（既定）。DBにも触れない ---
  if (!ctx.env.apiEnabled) {
    return json(503, { error: 'api_disabled' })
  }

  // --- 門番2：接続先が無い ---
  if (!ctx.env.databaseUrl) {
    return json(503, { error: 'database_unconfigured' })
  }

  const isPost = request.method === 'POST'
  const read: BodyRead = isPost ? await readBody(request) : { ok: true, body: undefined, bytes: 0 }
  if (!read.ok) {
    return json(read.status, { error: read.error })
  }

  try {
    const response = await handleRankingRequest(
      {
        method: request.method,
        path: ctx.path,
        body: read.body,
        query: queryOf(request),
        bodyBytes: isPost ? read.bytes : undefined,
      },
      {
        store: ctx.resolveStore(ctx.env.databaseUrl),
        now: ctx.now,
        // ★kill switch。開けるのは Preview だけ（production では `env.ts` が必ず false にする）。
        // 閉じているときは undefined を渡し、`rules.ts` の定数＝false をそのまま使わせる
        submissionEnabled: ctx.env.submissionUnlocked ? true : undefined,
      },
    )
    return json(response.status, response.body, response.headers)
  } catch (error) {
    // ★メッセージを出さない。ドライバの例外は接続文字列を含みうる（Phase 4.4）
    console.error('ranking route failed', {
      path: ctx.path,
      kind: error instanceof Error ? error.name : typeof error,
    })
    return json(500, { error: 'internal_error' })
  }
}

/**
 * Neon の保存層。warm な実行では作り直さない（接続文字列が同じ間は使い回す）。
 * `neon()` は HTTP ベースなのでコネクションプールを持たず、作り直しても実害は無いが、
 * 1リクエストで複数回 `resolveStore` を呼ぶ形になっても安全にしておく。
 */
let cached: { url: string; store: RankingStore } | null = null

function neonStore(databaseUrl: string): RankingStore {
  if (cached && cached.url === databaseUrl) return cached.store
  const client = neon(databaseUrl)
  // ★`client(text, params)` ではなく `client.query(...)`。
  // neon serverless v1 の呼び出し可能形はタグ付きテンプレート専用（Phase 4.4 follow-up）
  const sql = (async <T>(text: string, params?: unknown[]) => {
    const rows = await client.query(text, params)
    return rows as T[]
  }) as SqlExecutor
  cached = { url: databaseUrl, store: createPostgresRankingStore(sql) }
  return cached.store
}

/** production のルート1本を作る。`api/ranking/*.ts` はこれを呼ぶだけ */
export function rankingRoute(path: string): (request: Request) => Promise<Response> {
  return (request: Request) =>
    handleRankingHttp(request, {
      path,
      env: readRankingEnv(),
      now: Date.now(),
      resolveStore: neonStore,
    })
}

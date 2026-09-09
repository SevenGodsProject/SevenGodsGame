import { afterEach, describe, expect, it } from 'vitest'
import * as leaderboard from '../ranking/leaderboard.js'
import * as start from '../ranking/start.js'
import * as submit from '../ranking/submit.js'

/**
 * Phase 4.8：公開される3本のルートそのものの検査。
 *
 * ★`api/_tests/` に置いてある理由
 * Vercel は `api/` 配下の `.ts` を片っ端からエンドポイントにするので、テストを
 * `api/ranking/` に置くと `/api/ranking/routes.test` という関数ができてしまう
 * （vitest を import しているので build も落ちる）。先頭が `_` のディレクトリは
 * ルートにならないため、ここへ置く。`.vercelignore` でも二重に除外している。
 *
 * `handler.test.ts` は文脈を注入して中身を見ているが、こちらは
 * **production と同じ配線**（`rankingRoute()` → `readRankingEnv()` → `process.env`）を
 * そのまま通す。ここが通れば、
 *   - モジュールが読み込める（ドライバの解決も含め、import で落ちない）
 *   - Vercel が期待する形（HTTPメソッド名の export）になっている
 *   - **環境変数を入れていない状態では3本とも閉じている**
 * の3つが同時に確認できる。deploy 前の最後の安全確認にあたる。
 */

const KEYS = ['RANKING_API_ENABLED', ['RANKING', 'DATABASE', 'URL'].join('_')]
const saved = new Map<string, string | undefined>()

function clearEnv() {
  for (const key of KEYS) {
    if (!saved.has(key)) saved.set(key, process.env[key])
    delete process.env[key]
  }
}

afterEach(() => {
  for (const [key, value] of saved) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  saved.clear()
})

const ROUTES = [
  { name: 'start', mod: start, path: '/api/ranking/start', method: 'POST' },
  { name: 'submit', mod: submit, path: '/api/ranking/submit', method: 'POST' },
  { name: 'leaderboard', mod: leaderboard, path: '/api/ranking/leaderboard', method: 'GET' },
] as const

describe('公開される3本のルート', () => {
  it('Vercel が拾う形（GET / POST の export）になっている', () => {
    for (const { name, mod } of ROUTES) {
      expect(typeof mod.GET, `${name}: GET`).toBe('function')
      expect(typeof mod.POST, `${name}: POST`).toBe('function')
    }
  })

  it('★環境変数を入れていなければ、3本とも 503 で閉じている', async () => {
    clearEnv()
    for (const { name, mod, path, method } of ROUTES) {
      const handler = method === 'POST' ? mod.POST : mod.GET
      const response = await handler(
        new Request(`https://example.vercel.app${path}?dailyKey=2026-09-09`, {
          method,
          ...(method === 'POST'
            ? { headers: { 'content-type': 'application/json' }, body: '{}' }
            : {}),
        }),
      )
      expect(response.status, name).toBe(503)
      expect(await response.json(), name).toEqual({ error: 'api_disabled' })
    }
  })

  it('API を開けても接続先が無ければ 503（DBを勝手に探しに行かない）', async () => {
    clearEnv()
    process.env.RANKING_API_ENABLED = '1'
    const response = await leaderboard.GET(
      new Request('https://example.vercel.app/api/ranking/leaderboard?dailyKey=2026-09-09'),
    )
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'database_unconfigured' })
  })
})

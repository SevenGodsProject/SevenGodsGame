import { describe, it, expect } from 'vitest'

/**
 * Phase 4.3：Backend のアーキテクチャ境界と、クライアント側の安全弁。
 *
 * 守りたいこと：
 *   1. `src/server` は React・DOM・localStorage・外部パッケージに依存しない
 *      （Vercel Functions でも Node でも Deno でも同じコードが動く）
 *   2. `src/server` は UI 層（components / hooks）を参照しない
 *   3. **ブラウザ側（App→components→hooks）が `src/server` を import しない**
 *      ——サーバー専用の検証コードがバンドルに混ざると、意味が無いどころか
 *      「クライアントで検証している」という誤解を生む
 *   4. Phase 4.8：`api/` は作ったが、**既定で閉じている**（末尾の describe で検査）
 *   5. Backendが未契約の間は、クライアントが送信しない（kill switch）
 */

const toPosix = (p: string) => p.replace(/\\/g, '/')

/** src配下の全ソース。キーは `src/` からの相対パス */
const SOURCES: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob('../../**/*.{ts,tsx}', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>,
  ).map(([key, value]) => [resolvePath('server/ranking/rankingBoundary.test.ts', key), value]),
)

/** posixの相対パス解決 */
function resolvePath(fromFile: string, specifier: string): string {
  const segments = fromFile.split('/').slice(0, -1).concat(specifier.split('/'))
  const out: string[] = []
  for (const segment of segments) {
    if (segment === '.' || segment === '') continue
    if (segment === '..') out.pop()
    else out.push(segment)
  }
  return out.join('/')
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function importSpecifiers(source: string): string[] {
  const out: string[] = []
  const re = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source)) !== null) out.push(m[1])
  return out
}

function resolveModule(fromFile: string, specifier: string): string | null {
  const base = resolvePath(fromFile, specifier)
  for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
    if (candidate in SOURCES) return candidate
  }
  return null
}

/** entry から到達できる全ファイル（テストファイルは辿らない） */
function crawl(entry: string): { files: string[]; bare: string[] } {
  const seen = new Set<string>()
  const bare = new Set<string>()
  const queue = [entry]
  while (queue.length > 0) {
    const file = queue.shift() as string
    if (seen.has(file) || !(file in SOURCES)) continue
    seen.add(file)
    // コメント内のサンプルコード（「接続はこう書く」等）をimportと誤認しない
    for (const spec of importSpecifiers(stripComments(SOURCES[file]))) {
      if (spec.startsWith('.')) {
        // CSS・画像などTS以外のアセットは依存グラフの対象外
        if (/\.(css|svg|png|jpe?g|webp|mp3|wav|json)$/.test(spec)) continue
        const resolved = resolveModule(file, spec)
        expect(resolved, `解決できない相対import: ${spec}（${file}）`).not.toBeNull()
        queue.push(resolved as string)
      } else {
        bare.add(spec)
      }
    }
  }
  return { files: [...seen], bare: [...bare] }
}

const server = crawl('server/ranking/index.ts')
const app = crawl('App.tsx')

describe('Backend のアーキテクチャ境界', () => {
  it('到達する全ファイルが src/server か src/core の中にある（UI層を参照しない）', () => {
    const outside = server.files.filter(
      (f) => !f.startsWith('server/') && !f.startsWith('core/'),
    )
    expect(outside, `UI層へ依存しています: ${outside.join(', ')}`).toEqual([])
  })

  it('外部パッケージに依存しない（ホスティング・DBドライバを決め打ちしない）', () => {
    expect(server.bare).toEqual([])
  })

  it('ブラウザ専用のグローバルを参照しない', () => {
    const forbidden = ['window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'Phaser']
    const hits: string[] = []
    for (const file of server.files) {
      const code = stripComments(SOURCES[file])
      for (const token of forbidden) if (code.includes(token)) hits.push(`${file}: ${token}`)
    }
    expect(hits).toEqual([])
  })

  it('DBドライバ・環境変数を直接参照しない（保存層はポート経由）', () => {
    const forbidden = ['@neondatabase', 'neon.tech', 'supabase', 'firebase', 'process.env', 'DATABASE_URL']
    const hits: string[] = []
    for (const file of server.files) {
      const code = stripComments(SOURCES[file])
      for (const token of forbidden) if (code.includes(token)) hits.push(`${file}: ${token}`)
    }
    expect(hits).toEqual([])
  })

  it('時刻を内部で取らない（now は注入する＝決定論的に検証できる）', () => {
    const hits = server.files.filter((f) => {
      const code = stripComments(SOURCES[f])
      return code.includes('Date.now()')
    })
    expect(hits).toEqual([])
  })

  it('リプレイ検証・順位規則はcoreの実装を借りている（サーバー側で作り直していない）', () => {
    expect(server.files).toContain('core/replay/replay.ts')
    expect(server.files).toContain('core/replay/ranking.ts')
    // サーバー側にスコア計算や順位付けの独自実装が無いこと
    const serverOnly = server.files.filter((f) => f.startsWith('server/'))
    for (const file of serverOnly) {
      const code = stripComments(SOURCES[file])
      expect(code, `${file} が独自にスコアを計算している`).not.toContain('getFinalScore')
    }
  })
})

describe('クライアントは Backend を取り込まない', () => {
  it('ブラウザ側から src/server へ到達しない（サーバー検証コードをバンドルしない）', () => {
    const leaked = app.files.filter((f) => f.startsWith('server/'))
    expect(leaked, `クライアントがサーバーコードをimportしています: ${leaked.join(', ')}`).toEqual(
      [],
    )
  })

  it('src/server を値としてimportしているのはサーバー側とテストだけ', () => {
    const offenders: string[] = []
    for (const [file, source] of Object.entries(SOURCES)) {
      if (file.startsWith('server/') || file.includes('.test.')) continue
      const code = stripComments(source)
      // 型のみのimport（`import type`）はビルド時に消えるので許容する
      for (const line of code.split('\n')) {
        if (!line.includes('/server/') && !line.includes("'../server")) continue
        if (line.includes('import type')) continue
        if (/from\s+['"][^'"]*server/.test(line)) offenders.push(`${file}: ${line.trim()}`)
      }
    }
    expect(offenders).toEqual([])
  })
})

describe('deployの安全弁', () => {
  it('クライアントの送信は kill switch で止まっている（Backend未契約のため）', async () => {
    const { RULES } = await import('../../core/data/rules')
    expect(RULES.ranking.submissionEnabled).toBe(false)
  })

  it('パスの正規化が期待どおり（クロールが空振りしていない）', () => {
    expect(toPosix('a\\b')).toBe('a/b')
    expect(server.files.length).toBeGreaterThan(10)
    expect(app.files.length).toBeGreaterThan(10)
  })
})

/**
 * Phase 4.8：`api/`（Vercel Functions）の境界。
 *
 * ★Phase 4.3〜4.7 では「`api/` を作らない」ことが安全弁だった。
 * 作った瞬間に、次の deploy でエンドポイントが公開されてしまうためである。
 * Phase 4.8 で `api/` を作ったので、安全弁を**「作らない」から「既定で閉じている」へ**置き換える。
 * ここではその置き換えが本当に成立しているかを、ソースの形から機械検査する。
 */
const API_SOURCES: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob('../../../api/**/*.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>,
  ).map(([key, value]) => [key.replace(/^(\.\.\/)+/, ''), value]),
)

/** Vercel がURLとして公開するファイル（先頭が `_` のものはルートにならない） */
const ROUTE_FILES = Object.keys(API_SOURCES).filter(
  (f) => !f.includes('/_') && !f.includes('.test.'),
)

describe('api/ の境界（Phase 4.8）', () => {
  it('3本のルートと、共有コードが揃っている', () => {
    expect(ROUTE_FILES.sort()).toEqual([
      'api/ranking/leaderboard.ts',
      'api/ranking/start.ts',
      'api/ranking/submit.ts',
    ])
    expect(Object.keys(API_SOURCES)).toContain('api/_lib/handler.ts')
    expect(Object.keys(API_SOURCES)).toContain('api/_lib/env.ts')
  })

  it('公開されるルートは薄い（rankingRoute を呼ぶだけで、独自ロジックを持たない）', () => {
    for (const file of ROUTE_FILES) {
      const code = stripComments(API_SOURCES[file])
      expect(code, `${file} が rankingRoute を経由していない`).toContain(
        "rankingRoute } from '../_lib/handler'",
      )
      // 判定・保存・接続をルート側で書いていないこと
      for (const token of ['process.env', 'process?.env', 'neon(', 'RULES.', 'if (']) {
        expect(code, `${file} が独自ロジックを持っている: ${token}`).not.toContain(token)
      }
    }
  })

  it('共有コードは _lib/ にあり、URLとして公開されない', () => {
    const shared = Object.keys(API_SOURCES).filter(
      (f) => f.includes('handler') || f.includes('env'),
    )
    for (const file of shared) {
      expect(file, `${file} が公開されるパスにある`).toContain('api/_lib/')
    }
  })

  it('env を読むのは _lib/env.ts だけ（門番を迂回できない）', () => {
    const readers = Object.keys(API_SOURCES).filter((f) => {
      if (f.includes('.test.')) return false
      return /process\??\.env/.test(stripComments(API_SOURCES[f]))
    })
    expect(readers).toEqual(['api/_lib/env.ts'])
  })

  it('すべてのルートが門番（apiEnabled）の内側にある', () => {
    const handler = stripComments(API_SOURCES['api/_lib/handler.ts'])
    // 門番は「最初の分岐」でなければならない（DBに触れる前に落とす）
    const gate = handler.indexOf('ctx.env.apiEnabled')
    const dbUse = handler.indexOf('ctx.resolveStore')
    expect(gate).toBeGreaterThan(-1)
    expect(gate, '保存層に触れてから門番を見ている').toBeLessThan(dbUse)
  })

  it('UI層・ブラウザ専用のものを取り込まない', () => {
    for (const [file, raw] of Object.entries(API_SOURCES)) {
      if (file.includes('.test.')) continue
      const code = stripComments(raw)
      for (const token of ['/components/', '/hooks/', 'react', 'phaser', 'localStorage', 'document']) {
        expect(code, `${file} が ${token} を参照している`).not.toContain(token)
      }
    }
  })

  it('kill switch を rules.ts 側で開けていない（環境変数からしか開かない）', () => {
    for (const [file, raw] of Object.entries(API_SOURCES)) {
      const code = stripComments(raw)
      expect(code, `${file} が rules.ts の kill switch を書き換えている`).not.toContain(
        'submissionEnabled =',
      )
    }
    const handler = stripComments(API_SOURCES['api/_lib/handler.ts'])
    // 渡すのは env が決めた値だけ。true を直書きしない
    expect(handler).toContain('ctx.env.submissionUnlocked')
  })
})

describe('api/ が deploy で余計なものを公開しない（Phase 4.8）', () => {
  it('公開されるパスにテストファイルが無い（Vercelが .test も関数にしてしまう）', () => {
    const leaked = Object.keys(API_SOURCES).filter(
      (f) => f.includes('.test.') && !f.includes('/_'),
    )
    expect(leaked, `deploy で公開されてしまうテスト: ${leaked.join(', ')}`).toEqual([])
  })

  it('テストは _ 付きディレクトリに置いてある', () => {
    const tests = Object.keys(API_SOURCES).filter((f) => f.includes('.test.'))
    expect(tests.length).toBeGreaterThan(0)
    for (const file of tests) {
      expect(file, `${file} がルート化されるパスにある`).toMatch(/api\/_[^/]+\//)
    }
  })

  it('.vercelignore がテストを二重に除外している', async () => {
    const ignore = await import('../../../.vercelignore?raw').then(
      (m) => (m as { default: string }).default,
    )
    expect(ignore).toContain('*.test.ts')
  })
})

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
 *   4. `api/` を作っていない（Vercelが自動でエンドポイントを公開してしまうため）
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
  it('リポジトリ直下に api/ を作っていない（Vercelが自動公開してしまうため）', () => {
    const apiFiles = Object.keys(SOURCES).filter((f) => f.startsWith('../api/') || f.startsWith('api/'))
    expect(apiFiles).toEqual([])
  })

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

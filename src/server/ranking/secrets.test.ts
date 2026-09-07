import { describe, expect, it } from 'vitest'

/**
 * Phase 4.4 Step 10：秘密情報が混入していないことの機械検査。
 *
 * DB接続文字列（Neon）は環境変数からしか読まず、リポジトリにも
 * クライアントバンドルにも入らない。「入っていないつもり」を口約束にせず、
 * `src` 配下の全ソースを走査して固定する。
 *
 * ★このテストは**値そのものを出力しない**。
 * 見つかった場合もファイル名とパターン名だけを報告する。
 */

/** コメントを除いたソース（説明文中の言及を実装と取り違えないため） */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/** globのキーはこのファイルからの相対パスで返るので、`src/` 起点へ正規化する */
function resolveFromHere(specifier: string): string {
  const segments = 'src/server/ranking/x'.split('/').slice(0, -1).concat(specifier.split('/'))
  const out: string[] = []
  for (const segment of segments) {
    if (segment === '.' || segment === '') continue
    if (segment === '..') out.pop()
    else out.push(segment)
  }
  return out.join('/')
}

/** src配下の全ソース（テスト自身も含む） */
const SOURCES: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob('../../**/*.{ts,tsx}', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>,
  ).map(([key, value]) => [resolveFromHere(key), value]),
)

/** 秘密情報「らしさ」のパターン。名前だけの言及（DATABASE_URLという文字列）は対象外 */
const SECRET_PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'postgres connection string', re: /postgres(?:ql)?:\/\/[^\s'"<]+/i },
  { name: 'mysql/mongo connection string', re: /(?:mysql|mongodb(?:\+srv)?):\/\/[^\s'"<]+/i },
  { name: 'neon endpoint host', re: /ep-[a-z0-9-]{6,}\.[a-z0-9-]+\.aws\.neon\.tech/i },
  { name: 'neon role password', re: /npg_[A-Za-z0-9]{12,}/ },
  { name: 'neon api key', re: /neon_api_key\s*[:=]\s*['"][^'"]+['"]/i },
  { name: 'bearer token', re: /Bearer\s+[A-Za-z0-9._-]{24,}/ },
  { name: 'private key block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'aws access key', re: /AKIA[0-9A-Z]{16}/ },
  // `DATABASE_URL=` に実値が続いている形（名前だけの言及は拾わない）
  { name: 'assigned DATABASE_URL', re: /DATABASE_URL\s*[:=]\s*['"][^'"]{8,}['"]/ },
]

describe('秘密情報の混入検査（Step 10）', () => {
  it('src配下のどのソースにも接続文字列・鍵・トークンが埋め込まれていない', () => {
    const hits: string[] = []
    for (const [file, source] of Object.entries(SOURCES)) {
      for (const { name, re } of SECRET_PATTERNS) {
        // 検出しても値は出さない。ファイル名とパターン名だけを報告する
        if (re.test(source)) hits.push(`${file}: ${name}`)
      }
    }
    expect(hits, `秘密情報らしき記述を検出しました: ${hits.join(' / ')}`).toEqual([])
  })

  it('接続情報は環境変数からしか読まない（ファイル・定数から読まない）', () => {
    const readers: string[] = []
    for (const [file, raw] of Object.entries(SOURCES)) {
      const source = stripComments(raw)
      if (!source.includes('RANKING_DATABASE_URL')) continue
      readers.push(file)
      // 環境変数経由（process.env）以外の読み取り方をしていないこと
      expect(source, `${file} が環境変数以外から接続情報を読んでいる`).toContain('process?.env')
      expect(source).not.toContain('readFileSync')
    }
    // 読み取り箇所は実DB統合テストの1か所だけ
    expect(readers).toEqual(['src/server/ranking/postgres.integration.test.ts'])
  })

  it('サーバー実装は接続情報を受け取らない（SQL実行関数を注入される側）', () => {
    const store = stripComments(SOURCES['src/server/ranking/postgresStore.ts'])
    expect(store).toBeDefined()
    expect(store).not.toContain('RANKING_DATABASE_URL')
    expect(store).not.toContain('process.env')
    // ドライバも直接importしない
    expect(store).not.toMatch(/^import .* from '@neondatabase/m)
  })

  it('接続情報がクライアント側のコードへ入り込む経路が無い', () => {
    for (const [file, raw] of Object.entries(SOURCES)) {
      if (file.startsWith('src/server/')) continue
      expect(stripComments(raw), `${file} が接続情報を参照している`).not.toContain(
        'RANKING_DATABASE_URL',
      )
    }
  })

  it('接続情報をログへ出す記述が無い', () => {
    const hits: string[] = []
    for (const [file, source] of Object.entries(SOURCES)) {
      for (const line of source.split('\n')) {
        if (!/console\.(log|info|warn|error|debug)/.test(line)) continue
        if (/CONNECTION|RANKING_DATABASE_URL|connectionString/i.test(line)) {
          hits.push(`${file}: console with connection info`)
        }
      }
    }
    expect(hits).toEqual([])
  })
})

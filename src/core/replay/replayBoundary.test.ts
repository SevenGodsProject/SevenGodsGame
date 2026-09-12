import { describe, it, expect } from 'vitest'

/**
 * Phase 4.1 Step 8：アーキテクチャ境界の機械検査。
 *
 * Replay Foundationは将来 Vercel の Node Function から import して動かす前提のため、
 * React・DOM・localStorage・window・Phaser・UI層（hooks/components）へ
 * 依存してはならない。「依存させない」を口約束ではなくテストで固定する
 * （CLAUDE.md §3 不変ルール1「`src/core`に`import Phaser`と`import React`を書かない」の延長）。
 *
 * `runReplay`から到達できる**全ファイル**（推移的な依存の閉包）を対象にする。
 * 直下のファイルだけ調べても、core内のどこか1つがwindowを触っていれば
 * サーバーでは落ちるため。
 *
 * ソースの読み取りには`node:fs`ではなく`import.meta.glob`を使う。
 * `tsconfig.app.json`のtypesは`vite/client`のみで、`src`配下からNodeの
 * 組み込みモジュールを型解決できない（`npm run build`の`tsc -b`が落ちる）ため。
 */

/** posixの相対パス解決（`a/b/c.ts` + `../d` → `a/d`） */
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

/** このテストファイル自身の位置（globのキーはここからの相対パスで返る） */
const HERE = 'core/replay/replayBoundary.test.ts'

/** src配下の全TSファイルの中身。キーを`src/`からの相対パスへ正規化して持つ */
const SOURCES: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob('../../**/*.{ts,tsx}', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>,
  ).map(([key, value]) => [resolvePath(HERE, key), value]),
)

const ENTRY = 'core/replay/index.ts'

/**
 * コメントを除いたソース。
 * このリポジトリのcoreは「Math.randomを使わない」「windowに触らない」といった
 * 約束をコメントで大量に明記しているため、素のテキスト検索では自己言及に当たる。
 * 実際の依存だけを見たいので、走査の前にコメントを落とす。
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/** `from '...'` / `import('...')` の指定子を拾う */
function importSpecifiers(source: string): string[] {
  const out: string[] = []
  const re = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source)) !== null) out.push(m[1])
  return out
}

function resolveModule(fromFile: string, specifier: string): string | null {
  // Node の ESM 解決に合わせて `.js` を付けてあるので、実体（.ts）へ戻してから探す
  const base = resolvePath(fromFile, specifier.replace(/.js$/, ''))
  for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
    if (candidate in SOURCES) return candidate
  }
  return null
}

/** エントリから到達できる全ファイルと、そこで使われた外部（非相対）指定子 */
function crawl(entry: string): { files: string[]; bareSpecifiers: string[] } {
  const seen = new Set<string>()
  const bare = new Set<string>()
  const queue = [entry]
  while (queue.length > 0) {
    const file = queue.shift() as string
    if (seen.has(file)) continue
    seen.add(file)
    for (const spec of importSpecifiers(SOURCES[file])) {
      if (spec.startsWith('.')) {
        const resolved = resolveModule(file, spec)
        expect(resolved, `解決できない相対import: ${spec}（${file}）`).not.toBeNull()
        queue.push(resolved as string)
      } else {
        bare.add(spec)
      }
    }
  }
  return { files: [...seen], bareSpecifiers: [...bare] }
}

const { files, bareSpecifiers } = crawl(ENTRY)

/** 検査対象のソース（コメント除去済み） */
const stripped = files.map((f) => [f, stripComments(SOURCES[f])] as const)

function scanFor(tokens: string[]): string[] {
  const hits: string[] = []
  for (const [file, source] of stripped) {
    for (const token of tokens) {
      if (source.includes(token)) hits.push(`${file}: ${token}`)
    }
  }
  return hits
}

describe('Replay Foundation のアーキテクチャ境界', () => {
  it('エントリから到達できるファイルがすべて src/core の中にある（hooks・componentsへ逆流しない）', () => {
    const outside = files.filter((f) => !f.startsWith('core/'))
    expect(outside, `src/core の外へ依存しています: ${outside.join(', ')}`).toEqual([])
  })

  it('外部パッケージに一切依存しない（react・phaser等をimportしない）', () => {
    expect(bareSpecifiers).toEqual([])
  })

  it('ブラウザ専用のグローバル・APIを参照しない', () => {
    const hits = scanFor([
      'window',
      'document',
      'localStorage',
      'sessionStorage',
      'navigator',
      'Phaser',
      'fetch(',
    ])
    expect(hits, `ブラウザ依存を検出しました: ${hits.join(' / ')}`).toEqual([])
  })

  it('Math.random を使わない（不変ルール2）', () => {
    expect(scanFor(['Math.random'])).toEqual([])
  })

  it('Backend・外部サービス・環境変数へ依存しない（Neon/Supabase/DB/API key）', () => {
    const hits = scanFor([
      '@neondatabase',
      'neon.tech',
      'supabase',
      'firebase',
      'DATABASE_URL',
      'process.env',
    ])
    expect(hits).toEqual([])
  })

  it('リプレイ本体・エンジン・Daily導出が到達範囲に含まれている（クロールが空振りしていない）', () => {
    expect(files).toContain('core/replay/replay.ts')
    expect(files).toContain('core/engine/reducer.ts')
    expect(files).toContain('core/data/dailyStart.ts')
    expect(files.length).toBeGreaterThan(10)
  })

  it('テスト専用ファイル（replayTestUtils）は本番の到達範囲に含まれない', () => {
    expect(files).not.toContain('core/replay/replayTestUtils.ts')
  })
})

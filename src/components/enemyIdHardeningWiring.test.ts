import { describe, expect, it } from 'vitest'

/**
 * Post-P2 Hardening（決定191）：未知 enemyId 耐性の配線ガード（ソース固定）。
 *
 * React を描画するテスト基盤が無いため、`matchupWiring.test.ts` と同じくソースを直接検査する。
 * （tsconfig.app の types は vite/client のみのため node:fs ではなく import.meta.glob で読む）
 */
const SOURCES = import.meta.glob(['./**/*.ts', './**/*.tsx', '!./**/*.test.ts', '!./**/*.test.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const toSrcPath = (k: string): string => (k.startsWith('./') ? `components/${k.slice(2)}` : k.replace(/^\.\.\//, ''))

const read = (suffix: string): string => {
  const key = Object.keys(SOURCES).find((k) => toSrcPath(k).endsWith(suffix))
  expect(key, `ソースが見つからない: ${suffix}`).toBeDefined()
  return SOURCES[key as string]
}

describe('保存データ由来の enemyId は安全な経路だけを通る', () => {
  it('HomeScreen.tsx は enemies.ts の getEnemyDef を直接呼ばず、safe ヘルパーを使う', () => {
    const src = read('setup/HomeScreen.tsx')
    expect(src).not.toMatch(/from '\.\.\/\.\.\/core\/data\/enemies'/)
    expect(src).toMatch(/from '\.\.\/enemyLookup'/)
    expect(src).toMatch(/isKnownEnemyId/)
    expect(src).toMatch(/safeEnemyName/)
  })

  it('HomeScreen.tsx の canResume は savedEnemyKnown を含む（未知 ID では Resume を出さない）', () => {
    const src = read('setup/HomeScreen.tsx')
    const m = src.match(/const canResume = ([^\n]+)/)
    expect(m, 'canResume の定義が見つからない').toBeTruthy()
    expect(m?.[1]).toContain('savedEnemyKnown')
  })

  it('RecordScreen.tsx は enemies.ts の getEnemyDef を直接呼ばず、safe ヘルパーを使う', () => {
    const src = read('setup/RecordScreen.tsx')
    expect(src).not.toMatch(/from '\.\.\/\.\.\/core\/data\/enemies'/)
    expect(src).toMatch(/from '\.\.\/enemyLookup'/)
    expect(src).toMatch(/safeEnemyName\(day\.enemyId\)/)
  })
})

describe('Hardening は storage を書き換えない（読み取り専用）', () => {
  it('enemyLookup.ts・HomeScreen.tsx・RecordScreen.tsx に localStorage への書き込みが無い', () => {
    for (const file of ['enemyLookup.ts', 'setup/HomeScreen.tsx', 'setup/RecordScreen.tsx']) {
      const src = read(file)
      expect(src).not.toMatch(/localStorage\.(setItem|removeItem|clear)\(/)
    }
  })

  it('enemyLookup.ts は localStorage に一切触れない（getEnemyDef のラップのみの純粋な読み取りヘルパー）', () => {
    expect(read('enemyLookup.ts')).not.toMatch(/localStorage/)
  })
})

describe('P2 の matchups 表示は既に安全（変更していないことを確認）', () => {
  it('MatchupBoard.tsx は保存データを直接 getEnemyDef へ渡さず、既知の ENEMIES 一覧だけを描画する', () => {
    const src = read('setup/MatchupBoard.tsx')
    expect(src).not.toMatch(/getEnemyDef/)
    expect(src).toMatch(/ENEMIES\.map/)
  })
})

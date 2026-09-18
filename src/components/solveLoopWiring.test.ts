import { describe, expect, it } from 'vitest'

/**
 * 決定196（Solve Loop v1）：同じ盤面での再戦の配線ガード（ソース固定）。
 *
 * React を描画するテスト基盤が無いため、`matchupWiring.test.ts`・`enemyIdHardeningWiring.test.ts`
 * と同じく呼び出し箇所のソースを直接検査する。
 *
 * ここで守るのは 2 つ：
 *   1. 再戦の seed を決めるのは `retrySemantics.ts` の 1 か所だけ（分岐がコピーされない）
 *   2. **神域挑戦（Daily）の seed 経路に一切触れていない**
 *      （`startDailyGame` は `resolveDailyStart` の seed のみ。回数消費も従来どおり 1 か所）
 */
const SOURCES = import.meta.glob(
  ['./**/*.ts', './**/*.tsx', '../hooks/**/*.ts', '!./**/*.test.ts', '!./**/*.test.tsx', '!../hooks/**/*.test.ts'],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>

const toSrcPath = (k: string): string => (k.startsWith('./') ? `components/${k.slice(2)}` : k.replace(/^\.\.\//, ''))

const read = (suffix: string): string => {
  const key = Object.keys(SOURCES).find((k) => toSrcPath(k).endsWith(suffix))
  expect(key, `ソースが見つからない: ${suffix}`).toBeDefined()
  return SOURCES[key as string]
}

const callersOf = (pattern: RegExp, exclude: string): string[] =>
  Object.entries(SOURCES)
    .filter(([k, src]) => !toSrcPath(k).endsWith(exclude) && pattern.test(src))
    .map(([k]) => `src/${toSrcPath(k)}`)
    .sort()

describe('同じ盤面での再戦の配線（決定196）', () => {
  it('再戦 seed の判定は retrySemantics.ts だけが持ち、呼ぶのは GameFlow の再戦ハンドラだけ', () => {
    expect(callersOf(/resolveRematchSeed\s*\(/, 'components/battle/retrySemantics.ts')).toEqual([
      'src/components/GameFlow.tsx',
    ])
    expect(read('components/GameFlow.tsx').match(/resolveRematchSeed\s*\(/g)).toHaveLength(1)
  })

  it('GameFlow は決着した対局の mode・status・seed をそのまま渡す（別の値で組み立て直さない）', () => {
    const src = read('components/GameFlow.tsx')
    expect(src).toMatch(/resolveRematchSeed\(\{[\s\S]*?mode:\s*engine\.state\.mode/)
    expect(src).toMatch(/resolveRematchSeed\(\{[\s\S]*?status:\s*engine\.state\.status/)
    expect(src).toMatch(/resolveRematchSeed\(\{[\s\S]*?seed:\s*engine\.state\.seed/)
  })

  it('startGame は「URLバックドア > 渡された seed > 新規発行」の順で seed を決める', () => {
    const src = read('hooks/useGameEngine.ts')
    expect(src).toMatch(/resolveForcedSeed\(\)\s*\?\?\s*requestedSeed\s*\?\?\s*`seed-\$\{Date\.now\(\)\}`/)
  })

  it('文言の出し分けも同じ純関数を使う（結果画面と挙動がずれない）', () => {
    expect(read('components/battle/resultHub.ts')).toMatch(/isSameBoardRematch\(ctx\)/)
  })
})

describe('神域挑戦（Daily）の seed 意味論は変更していない（決定196）', () => {
  it('startDailyGame の seed は resolveDailyStart の値のまま', () => {
    const src = read('hooks/useGameEngine.ts')
    const daily = src.slice(src.indexOf('const startDailyGame'))
    expect(daily).toMatch(/seed:\s*daily\.seed/)
    // Daily 側の dispatch に再戦 seed が混ざっていない
    expect(daily).not.toMatch(/requestedSeed/)
  })

  it('神域挑戦の回数を消費する場所は増えていない（startDailyAttempt の呼び出しは 1 か所）', () => {
    expect(callersOf(/startDailyAttempt\s*\(/, 'hooks/dailyStorage.ts')).toEqual(['src/hooks/useGameEngine.ts'])
  })

  it('GameFlow の再戦は Daily なら beginDailyChallenge へ分岐したまま（startGame を通らない）', () => {
    const src = read('components/GameFlow.tsx')
    const handler = src.slice(src.indexOf('onRematch={() => {'))
    const inDailyBranch = handler.slice(0, handler.indexOf('engine.startGame('))
    expect(inDailyBranch).toMatch(/beginDailyChallenge\(godId,\s*deck,\s*dailyKey\)/)
    expect(inDailyBranch).toMatch(/return/)
  })
})

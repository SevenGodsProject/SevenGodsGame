import { describe, expect, it } from 'vitest'

/**
 * Phase 7 P2（決定189）：神×敵の攻略記録の配線ガード（ソース固定）。
 *
 * このリポジトリには React を描画するテスト基盤が無いため、`dailyFairness.test.ts`・
 * `resultTransitions.test.ts` と同じく呼び出し箇所のソースを直接検査する。
 * （tsconfig.app の types は vite/client のみのため node:fs ではなく import.meta.glob で読む）
 */
const SOURCES = import.meta.glob(['./**/*.ts', './**/*.tsx', '../hooks/**/*.ts', '!./**/*.test.ts', '!./**/*.test.tsx', '!../hooks/**/*.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** glob のキー（./setup/X.tsx・../hooks/Y.ts）を src 起点のパス（components/setup/X.tsx・hooks/Y.ts）にする */
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

describe('記録の書き込み点は 1 か所だけ', () => {
  it('recordMatchupClear を呼ぶのは useGameEngine の決着処理だけ（1 回）', () => {
    expect(callersOf(/recordMatchupClear\s*\(/, 'hooks/matchupStorage.ts')).toEqual(['src/hooks/useGameEngine.ts'])
    expect(read('hooks/useGameEngine.ts').match(/recordMatchupClear\s*\(/g)).toHaveLength(1)
  })

  it('決着分岐の中で、Daily の記録（recordDailyResult）より先に呼ぶ（初回取り込みで今回の勝利を先に取り込まないため）', () => {
    const src = read('hooks/useGameEngine.ts')
    const settle = src.indexOf('clearBattleSave()')
    const matchup = src.indexOf('recordMatchupClear(')
    const daily = src.indexOf('recordDailyResult(result.state)')
    expect(settle).toBeGreaterThan(0)
    expect(matchup).toBeGreaterThan(settle)
    expect(daily).toBeGreaterThan(matchup)
  })

  it('神域挑戦の回数を消費する場所は増えていない（startDailyAttempt の呼び出しは 1 か所）', () => {
    expect(callersOf(/startDailyAttempt\s*\(/, 'hooks/dailyStorage.ts')).toEqual(['src/hooks/useGameEngine.ts'])
  })
})

describe('P1 の判断（Home・Next Goal・Result Hub の出口）は神×敵を参照しない（AC19）', () => {
  it.each([
    'components/setup/HomeScreen.tsx',
    'components/setup/HomeTodayPanel.tsx',
    'components/battle/resultHub.ts',
    'components/battle/dailyDiff.ts',
    'components/resultTransitions.ts',
  ])('%s は matchup を参照しない', (file) => {
    expect(read(file)).not.toMatch(/matchup/i)
  })

  // v1.0.4 Retention 束 ②（NM1・決定284 候補・AI 判断）：AC19 の 2 つ目の例外。nextGoal.ts は「初撃破か・この敵の撃破神数」を
  // **入力として受け取るだけ**（matchupStorage の import・読み込み・書き込みは無い）。判定材料の取得は resultContext.ts に閉じる（決定206 と同じ型）
  it('components/battle/nextGoal.ts は matchup を入力として受け取るだけ（matchupStorage を import しない・保存 API を呼ばない）', () => {
    const src = read('components/battle/nextGoal.ts')
    // v1.0.4 RC（決定284・AI 判断）：resultContext と同じ「参照語の完全一致」に強める。許すのは入力名 matchup の 1 語だけで、
    // matchupStorage・matchups・MatchupClearResult などの語が 1 つでも増えたら赤になる（将来の import 追加を構造的に検出する）
    const refs = [...new Set([...src.matchAll(/\b\w*[mM]atchup\w*\b/g)].map((m) => m[0]))].sort()
    expect(refs).toEqual(['matchup'])
    expect(src).not.toMatch(/matchupStorage/)
    expect(src).not.toMatch(/\b(loadMatchups|countMatchupsByEnemy|recordMatchupClear)\b/)
    expect(src).not.toMatch(/localStorage|\.setItem\s*\(/)
  })

  // 決定206（Solve Legibility v1）：resultContext だけは「魔獣を既に倒しているか」を **読むだけ** で参照してよい
  // （NR1 の判定材料。書き込み・49 の一般接続はしない。nextGoal.ts は上の検査どおり入力名 matchup を受け取るだけで、保存には触れない）
  it('components/battle/resultContext.ts は matchup を読むだけ（countMatchupsByEnemy／loadMatchups のみ・書き込み無し）', () => {
    const src = read('components/battle/resultContext.ts')
    const refs = [...new Set([...src.matchAll(/\b\w*[mM]atchup\w*\b/g)].map((m) => m[0]))].sort()
    // v1.0.4 NM1：BattleScreen が渡す初撃破結果（MatchupClearResult・型のみ）と、nextGoal へ渡す入力名 matchup／matchupClear を追加
    expect(refs).toEqual(['MatchupClearResult', 'countMatchupsByEnemy', 'loadMatchups', 'matchup', 'matchupClear', 'matchupStorage', 'matchups'])
    // 書き込み関数の **呼び出し** が無い（コメントでの言及は可）
    expect(src).not.toMatch(/\b(recordMatchupClear|recordGameResult|saveBattle|recordOtomoBond|recordDailyResult)\s*\(|\.setItem\s*\(/)
  })
})

describe('神×敵の記録は既存の保存を書き換えない', () => {
  it('matchupStorage が書き込むキーは sevengods.matchups だけ', () => {
    const src = read('hooks/matchupStorage.ts')
    const keys = [...src.matchAll(/'sevengods\.[a-zA-Z]+'/g)].map((m) => m[0])
    expect([...new Set(keys)]).toEqual(["'sevengods.matchups'"])
    expect(src.match(/localStorage\.setItem\(/g)).toHaveLength(1)
    expect(src).toMatch(/localStorage\.setItem\(STORAGE_KEY,/)
    expect(src).not.toMatch(/removeItem\(/)
  })

  it('神×敵の表示部品（戦績・神選択・敵選択・結果の 1 行）は記録を書かない', () => {
    for (const file of ['components/setup/MatchupBoard.tsx', 'components/setup/GodSelectScreen.tsx', 'components/setup/EnemySelectScreen.tsx', 'components/battle/matchupCelebration.ts', 'components/battle/GameOverOverlay.tsx']) {
      expect(read(file)).not.toMatch(/recordMatchupClear|localStorage\.setItem/)
    }
  })
})

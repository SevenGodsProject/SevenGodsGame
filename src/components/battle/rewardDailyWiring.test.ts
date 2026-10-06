import { describe, expect, it } from 'vitest'

/**
 * 決定267：報酬の配線ガード（ソース固定・Final Design §13-3 W1）。
 * React を描画するテスト基盤が無いため、`entranceWiring.test.ts` と同じくソースを直接検査する。
 * - Daily では報酬を提示しない（`BattleScreen.tsx` の 2 箇所に `state.mode !== 'daily'`）
 * - `RewardOverlay.tsx` は storage を読むだけで書かない（AC18）
 */
const SOURCES = import.meta.glob(['./*.tsx', './*.ts', '!./*.test.ts', '!./*.test.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const read = (file: string): string => {
  const key = Object.keys(SOURCES).find((k) => k.endsWith(`/${file}`))
  expect(key, `ソースが見つからない: ${file}`).toBeDefined()
  return SOURCES[key as string]
}

const count = (src: string, re: RegExp): number => (src.match(new RegExp(re.source, 'g')) ?? []).length

describe('決定267 W1：BattleScreen hides the reward in daily mode and RewardOverlay never writes storage', () => {
  it('BattleScreen.tsx：RewardOverlay の表示条件と rewardPending に state.mode !== \'daily\' が各 1 回', () => {
    const src = read('BattleScreen.tsx')
    expect(count(src, /state\.status === 'won' && state\.mode !== 'daily' && !rewardDone && rewardOpen/)).toBe(1)
    expect(count(src, /rewardPending=\{state\.status === 'won' && state\.mode !== 'daily' && !rewardDone\}/)).toBe(1)
  })

  it('BattleScreen.tsx：確定時に履歴を記録する（選択＝offered、見送り＝offered＋declined）', () => {
    const src = read('BattleScreen.tsx')
    expect(src).toMatch(/pushOfferedRewards\(state\.godId, offered\)/)
    expect(src).toMatch(/pushDeclinedRewards\(state\.godId, offered\)/)
    expect(src).toMatch(/deckFromState=\{collectDeckCardIds\(state\)\}/)
  })

  it('RewardOverlay.tsx：storage 書き込み関数を呼ばない（AC18）', () => {
    const src = read('RewardOverlay.tsx')
    expect(src).not.toMatch(/\b(addRewardBonus|pushOfferedRewards|pushDeclinedRewards|localStorage\.setItem)\s*\(/)
  })
})

import { describe, expect, it } from 'vitest'
import { GOD_IDS } from '../../core/data/gods'
import { ENEMY_IDS } from '../../core/data/enemies'
import type { MatchupClearResult } from '../../hooks/matchupStorage'
import { describeMatchupClear } from './matchupCelebration'

/** Phase 7 P2（決定189・仕様 §9）：結果画面の「初撃破」1 行 */

const r = (over: Partial<MatchupClearResult> = {}): MatchupClearResult => ({
  godId: GOD_IDS.taiyo,
  enemyId: ENEMY_IDS.oni,
  isFirstClear: true,
  godClearedCount: 2,
  enemyClearedCount: 3,
  totalCleared: 12,
  ...over,
})

describe('describeMatchupClear', () => {
  it('初撃破：神 × 敵 と、この敵を倒した神の数（母数 49 は出さない）', () => {
    const text = describeMatchupClear(r())
    expect(text).toBe('✨ 初撃破：大耀 × 業斧の鬼将（この敵 3/7 神）')
    expect(text).not.toContain('49')
  })

  it('同じ組み合わせの 2 勝目以降・記録できなかったときは出さない', () => {
    expect(describeMatchupClear(r({ isFirstClear: false }))).toBeNull()
    expect(describeMatchupClear(null)).toBeNull()
  })

  it('節目：その敵を 7 柱すべてで撃破', () => {
    expect(describeMatchupClear(r({ enemyClearedCount: 7 }))).toBe('✨ 業斧の鬼将を七柱すべてで撃破')
  })

  it('節目：その神で 7 体すべてを撃破（敵 7/7 より優先）', () => {
    expect(describeMatchupClear(r({ godClearedCount: 7 }))).toBe('✨ 大耀で七体すべての敵を撃破')
    expect(describeMatchupClear(r({ godClearedCount: 7, enemyClearedCount: 7 }))).toBe('✨ 大耀で七体すべての敵を撃破')
  })

  it('節目：49/49 がすべてに優先', () => {
    expect(describeMatchupClear(r({ godClearedCount: 7, enemyClearedCount: 7, totalCleared: 49 }))).toBe('✨ 四十九の組み合わせをすべて攻略')
  })

  it('色ではなく ✨ と文言で示す（どの文言も ✨ で始まる 1 行）', () => {
    for (const over of [{}, { enemyClearedCount: 7 }, { godClearedCount: 7 }, { totalCleared: 49, godClearedCount: 7, enemyClearedCount: 7 }]) {
      const text = describeMatchupClear(r(over))
      expect(text?.startsWith('✨ ')).toBe(true)
      expect(text).not.toContain('\n')
    }
  })
})

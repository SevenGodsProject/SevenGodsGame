import { describe, expect, it } from 'vitest'
import type { MasteryResult } from '../../core/engine'
import { GOD_IDS } from '../../core/data/gods'
import { describeMastery, MASTERY_GRADE_WORD, MASTERY_SELECT_HINT } from './masteryDisplay'

/** STEP-SCORE2-D2a：神技評価の表示コピー（純粋関数）の検証 */

function taiyoResult(grade: MasteryResult['grade'], raw: number): MasteryResult {
  return { title: '爆発', grade, raw }
}

describe('describeMastery（大耀「爆発」）', () => {
  it('Gradeに和語補助が付く（A→A（見事））', () => {
    const d = describeMastery(taiyoResult('A', 0.47), GOD_IDS.taiyo, '大耀')
    expect(d.gradeLabel).toBe('A（見事）')
  })

  it('何を測ったかが1行の日本語文になる（47%）', () => {
    const d = describeMastery(taiyoResult('A', 0.47), GOD_IDS.taiyo, '大耀')
    expect(d.description).toBe('大耀「爆発」— 1ラウンドで敵HPの47%を一気に削った！')
  })

  it('A評価では次Grade目標「Sまであと11%」（0.58-0.47）', () => {
    const d = describeMastery(taiyoResult('A', 0.47), GOD_IDS.taiyo, '大耀')
    expect(d.goal).toBe('Sまであと11%')
  })

  it('B評価では「Aまであと○%」', () => {
    const d = describeMastery(taiyoResult('B', 0.4), GOD_IDS.taiyo, '大耀')
    expect(d.goal).toBe('Aまであと5%')
  })

  it('S評価では達成文言（%目標は出さない）', () => {
    const d = describeMastery(taiyoResult('S', 0.62), GOD_IDS.taiyo, '大耀')
    expect(d.goal).toBe('神業達成！')
    expect(d.goal).not.toContain('%')
  })

  it('C評価では失敗感の強い「あと○%」を出さず、励まし文にする（圧対策）', () => {
    const d = describeMastery(taiyoResult('C', 0.2), GOD_IDS.taiyo, '大耀')
    expect(d.goal).toBe('大耀らしい爆発力を、さらに高めよう')
    expect(d.goal).not.toContain('あと')
    expect(d.goal).not.toContain('%')
  })

  it('境界ちょうどでも「あと0%」にはならない（最低1%）', () => {
    // raw 0.579 → S(0.58)まで実際は0.1%だが、表示は最低1%
    const d = describeMastery(taiyoResult('A', 0.579), GOD_IDS.taiyo, '大耀')
    expect(d.goal).toBe('Sまであと1%')
  })
})

describe('神選択画面の神技1行', () => {
  it('大耀には神技説明があり、未実装の神には無い（prototype範囲）', () => {
    expect(MASTERY_SELECT_HINT[GOD_IDS.taiyo]).toContain('爆発')
    expect(MASTERY_SELECT_HINT[GOD_IDS.ebisu]).toBeUndefined()
  })
})

describe('Grade和語', () => {
  it('S/A/B/Cすべてに補助語がある', () => {
    expect(MASTERY_GRADE_WORD).toEqual({ S: '神業', A: '見事', B: '堂々', C: '修行中' })
  })
})

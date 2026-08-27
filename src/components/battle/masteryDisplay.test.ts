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
  it('大耀・寿楽・蒼毘には神技説明があり、未実装の神には無い（prototype範囲）', () => {
    expect(MASTERY_SELECT_HINT[GOD_IDS.taiyo]).toContain('爆発')
    expect(MASTERY_SELECT_HINT[GOD_IDS.juraku]).toContain('無力化')
    expect(MASTERY_SELECT_HINT[GOD_IDS.sobi]).toContain('鉄壁')
    expect(MASTERY_SELECT_HINT[GOD_IDS.ebisu]).toBeUndefined()
  })
})

describe('describeMastery（蒼毘「鉄壁」・STEP-SCORE2-G3）', () => {
  function sobiResult(grade: MasteryResult['grade'], raw: number): MasteryResult {
    return { title: '鉄壁', grade, raw }
  }

  it('表示%は内部rawとMath.roundで一致する（0.496→50%）', () => {
    const d = describeMastery(sobiResult('B', 0.496), GOD_IDS.sobi, '蒼毘')
    expect(d.description).toBe('蒼毘「鉄壁」— 敵の攻撃の50%を無傷で受け止めた！')
  })

  it('C：次Gradeまでの距離を表示（0.30→あと10%でB）', () => {
    const d = describeMastery(sobiResult('C', 0.3), GOD_IDS.sobi, '蒼毘')
    expect(d.gradeLabel).toBe('C（修行中）')
    expect(d.description).toBe('蒼毘「鉄壁」— 敵の攻撃の30%を無傷で受け止めた！')
    expect(d.goal).toBe('あと10%でB（堂々）')
  })

  it('B：Aまでの距離（0.50→Aまであと15%）', () => {
    const d = describeMastery(sobiResult('B', 0.5), GOD_IDS.sobi, '蒼毘')
    expect(d.goal).toBe('Aまであと15%')
  })

  it('A：Sまでの距離（0.65→Sまであと20%）', () => {
    const d = describeMastery(sobiResult('A', 0.65), GOD_IDS.sobi, '蒼毘')
    expect(d.goal).toBe('Sまであと20%')
  })

  it('S：「その盾、神業なり！」（0.90→90%）', () => {
    const d = describeMastery(sobiResult('S', 0.9), GOD_IDS.sobi, '蒼毘')
    expect(d.gradeLabel).toBe('S（神業）')
    expect(d.description).toBe('蒼毘「鉄壁」— 敵の攻撃の90%を無傷で受け止めた！')
    expect(d.goal).toBe('その盾、神業なり！')
  })

  it('境界の浮動小数点誤差：0.84→Sまであと1%', () => {
    const d = describeMastery(sobiResult('A', 0.84), GOD_IDS.sobi, '蒼毘')
    expect(d.goal).toBe('Sまであと1%')
  })
})

describe('describeMastery（寿楽「無力化」・STEP-SCORE2-G1b）', () => {
  function jurakuResult(
    grade: MasteryResult['grade'],
    raw: number,
    extra: Partial<MasteryResult> = {},
  ): MasteryResult {
    return { title: '無力化', grade, raw, sGateMet: false, easyCapped: false, ...extra }
  }

  it('表示%は内部rawとMath.roundで一致する（0.804→80%）', () => {
    const d = describeMastery(jurakuResult('A', 0.804), GOD_IDS.juraku, '寿楽')
    expect(d.description).toBe('寿楽「無力化」— 敵の攻撃を平均80%削いだ！')
  })

  it('S表示：「強打を封じ、神業の無力化！」', () => {
    const d = describeMastery(jurakuResult('S', 0.93, { sGateMet: true }), GOD_IDS.juraku, '寿楽')
    expect(d.gradeLabel).toBe('S（神業）')
    expect(d.goal).toBe('強打を封じ、神業の無力化！')
  })

  it('A（ゲート未達）：強打半減の行動目標を示す', () => {
    const d = describeMastery(jurakuResult('A', 0.85), GOD_IDS.juraku, '寿楽')
    expect(d.goal).toBe('Sには強打（100以上の攻撃）を半分以下に抑えよう')
  })

  it('A（ゲート達成・raw不足）：Sまでの平均%ギャップを示す', () => {
    const d = describeMastery(
      jurakuResult('A', 0.85, { sGateMet: true }),
      GOD_IDS.juraku,
      '寿楽',
    )
    expect(d.goal).toBe('Sまで平均あと5%')
  })

  it('A（easy上限）：難易度を上げる導線を示す', () => {
    const d = describeMastery(
      jurakuResult('A', 0.95, { sGateMet: true, easyCapped: true }),
      GOD_IDS.juraku,
      '寿楽',
    )
    expect(d.goal).toBe('「ふつう」以上の難易度でSに挑戦しよう')
  })

  it('B：Aまでの平均%ギャップ', () => {
    const d = describeMastery(jurakuResult('B', 0.6), GOD_IDS.juraku, '寿楽')
    expect(d.goal).toBe('Aまで平均あと20%')
  })

  // STEP-SCORE2-G1c：CEO初見FB「なぜCか・あとどれだけでBかが分からない」対応。
  // CはUX-A案「あと○%でB（堂々）」で次Gradeまでの距離を必ず示す。
  it('C：次Gradeまでの距離を表示（46%→あと4%でB）', () => {
    const d = describeMastery(jurakuResult('C', 0.46), GOD_IDS.juraku, '寿楽')
    expect(d.description).toBe('寿楽「無力化」— 敵の攻撃を平均46%削いだ！')
    expect(d.goal).toBe('あと4%でB（堂々）')
  })

  // G1d：CEO実測ケース。B=0.50緩和により51%はB（堂々）になる
  it('CEO実測51%：B（堂々）＋「Aまで平均あと29%」', () => {
    const d = describeMastery(jurakuResult('B', 0.51), GOD_IDS.juraku, '寿楽')
    expect(d.gradeLabel).toBe('B（堂々）')
    expect(d.description).toBe('寿楽「無力化」— 敵の攻撃を平均51%削いだ！')
    expect(d.goal).toBe('Aまで平均あと29%')
  })

  // G1d PHASE 3指定の11値（B=0.50/A=0.80）。gradeはgetMasteryの境界仕様
  // （jurakuMastery.test.tsで検証済み）に対応。浮動小数点誤差込みで文言を固定する
  it.each([
    ['C', 0.0, false, 'あと50%でB（堂々）'],
    ['C', 0.3, false, 'あと20%でB（堂々）'],
    ['C', 0.49, false, 'あと1%でB（堂々）'],
    ['C', 0.499999, false, 'あと1%でB（堂々）'],
    ['B', 0.5, false, 'Aまで平均あと30%'],
    ['B', 0.51, false, 'Aまで平均あと29%'],
    ['B', 0.79, false, 'Aまで平均あと1%'],
    ['B', 0.799999, false, 'Aまで平均あと1%'],
    ['A', 0.8, true, 'Sまで平均あと10%'],
    ['A', 0.89, true, 'Sまで平均あと1%'],
    ['S', 0.9, true, '強打を封じ、神業の無力化！'],
  ] as const)('grade=%s raw=%s の表示（境界・浮動小数点誤差込み）', (grade, raw, gate, expected) => {
    const d = describeMastery(jurakuResult(grade, raw, { sGateMet: gate }), GOD_IDS.juraku, '寿楽')
    expect(d.goal).toBe(expected)
  })
})

describe('Grade和語', () => {
  it('S/A/B/Cすべてに補助語がある', () => {
    expect(MASTERY_GRADE_WORD).toEqual({ S: '神業', A: '見事', B: '堂々', C: '修行中' })
  })
})

import { describe, expect, it } from 'vitest'
import type { MasteryResult } from '../../core/engine'
import type { GodId } from '../../core/types'
import { GOD_IDS } from '../../core/data/gods'
import { RULES } from '../../core/data/rules'
import { describeMastery, MASTERY_AXIS_NOTE, MASTERY_GRADE_WORD, MASTERY_SELECT_HINT } from './masteryDisplay'

/**
 * 神技評価の表示コピー（純粋関数）の検証。
 *
 * Human Play QA（2026-09-06）の指摘「なぜCか・次に何をすればいいか分からない」への
 * 修正後の形式を保証する：
 *   ① 現在値と次ランクの目標値が同じ行に並ぶ（差分表現「あと○%」は使わない）
 *   ② 指標の上げ方が1行で出る
 *   ③ 4神とも同じフォーマット（大耀だけ距離が出ない、という例外を作らない）
 *   ④ スコアとは別軸だと分かるラベルがある
 */

const taiyo = (grade: MasteryResult['grade'], raw: number): MasteryResult => ({ title: '爆発', grade, raw })
const sobi = (grade: MasteryResult['grade'], raw: number): MasteryResult => ({ title: '鉄壁', grade, raw })
const juraku = (
  grade: MasteryResult['grade'],
  raw: number,
  extra: Partial<MasteryResult> = {},
): MasteryResult => ({ title: '無力化', grade, raw, sGateMet: false, ...extra })
const fukuei = (
  grade: MasteryResult['grade'],
  raw: number,
  riskGateMet = true,
): MasteryResult => ({ title: '大勝負', grade, raw, riskGateMet })

describe('差分表現の廃止（旧「あと○%でB」を出さない）', () => {
  it('4神のどのランクでも「あと」で始まる距離表現を使わない', () => {
    const cases: [MasteryResult, GodId][] = [
      [taiyo('C', 0.2), GOD_IDS.taiyo],
      [taiyo('B', 0.4), GOD_IDS.taiyo],
      [sobi('C', 0.2), GOD_IDS.sobi],
      [sobi('A', 0.7), GOD_IDS.sobi],
      [juraku('C', 0.3), GOD_IDS.juraku],
      [fukuei('B', 0.2), GOD_IDS.fukuei],
    ]
    for (const [m, god] of cases) {
      const d = describeMastery(m, god)
      expect(d.progress).not.toMatch(/あと/)
      expect(d.hint).not.toMatch(/^あと/)
    }
  })
})

describe('現在値と次ランク閾値の表示', () => {
  it('蒼毘C：現在20%と、Bの目標40%が同じ行に出る', () => {
    const d = describeMastery(sobi('C', 0.2), GOD_IDS.sobi)
    expect(d.gradeLabel).toBe('C（修行中）')
    expect(d.metricLabel).toBe('無傷で受け止めた割合')
    expect(d.progress).toBe('20% → B（堂々）は 40%')
    expect(d.hint).toBe('敵の予告以上のブロックを積むと「無傷」になります')
  })

  it('蒼毘B：次はA（65%）', () => {
    expect(describeMastery(sobi('B', 0.5), GOD_IDS.sobi).progress).toBe('50% → A（見事）は 65%')
  })

  it('蒼毘A：次はS（85%）', () => {
    expect(describeMastery(sobi('A', 0.7), GOD_IDS.sobi).progress).toBe('70% → S（神業）は 85%')
  })

  it('蒼毘S：最高ランクでは目標値を出さない', () => {
    const d = describeMastery(sobi('S', 0.9), GOD_IDS.sobi)
    expect(d.progress).toBe('90% → 最高ランク達成！')
    expect(d.progress).not.toMatch(/は \d+%/)
  })

  it('表示%は内部rawとMath.roundで一致する（0.496→50%）', () => {
    expect(describeMastery(sobi('B', 0.496), GOD_IDS.sobi).progress).toBe('50% → A（見事）は 65%')
  })

  it('閾値ちょうどでも矛盾しない（B閾値0.40でB）', () => {
    expect(describeMastery(sobi('B', RULES.mastery.sobi.b), GOD_IDS.sobi).progress).toBe(
      '40% → A（見事）は 65%',
    )
  })
})

describe('大耀「爆発」— 例外状態をなくす（旧実装ではCで距離が出なかった）', () => {
  it('C：他の神と同じ形式で目標値（37%）が出る', () => {
    const d = describeMastery(taiyo('C', 0.3), GOD_IDS.taiyo)
    expect(d.metricLabel).toBe('1ラウンドで削った敵HPの割合')
    expect(d.progress).toBe('30% → B（堂々）は 37%')
    expect(d.hint).toBe('1ラウンドに火力を集中させるほど割合が上がります')
  })

  it('B/A/Sも同じ形式', () => {
    expect(describeMastery(taiyo('B', 0.4), GOD_IDS.taiyo).progress).toBe('40% → A（見事）は 45%')
    expect(describeMastery(taiyo('A', 0.5), GOD_IDS.taiyo).progress).toBe('50% → S（神業）は 58%')
    expect(describeMastery(taiyo('S', 0.6), GOD_IDS.taiyo).progress).toBe('60% → 最高ランク達成！')
  })

  it('閾値は変更していない（B=0.37 / A=0.45 / S=0.58）', () => {
    expect(RULES.mastery.taiyo).toEqual({ s: 0.58, a: 0.45, b: 0.37 })
  })
})

describe('寿楽「無力化」— ゲート・難易度上限はヒント側で説明する', () => {
  it('C：目標50%と上げ方', () => {
    const d = describeMastery(juraku('C', 0.3), GOD_IDS.juraku)
    expect(d.progress).toBe('30% → B（堂々）は 50%')
    expect(d.hint).toBe('大技の前に敵の攻撃力を下げるほど割合が上がります')
  })

  it('A（強打ゲート未達）：数値目標は出しつつ、ゲート条件をヒントで示す', () => {
    const d = describeMastery(juraku('A', 0.92, { sGateMet: false }), GOD_IDS.juraku)
    expect(d.progress).toBe('92% → S（神業）は 90%')
    expect(d.hint).toBe('Sは強打（予告100以上）を半分以下に抑えると届きます')
  })

  it('A（かんたん上限）：難易度を上げる導線を示す', () => {
    const d = describeMastery(
      juraku('A', 0.95, { sGateMet: true, easyCapped: true }),
      GOD_IDS.juraku,
    )
    expect(d.hint).toBe('「かんたん」では上限A。ふつう以上でSに挑戦できます')
  })

  it('A（ゲート達成・上限なし）：通常のヒントに戻る', () => {
    const d = describeMastery(juraku('A', 0.85, { sGateMet: true }), GOD_IDS.juraku)
    expect(d.progress).toBe('85% → S（神業）は 90%')
    expect(d.hint).toBe('大技の前に敵の攻撃力を下げるほど割合が上がります')
  })
})

describe('福永「大勝負」— risk gate 未達は現在値に注記する', () => {
  it('gate未達C：評価対象外であることを現在値に付け、条件をヒントで示す', () => {
    const d = describeMastery(fukuei('C', 0, false), GOD_IDS.fukuei)
    expect(d.progress).toBe('0%（まだ評価対象外） → B（堂々）は 10%')
    expect(d.hint).toBe('身を削る札で敵HPの1割を削ると評価対象になります')
  })

  it('gate達成C：注記なしで通常の形式', () => {
    const d = describeMastery(fukuei('C', 0.05, true), GOD_IDS.fukuei)
    expect(d.progress).toBe('5% → B（堂々）は 10%')
    expect(d.hint).toBe('身を削る札で攻め、そこからHPを取り戻すと上がります')
  })

  it('B：次はA（40%）', () => {
    expect(describeMastery(fukuei('B', 0.2), GOD_IDS.fukuei).progress).toBe('20% → A（見事）は 40%')
  })
})

describe('全神共通の表示ルール', () => {
  const ALL: [GodId, MasteryResult][] = [
    [GOD_IDS.taiyo, taiyo('C', 0.3)],
    [GOD_IDS.sobi, sobi('C', 0.2)],
    [GOD_IDS.juraku, juraku('C', 0.3)],
    [GOD_IDS.fukuei, fukuei('C', 0.05, true)],
  ]

  it('4神とも「指標名・現在値→目標・上げ方」の3要素が埋まる', () => {
    for (const [god, m] of ALL) {
      const d = describeMastery(m, god)
      expect(d.metricLabel.length).toBeGreaterThan(0)
      expect(d.progress).toMatch(/^\d+%.* → .*は \d+%$/)
      expect(d.hint.length).toBeGreaterThan(0)
    }
  })

  it('ヒントはスマホで一読できる長さ（30字以内）', () => {
    const variants: [GodId, MasteryResult][] = [
      ...ALL,
      [GOD_IDS.juraku, juraku('A', 0.92, { sGateMet: false })],
      [GOD_IDS.juraku, juraku('A', 0.95, { sGateMet: true, easyCapped: true })],
      [GOD_IDS.fukuei, fukuei('C', 0, false)],
    ]
    for (const [god, m] of variants) {
      expect(describeMastery(m, god).hint.length).toBeLessThanOrEqual(30)
    }
  })

  it('スコアと混同されないラベルがある（金額・点ではなく戦い方だと明示）', () => {
    expect(MASTERY_AXIS_NOTE).toBe('スコアとは別。戦い方で決まります')
    expect(MASTERY_AXIS_NOTE.length).toBeLessThanOrEqual(20)
  })

  it('表示にスコア由来の語（点・スコア）を混ぜない', () => {
    for (const [god, m] of ALL) {
      const d = describeMastery(m, god)
      expect(`${d.metricLabel}${d.progress}${d.hint}`).not.toMatch(/スコア|点/)
    }
  })
})

describe('神選択画面の神技1行', () => {
  it('大耀・寿楽・蒼毘・福永には神技説明があり、未実装の神には無い', () => {
    expect(MASTERY_SELECT_HINT[GOD_IDS.taiyo]).toBeTruthy()
    expect(MASTERY_SELECT_HINT[GOD_IDS.juraku]).toBeTruthy()
    expect(MASTERY_SELECT_HINT[GOD_IDS.sobi]).toBeTruthy()
    expect(MASTERY_SELECT_HINT[GOD_IDS.fukuei]).toBeTruthy()
    expect(MASTERY_SELECT_HINT[GOD_IDS.ebisu]).toBeUndefined()
    expect(MASTERY_SELECT_HINT[GOD_IDS.saika]).toBeUndefined()
    expect(MASTERY_SELECT_HINT[GOD_IDS.shouren]).toBeUndefined()
  })
})

describe('Grade和語', () => {
  it('S/A/B/Cすべてに補助語がある', () => {
    expect(MASTERY_GRADE_WORD).toEqual({ S: '神業', A: '見事', B: '堂々', C: '修行中' })
  })
})

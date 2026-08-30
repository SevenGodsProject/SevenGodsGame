import { describe, expect, it } from 'vitest'
import { RULES } from './rules'
import { ENEMY_IDS } from './enemies'
import {
  NO_STAKE_RULES,
  STAKE_CHOICES,
  STAKE_LEVELS,
  STAKE_MAX,
  describeStakeRules,
  isStakeLevel,
  resolveStakeRules,
  specialMultiplierFor,
  stakeLabel,
  stakeScoreScale,
} from './stakes'

/** 決定126：神階Ⅰ〜Ⅶの累積ルール解決（データ層）。engine側の適用は stakeRules.test.ts */
describe('STAKE_LEVELS (決定126)', () => {
  it('defines exactly 7 levels Ⅰ〜Ⅶ with unique names (参道→高天原)', () => {
    expect(STAKE_MAX).toBe(7)
    expect(STAKE_LEVELS.map((s) => s.level)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(STAKE_LEVELS.map((s) => s.nameJa)).toEqual(['参道', '鳥居', '拝殿', '本殿', '奥宮', '禁足地', '高天原'])
    expect(new Set(STAKE_LEVELS.map((s) => s.numeral)).size).toBe(7)
  })

  it('offers 3 distinct choices at Ⅶ', () => {
    expect(STAKE_CHOICES.map((c) => c.id)).toEqual(['race', 'pressure', 'tempo'])
  })

  it('isStakeLevel accepts 0..7 integers only', () => {
    expect([0, 1, 7].every(isStakeLevel)).toBe(true)
    expect([-1, 8, 1.5, '3', null, undefined].some((v) => isStakeLevel(v))).toBe(false)
  })
})

describe('resolveStakeRules (累積方式)', () => {
  it('level 0 / undefined / invalid → identity rules', () => {
    expect(resolveStakeRules(0)).toEqual(NO_STAKE_RULES)
    expect(resolveStakeRules(undefined)).toEqual(NO_STAKE_RULES)
    expect(resolveStakeRules(99)).toEqual(NO_STAKE_RULES)
    expect(NO_STAKE_RULES.divinationCount).toBe(RULES.divination.count)
  })

  it('accumulates one new constraint per level and never removes an earlier one', () => {
    const s = RULES.stakes
    const r1 = resolveStakeRules(1)
    expect(r1.divinationCount).toBe(s.divinationCount)
    expect(r1.lateRoundFrom).toBe(s.lateRoundFrom)
    expect(r1.lateRoundAtkMul).toBe(s.lateRoundAtkMul)
    expect(r1.enemyAtkMul).toBe(s.enemyAtkStep)
    expect(r1.initialHandMinus).toBe(0)
    expect(resolveStakeRules(2).initialHandMinus).toBe(s.initialHandMinus)
    expect(resolveStakeRules(2).enemyHpMul).toBe(1)
    expect(resolveStakeRules(3).enemyHpMul).toBe(s.enemyHpStep)
    expect(resolveStakeRules(3).blockEfficiency).toBe(1)
    expect(resolveStakeRules(4).blockEfficiency).toBe(s.blockEfficiency)
    expect(resolveStakeRules(4).healEfficiency).toBe(1)
    expect(resolveStakeRules(5).healEfficiency).toBe(s.healEfficiency)
    expect(resolveStakeRules(5).specialMul).toBe(1)
    expect(resolveStakeRules(6).specialMul).toBe(s.specialMul)
    // 累積：Ⅵは Ⅰ〜Ⅴ の全制約を保持
    const r6 = resolveStakeRules(6)
    expect(r6.divinationCount).toBe(s.divinationCount)
    expect(r6.initialHandMinus).toBe(s.initialHandMinus)
    expect(r6.enemyHpMul).toBe(s.enemyHpStep)
    expect(r6.blockEfficiency).toBe(s.blockEfficiency)
    expect(r6.healEfficiency).toBe(s.healEfficiency)
  })

  it('Ⅶ applies exactly one chosen trial on top of Ⅵ (pressure is the fallback)', () => {
    const s = RULES.stakes
    const r6 = resolveStakeRules(6)
    const race = resolveStakeRules(7, 'race')
    const pressure = resolveStakeRules(7, 'pressure')
    const tempo = resolveStakeRules(7, 'tempo')
    expect(race.enemyHpMul).toBeCloseTo(r6.enemyHpMul * s.enemyHpStep)
    expect(race.enemyAtkMul).toBe(r6.enemyAtkMul)
    expect(pressure.enemyAtkMul).toBeCloseTo(r6.enemyAtkMul * s.enemyAtkStep)
    expect(pressure.enemyHpMul).toBe(r6.enemyHpMul)
    expect(tempo.round1ApMinus).toBe(1)
    expect(tempo.enemyHpMul).toBe(r6.enemyHpMul)
    expect(resolveStakeRules(7)).toEqual(pressure)
    expect(resolveStakeRules(7, null)).toEqual(pressure)
  })

  it('never hides, randomizes or betrays enemy intent (no such fields exist)', () => {
    const keys = Object.keys(resolveStakeRules(7, 'race'))
    expect(keys.some((k) => /intent|hide|random|bluff/i.test(k))).toBe(false)
  })
})

describe('specialMultiplierFor / stakeScoreScale / describe', () => {
  it('caps the special multiplier for 機工師 (主砲24) and applies it fully to others', () => {
    const r6 = resolveStakeRules(6)
    expect(specialMultiplierFor(r6, ENEMY_IDS.karakuri)).toBe(RULES.stakes.specialMulCapKarakuri)
    expect(specialMultiplierFor(r6, ENEMY_IDS.juuma)).toBe(RULES.stakes.specialMul)
    expect(specialMultiplierFor(resolveStakeRules(5), ENEMY_IDS.karakuri)).toBe(1)
  })

  it('score scale grows linearly and is 1 for normal play', () => {
    expect(stakeScoreScale(0)).toBe(1)
    expect(stakeScoreScale(undefined)).toBe(1)
    expect(stakeScoreScale(7)).toBeCloseTo(1 + RULES.stakes.scoreScalePerLevel * 7)
  })

  it('describes cumulative rules in level order and labels levels', () => {
    expect(describeStakeRules(0)).toEqual([])
    expect(describeStakeRules(1)).toHaveLength(3)
    expect(describeStakeRules(7, 'tempo').at(-1)).toContain('ラウンド1の神力')
    expect(stakeLabel(3)).toBe('神階Ⅲ 拝殿')
    expect(stakeLabel(0)).toBe('')
  })
})

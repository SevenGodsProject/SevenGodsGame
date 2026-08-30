import { describe, expect, it } from 'vitest'
import { RULES } from '../../core/data/rules'
import { SE_GAIN, damageFeelTier, feelTierClass } from './feelTier'

/** 決定128：演出強度4段階の回帰保証。閾値は baselineDamagePerAp から導く（ハードコードしない） */
describe('damageFeelTier (決定128)', () => {
  const b = RULES.baselineDamagePerAp
  it('maps damage amounts to 4 tiers with thresholds 2x/3x/5x baseline', () => {
    expect(damageFeelTier(1)).toBe(1)
    expect(damageFeelTier(b * 2 - 1)).toBe(1)
    expect(damageFeelTier(b * 2)).toBe(2)
    expect(damageFeelTier(b * 3 - 1)).toBe(2)
    expect(damageFeelTier(b * 3)).toBe(3)
    expect(damageFeelTier(b * 5 - 1)).toBe(3)
    expect(damageFeelTier(b * 5)).toBe(4)
  })

  it('BURST is always L4 and enemy specials are at least L3', () => {
    expect(damageFeelTier(3, { burst: true })).toBe(4)
    expect(damageFeelTier(3, { special: true })).toBe(3)
    expect(damageFeelTier(b * 5, { special: true })).toBe(4)
  })

  it('does not inflate: ordinary card damage in the current pool stays below L4', () => {
    // 共通カードの最大単発ダメージは 渾身の一撃 20 → L3。神託 25 のみ L4
    expect(damageFeelTier(20)).toBe(3)
    expect(damageFeelTier(25)).toBe(4)
  })

  it('SE gain hierarchy is monotonic by impact tier and bounded by master', () => {
    expect(SE_GAIN.impact[1]).toBeLessThan(SE_GAIN.impact[2])
    expect(SE_GAIN.impact[2]).toBeLessThan(SE_GAIN.impact[3])
    expect(SE_GAIN.impact[3]).toBeLessThan(SE_GAIN.impact[4])
    expect(SE_GAIN.feedback).toBeLessThan(SE_GAIN.stateChange)
    expect(SE_GAIN.master).toBeLessThanOrEqual(1)
    expect(feelTierClass('hit-tier', 3)).toBe('hit-tier-l3')
  })
})

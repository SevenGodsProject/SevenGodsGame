import { describe, expect, it } from 'vitest'
import { getCardDef } from '../../core/data/cards'
import { CARD_IDS } from '../../core/data/cards/common'
import { formatEnemyIntent, getEnemyDamagePowerTier, getIntentTierClass } from './cardStyle'

describe('getEnemyDamagePowerTier', () => {
  it('判定はtype・godId・カードIDを見ず、敵へのdamage量だけで決まる', () => {
    // 神託はtype:'oracle'・damage 25。attack以外でも大ダメージなら
    // 最上位tierになることを保証する（第二次完成フェーズ候補C、CEO必須条件）。
    const oracle = getCardDef(CARD_IDS.oracle)
    expect(oracle.type).toBe('oracle')
    expect(getEnemyDamagePowerTier(oracle)).toBe('huge')
  })

  it('閾値の境界（9→normal, 10→strong, 14→strong, 15→huge）', () => {
    const base = getCardDef(CARD_IDS.oracle)
    const withAmount = (amount: number) => ({
      ...base,
      effects: [{ kind: 'damage' as const, target: 'enemy' as const, amount }],
    })
    expect(getEnemyDamagePowerTier(withAmount(9))).toBe('normal')
    expect(getEnemyDamagePowerTier(withAmount(10))).toBe('strong')
    expect(getEnemyDamagePowerTier(withAmount(14))).toBe('strong')
    expect(getEnemyDamagePowerTier(withAmount(15))).toBe('huge')
  })

  it('敵へのdamage効果を持たないカード（共鳴・防御など）はnormal扱い', () => {
    const guard = getCardDef(CARD_IDS.ironStance)
    expect(getEnemyDamagePowerTier(guard)).toBe('normal')
  })

  it('自傷ダメージ（target:self）はtier判定に含めない', () => {
    const selfHarm = getCardDef(CARD_IDS.recklessBlow)
    // 捨身の一撃：自分に3、敵に6。敵への6のみが判定対象で'normal'のまま
    expect(getEnemyDamagePowerTier(selfHarm)).toBe('normal')
  })
})

// ENEMY-IDENTITY-PROTOTYPE-02：連撃・必殺技のintent表示
describe('formatEnemyIntent（連撃・必殺技）', () => {
  it('必殺技（special）は🔥＋技名＋×10表示', () => {
    expect(formatEnemyIntent({ kind: 'special', amount: 24, name: '主砲・神滅甲' })).toBe(
      '🔥 主砲・神滅甲 240',
    )
  })

  it('special連撃は🔥＋技名＋「40×3」形式（合計120と誤認させない）', () => {
    expect(
      formatEnemyIntent({ kind: 'multiAttack', hits: [4, 4, 4], name: '双牙乱撃', special: true }),
    ).toBe('🔥 双牙乱撃 40×3')
  })

  it('通常連撃（不均一hit）は⚔連撃＋「50+40」形式', () => {
    expect(formatEnemyIntent({ kind: 'multiAttack', hits: [5, 4] })).toBe('⚔ 連撃 50+40')
  })

  it('通常連撃（均一hit）は⚔連撃＋「70×2」形式', () => {
    expect(formatEnemyIntent({ kind: 'multiAttack', hits: [7, 7] })).toBe('⚔ 連撃 70×2')
  })
})

describe('getIntentTierClass（連撃・必殺技）', () => {
  it('specialは常に最上位（intent-tier-huge）', () => {
    expect(getIntentTierClass({ kind: 'special', amount: 24, name: '主砲・神滅甲' })).toBe(
      'intent-tier-huge',
    )
  })

  it('special連撃も最上位', () => {
    expect(
      getIntentTierClass({ kind: 'multiAttack', hits: [4, 4, 4], name: '双牙乱撃', special: true }),
    ).toBe('intent-tier-huge')
  })

  it('通常連撃は合計値でtier判定（5+4=9→normal、7+7=14→strong、8+8=16→huge）', () => {
    expect(getIntentTierClass({ kind: 'multiAttack', hits: [5, 4] })).toBe('')
    expect(getIntentTierClass({ kind: 'multiAttack', hits: [7, 7] })).toBe('intent-tier-strong')
    expect(getIntentTierClass({ kind: 'multiAttack', hits: [8, 8] })).toBe('intent-tier-huge')
  })
})

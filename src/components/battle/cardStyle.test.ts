import { describe, expect, it } from 'vitest'
import { getCardDef } from '../../core/data/cards'
import { CARD_IDS } from '../../core/data/cards/common'
import { getEnemyDamagePowerTier } from './cardStyle'

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

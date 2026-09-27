import { describe, expect, it } from 'vitest'
import { getCardDef } from '../../core/data/cards'
import { CARD_IDS } from '../../core/data/cards/common'
import { ENEMIES } from '../../core/data/enemies'
import type { EnemyActionDef } from '../../core/types'
import {
  formatEnemyIntent,
  formatEnemyIntentText,
  getEnemyDamagePowerTier,
  getIntentDangerLevel,
  getIntentGlyph,
  getIntentStanceClass,
  getIntentTierClass,
  type IntentDangerLevel,
} from './cardStyle'

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

/* 決定240 Enemy Intent Presentation v1：表示専用の純関数（文言・名札クラスは不変） */
describe('決定240 getIntentDangerLevel／getIntentGlyph／formatEnemyIntentText／getIntentStanceClass', () => {
  it('kind と 10/15 閾値だけで危険度を決める（getIntentTierClass と同じ判定）', () => {
    expect(getIntentDangerLevel(null)).toBe('none')
    expect(getIntentDangerLevel({ kind: 'attack', amount: 9 })).toBe('none')
    expect(getIntentDangerLevel({ kind: 'attack', amount: 10 })).toBe('strong')
    expect(getIntentDangerLevel({ kind: 'attack', amount: 14 })).toBe('strong')
    expect(getIntentDangerLevel({ kind: 'attack', amount: 15 })).toBe('huge')
    expect(getIntentDangerLevel({ kind: 'charge', label: '砲身に魔力を溜めている…' })).toBe('charge')
    expect(getIntentDangerLevel({ kind: 'special', amount: 24, name: '主砲・神滅甲' })).toBe('special')
    expect(getIntentDangerLevel({ kind: 'multiAttack', hits: [4, 4, 4], name: '双牙乱撃', special: true })).toBe('special')
    expect(getIntentDangerLevel({ kind: 'multiAttack', hits: [5, 4] })).toBe('none')
    expect(getIntentDangerLevel({ kind: 'multiAttack', hits: [7, 7] })).toBe('strong')
    expect(getIntentDangerLevel({ kind: 'multiAttack', hits: [8, 8] })).toBe('huge')
  })

  it('グリフは既存キーのみ（⚔→sword／💥→swordHeavy／🔥→burst／⚡→bolt、予告なし→null）', () => {
    expect(getIntentGlyph(null)).toBeNull()
    expect(getIntentGlyph({ kind: 'attack', amount: 5 })).toBe('sword')
    expect(getIntentGlyph({ kind: 'attack', amount: 12 })).toBe('swordHeavy')
    expect(getIntentGlyph({ kind: 'attack', amount: 22 })).toBe('burst')
    expect(getIntentGlyph({ kind: 'special', amount: 24, name: '主砲・神滅甲' })).toBe('burst')
    expect(getIntentGlyph({ kind: 'multiAttack', hits: [4, 4, 4], name: '双牙乱撃', special: true })).toBe('burst')
    expect(getIntentGlyph({ kind: 'charge', label: 'x' })).toBe('bolt')
  })

  it('文言は formatEnemyIntent から先頭絵文字 1 つと空白を除いただけ（語・数値は同一・絵文字 0）', () => {
    const cases: EnemyActionDef[] = [
      { kind: 'attack', amount: 5 },
      { kind: 'attack', amount: 12 },
      { kind: 'attack', amount: 22 },
      { kind: 'charge', label: '⚠ 主砲充填開始…！' },
      { kind: 'special', amount: 24, name: '主砲・神滅甲' },
      { kind: 'multiAttack', hits: [4, 4, 4], name: '双牙乱撃', special: true },
      { kind: 'multiAttack', hits: [5, 4] },
    ]
    for (const c of cases) {
      const full = formatEnemyIntent(c)
      const text = formatEnemyIntentText(c)
      expect(full.endsWith(text)).toBe(true)
      // 先頭の絵文字 1 文字（💥🔥 はサロゲートペア）＋空白 1 ＝コードポイント 2 つ分だけ短い
      expect([...full].length - [...text].length).toBe(2)
      expect(/^(⚔|💥|🔥|⚡)/u.test(text)).toBe(false)
    }
    expect(formatEnemyIntentText({ kind: 'attack', amount: 22 })).toBe('特大 220')
    expect(formatEnemyIntentText({ kind: 'charge', label: '⚠ 主砲充填開始…！' })).toBe('⚠ 主砲充填開始…！')
    expect(formatEnemyIntentText(null)).toBe('行動予告なし')
  })

  it('構えクラスは strong／huge／special だけ。normal・charge（既存 enemy-avatar-charging が担う）・予告なしは空', () => {
    expect(getIntentStanceClass(null)).toBe('')
    expect(getIntentStanceClass({ kind: 'attack', amount: 9 })).toBe('')
    expect(getIntentStanceClass({ kind: 'charge', label: 'x' })).toBe('')
    expect(getIntentStanceClass({ kind: 'attack', amount: 10 })).toBe('enemy-avatar-intent-strong')
    expect(getIntentStanceClass({ kind: 'attack', amount: 15 })).toBe('enemy-avatar-intent-huge')
    expect(getIntentStanceClass({ kind: 'special', amount: 24, name: 'x' })).toBe('enemy-avatar-intent-special')
    expect(getIntentStanceClass({ kind: 'multiAttack', hits: [4, 4, 4], name: 'x', special: true })).toBe('enemy-avatar-intent-special')
  })

  it('台帳（通常難度・修正子なし）：7 敵 × 7 行動＝49、normal 21／strong 10／huge 12／special 2／charge 4（危険 28）', () => {
    const counts: Record<IntentDangerLevel, number> = { none: 0, strong: 0, huge: 0, special: 0, charge: 0 }
    let total = 0
    for (const def of ENEMIES) {
      expect(def.actions.length).toBe(7)
      for (const a of def.actions) {
        total++
        const level = getIntentDangerLevel(a)
        counts[level]++
        // 名札の色クラス（既存）と危険度が矛盾しない
        const tierCls = getIntentTierClass(a)
        if (level === 'none') expect(tierCls).toBe('')
        if (level === 'strong') expect(tierCls).toBe('intent-tier-strong')
        if (level === 'huge' || level === 'special') expect(tierCls).toBe('intent-tier-huge')
        if (level === 'charge') expect(tierCls).toBe('intent-tier-charge')
        // normal と charge は構えクラス 0（静かなラウンドは静かなまま／charge は既存表現）
        if (level === 'none' || level === 'charge') expect(getIntentStanceClass(a)).toBe('')
        else expect(getIntentStanceClass(a)).toBe(`enemy-avatar-intent-${level}`)
      }
    }
    expect(total).toBe(49)
    expect(counts).toEqual({ none: 21, strong: 10, huge: 12, special: 2, charge: 4 })
  })
})

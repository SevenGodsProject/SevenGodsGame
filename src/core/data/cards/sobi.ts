import { cardDefId } from '../../types/ids'
import type { CardDef } from '../../types/card'
import { GOD_IDS } from '../gods'

/**
 * 蒼毘（sobi）専用カード。
 *
 * 決定20の性格モチーフ（毘沙門天：寡黙で実直な守護者、仲間のためなら
 * 一歩も引かない硬派な武人）を反映し、防御・妨害を中心に据えた
 * 「盾となる」構成にしています（決定25）。
 */
export const SOBI_CARD_IDS = {
  unshakableStance: cardDefId('card_sobi_guard_01'),
  oathOfShield: cardDefId('card_sobi_guard_02'),
  counterBlade: cardDefId('card_sobi_attack_01'),
  sternRebuke: cardDefId('card_sobi_hinder_01'),
} as const

export const SOBI_CARDS: CardDef[] = [
  {
    id: SOBI_CARD_IDS.unshakableStance,
    name: '不動の構え',
    text: 'ブロックを130得る。',
    type: 'guard',
    cost: 2,
    rarity: 'rare',
    godId: GOD_IDS.sobi,
    // 鉄壁の構え(2AP・12block)よりわずかに硬い、専用の盾
    effects: [{ kind: 'block', amount: 13 }],
    // Phase 3 FINAL SPEC v0.1：予告に合わせて固める判断そのものを火力に変える。
    // Step 2.5の対応標本で −10.3pt（現行）→ +2.2pt へ転じた蒼毘の看板カード
    bonus: {
      when: 'blocked',
      effects: [{ kind: 'damage', target: 'enemy', amount: 6 }],
      textJa: 'ブロックが敵の予告以上なら、敵に60ダメージ。',
    },
  },
  {
    id: SOBI_CARD_IDS.oathOfShield,
    name: '誓いの盾',
    text: 'ブロックを40得て、HPを30回復する。',
    type: 'guard',
    cost: 1,
    rarity: 'rare',
    godId: GOD_IDS.sobi,
    effects: [
      { kind: 'block', amount: 4 },
      { kind: 'heal', amount: 3 },
    ],
  },
  {
    id: SOBI_CARD_IDS.counterBlade,
    name: '反撃の刃',
    text: 'ブロックを60得て、敵に80ダメージを与える。',
    type: 'attack',
    cost: 2,
    rarity: 'rare',
    godId: GOD_IDS.sobi,
    // 守ってから攻める、武人らしい一枚
    effects: [
      { kind: 'block', amount: 6 },
      { kind: 'damage', target: 'enemy', amount: 8 },
    ],
  },
  {
    id: SOBI_CARD_IDS.sternRebuke,
    name: '一喝',
    text: '敵の攻撃力を3ラウンドのあいだ60下げる。',
    type: 'hinder',
    cost: 2,
    rarity: 'rare',
    godId: GOD_IDS.sobi,
    // 呪縛(2AP・-5×3round・効率×1.5)の専用上位版
    effects: [{ kind: 'debuff', target: 'enemy', stat: 'atk', amount: 6, rounds: 3 }],
    // Phase 3 FINAL SPEC v0.1：「大技の直前に置く」判断に報酬を与える。
    // Step 2.5の対応標本で −6.7pt（現行）→ +3.6pt
    bonus: {
      when: 'enemyBig',
      effects: [{ kind: 'damage', target: 'enemy', amount: 6 }],
      textJa: '敵の予告が100以上なら、敵に60ダメージ。',
    },
  },
]

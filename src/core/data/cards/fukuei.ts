import { cardDefId } from '../../types/ids'
import type { CardDef } from '../../types/card'
import { GOD_IDS } from '../gods'

/**
 * 福永（fukuei）専用カード。
 *
 * 決定20の性格モチーフ（福禄寿：怖いもの知らずの冒険家、幸運は自分から
 * 掴みにいく主義）を反映し、リスクを取った攻めと、掴んだ幸運が自分を
 * 支える回復・リソース獲得を組み合わせた構成にしています（決定25）。
 */
export const FUKUEI_CARD_IDS = {
  fortuneStrike: cardDefId('card_fukuei_attack_01'),
  goddessOfLuck: cardDefId('card_fukuei_support_01'),
  adventurersInstinct: cardDefId('card_fukuei_resonance_01'),
  unbreakableStep: cardDefId('card_fukuei_attack_02'),
} as const

export const FUKUEI_CARDS: CardDef[] = [
  {
    id: FUKUEI_CARD_IDS.fortuneStrike,
    name: '一攫千金',
    text: '敵に150ダメージを与え、自分に20ダメージを与える。',
    type: 'attack',
    cost: 2,
    rarity: 'rare',
    godId: GOD_IDS.fukuei,
    effects: [
      { kind: 'damage', target: 'enemy', amount: 15 },
      { kind: 'damage', target: 'self', amount: 2 },
    ],
  },
  {
    id: FUKUEI_CARD_IDS.goddessOfLuck,
    name: '幸運の女神',
    text: 'HPを40回復し、神力を1得る。',
    type: 'support',
    cost: 1,
    rarity: 'rare',
    godId: GOD_IDS.fukuei,
    effects: [
      { kind: 'heal', amount: 4 },
      { kind: 'gainAp', amount: 1 },
    ],
  },
  {
    id: FUKUEI_CARD_IDS.adventurersInstinct,
    name: '冒険者の勘',
    text: '共鳴ゲージを2上昇させ、カードを1枚引く。',
    type: 'resonance',
    cost: 2,
    rarity: 'rare',
    godId: GOD_IDS.fukuei,
    effects: [
      { kind: 'resonance', amount: 2 },
      { kind: 'draw', amount: 1 },
    ],
  },
  {
    id: FUKUEI_CARD_IDS.unbreakableStep,
    name: '不屈の一歩',
    text: '敵に40ダメージを与え、HPを20回復する。',
    type: 'attack',
    cost: 1,
    rarity: 'rare',
    godId: GOD_IDS.fukuei,
    effects: [
      { kind: 'damage', target: 'enemy', amount: 4 },
      { kind: 'heal', amount: 2 },
    ],
  },
]

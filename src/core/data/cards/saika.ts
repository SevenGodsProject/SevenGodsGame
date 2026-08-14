import { cardDefId } from '../../types/ids'
import type { CardDef } from '../../types/card'
import { GOD_IDS } from '../gods'

/**
 * 才華（saika）専用カード。
 *
 * 決定20の性格モチーフ（弁財天：天性のパフォーマー、目立つこと・魅せることが
 * 何より好き）を反映し、ドロー・神力獲得によるコンボ継続を中心に据えた
 * 構成にしています（決定25。共鳴発動効果のdraw+gainApとも一貫性を持たせた）。
 */
export const SAIKA_CARD_IDS = {
  mesmerizingDance: cardDefId('card_saika_resonance_01'),
  standingOvation: cardDefId('card_saika_support_01'),
  soloPerformance: cardDefId('card_saika_attack_01'),
  encore: cardDefId('card_saika_support_02'),
} as const

export const SAIKA_CARDS: CardDef[] = [
  {
    id: SAIKA_CARD_IDS.mesmerizingDance,
    name: '魅惑の舞',
    text: '共鳴ゲージを3上昇させ、カードを1枚引く。',
    type: 'resonance',
    cost: 2,
    rarity: 'rare',
    godId: GOD_IDS.saika,
    effects: [
      { kind: 'resonance', amount: 3 },
      { kind: 'draw', amount: 1 },
    ],
  },
  {
    id: SAIKA_CARD_IDS.standingOvation,
    name: '喝采',
    text: 'カードを1枚引き、スコアを20得る。',
    type: 'support',
    cost: 1,
    rarity: 'rare',
    godId: GOD_IDS.saika,
    effects: [
      { kind: 'draw', amount: 1 },
      { kind: 'score', amount: 20 },
    ],
  },
  {
    id: SAIKA_CARD_IDS.soloPerformance,
    name: '独奏',
    text: '敵に4ダメージを与え、神力を1得る。',
    type: 'attack',
    cost: 1,
    rarity: 'rare',
    godId: GOD_IDS.saika,
    effects: [
      { kind: 'damage', target: 'enemy', amount: 4 },
      { kind: 'gainAp', amount: 1 },
    ],
  },
  {
    id: SAIKA_CARD_IDS.encore,
    name: 'アンコール',
    text: '神力を2得て、スコアを30得る。',
    type: 'support',
    cost: 2,
    rarity: 'rare',
    godId: GOD_IDS.saika,
    effects: [
      { kind: 'gainAp', amount: 2 },
      { kind: 'score', amount: 30 },
    ],
  },
]

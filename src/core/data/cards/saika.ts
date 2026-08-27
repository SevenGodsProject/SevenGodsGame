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
    // STEP-SCORE2-F2（B'）：旧score20はBASE-Dで無効化されたため、block2へ置換。
    // resonance置換はF1 PLAN-Bで才華テール独占（84.6%）の主因と実証されたため禁止。
    text: 'カードを1枚引き、ブロックを20得る。',
    type: 'support',
    cost: 1,
    rarity: 'rare',
    godId: GOD_IDS.saika,
    effects: [
      { kind: 'draw', amount: 1 },
      { kind: 'block', amount: 2 },
    ],
  },
  {
    id: SAIKA_CARD_IDS.soloPerformance,
    name: '独奏',
    text: '敵に40ダメージを与え、神力を1得る。',
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
    // STEP-SCORE2-F2（B'・PHASE1B確定）：旧score30をdraw1へ置換し「もう一手動ける」
    // 体験の核にする。[gainAp3]案は才華上位1%を53.1→56.0%へ悪化させたため不採用
    // （drawではなくAPがテールの燃料であることをPHASE1Bで実証済み）。
    text: '神力を2得て、カードを1枚引く。',
    type: 'support',
    cost: 2,
    rarity: 'rare',
    godId: GOD_IDS.saika,
    effects: [
      { kind: 'gainAp', amount: 2 },
      { kind: 'draw', amount: 1 },
    ],
  },
]

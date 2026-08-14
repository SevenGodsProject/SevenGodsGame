import { cardDefId } from '../../types/ids'
import type { CardDef } from '../../types/card'
import { GOD_IDS } from '../gods'

/**
 * 恵比寿（ebisu）専用カード。
 *
 * 決定18でSGG Creator Kitを採用し、恵比寿＝鯛と釣り竿を携えた福の神という
 * ビジュアルが確定したため、その意匠をカード効果に反映しています。
 *
 * MVPでは恵比寿固定（決定16）のため、STARTER_DECKに組み込んでそのまま使えます。
 * 他の神のカードを増やすときは、この形式でファイルを追加してください。
 */
export const EBISU_CARD_IDS = {
  greatCatch: cardDefId('card_ebisu_attack_01'),
  fortune: cardDefId('card_ebisu_support_01'),
  tidingsCatch: cardDefId('card_ebisu_attack_02'),
  ebisuSmile: cardDefId('card_ebisu_support_02'),
} as const

export const EBISU_CARDS: CardDef[] = [
  {
    id: EBISU_CARD_IDS.greatCatch,
    name: '大漁',
    text: '敵に8ダメージを与え、共鳴ゲージを2上昇させる。',
    type: 'attack',
    cost: 2,
    rarity: 'rare',
    godId: GOD_IDS.ebisu,
    effects: [
      { kind: 'damage', target: 'enemy', amount: 8 },
      { kind: 'resonance', amount: 2 },
    ],
  },
  {
    id: EBISU_CARD_IDS.fortune,
    name: '福授け',
    text: 'HPを3回復し、スコアを30得る。',
    type: 'support',
    cost: 1,
    rarity: 'rare',
    godId: GOD_IDS.ebisu,
    effects: [
      { kind: 'heal', amount: 3 },
      { kind: 'score', amount: 30 },
    ],
  },
  {
    id: EBISU_CARD_IDS.tidingsCatch,
    name: '潮招き',
    text: '敵に10ダメージを与え、HPを4回復する。',
    type: 'attack',
    cost: 2,
    rarity: 'rare',
    godId: GOD_IDS.ebisu,
    // 大漁の別解。共鳴を伸ばす代わりに自己回復で粘り強さを出す
    effects: [
      { kind: 'damage', target: 'enemy', amount: 10 },
      { kind: 'heal', amount: 4 },
    ],
  },
  {
    id: EBISU_CARD_IDS.ebisuSmile,
    name: '恵比寿顔',
    text: 'HPを6回復し、共鳴ゲージを2上昇させる。',
    type: 'support',
    cost: 2,
    rarity: 'rare',
    godId: GOD_IDS.ebisu,
    effects: [
      { kind: 'heal', amount: 6 },
      { kind: 'resonance', amount: 2 },
    ],
  },
]

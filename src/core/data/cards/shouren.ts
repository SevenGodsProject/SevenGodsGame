import { cardDefId } from '../../types/ids'
import type { CardDef } from '../../types/card'
import { GOD_IDS } from '../gods'

/**
 * 笑蓮（shouren）専用カード。
 *
 * 決定20の性格モチーフ（布袋：おおらかで面倒見のいい姉貴分、細かいことは
 * 気にせず誰でも受け入れる）を反映し、回復・ブロックによる包容力を中心に
 * 据えた、攻撃は控えめな支援特化の構成にしています（決定25）。
 */
export const SHOUREN_CARD_IDS = {
  bagOfFortune: cardDefId('card_shouren_support_01'),
  deepEmbrace: cardDefId('card_shouren_guard_01'),
  laughItOff: cardDefId('card_shouren_support_02'),
  gentleBlow: cardDefId('card_shouren_attack_01'),
} as const

export const SHOUREN_CARDS: CardDef[] = [
  {
    id: SHOUREN_CARD_IDS.bagOfFortune,
    name: '福袋',
    text: 'HPを11回復する。',
    type: 'support',
    cost: 2,
    rarity: 'rare',
    godId: GOD_IDS.shouren,
    // 息吹(2AP・12heal)よりわずかに控えめな、専用の大回復
    effects: [{ kind: 'heal', amount: 11 }],
  },
  {
    id: SHOUREN_CARD_IDS.deepEmbrace,
    name: '懐の深さ',
    text: 'ブロックを11得る。',
    type: 'guard',
    cost: 2,
    rarity: 'rare',
    godId: GOD_IDS.shouren,
    effects: [{ kind: 'block', amount: 11 }],
  },
  {
    id: SHOUREN_CARD_IDS.laughItOff,
    name: '笑って許す',
    text: 'HPを4回復し、ブロックを4得る。',
    type: 'support',
    cost: 1,
    rarity: 'rare',
    godId: GOD_IDS.shouren,
    effects: [
      { kind: 'heal', amount: 4 },
      { kind: 'block', amount: 4 },
    ],
  },
  {
    id: SHOUREN_CARD_IDS.gentleBlow,
    name: 'おおらかな一打',
    text: '敵に7ダメージを与え、HPを3回復する。',
    type: 'attack',
    cost: 1,
    rarity: 'rare',
    godId: GOD_IDS.shouren,
    // 笑蓮の唯一の攻撃カード。決定26のバランスシミュレーションで、攻撃カードが
    // これ1種類しか無いことによる火力不足（全戦略で撃破不能）が判明したため、
    // 控えめな威力に回復を添えた「優しい一打」のコンセプトは保ちつつ4→7に引き上げた
    effects: [
      { kind: 'damage', target: 'enemy', amount: 7 },
      { kind: 'heal', amount: 3 },
    ],
  },
]

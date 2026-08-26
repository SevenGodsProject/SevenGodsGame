import { cardDefId } from '../../types/ids'
import type { CardDef } from '../../types/card'
import { GOD_IDS } from '../gods'

/**
 * 寿楽（juraku）専用カード。
 *
 * 決定20の性格モチーフ（寿老人：悪戯好きの老獪、されど中身は子供のように
 * 無邪気）を反映し、敵の勢いをじわじわ削る妨害と、長生きらしい持久戦向けの
 * 支援を中心に据えた構成にしています（決定25）。
 */
export const JURAKU_CARD_IDS = {
  mischief: cardDefId('card_juraku_hinder_01'),
  wisdomOfAges: cardDefId('card_juraku_guard_01'),
  halfJoking: cardDefId('card_juraku_attack_01'),
  whimsy: cardDefId('card_juraku_resonance_01'),
} as const

export const JURAKU_CARDS: CardDef[] = [
  {
    id: JURAKU_CARD_IDS.mischief,
    name: '悪戯',
    text: '敵の攻撃力を2ラウンドのあいだ40下げる。',
    type: 'hinder',
    cost: 1,
    rarity: 'rare',
    godId: GOD_IDS.juraku,
    // 見切り(1AP・-5×1round)と威嚇(1AP・-3×2round)の中間に位置する軽量妨害
    effects: [{ kind: 'debuff', target: 'enemy', stat: 'atk', amount: 4, rounds: 2 }],
  },
  {
    id: JURAKU_CARD_IDS.wisdomOfAges,
    name: '長生きの知恵',
    text: 'HPを40回復し、ブロックを40得る。',
    type: 'guard',
    cost: 1,
    rarity: 'rare',
    godId: GOD_IDS.juraku,
    effects: [
      { kind: 'heal', amount: 4 },
      { kind: 'block', amount: 4 },
    ],
  },
  {
    id: JURAKU_CARD_IDS.halfJoking,
    name: 'からかい半分',
    text: '敵に70ダメージを与え、敵の攻撃力を2ラウンドのあいだ40下げる。',
    type: 'attack',
    cost: 2,
    rarity: 'rare',
    godId: GOD_IDS.juraku,
    // 大喝(3AP・18dmg+debuff3×1round)よりダメージは低いが、妨害を長く効かせる
    effects: [
      { kind: 'damage', target: 'enemy', amount: 7 },
      { kind: 'debuff', target: 'enemy', stat: 'atk', amount: 4, rounds: 2 },
    ],
  },
  {
    id: JURAKU_CARD_IDS.whimsy,
    name: '気まぐれ',
    text: '共鳴ゲージを2上昇させ、HPを20回復する。',
    type: 'resonance',
    cost: 1,
    rarity: 'rare',
    godId: GOD_IDS.juraku,
    effects: [
      { kind: 'resonance', amount: 2 },
      { kind: 'heal', amount: 2 },
    ],
  },
]

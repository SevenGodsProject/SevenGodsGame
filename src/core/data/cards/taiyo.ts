import { cardDefId } from '../../types/ids.js'
import type { CardDef } from '../../types/card.js'
import { GOD_IDS } from '../gods.js'

/**
 * 大耀（taiyo）専用カード。
 *
 * 決定20の性格モチーフ（大黒天：戦いを楽しむ豪快な戦術家肌、後輩思いの姉御肌）を
 * 反映し、リスクを取って火力を伸ばす「玉砕上等」の攻撃と、
 * 姉御肌らしい鼓舞・面倒見の支援で構成しています（決定25）。
 */
export const TAIYO_CARD_IDS = {
  boldStrike: cardDefId('card_taiyo_attack_01'),
  sisterlyCommand: cardDefId('card_taiyo_support_01'),
  singleMinded: cardDefId('card_taiyo_attack_02'),
  lookingAfterJuniors: cardDefId('card_taiyo_support_02'),
} as const

export const TAIYO_CARDS: CardDef[] = [
  {
    id: TAIYO_CARD_IDS.boldStrike,
    name: '豪快な一撃',
    text: '敵に140ダメージを与え、自分に20ダメージを与える。',
    type: 'attack',
    cost: 2,
    rarity: 'rare',
    godId: GOD_IDS.taiyo,
    // 剛撃(2AP・12dmg)より高火力だが自傷2の代償を払う「玉砕上等」な一枚
    effects: [
      { kind: 'damage', target: 'enemy', amount: 14 },
      { kind: 'damage', target: 'self', amount: 2 },
    ],
    // Phase 5-C（決定159）：「共鳴を溜めてから吐き出す」。共鳴は使う前の値で判定するので、
    // 先に共振・一心不乱で4まで積んでから撃つ、という順番そのものに報酬が出る
    bonus: {
      when: 'charged',
      effects: [{ kind: 'damage', target: 'enemy', amount: 4 }],
      textJa: '共鳴が4以上なら、敵に40ダメージ。',
    },
  },
  {
    id: TAIYO_CARD_IDS.sisterlyCommand,
    name: '姉御の号令',
    text: '自分の攻撃力を2ラウンドのあいだ30上げる。',
    type: 'support',
    cost: 1,
    rarity: 'rare',
    godId: GOD_IDS.taiyo,
    // カード効果でのbuff初採用。以降の攻撃カードの威力を底上げする
    effects: [{ kind: 'buff', target: 'self', stat: 'atk', amount: 3, rounds: 2 }],
    // Phase 5-C（決定159）：共鳴を溜めた状態で号令をかけると、このラウンドの攻撃がさらに伸びる。
    // rounds:1 はラウンド終了時の tickBuffs で消える＝次のラウンドへは残らない（本体の+30・2Rとは別枠で加算）
    bonus: {
      when: 'charged',
      effects: [{ kind: 'buff', target: 'self', stat: 'atk', amount: 3, rounds: 1 }],
      textJa: '共鳴が4以上なら、さらに攻撃力+30（1ラウンドのみ）。',
    },
  },
  {
    id: TAIYO_CARD_IDS.singleMinded,
    name: '一心不乱',
    text: '敵に40ダメージを与え、共鳴ゲージを1上昇させる。',
    type: 'attack',
    cost: 1,
    rarity: 'rare',
    godId: GOD_IDS.taiyo,
    effects: [
      { kind: 'damage', target: 'enemy', amount: 4 },
      { kind: 'resonance', amount: 1 },
    ],
  },
  {
    id: TAIYO_CARD_IDS.lookingAfterJuniors,
    name: '後輩想い',
    text: 'ブロックを60得て、HPを40回復する。',
    type: 'support',
    cost: 2,
    rarity: 'rare',
    godId: GOD_IDS.taiyo,
    effects: [
      { kind: 'block', amount: 6 },
      { kind: 'heal', amount: 4 },
    ],
  },
]

import type { CardDefId, CardUid, GodId } from './ids'
import type { Effect } from './effect'

/** 企画書5章のカード分類 */
export type CardType =
  | 'attack' // ⚔ 攻撃
  | 'guard' // 🛡 防御
  | 'resonance' // ✨ 共鳴
  | 'support' // 🌿 支援
  | 'hinder' // 💀 妨害
  | 'oracle' // 🌟 神託

export type Rarity = 'common' | 'rare' | 'legend'

/**
 * 条件付き追加効果（bonus）の条件（Phase 3「神格」FINAL SPEC v0.1）。
 *
 * ★不変ルール3の維持：カード名で分岐（`if (card.name === '...')`）せず、
 * 「どの条件で」「どの効果が増えるか」をデータ（`CardDef.bonus`）で表す。
 * 評価は`engine/cardBonus.ts`の1関数だけが行い、engineに大量のifを増やさない。
 *
 * - blocked  … 本体効果の適用「後」、ブロックが敵の予告ダメージ以上（予告0＝溜め等では不成立）
 * - enemyBig … カードを使う「前」、敵の予告ダメージ合計が`RULES.cardBonus.enemyBigThreshold`以上
 * - lowHp    … カードを使う「前」、HPが最大の`RULES.cardBonus.lowHpRatio`以下（切り捨て）
 */
export type BonusCond = 'blocked' | 'enemyBig' | 'lowHp'

/**
 * カード1枚が持てる条件付き追加効果（1枚につき最大1つ）。
 * 本体`effects`を適用したあとに条件を1回だけ評価し、成立していれば`effects`を追加で適用する。
 */
export type CardBonus = {
  when: BonusCond
  effects: Effect[]
  /** カード説明の追加行（プレイヤー向け。表示値は内部値×10） */
  textJa: string
}

/**
 * カードの「設計図」。1種類につき1つだけ存在します。
 * 例：「一撃」というカードの定義。
 */
export type CardDef = {
  id: CardDefId
  name: string
  /** プレイヤーに見せる説明文 */
  text: string
  type: CardType
  /** 消費する神力（AP） */
  cost: number
  effects: Effect[]
  rarity: Rarity
  /** 神専用カードの場合のみ設定 */
  godId?: GodId
  /** 画像ファイル名（未設定なら色で代用） */
  art?: string
  /** 条件付き追加効果（Phase 3 FINAL SPEC v0.1。持たないカードは未設定） */
  bonus?: CardBonus
}

/**
 * 盤面に存在する「1枚のカード」。
 *
 * 設計図（CardDef）と実体（CardInstance）を分けている理由：
 * 同じ「一撃」がデッキに5枚あるとき、「そのうち1枚だけ強化」といった
 * 表現が後から必ず必要になります。最初から分けておけば無傷で対応できます。
 */
export type CardInstance = {
  /** この1枚を識別する番号 */
  uid: CardUid
  /** どの設計図から作られたか */
  defId: CardDefId
  /** 一時的なコスト変化（例：このラウンドだけ1安い） */
  costModifier?: number
}

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

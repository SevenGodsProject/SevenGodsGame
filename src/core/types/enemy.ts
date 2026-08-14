import type { EnemyId } from './ids'
import type { Buff } from './effect'

/**
 * 敵の行動。
 *
 * 決定4：スクリプト型CPU。行動はあらかじめ決まっており、
 * プレイヤーには「次に何をしてくるか」が予告されます。
 * これにより「防ぐか、賭けて殴るか」の読み合いが生まれます。
 */
export type EnemyActionDef =
  | { kind: 'attack'; amount: number }
  /** 将来用：溜め（次ラウンドに大技） */
  | { kind: 'charge'; label: string }

/** 敵の「設計図」 */
export type EnemyDef = {
  id: EnemyId
  name: string
  maxHp: number
  /**
   * ラウンドごとの行動。index 0 がラウンド1。
   * 計算式ではなく表で持つことで、「ラウンド3だけ少し楽にしたい」といった
   * 微調整が数字1つの書き換えで済みます。
   */
  actions: EnemyActionDef[]
  /** 立ち絵（決定32。神・OTOMOと違い1枚のみ） */
  art: string
  /**
   * 戦闘中の掛け声（決定40）。ラウンドごとに`(round - 1) % battleCries.length`で
   * 順番に表示する（`Math.random`は使わない、決定不変ルール2）。
   */
  battleCries: string[]
}

/** 盤面上の敵の状態 */
export type EnemyState = {
  defId: EnemyId
  name: string
  hp: number
  maxHp: number
  /** このラウンドの被ダメージ軽減量 */
  block: number
  buffs: Buff[]
  /** 次の行動の予告。ゲーム終了時は null */
  intent: EnemyActionDef | null
}

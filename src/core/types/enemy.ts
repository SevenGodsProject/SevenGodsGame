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

/**
 * STEP3-A：敵タイプ別の軽量CSS演出を出し分けるための表示専用タグ。
 * GameStateではなく`EnemyDef`（静的データ）にのみ持たせる。新しい行動種別・
 * AIロジック・数値には一切関与しない（`enemy-lunge`のanimation-duration違いと、
 * ラウンド終盤の`box-shadow`強化だけに使う）。
 * - lateSurgeMild：datenshi（標準・入門型。終盤にやや攻撃が強まる程度の控えめな演出）
 * - lateSurgeStrong：onryo（遅咲き型。R3→7.7倍という実際の急伸に見合う明確な演出）
 * - fast / heavy：juuma（速攻型）/ ryujin（耐久型）のlunge速度差
 * - standard：上記に該当しない敵（oni・karakuri・juuma以外・doukeshi等）。
 *   karakuri/doukeshiの「溜め」演出は`visualType`ではなく`EnemyState.intent.kind`から
 *   直接判定するため、専用の値は持たない。
 */
export type EnemyVisualType = 'standard' | 'lateSurgeMild' | 'lateSurgeStrong' | 'fast' | 'heavy'

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
  /**
   * STEP3-A（8/31 敵7体ゲーム性監査 処理20＝A案）：EnemyPanel直下に表示する
   * 短いタイプバッジ（例：「【遅咲き型】」）と1行以内の攻略説明。既存の
   * HP・actionsから導ける個性を可視化するだけで、新しい戦闘ロジックは持たない。
   */
  typeLabel: string
  typeDescription: string
  /** 上記コメント参照。表示・CSS演出専用 */
  visualType: EnemyVisualType
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

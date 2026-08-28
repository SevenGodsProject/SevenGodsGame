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
  /** 溜め（次ラウンドに大技）。telegraphの警告表示にもlabelを流用する */
  | { kind: 'charge'; label: string }
  /**
   * ENEMY-IDENTITY-PROTOTYPE-02：連撃。1回のenemy actionとして複数hitを順に与える。
   * - Mastery集計は「1 action = 1 sample」（MODEL-B）。hitごとに票を数えない
   * - debuff（敵atk低下）はaction合計へ1回だけ適用する（per-hit適用は寿楽Mastery
   *   S率51%のfarming破綻をsimulationで確認済みのため禁止）
   * - 難易度倍率は「合計をroundしてから各hitへ配分」（per-hit丸めはhard勝率を
   *   大きく崩すことをsimulationで確認済み）
   * - special: trueなら必殺技（🔥表示・nameを表示に使う）
   */
  | { kind: 'multiAttack'; hits: number[]; name?: string; special?: boolean }
  /** 必殺技（単発）。charge予告の次ラウンドに撃つ大技。nameを🔥表示に使う */
  | { kind: 'special'; amount: number; name: string }

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

/**
 * LANE-D（Stage system architecture）：敵ごとの「戦いの舞台」の表示専用定義。
 * - nameJa：舞台名（例「褪色の神殿」）。Enemy Select画面のフレーバー表示に使う
 * - bg：戦闘背景画像のパス。未指定なら現行の共通背景（arena.jpg）へフォールバック
 *   する（battle.css末尾の`var(--stage-bg, url('/assets/backgrounds/arena.jpg'))`）。
 *   現時点では全敵未指定＝全敵で現行と完全に同一表示（背景画像は別途生成予定。
 *   既存OTOMO背景は正式採用しない）
 * - accent：敵の性格を表すアクセント色（#rrggbb）。Enemy Select画面のカード縁色や
 *   将来のBattle側演出に使う（BattleScreenは`--stage-accent`として注入だけ行う）
 * 戦闘ロジック・数値には一切関与しない。
 */
export type EnemyStageDef = {
  nameJa: string
  bg?: string
  accent: string
}

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
  /**
   * LANE-D：脅威度（表示専用、1〜5）。Enemy Select画面の★表示に使う。
   * 難易度★（金色）との混同を避けるため、UI側では紫紅系の色＋「脅威度」ラベルで
   * 表示する。★5は将来のBoss用に予約（現行7体は1〜4のみ。テストで保証）。
   * HP・行動テーブルとは独立した「体感の手強さ」の目安で、ロジックには使わない。
   */
  rank: number
  /** LANE-D：戦いの舞台（表示専用）。詳細は`EnemyStageDef`のコメント参照 */
  stage: EnemyStageDef
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

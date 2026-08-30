import type { CardDefId, CardUid, EnemyId, GodId } from './ids'
import type { Difficulty } from './difficulty'
import type { GrowthPath } from './otomo'
import type { BattleModifier, GameMode, StakeChoiceId } from './state'

/**
 * プレイヤーが行う「操作」。
 *
 * ゲームを動かす唯一の入り口です。
 * 操作をすべて記録しておけば、あとで順番に再生するだけで
 * まったく同じゲームを再現できます（リプレイ・バグ再現）。
 */
export type GameAction =
  /**
   * ゲーム開始。
   * 決定18：OTOMOは神1柱につき専属1体のため、godIdから自動的に決まる
   * （旧仕様の otomoIds 選択は廃止）。
   * 決定24：Phase 5のデッキ構築により、使用するデッキをUI側（デッキ構築画面）
   * から渡す。有効性は`core/data/deckBuilder.ts`のvalidateDeckで検証される。
   */
  | {
      type: 'START_GAME'
      seed: string
      godId: GodId
      enemyId: EnemyId
      deck: CardDefId[]
      /** 省略時は'normal'（決定39）。既存の呼び出し元・テストは未指定のままでよい */
      difficulty?: Difficulty
      /**
       * 決定43：報酬カードで獲得した、カードごとの追加編成上限。
       * 省略時は空（＝ボーナス無し）。既存の呼び出し元・テストは未指定のままでよい
       */
      bonusCopies?: Partial<Record<CardDefId, number>>
      /** 省略時は'guardian'（決定44）。既存の呼び出し元・テストは未指定のままでよい */
      otomoGrowthPath?: GrowthPath
      /** 決定126：神階（0〜7）。未指定＝0 */
      stake?: number
      /** 決定126：神階Ⅶの最終試練の選択 */
      stakeChoice?: StakeChoiceId
      /**
       * DAILY-01：省略時は'normal'。'daily'（神域挑戦）は敵・seed・補正を
       * UI側（`startDailyGame`）が`dailyBossFor`で確定して渡す。既存の呼び出し元・
       * テストは未指定のままでよい
       */
      mode?: GameMode
      /** 'daily'のときの日付キー（JST `YYYY-MM-DD`）。期限切れセーブの判定に使う */
      dailyKey?: string
      /** 敵HP/攻撃の追加倍率（難易度倍率に乗算）。省略＝恒等 */
      modifier?: BattleModifier
    }
  /** 手札からカードを使う */
  | { type: 'PLAY_CARD'; uid: CardUid }
  /** 託宣を使う（詳細は未決定） */
  | { type: 'USE_DIVINATION'; choiceIndex: number }
  /** ラウンドを終える（敵の行動へ進む） */
  | { type: 'END_ROUND' }

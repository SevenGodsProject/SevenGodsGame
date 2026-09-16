import type { Difficulty, EnemyId, GrowthPath, StakeChoiceId } from '../core/types'
import type { ResultAction } from './battle/nextGoal'

/**
 * Phase 7 P1（決定187・仕様 §5-1／§13）：結果画面の新しい出口が「どの画面へ、何を引き継いで」戻るか。
 *
 * GameFlow はこの計画どおりに `engine.resetGame()` と setState を行うだけ（独自の flow system は作らない）。
 * **ここには神域挑戦の回数を消費する処理が存在しない**。回数の消費は従来どおり
 * `startDailyGame`（→ `startDailyAttempt`）だけで、デッキ調整から戻った先の「開始」も
 * 既存の `beginDailyChallenge` を通る。
 *
 * rematch（もう一度）と reselect（選び直す）は既存の `onRematch`／`backToGodSelect` をそのまま使うため
 * ここでは扱わない。
 */

export type ResultTransitionScreen = 'deckBuild' | 'daily' | 'home' | 'godSelect' | 'record'

export type NormalCarry = {
  enemyId: EnemyId
  stake: number
  stakeChoice: StakeChoiceId | null
  difficulty: Difficulty
  otomoGrowthPath: GrowthPath
}

export type ResultTransition = {
  screen: ResultTransitionScreen
  /** 'keep'＝同じ日の神域挑戦を続ける（dailyKey を保持）。null＝通常モードへ戻す */
  dailyKey: 'keep' | null
  /** 通常モードでデッキ調整へ戻るとき、直前の対局条件（敵・神階・難易度・成長経路）を引き継ぐ */
  carry: NormalCarry | null
  /** 神・デッキ・敵の選択を初期化するか */
  clearSelection: boolean
}

export type ResultTransitionContext = {
  mode: 'normal' | 'daily'
  /** 進行中の神域挑戦の日付キー（GameFlow の state） */
  dailyKey: string | null
  /** 今日の日付キー（`todayDailyKey()`） */
  todayKey: string
  /** `dailyKey` の残り回数（`dailyAttemptsLeft`） */
  dailyAttemptsLeft: number
  /** 決着した対局の条件 */
  lastBattle: NormalCarry
}

export type ResultTransitionAction = Exclude<ResultAction, 'rematch' | 'reselect'>

export function planResultTransition(action: ResultTransitionAction, ctx: ResultTransitionContext): ResultTransition {
  switch (action) {
    case 'adjustDeck': {
      if (ctx.mode === 'daily') {
        // 同じ日で回数が残っているときだけ、同じ日の挑戦のままデッキ画面へ。
        // 日付をまたいだ／残り 0 のときは神域挑戦画面で状況を見せる（昨日の seed で始めさせない）
        const canContinue = ctx.dailyKey !== null && ctx.dailyKey === ctx.todayKey && ctx.dailyAttemptsLeft > 0
        return canContinue
          ? { screen: 'deckBuild', dailyKey: 'keep', carry: null, clearSelection: false }
          : { screen: 'daily', dailyKey: null, carry: null, clearSelection: false }
      }
      return { screen: 'deckBuild', dailyKey: null, carry: { ...ctx.lastBattle }, clearSelection: false }
    }
    case 'goDaily':
      return { screen: 'daily', dailyKey: null, carry: null, clearSelection: false }
    case 'home':
      return { screen: 'home', dailyKey: null, carry: null, clearSelection: false }
    case 'startNormal':
      return { screen: 'godSelect', dailyKey: null, carry: null, clearSelection: true }
    case 'record':
      return { screen: 'record', dailyKey: null, carry: null, clearSelection: false }
  }
}

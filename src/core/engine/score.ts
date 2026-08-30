import type { ScoreState } from '../types'
import { RULES } from '../data/rules'
import { stakeScoreScale } from '../data/stakes'

/**
 * 表示スコア（Battle Score）。素点合計×finalScaleを四捨五入する（BASE-D、決定109）。
 *
 * ScoreStateの各項目は「素点」で持ち、倍率はここで一括適用する。
 * 途中経過表示・結果画面・自己ベスト記録・GAME_ENDEDイベントは
 * すべてこの値を使うこと（素点totalを直接ユーザーへ見せない）。
 */
/**
 * 表示・記録用の最終スコア。決定126：神階では `stakeScoreScale`（×(1+0.08×段)）を乗じる。
 * 勝敗にかかわらず乗じるが、敗北スコアは撃破・早期撃破ボーナスを含まないため
 * 「高い段を選ぶだけで高得点」にはならない（Ⅶ敗北 ≈ 4,000未満 < Ⅰ勝利 8,000超）。
 */
export function getFinalScore(score: ScoreState, stake?: number): number {
  return Math.round(score.total * RULES.score.finalScale * stakeScoreScale(stake))
}

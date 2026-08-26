import type { ScoreState } from '../types'
import { RULES } from '../data/rules'

/**
 * 表示スコア（Battle Score）。素点合計×finalScaleを四捨五入する（BASE-D、決定109）。
 *
 * ScoreStateの各項目は「素点」で持ち、倍率はここで一括適用する。
 * 途中経過表示・結果画面・自己ベスト記録・GAME_ENDEDイベントは
 * すべてこの値を使うこと（素点totalを直接ユーザーへ見せない）。
 */
export function getFinalScore(score: ScoreState): number {
  return Math.round(score.total * RULES.score.finalScale)
}

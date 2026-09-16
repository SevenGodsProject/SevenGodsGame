import type { GameStatus, GodId } from '../../core/types'
import type { DailyDay, DailyRecordResult, DailyResult } from '../../hooks/dailyStorage'
import { formatScaled } from '../displayScale'

/**
 * Phase 7 P1（決定187・仕様 §9）：神域挑戦の決着画面に出す「今日のベスト」と「前回」の比較 2 行。
 *
 * **新しい保存は一切しない**。`recordDailyResult` が決着の瞬間に `results[]` の末尾へ今回分を
 * 追加済みなので、その直前の要素が「前回」になる（読み取りのみ）。
 *
 * - 1 行目（BEST 軸＝今日の目標）：更新／あと N 点／同点／まだ無い
 * - 2 行目（前回軸＝同じ盤面での進歩）：前回 → 今回（差）。前回が無ければ残り回数
 *
 * 旧表示の不具合（決定187 で修正）：今日のベストが未記録（0）のまま敗北すると、
 * `prevBest > finalScore` が偽になって「今日のベストと同点です」と出ていた。
 * ここでは「同点」はベストが 1 点以上あるときにしか使わない。
 */

export type DailyDiffCurrent = {
  godId: GodId
  /** 表示前スケールの最終スコア（`getFinalScore(state.score)`） */
  score: number
  status: GameStatus
  round: number
}

export type DailyBestLineKind = 'firstBest' | 'newBest' | 'gap' | 'tie' | 'none'

export type DailyDiff = {
  best: { kind: DailyBestLineKind; text: string }
  previous: { kind: 'diff' | 'remaining'; text: string }
}

/** 符号付きの差（表示スケール）。マイナスはハイフンではなく数学記号の − を使う */
export function formatSignedScaled(diff: number): string {
  if (diff > 0) return `+${formatScaled(diff)}`
  if (diff < 0) return `−${formatScaled(-diff)}`
  return '±0'
}

/** results[] の中から今回分を末尾側から探す（保存に失敗していれば見つからない＝前回も出さない） */
function findPrevious(results: readonly DailyResult[], current: DailyDiffCurrent): DailyResult | null {
  for (let i = results.length - 1; i >= 0; i--) {
    const r = results[i]
    if (r.godId === current.godId && r.score === current.score && r.status === current.status && r.round === current.round) {
      return i > 0 ? results[i - 1] : null
    }
  }
  return null
}

export function describeDailyDiff(day: DailyDay, current: DailyDiffCurrent, result: DailyRecordResult): DailyDiff {
  const previous = findPrevious(day.results, current)
  const attemptNumber = Math.max(1, day.attemptsUsed)

  let best: DailyDiff['best']
  if (result.isNewBest && previous === null) {
    best = { kind: 'firstBest', text: `今日のベスト ${formatScaled(current.score)}（${attemptNumber}回目）` }
  } else if (result.isNewBest) {
    best = {
      kind: 'newBest',
      text: `✨ 今日のベスト更新！ ${formatScaled(current.score)}（${formatSignedScaled(current.score - result.prevBest)}）`,
    }
  } else if (result.prevBest > current.score) {
    best = {
      kind: 'gap',
      text: `今日のベスト ${formatScaled(result.prevBest)} まであと ${formatScaled(result.prevBest - current.score)} 点`,
    }
  } else if (result.prevBest > 0) {
    best = { kind: 'tie', text: `今日のベスト ${formatScaled(result.prevBest)} と同点` }
  } else {
    best = { kind: 'none', text: '今日のベストはまだありません' }
  }

  if (previous === null) {
    return {
      best,
      previous: {
        kind: 'remaining',
        text: result.attemptsLeft > 0 ? `残り ${result.attemptsLeft} 回` : '今日の挑戦は終了',
      },
    }
  }

  const roundChange =
    previous.status === 'won' && current.status === 'won' && previous.round !== current.round
      ? `・撃破 R${previous.round}→R${current.round}`
      : ''
  return {
    best,
    previous: {
      kind: 'diff',
      text: `前回 ${formatScaled(previous.score)} → 今回 ${formatScaled(current.score)}（${formatSignedScaled(current.score - previous.score)}）${roundChange}`,
    },
  }
}

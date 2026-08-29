import type { GameState } from '../core/types'
import { dailyKeyOf } from '../core/data/dailyBoss'

/**
 * DAILY-01：現在時刻からJSTの日付キーを得る。
 * `new Date()`はここでもデフォルト引数としてだけ使う（決定72と同じ「時刻の注入」方針）。
 * core側の`dailyKeyOf`は純関数なので、テストは任意の時刻を渡して境界を検証できる。
 */
export function todayDailyKey(now: Date = new Date()): string {
  return dailyKeyOf(now)
}

/**
 * 保存済みの神域挑戦が「別の日」のものなら期限切れ。
 * 昨日のseedで今日のベストを作れてしまうのを防ぐため、再開させない。
 * 通常モードのセーブ（mode未指定＝v7以前を含む）は日付の概念が無いので常に有効。
 */
export function isExpiredDailySave(state: GameState, now: Date = new Date()): boolean {
  if (state.mode !== 'daily') return false
  return state.dailyKey !== todayDailyKey(now)
}

import type { GameState } from '../core/types'
import { RULES } from '../core/data/rules'
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

const MINUTE_MS = 60_000
const DAY_MINUTES = 24 * 60

/**
 * Phase 7 P1（決定187）：次の神域挑戦（JST 0:00 の日付キー切替）までの残り時間（ms）。
 *
 * **表示専用・保存しない**。日付キーの切替そのもの（`dailyKeyOf`／`todayDailyKey`）は
 * 一切変えず、同じ「JSTへずらしてから UTC の日付境界を見る」変換で翌日 0:00 との差を出すだけ。
 * そのため「カウントダウンが 0 になる瞬間」と「`todayDailyKey` が翌日に変わる瞬間」は必ず一致する。
 */
export function msUntilNextDailyKey(now: Date = new Date()): number {
  const offsetMs = RULES.daily.timezoneOffsetMinutes * MINUTE_MS
  const shifted = new Date(now.getTime() + offsetMs)
  const nextMidnight = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() + 1)
  return nextMidnight - shifted.getTime()
}

/**
 * 残り時間を「HH:MM」にする（分は切り上げ）。
 * 切り上げにしているのは、残り 30 秒のときに「00:00」と出て、まだ切り替わっていないのに
 * 「もう来ている」と誤読させないため。ちょうど 0:00 JST では 24:00 を返す。
 */
export function formatDailyCountdown(ms: number): string {
  const totalMinutes = Math.min(DAY_MINUTES, Math.max(0, Math.ceil(ms / MINUTE_MS)))
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const mm = String(totalMinutes % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

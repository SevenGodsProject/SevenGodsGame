import type { EnemyId, GameState, GameStatus, GodId } from '../core/types'
import { RULES } from '../core/data/rules'
import { getFinalScore } from '../core/engine'
import { dailyBossFor, isValidDailyKey } from '../core/data/dailyBoss'

/**
 * DAILY-01：神域挑戦の記録（今日の挑戦回数・ベスト・神別ベスト・直近の履歴）。
 *
 * 通常モードの戦績（`recordStorage.ts`、神ごとの自己ベスト）とは**完全に別のキー**に
 * 保存し、互いに混ぜない（CEO決定5：Daily結果を通常の自己ベストへ混ぜない。
 * ★★★★★神域強化のスコアが通常ベストへ混入するのを防ぐ）。
 *
 * 1レコード＝「日付キー・敵・seed・神・スコア・勝敗・ラウンド」で、これは将来の
 * オンライン送信ペイロードそのもの（前回Daily監査：決定論エンジンでのサーバ再計算に
 * 必要な材料）。Phase 2で行動ログを同梱する余地を残している。
 *
 * 他のstorage群と同じ流儀：独立version・`sevengods.*`キー・try/catch＋構造チェック・
 * hooks層（不変ルール1）。
 */

const STORAGE_KEY = 'sevengods.daily'
const DAILY_VERSION = 1

export type DailyResult = {
  godId: GodId
  /** 表示用の最終スコア（`getFinalScore`済み） */
  score: number
  status: GameStatus
  round: number
  /** 記録時刻（ms）。表示順と剪定にのみ使う */
  at: number
}

export type DailyDay = {
  dateKey: string
  enemyId: EnemyId
  seed: string
  /** 開始した挑戦の回数（途中放棄も1回に数える。seedが同じなので引き直しにはならない） */
  attemptsUsed: number
  results: DailyResult[]
  bestScore: number
  bestGodId: GodId | null
  /** 神別の今日のベスト（CEO決定6：神格差の可視化用） */
  bestByGod: Partial<Record<GodId, number>>
}

type DailyData = {
  version: number
  days: Record<string, DailyDay>
}

function isDailyData(value: unknown): value is DailyData {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.version === 'number' && !!v.days && typeof v.days === 'object'
}

function loadData(): DailyData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { version: DAILY_VERSION, days: {} }
    const parsed: unknown = JSON.parse(raw)
    if (!isDailyData(parsed) || parsed.version !== DAILY_VERSION) {
      return { version: DAILY_VERSION, days: {} }
    }
    return parsed
  } catch {
    return { version: DAILY_VERSION, days: {} }
  }
}

function saveData(data: DailyData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // 保存できなくてもゲーム自体には影響しないため無視する
  }
}

/** 日付キーの辞書順＝時系列順（`YYYY-MM-DD`固定長）を利用して古い日を落とす */
function prune(data: DailyData, keepDays = RULES.daily.retentionDays): DailyData {
  const keys = Object.keys(data.days).sort()
  if (keys.length <= keepDays) return data
  const drop = new Set(keys.slice(0, keys.length - keepDays))
  const days: Record<string, DailyDay> = {}
  for (const k of keys) if (!drop.has(k)) days[k] = data.days[k]
  return { ...data, days }
}

function emptyDay(dateKey: string): DailyDay {
  const boss = dailyBossFor(dateKey)
  return {
    dateKey,
    enemyId: boss.enemyId,
    seed: boss.seed,
    attemptsUsed: 0,
    results: [],
    bestScore: 0,
    bestGodId: null,
    bestByGod: {},
  }
}

/** その日の記録を返す（未挑戦なら空の記録。保存はしない） */
export function loadDailyDay(dateKey: string): DailyDay {
  if (!isValidDailyKey(dateKey)) return emptyDay('2000-01-03')
  return loadData().days[dateKey] ?? emptyDay(dateKey)
}

/** 残り挑戦回数 */
export function dailyAttemptsLeft(dateKey: string): number {
  return Math.max(0, RULES.daily.attemptsPerDay - loadDailyDay(dateKey).attemptsUsed)
}

/**
 * 挑戦を1回消費する（START_GAME直前に呼ぶ）。残り0なら消費せずfalseを返す。
 * 「開始時に消費」にしているのは、途中放棄で回数を取り戻せないようにするため
 * （seed共有なので引き直しの利益は無いが、ルールの単純さを優先）。
 */
export function startDailyAttempt(dateKey: string): { ok: boolean; attemptsLeft: number } {
  const data = loadData()
  const day = data.days[dateKey] ?? emptyDay(dateKey)
  if (day.attemptsUsed >= RULES.daily.attemptsPerDay) {
    return { ok: false, attemptsLeft: 0 }
  }
  const next: DailyDay = { ...day, attemptsUsed: day.attemptsUsed + 1 }
  saveData(prune({ ...data, days: { ...data.days, [dateKey]: next } }))
  return { ok: true, attemptsLeft: RULES.daily.attemptsPerDay - next.attemptsUsed }
}

export type DailyRecordResult = {
  isNewBest: boolean
  /** 更新前の今日のベスト（未記録なら0） */
  prevBest: number
  attemptsLeft: number
}

/**
 * 決着した神域挑戦を記録する。`useGameEngine`が決着の瞬間に1回だけ呼ぶ
 * （`recordGameResult`と同じ1回性）。通常モードのstateを渡しても何もしない。
 * 敗北・未撃破も記録する（前回Daily監査：敗北も記録）。ベストは勝敗を問わず
 * 最終スコアで比較する（Battle Scoreは撃破加点を含むため、通常は勝利が上回る）。
 */
export function recordDailyResult(state: GameState, now = Date.now()): DailyRecordResult | null {
  if (state.mode !== 'daily' || !state.dailyKey || state.status === 'playing') return null
  const dateKey = state.dailyKey
  const data = loadData()
  const day = data.days[dateKey] ?? emptyDay(dateKey)
  const score = getFinalScore(state.score)
  const prevBest = day.bestScore
  const isNewBest = score > prevBest
  const result: DailyResult = { godId: state.godId, score, status: state.status, round: state.round, at: now }
  const bestByGod = { ...day.bestByGod, [state.godId]: Math.max(day.bestByGod[state.godId] ?? 0, score) }
  const next: DailyDay = {
    ...day,
    results: [...day.results, result],
    bestScore: isNewBest ? score : prevBest,
    bestGodId: isNewBest ? state.godId : day.bestGodId,
    bestByGod,
  }
  saveData(prune({ ...data, days: { ...data.days, [dateKey]: next } }))
  return { isNewBest, prevBest, attemptsLeft: Math.max(0, RULES.daily.attemptsPerDay - next.attemptsUsed) }
}

/**
 * 8/31 P0-3：表示用の純関数。保存済みの`results[]`から「その日のベストを出した結果」と
 * 「神ごとのベスト結果」を求める（勝敗ラベル表示のため）。新しい保存フィールド・
 * 計算ロジックは追加しない（bestScore/bestByGodと同じ値を、勝敗付きで引き直すだけ）。
 * 同点は先に記録された方を採用する。
 */
export function bestResultOf(day: DailyDay): DailyResult | null {
  if (day.bestScore <= 0) return null
  return day.results.find((r) => r.score === day.bestScore && r.godId === day.bestGodId) ?? day.results.find((r) => r.score === day.bestScore) ?? null
}

export function bestResultsByGod(day: DailyDay): Partial<Record<GodId, DailyResult>> {
  const out: Partial<Record<GodId, DailyResult>> = {}
  for (const r of day.results) {
    const cur = out[r.godId]
    if (!cur || r.score > cur.score) out[r.godId] = r
  }
  return out
}

/** 直近n日の記録（新しい順）。戦績画面の「神域挑戦」セクション用 */
export function loadRecentDailyDays(n: number): DailyDay[] {
  const data = loadData()
  return Object.keys(data.days)
    .sort()
    .reverse()
    .slice(0, n)
    .map((k) => data.days[k])
}

/** テスト・デバッグ用：全記録を消す */
export function clearDailyRecords(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 無視
  }
}

import type { EnemyId } from '../types'
import { ENEMY_IDS } from './enemies'
import { RULES } from './rules'
import { createRng } from '../rng/seededRandom'

/**
 * DAILY-01：神域挑戦の「今日のボス」と共有seedを決める純関数群。
 *
 * ★不変ルール：Math.random()・new Date()を使わない。日付は引数で受け取る
 * （決定72の`QuotaProvider`と同じ「時刻の注入」方針）。同じ日付キーからは
 * 誰の端末でも同じ敵・同じseedが導かれ、これが「全員共通条件」の根拠になる。
 *
 * 敵の決め方＝週次シャッフル巡回：JSTの週キー（その週の月曜の日付）から
 * 決定論的にENEMY_IDSをshuffleし、曜日番号（月=0…日=6）で1体を取る。
 * これにより1週間で7体が必ず1回ずつ登場し、順番だけが週ごとに変わる。
 */

export type DailyBoss = {
  /** JSTの日付キー `YYYY-MM-DD` */
  dateKey: string
  /** その週の月曜の日付キー（shuffleの種） */
  weekKey: string
  /** 月=0 … 日=6 */
  dayIndex: number
  enemyId: EnemyId
  /** 全員共通の対局seed */
  seed: string
  /** 画面表示用の短いSeed ID（同じ日なら全員同じ値になる） */
  seedId: string
}

/** 巡回対象の7体（`ENEMY_IDS`の定義順。順番はshuffleの入力なので変えない） */
export const DAILY_BOSS_POOL: readonly EnemyId[] = Object.values(ENEMY_IDS)

const pad2 = (n: number) => String(n).padStart(2, '0')
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * JST（UTC+9）固定の日付キー。端末のタイムゾーン設定に関わらず
 * 「日本時間の0:00」で日付が切り替わる。
 */
export function dailyKeyOf(now: Date): string {
  const shifted = new Date(now.getTime() + RULES.daily.timezoneOffsetMinutes * 60_000)
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`
}

/** `YYYY-MM-DD`として妥当か（実在する日付か） */
export function isValidDailyKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

/** 日付キー → その週の月曜の日付キーと曜日番号（月=0…日=6） */
export function weekKeyOf(dateKey: string): { weekKey: string; dayIndex: number } {
  if (!isValidDailyKey(dateKey)) throw new Error(`不正な日付キーです: ${dateKey}`)
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const dayIndex = (date.getUTCDay() + 6) % 7
  const monday = new Date(date.getTime() - dayIndex * DAY_MS)
  return {
    weekKey: `${monday.getUTCFullYear()}-${pad2(monday.getUTCMonth() + 1)}-${pad2(monday.getUTCDate())}`,
    dayIndex,
  }
}

/** その週の巡回順（7体の並び）。週キーが同じなら常に同じ並び */
export function weeklyBossOrder(weekKey: string): EnemyId[] {
  return createRng(`daily-week-${weekKey}`).shuffle([...DAILY_BOSS_POOL])
}

/** 表示用の短いID。seed文字列の決定論ハッシュを英数6桁にしたもの */
export function seedIdOf(seed: string): string {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36).toUpperCase().padStart(7, '0').slice(-6)
}

/** 日付キーから「今日のボス」を確定する。同じ日付キーなら誰の端末でも同じ結果 */
export function dailyBossFor(dateKey: string): DailyBoss {
  const { weekKey, dayIndex } = weekKeyOf(dateKey)
  const enemyId = weeklyBossOrder(weekKey)[dayIndex]
  const seed = `daily-${dateKey}-${enemyId}`
  return { dateKey, weekKey, dayIndex, enemyId, seed, seedId: seedIdOf(seed) }
}

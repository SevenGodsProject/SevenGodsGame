import type { GameState, GodId } from '../core/types'
import { RULES } from '../core/data/rules'
import { getFinalScore } from '../core/engine'
import { STAKE_MAX, isStakeLevel, type StakeLevel } from '../core/data/stakes'
import { loadGodRecord } from './recordStorage'

/**
 * 決定126：神階（しんかい）の記録。`sevengods.stakes`（v1）に神ごとの
 * 「むずかしい撃破済み」「最高到達段（クリア済み）」「段別ベストスコア」を保存する。
 *
 * - 通常モードの神別自己ベスト（`recordStorage`）や Daily（`dailyStorage`）とは別キー。
 *   既存の `GodRecord` の形は変えない（旧記録互換）。
 * - 解放条件：その神で「むずかしい」を1回クリア → 神階Ⅰ。段をクリアするごとに次段が開く。
 *   到達は永続（連続クリア不要）。
 * - 8/31版以前に既に「むずかしい」ベストを持つプレイヤーは、`GodRecord.bestBattleScoreDifficulty`
 *   が'hard'なら解放済みとみなす（過去の到達を無駄にしない。推定ではなく記録に基づく）。
 * - `localStorage` が使えない環境でも遊べるよう、読み書きは try-catch で握りつぶす（決定27と同方針）。
 */
const STORAGE_KEY = 'sevengods.stakes'
const STORAGE_VERSION = 1

export type GodStakeRecord = {
  hardCleared: boolean
  /** クリア済みの最高段（0＝未クリア） */
  maxCleared: number
  /** 段別ベストスコア（最終スコア、表示前スケール）。キーは段（1〜7） */
  bestByStake: Record<string, number>
}

type StakeData = {
  version: number
  byGod: Partial<Record<GodId, GodStakeRecord>>
}

function load(): StakeData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { version: STORAGE_VERSION, byGod: {} }
    const parsed: unknown = JSON.parse(raw)
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      (parsed as StakeData).version !== STORAGE_VERSION ||
      typeof (parsed as StakeData).byGod !== 'object'
    ) {
      return { version: STORAGE_VERSION, byGod: {} }
    }
    return parsed as StakeData
  } catch {
    return { version: STORAGE_VERSION, byGod: {} }
  }
}

function save(data: StakeData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // 保存できない環境では記録だけが残らない（ゲーム進行は止めない）
  }
}

function normalize(rec: Partial<GodStakeRecord> | undefined): GodStakeRecord {
  return {
    hardCleared: rec?.hardCleared === true,
    maxCleared: isStakeLevel(rec?.maxCleared) ? rec.maxCleared : 0,
    bestByStake: rec?.bestByStake && typeof rec.bestByStake === 'object' ? { ...rec.bestByStake } : {},
  }
}

export function loadGodStakeRecord(godId: GodId): GodStakeRecord {
  return normalize(load().byGod[godId])
}

/** 神階が解放済みか（むずかしいを1回クリア、または旧記録にhardベストがある） */
export function isStakeUnlocked(godId: GodId): boolean {
  const rec = loadGodStakeRecord(godId)
  if (rec.hardCleared) return true
  const legacy = loadGodRecord(godId)
  return legacy.wins > 0 && legacy.bestBattleScoreDifficulty === RULES.stakes.unlockDifficulty
}

/** その神で選択できる最高段（未解放＝0、解放済み＝クリア済み最高段+1、上限Ⅶ） */
export function maxSelectableStake(godId: GodId): StakeLevel {
  if (!isStakeUnlocked(godId)) return 0
  const rec = loadGodStakeRecord(godId)
  const next = Math.min(STAKE_MAX, rec.maxCleared + 1)
  return (isStakeLevel(next) ? next : 0) as StakeLevel
}

export type StakeResultOutcome = {
  stake: number
  isNewStakeBest: boolean
  prevStakeBest: number
  clearedNew: boolean
  hardClearedNow: boolean
}

/**
 * 決着時の記録（通常モードのみ。Dailyは`resolveDailyStart`が神階を渡さないため到達しない）。
 * - 勝利 && 難易度むずかしい && 神階0 → hardCleared
 * - 勝利 && 神階>0 → maxCleared更新
 * - 神階>0 の決着（勝敗問わず）→ 段別ベスト更新
 */
export function recordStakeResult(state: GameState): StakeResultOutcome | null {
  if (state.status === 'playing' || state.mode === 'daily') return null
  const stake = isStakeLevel(state.stake) ? state.stake : 0
  const data = load()
  const prev = normalize(data.byGod[state.godId])
  const won = state.status === 'won'
  const hardClearedNow = won && stake === 0 && state.difficulty === RULES.stakes.unlockDifficulty && !prev.hardCleared
  const next: GodStakeRecord = {
    hardCleared: prev.hardCleared || (won && stake === 0 && state.difficulty === RULES.stakes.unlockDifficulty),
    maxCleared: won && stake > prev.maxCleared ? stake : prev.maxCleared,
    bestByStake: { ...prev.bestByStake },
  }
  let isNewStakeBest = false
  let prevStakeBest = 0
  if (stake > 0) {
    const score = getFinalScore(state.score, stake)
    prevStakeBest = prev.bestByStake[String(stake)] ?? 0
    isNewStakeBest = score > prevStakeBest
    next.bestByStake[String(stake)] = Math.max(prevStakeBest, score)
  }
  data.byGod[state.godId] = next
  save(data)
  return {
    stake,
    isNewStakeBest,
    prevStakeBest,
    clearedNew: won && stake > prev.maxCleared,
    hardClearedNow,
  }
}

/** テスト・デバッグ用 */
export function clearStakeRecords(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

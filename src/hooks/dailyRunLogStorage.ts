import type { DailyRunLog } from '../core/replay'
import { REPLAY_ACTION_TYPES } from '../core/replay'
import { RULES } from '../core/data/rules'
import { isClientRunId } from './clientRunId'

/**
 * Phase 4.2 Step 7：進行中のDaily runの行動ログを永続化する。
 *
 * Daily は決定29の「続きから」で中断・再開できる。`battleSaveStorage` が保存するのは
 * GameStateだけなので、行動ログを別枠で持たないと**再開のたびにログが消え、
 * そのrunが永久に検証不能になる**（Phase 4.2 の禁止事項）。
 *
 * ★設計上の約束
 * - `RULES.saveVersion` とは**分離**した専用バージョンを持つ（不変ルール5）。
 *   セーブデータの構造が変わってもログの互換性は独立して判断できる。
 * - 保持するのは**1件だけ**（進行中のrunは常に1つ）。決着したら`clearRunLog`で消し、
 *   提出待ちの控えは`pendingRunStorage`へ移す。
 * - 読み戻した値は必ず形を検査する。壊れていれば「ログ無し」として扱い、
 *   ゲームの続行そのものは妨げない（記録が無いrunは提出対象外になるだけ）。
 * - GameStateとの整合は**ここでは判定しない**。`resumeRunLog`（core）が
 *   リプレイで突き合わせる。保存層は形だけを見る。
 */

const STORAGE_KEY = 'sevengods.dailyRunLog'

/** 行動ログ保存の形式バージョン。`RULES.saveVersion`とは独立 */
export const DAILY_RUN_LOG_VERSION = 1

type StoredRunLog = {
  version: number
  log: DailyRunLog
}

function isDailyRunLog(value: unknown): value is DailyRunLog {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (v.version !== RULES.replay.formatVersion) return false
  if (!isClientRunId(v.clientRunId)) return false
  if (typeof v.dailyKey !== 'string' || typeof v.godId !== 'string') return false
  if (typeof v.otomoGrowthPath !== 'string') return false
  if (!Array.isArray(v.deck) || v.deck.some((c) => typeof c !== 'string')) return false
  if (!Array.isArray(v.actions)) return false
  if (v.actions.length > RULES.replay.maxActions) return false
  return v.actions.every((a) => {
    if (!a || typeof a !== 'object') return false
    const type = (a as { type?: unknown }).type
    return typeof type === 'string' && (REPLAY_ACTION_TYPES as readonly string[]).includes(type)
  })
}

/** 進行中runの行動ログを保存する（毎アクション後に呼ばれる） */
export function saveRunLog(log: DailyRunLog): void {
  try {
    const payload: StoredRunLog = { version: DAILY_RUN_LOG_VERSION, log }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // 保存できなくてもゲーム自体は続行できる（そのrunが提出対象外になるだけ）
  }
}

/** 保存されている進行中runの行動ログ。無い・壊れている・版違いならnull */
export function loadRunLog(): DailyRunLog | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const stored = parsed as Record<string, unknown>
    if (stored.version !== DAILY_RUN_LOG_VERSION) return null
    if (!isDailyRunLog(stored.log)) return null
    return stored.log
  } catch {
    return null
  }
}

export function clearRunLog(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 消せなくても次の保存で上書きされる
  }
}

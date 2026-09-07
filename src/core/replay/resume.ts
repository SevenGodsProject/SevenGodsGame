import type { GameState } from '../types'
import { runReplay } from './replay'
import { toReplayInput, type DailyRunLog } from './runLog'

/**
 * Phase 4.2 Step 7：中断・再開（決定29）を跨いだ行動ログの引き継ぎ。
 *
 * Daily は途中でブラウザを閉じても「続きから」で再開できる（`battleSaveStorage`）。
 * 再開のたびに行動ログを捨てる設計は禁止されている（＝そのrunが永久に検証不能になる）。
 * そこでログを別枠で永続化し、再開時にここで**保存されたGameStateと突き合わせる**。
 *
 * ★突き合わせ方：ログを `runReplay` に通し、得られたGameStateが保存された
 * GameStateと構造的に一致するかを見る。「同じログから同じ盤面が出る」ことは
 * リプレイ検証そのものなので、専用の整合チェックを別に書く必要がない
 * （Phase 4.1 の資産をそのまま再利用する）。
 *
 * 一致しなければログを捨てる。ログが盤面と食い違ったまま追記を続けると、
 * 決着時に「本人は正しく遊んだのにリプレイが通らない」提出物が出来てしまい、
 * 原因の切り分けもできなくなるため、その場で切る方が安全。
 */

/** JSONに載る値の構造的同値。`undefined`のキーは「無い」と同じに扱う */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null || typeof a !== 'object') return false

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((item, i) => deepEqual(item, b[i]))
  }

  const ra = a as Record<string, unknown>
  const rb = b as Record<string, unknown>
  // `JSON.stringify`はundefinedのキーを落とすため、保存を跨ぐと
  // 「キーが無い」と「値がundefined」が混ざる。同じものとして扱う。
  const keys = new Set([...Object.keys(ra), ...Object.keys(rb)].filter(
    (k) => ra[k] !== undefined || rb[k] !== undefined,
  ))
  for (const key of keys) {
    if (!deepEqual(ra[key], rb[key])) return false
  }
  return true
}

export type ResumeRunLogResult =
  /** ログを引き継いで記録を続けてよい */
  | { ok: true; log: DailyRunLog }
  /** 引き継げない。このrunは提出対象外になる（ゲームの続行自体は妨げない） */
  | { ok: false; reason: 'not-daily' | 'no-log' | 'key-mismatch' | 'state-mismatch' }

/**
 * 再開しようとしているGameStateに対して、保存されていた行動ログが使えるかを判定する。
 *
 * @param savedState 「続きから」で読み込んだGameState
 * @param log        別枠で永続化していた行動ログ（無ければnull）
 */
export function resumeRunLog(
  savedState: GameState,
  log: DailyRunLog | null,
): ResumeRunLogResult {
  if (savedState.mode !== 'daily') return { ok: false, reason: 'not-daily' }
  if (!log) return { ok: false, reason: 'no-log' }
  if (
    log.dailyKey !== savedState.dailyKey ||
    log.godId !== savedState.godId ||
    log.otomoGrowthPath !== savedState.otomoGrowthPath
  ) {
    return { ok: false, reason: 'key-mismatch' }
  }

  // 決着前の盤面を突き合わせるので、決着到達の要求は外す
  const replayed = runReplay(toReplayInput(log), { requireFinished: false })
  if (!replayed.ok) return { ok: false, reason: 'state-mismatch' }
  if (!deepEqual(replayed.state, savedState)) return { ok: false, reason: 'state-mismatch' }

  return { ok: true, log }
}

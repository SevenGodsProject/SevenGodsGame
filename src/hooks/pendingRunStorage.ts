import type { ReplayInput } from '../core/replay'
import { REPLAY_ACTION_TYPES } from '../core/replay'
import { RULES } from '../core/data/rules'
import { isClientRunId } from './clientRunId'

/**
 * Phase 4.2 Step 8：送信待ちrunの控え。
 *
 * ランキングBackendはまだ無い（Phase 4.3）。**このモジュールはネットワークに一切触れない。**
 * 決着したDaily runの `ReplayInput` と `clientRunId` をローカルへ溜めておくだけで、
 * 将来の送信・再送のときに「未送信のrunを失わない」ための器を先に用意しておく。
 *
 * ★要件と満たし方
 * - **未送信runを失わない**：決着時に必ず1件追加する
 * - **retryで同じclientRunId**：IDはrun開始時に発行したものをそのまま保持する。
 *   再送のたびに新しいIDを振らないので、サーバー側で冪等に扱える
 * - **重複を増やさない**：`clientRunId`が同じものは追加ではなく**置換**する
 * - **上限を設ける**：`RULES.replay.pendingRuns.maxRuns`件を超えたら古い順に捨てる
 * - **古いDaily runを無限保存しない**：`retentionDays`より古い`dailyKey`は剪定する
 * - 既存のlocalStorage設計（`dailyStorage`・`rewardStorage`等）と同じく、
 *   専用のキー・専用のバージョンを持ち、`RULES.saveVersion`とは**分離**する（不変ルール5）
 *
 * ★payloadに入れないもの（Step 9）
 * `ReplayInput`と`clientRunId`と`dailyKey`と作成時刻だけを持つ。email・IP・端末情報・
 * 名前・cookie・他のlocalStorageの内容は一切含めない。`ReplayInput`自体も
 * score・勝敗・HP・rngCursorを持たない構造なので、ここへ足す余地が無い。
 */

const STORAGE_KEY = 'sevengods.pendingRuns'

/** 送信待ち保存の形式バージョン。`RULES.saveVersion`とは独立 */
export const PENDING_RUNS_VERSION = 1

export type PendingRun = {
  clientRunId: string
  /** 剪定に使う（JSTの日付キー）。`input.dailyKey`と同じ値 */
  dailyKey: string
  /** 何回送信を試みたか。Phase 4.3の再送制御用（現時点では常に0） */
  attempts: number
  /** 検証用の真実ではなく、剪定と表示順のためだけの時刻 */
  createdAt: number
  /** サーバーへ渡すpayloadそのもの */
  input: ReplayInput
}

type StoredPendingRuns = {
  version: number
  runs: PendingRun[]
}

function isReplayInput(value: unknown): value is ReplayInput {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (v.version !== RULES.replay.formatVersion) return false
  if (v.mode !== 'daily') return false
  if (typeof v.dailyKey !== 'string' || typeof v.godId !== 'string') return false
  if (!Array.isArray(v.deck) || !Array.isArray(v.actions)) return false
  if (v.actions.length > RULES.replay.maxActions) return false
  return v.actions.every((a) => {
    if (!a || typeof a !== 'object') return false
    const type = (a as { type?: unknown }).type
    return typeof type === 'string' && (REPLAY_ACTION_TYPES as readonly string[]).includes(type)
  })
}

function isPendingRun(value: unknown): value is PendingRun {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    isClientRunId(v.clientRunId) &&
    typeof v.dailyKey === 'string' &&
    typeof v.attempts === 'number' &&
    typeof v.createdAt === 'number' &&
    isReplayInput(v.input)
  )
}

function read(): PendingRun[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return []
    const stored = parsed as Record<string, unknown>
    if (stored.version !== PENDING_RUNS_VERSION) return []
    if (!Array.isArray(stored.runs)) return []
    return stored.runs.filter(isPendingRun)
  } catch {
    return []
  }
}

function write(runs: PendingRun[]): void {
  try {
    const payload: StoredPendingRuns = { version: PENDING_RUNS_VERSION, runs }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // 保存できなくてもゲーム自体には影響しない
  }
}

/** `retentionDays`より古い日付キーのrunを落とす */
function prune(runs: PendingRun[], todayKey: string): PendingRun[] {
  const limit = RULES.replay.pendingRuns.retentionDays
  const kept = runs.filter((run) => daysBetween(run.dailyKey, todayKey) <= limit)
  // 上限超過分は古い順（配列の先頭）から捨てる
  const max = RULES.replay.pendingRuns.maxRuns
  return kept.length > max ? kept.slice(kept.length - max) : kept
}

const DAY_MS = 24 * 60 * 60 * 1000

/** `YYYY-MM-DD`同士の日数差（不正な形式は「とても古い」として扱う） */
function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`)
  const b = Date.parse(`${to}T00:00:00Z`)
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.POSITIVE_INFINITY
  return Math.abs(b - a) / DAY_MS
}

/**
 * 決着したrunを送信待ちへ入れる。
 * 同じ`clientRunId`が既にあれば置換する（再送・再記録で重複を増やさない）。
 */
export function enqueuePendingRun(
  run: Omit<PendingRun, 'attempts' | 'createdAt'> & { attempts?: number; createdAt?: number },
  todayKey: string,
  now = Date.now(),
): PendingRun[] {
  const entry: PendingRun = {
    clientRunId: run.clientRunId,
    dailyKey: run.dailyKey,
    attempts: run.attempts ?? 0,
    createdAt: run.createdAt ?? now,
    input: run.input,
  }
  const existing = read().filter((r) => r.clientRunId !== entry.clientRunId)
  const next = prune([...existing, entry], todayKey)
  write(next)
  return next
}

/** 送信待ちの一覧（古い順）。読み出しのついでに剪定はしない（副作用を持たせない） */
export function loadPendingRuns(): PendingRun[] {
  return read()
}

/** 送信に成功したrunを取り除く（Phase 4.3で使う） */
export function removePendingRun(clientRunId: string): PendingRun[] {
  const next = read().filter((r) => r.clientRunId !== clientRunId)
  write(next)
  return next
}

/** 古いrunを剪定する（起動時などに呼ぶ想定） */
export function prunePendingRuns(todayKey: string): PendingRun[] {
  const next = prune(read(), todayKey)
  write(next)
  return next
}

export function clearPendingRuns(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 消せなくても次の書き込みで上書きされる
  }
}

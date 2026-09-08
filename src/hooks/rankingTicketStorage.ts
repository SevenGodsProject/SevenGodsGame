import { isClientRunId } from './clientRunId'

/**
 * Phase 4.6（決定139 §12）：サーバーが発行した run ticket の控え。
 *
 * ★なぜ START_GAME の**前**に保存するのか
 * ticketは「1日3回のうちの1回」を既に消費している。受け取ったのに保存しないまま
 * ブラウザが落ちると、プレイヤーから見れば「何もしていないのに1回減った」状態になり、
 * しかも再開する手がかり（`clientRunId`）が消えるので取り戻せない。
 * だから **受け取る → 保存する → 対局を始める** の順を崩さない。
 *
 * ★保存するのは公開情報だけ
 * `playerSecret` はここに入れない（入れる場所も無い）。ticketは「いつ・何回目の枠か」を
 * 表すだけで、それ自体は秘密ではない。
 *
 * ★他のstorageと同じ流儀
 * 独立version・`sevengods.*`キー・try/catch＋構造チェック・hooks層（不変ルール1・5）。
 */

const STORAGE_KEY = 'sevengods.rankingTicket'

/** ticket控えの形式バージョン。`RULES.saveVersion` とは独立 */
export const RANKING_TICKET_VERSION = 1

export type StoredTicket = {
  dailyKey: string
  clientRunId: string
  attemptNo: number
  /** サーバーが決めた提出期限（ミリ秒）。端末時計ではなくこの値を基準にする */
  expiresAt: number
  /** 発行時のコードの版。ゲームが更新されたら提出できなくなる（枠は返還される） */
  gameVersion: string
  /** 受領時のサーバー時刻。端末時計とのずれを補正して残り時間を表示するために持つ */
  serverNow: number
  /** 受領時の端末時刻。`serverNow` との差が時計のずれ */
  receivedAt: number
}

type StoredPayload = {
  version: number
  ticket: StoredTicket
}

function isStoredTicket(value: unknown): value is StoredTicket {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.dailyKey === 'string' &&
    isClientRunId(v.clientRunId) &&
    typeof v.attemptNo === 'number' &&
    Number.isFinite(v.attemptNo) &&
    typeof v.expiresAt === 'number' &&
    Number.isFinite(v.expiresAt) &&
    typeof v.gameVersion === 'string' &&
    typeof v.serverNow === 'number' &&
    typeof v.receivedAt === 'number'
  )
}

/** 受け取った ticket を控える。**START_GAME より前に呼ぶ** */
export function saveTicket(ticket: StoredTicket): void {
  try {
    const payload: StoredPayload = { version: RANKING_TICKET_VERSION, ticket }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // 保存できなくても対局は続けられる（そのrunが提出できなくなるだけ）
  }
}

/** 控えてある ticket。無い・壊れている・版違いならnull */
export function loadTicket(): StoredTicket | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const stored = parsed as Record<string, unknown>
    if (stored.version !== RANKING_TICKET_VERSION) return null
    return isStoredTicket(stored.ticket) ? stored.ticket : null
  } catch {
    return null
  }
}

export function clearTicket(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 消せなくても次の保存で上書きされる
  }
}

/**
 * この run の ticket が控えてあるか。`clientRunId` が一致するものだけを返す
 * （別の挑戦の ticket を取り違えて「提出できるはず」と誤解しないため）。
 */
export function loadTicketFor(clientRunId: string, dailyKey: string): StoredTicket | null {
  const ticket = loadTicket()
  if (!ticket) return null
  if (ticket.clientRunId !== clientRunId || ticket.dailyKey !== dailyKey) return null
  return ticket
}

/**
 * ticketの残り時間（ミリ秒）。**端末時計のずれを補正する**。
 *
 * 受領時に `serverNow`（サーバー時刻）と `receivedAt`（端末時刻）の両方を控えてあるので、
 * その差を端末時計に足せばサーバー基準の現在時刻が求まる。端末時計が何時間ずれていても
 * 「あと何分で期限切れか」は正しく出せる。
 */
export function remainingMs(ticket: StoredTicket, now: number): number {
  const skew = ticket.serverNow - ticket.receivedAt
  return ticket.expiresAt - (now + skew)
}

/** 期限切れか（サーバー基準） */
export function isTicketExpired(ticket: StoredTicket, now: number): boolean {
  return remainingMs(ticket, now) <= 0
}

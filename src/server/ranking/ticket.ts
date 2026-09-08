import { RULES } from './deps'

/**
 * Phase 4.6（決定139 §10・§11）：run ticket（挑戦枠の予約）の型と状態機械。
 *
 * ★なぜ ticket が要るのか
 * Phase 4.5 までの3回制限は「**提出**を3回まで」だった。Daily の seed は公開・決定論なので、
 * 何度でも遊んで良い3回だけ出せる。本番エンジンでの実測では、同じ腕のプレイヤーでも
 * 300回遊んで最良を出すと best-of-3 の **1.5〜2.3倍**になった（決定139 §4-2）。
 * つまり提出回数の制限では「1日3回勝負」は成立しない。
 *
 * そこで**挑戦を始める時点で枠を予約する**。枠を消費するのは ticket の発行であって、
 * 提出ではない。提出しなくても、期限が切れても、自分で別の挑戦を始めても枠は戻らない。
 * 唯一の例外が `voided`（deployでルールが変わった＝プレイヤーの落ち度ではない）で、
 * このときだけ番号を返還する。
 *
 * ★状態は5つしかない
 *
 *                    start（新しい clientRunId・枠あり）
 *   (none) ─────────────────────────────────────▶ open ──┐
 *                                                  │      │ submit 受理
 *      ┌───────────────────────────────────────────┤      ▼
 *      │ 別の clientRunId で start                   │   submitted（終端・枠消費）
 *      ▼                                            │
 *   abandoned（終端・枠消費）                          │ now > expiresAt
 *                                                   ▼
 *                                                expired（終端・枠消費）
 *
 *   open ── submit時に gameVersion が違う ──▶ voided（終端・枠**返還**）
 */

export type TicketClosedReason = 'abandoned' | 'voided'

export type RunTicket = {
  /** JSTの日付キー。**サーバー時刻**で決まる（クライアントの申告は使わない） */
  dailyKey: string
  playerId: string
  /** ticketの識別子は `clientRunId` そのもの（識別子を増やさない） */
  clientRunId: string
  /** その日の何回目か。1〜`RULES.daily.attemptsPerDay` */
  attemptNo: number
  issuedAt: number
  /** これを過ぎた ticket では提出できない */
  expiresAt: number
  /** 発行時点のコードの版。提出時に現在の版と一致しなければ `voided` */
  gameVersion: string
  /** null＝まだ閉じていない */
  closedReason: TicketClosedReason | null
}

/** 表示・判定用の状態。DBに列としては持たない（保存済みrunと時刻から導ける） */
export type TicketState = 'open' | 'submitted' | 'expired' | 'abandoned' | 'voided'

/**
 * ticketの現在の状態。
 * @param submitted この ticket に対応する run が保存済みか
 */
export function ticketStateOf(ticket: RunTicket, submitted: boolean, now: number): TicketState {
  if (ticket.closedReason) return ticket.closedReason
  if (submitted) return 'submitted'
  if (now > ticket.expiresAt) return 'expired'
  return 'open'
}

/** 枠を消費しているか。`voided` だけが返還される */
export function consumesAttempt(ticket: RunTicket): boolean {
  return ticket.closedReason !== 'voided'
}

/** JSTの `dailyKey` が終わる瞬間（＝翌日00:00 JST）をUTCミリ秒で返す */
export function dayEndOf(dailyKey: string): number {
  const [year, month, day] = dailyKey.split('-').map(Number)
  return Date.UTC(year, month - 1, day + 1) - RULES.daily.timezoneOffsetMinutes * 60_000
}

/** `dailyKey` を `days` 日ずらした日付キー（剪定の基準日を出すのに使う） */
export function shiftDailyKey(dailyKey: string, days: number): string {
  const [year, month, day] = dailyKey.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + days))
  const y = shifted.getUTCFullYear()
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const d = String(shifted.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * ticketの期限。「発行から `ticketTtlMinutes`」と「日末＋`dayEndGraceMinutes`」の早い方。
 *
 * 前者は放置した枠を寝かせ続けられないようにするため。後者は 23:59 に始めた挑戦を
 * 00:01 に提出できるようにしつつ、前日のボードが翌日 00:15 で確定するようにするため
 * （決定139 §6-2：0分では救えず、90分では確定が遅れて翌日の掲示と重なる）。
 */
export function expiryOf(dailyKey: string, issuedAt: number): number {
  const byTtl = issuedAt + RULES.ranking.ticketTtlMinutes * 60_000
  const byDayEnd = dayEndOf(dailyKey) + RULES.ranking.dayEndGraceMinutes * 60_000
  return Math.min(byTtl, byDayEnd)
}

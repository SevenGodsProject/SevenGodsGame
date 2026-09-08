import { createHash, randomBytes } from 'node:crypto'
import { RULES } from '../../src/core/data/rules'
import { dailyKeyOf, isValidDailyKey } from '../../src/core/data/dailyBoss'

/**
 * Phase 4.5 PSF Gate：**設計検証用のリファレンスモデル**。本番コードではない。
 *
 * ここにあるのは「run ticket（挑戦枠の予約）」の状態遷移と、それを守るサーバー手順の
 * 最小実装である。目的は docs/PHASE4_5_PSF_GATE.md の仕様が
 *   - 二重start・reload・resume・通信断・submit retry・期限切れ・日付跨ぎ・複数端末・並列start
 * のすべてで「正当なプレイヤーが枠を失わず、不正なプレイヤーが枠を増やせない」ことを
 * 状態機械として機械的に確かめること。
 *
 * ★本番へ持ち込むときの対応関係
 *   - `MemoryTicketStore.insertTicket` の不可分性 ＝ Postgres の
 *     部分UNIQUE `(daily_key, player_id, attempt_no) WHERE closed_reason IS DISTINCT FROM 'voided'`
 *     と `CHECK (attempt_no BETWEEN 1 AND N)`（daily_runs と同じ考え方）
 *   - `derivePlayerId` ＝ サーバー側 `crypto.subtle.digest('SHA-256', secret)` の先頭32桁
 *   - `PROPOSED` の数値 ＝ 実装時に `src/core/data/rules.ts` の `ranking` へ移す（不変ルール4）
 *
 * ★このファイルは `src/` に置かない。`src/server` は外部パッケージ0件・`node:crypto` 不使用を
 * 境界テストで守っており、モデル用の sha256 をそこへ持ち込まないため。
 */

/** 実装時に rules.ts へ移す提案値（このPhaseでは rules.ts を変更しない） */
export const PROPOSED = {
  /** ticket発行から提出までの猶予。実プレイ5〜10分＋中断を見込む */
  ticketTtlMinutes: 90,
  /** JST日付が変わったあと、前日のticketで提出できる猶予（23:59開始の救済） */
  dayEndGraceMinutes: 15,
  /** playerSecret のバイト数（256bit） */
  secretBytes: 32,
} as const

export const ATTEMPTS_PER_DAY = RULES.daily.attemptsPerDay
export const MAX_SUBMIT_ATTEMPTS_PER_DAY = RULES.ranking.maxSubmitAttemptsPerDay
const PLAYER_ID_LENGTH = RULES.ranking.playerIdLength

// ---------------------------------------------------------------------------
// PSF-1：匿名identity（クライアント保持の秘密 → 公開IDはそのハッシュ）
// ---------------------------------------------------------------------------

const HEX_SECRET = /^[0-9a-f]{64}$/
const HEX_ID = /^[0-9a-f-]{32,36}$/

/** 公開ID ＝ SHA-256(secret) の先頭32桁（既存の playerId 形式・長さと互換） */
export function derivePlayerId(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex').slice(0, PLAYER_ID_LENGTH)
}

export function createIdentity(): { secret: string; playerId: string } {
  const secret = randomBytes(PROPOSED.secretBytes).toString('hex')
  return { secret, playerId: derivePlayerId(secret) }
}

export function verifyIdentity(playerId: unknown, secret: unknown): boolean {
  return (
    typeof playerId === 'string' &&
    typeof secret === 'string' &&
    HEX_SECRET.test(secret) &&
    derivePlayerId(secret) === playerId
  )
}

// ---------------------------------------------------------------------------
// PSF-2/3/4：run ticket
// ---------------------------------------------------------------------------

export type ClosedReason = 'abandoned' | 'voided'

export type Ticket = {
  dailyKey: string
  playerId: string
  /** ticketId ＝ clientRunId（識別子を増やさない） */
  clientRunId: string
  attemptNo: number
  issuedAt: number
  expiresAt: number
  rulesVersion: string
  /** null＝有効。abandoned＝別runの開始で放棄（消費）。voided＝deployで無効化（返還） */
  closedReason: ClosedReason | null
}

export type StoredRun = {
  dailyKey: string
  playerId: string
  clientRunId: string
  attemptNo: number
  score: number
  submittedAt: number
  rulesVersion: string
}

export type TicketState = 'open' | 'submitted' | 'expired' | 'abandoned' | 'voided'

export function ticketStateOf(t: Ticket, submitted: boolean, now: number): TicketState {
  if (t.closedReason) return t.closedReason
  if (submitted) return 'submitted'
  if (now > t.expiresAt) return 'expired'
  return 'open'
}

/** JSTの `dailyKey` の翌日 00:00 を UTC ms で返す */
export function dayEndOf(dailyKey: string): number {
  const [y, m, d] = dailyKey.split('-').map(Number)
  const utcMidnight = Date.UTC(y, m - 1, d + 1)
  return utcMidnight - RULES.daily.timezoneOffsetMinutes * 60_000
}

export function expiryOf(dailyKey: string, issuedAt: number): number {
  const byTtl = issuedAt + PROPOSED.ticketTtlMinutes * 60_000
  const byDay = dayEndOf(dailyKey) + PROPOSED.dayEndGraceMinutes * 60_000
  return Math.min(byTtl, byDay)
}

export type InsertTicketResult =
  | { ok: true }
  | { ok: false; reason: 'attempt-taken' | 'duplicate-run-id' | 'attempts-exceeded' }

export type InsertRunResult = { ok: true } | { ok: false; reason: 'duplicate' | 'attempt-taken' }

/**
 * 保存層。`insertTicket` / `insertRun` は同期区間で判定と書き込みを終える
 * （＝Postgresの1文INSERTが制約で不可分に判定するのと同じ意味論）。
 */
export class MemoryTicketStore {
  tickets: Ticket[] = []
  runs: StoredRun[] = []
  private dayRules = new Map<string, string>()
  private submitAttempts = new Map<string, number>()
  /** 監査用：書き込み系の呼び出し回数 */
  writes = 0

  clear() {
    this.tickets = []
    this.runs = []
    this.dayRules.clear()
    this.submitAttempts.clear()
    this.writes = 0
  }

  /** その日の rulesVersion を最初のticketで固定する（`INSERT ... ON CONFLICT DO NOTHING` → SELECT） */
  async lockDayRules(dailyKey: string, rulesVersion: string): Promise<string> {
    const existing = this.dayRules.get(dailyKey)
    if (existing) return existing
    this.writes++
    this.dayRules.set(dailyKey, rulesVersion)
    return rulesVersion
  }

  async findTicket(dailyKey: string, clientRunId: string): Promise<Ticket | null> {
    const t = this.tickets.find((x) => x.dailyKey === dailyKey && x.clientRunId === clientRunId)
    return t ? { ...t } : null
  }

  async listTickets(dailyKey: string, playerId: string): Promise<Ticket[]> {
    return this.tickets
      .filter((x) => x.dailyKey === dailyKey && x.playerId === playerId)
      .map((x) => ({ ...x }))
  }

  async insertTicket(t: Ticket): Promise<InsertTicketResult> {
    this.writes++
    if (t.attemptNo < 1 || t.attemptNo > ATTEMPTS_PER_DAY) {
      return { ok: false, reason: 'attempts-exceeded' }
    }
    if (this.tickets.some((x) => x.dailyKey === t.dailyKey && x.clientRunId === t.clientRunId)) {
      return { ok: false, reason: 'duplicate-run-id' }
    }
    // 部分UNIQUE：voided は番号を返還するので衝突対象から外す
    const taken = this.tickets.some(
      (x) =>
        x.dailyKey === t.dailyKey &&
        x.playerId === t.playerId &&
        x.attemptNo === t.attemptNo &&
        x.closedReason !== 'voided',
    )
    if (taken) return { ok: false, reason: 'attempt-taken' }
    this.tickets.push({ ...t })
    return { ok: true }
  }

  async closeTicket(dailyKey: string, clientRunId: string, reason: ClosedReason): Promise<void> {
    this.writes++
    const t = this.tickets.find((x) => x.dailyKey === dailyKey && x.clientRunId === clientRunId)
    if (t && !t.closedReason) t.closedReason = reason
  }

  async findRun(dailyKey: string, clientRunId: string): Promise<StoredRun | null> {
    const r = this.runs.find((x) => x.dailyKey === dailyKey && x.clientRunId === clientRunId)
    return r ? { ...r } : null
  }

  async listPlayerRuns(dailyKey: string, playerId: string): Promise<StoredRun[]> {
    return this.runs
      .filter((x) => x.dailyKey === dailyKey && x.playerId === playerId)
      .map((x) => ({ ...x }))
  }

  async insertRun(r: StoredRun): Promise<InsertRunResult> {
    this.writes++
    if (this.runs.some((x) => x.dailyKey === r.dailyKey && x.clientRunId === r.clientRunId)) {
      return { ok: false, reason: 'duplicate' }
    }
    if (
      this.runs.some(
        (x) => x.dailyKey === r.dailyKey && x.playerId === r.playerId && x.attemptNo === r.attemptNo,
      )
    ) {
      return { ok: false, reason: 'attempt-taken' }
    }
    this.runs.push({ ...r })
    return { ok: true }
  }

  async countSubmitAttempts(dailyKey: string, playerId: string): Promise<number> {
    return this.submitAttempts.get(`${dailyKey} ${playerId}`) ?? 0
  }

  async recordSubmitAttempt(dailyKey: string, playerId: string): Promise<void> {
    this.writes++
    const k = `${dailyKey} ${playerId}`
    this.submitAttempts.set(k, (this.submitAttempts.get(k) ?? 0) + 1)
  }
}

// ---------------------------------------------------------------------------
// サーバー手順
// ---------------------------------------------------------------------------

export type ServerDeps = {
  store: MemoryTicketStore
  /** サーバー時刻（端末時計は一切使わない） */
  now: number
  /** 現在deployされているコードの rulesVersion */
  rulesVersion: string
}

export type StartRequest = { playerId: string; playerSecret: string; clientRunId: string }

export type StartRejection = 'BAD_IDENTITY' | 'ATTEMPTS_EXCEEDED' | 'RULES_VERSION_LOCKED' | 'RETRY'

export type StartResult =
  | {
      ok: true
      ticket: Ticket
      state: TicketState
      /** 既存ticketを返した（reload・二重start・通信断後のretry） */
      reused: boolean
      /** この start で放棄された別runのticket（あれば） */
      abandoned: string | null
      attemptsUsed: number
      serverNow: number
    }
  | { ok: false; code: StartRejection }

function countsAsAttempt(t: Ticket): boolean {
  return t.closedReason !== 'voided'
}

function isOpen(t: Ticket, runs: StoredRun[], now: number): boolean {
  return ticketStateOf(t, runs.some((r) => r.clientRunId === t.clientRunId), now) === 'open'
}

/**
 * `POST /api/ranking/start`
 *
 * 1. 身元（secretのハッシュが公開IDと一致するか）。不一致なら**何も書かない**
 * 2. dailyKey はサーバー時刻から決める（リクエストに含めない）
 * 3. その日の rulesVersion を固定。deployで変わっていたら発行しない（PSF-3）
 * 4. 同じ clientRunId の ticket があればそれを返す（冪等：reload／通信断／二重start）
 * 5. 枠が残っていなければ拒否（open ticket は**放棄しない**＝resume可能なまま）
 * 6. 別 clientRunId の open ticket があれば放棄（消費）。「新しい挑戦」の明示
 * 7. attempt_no ＝ 消費済み枚数＋1 で挿入。番号衝突（並列start）は**再採番せず**
 *    open ticket を読み直して返す（＝二重startを1枚に畳む）
 */
export async function startRun(req: StartRequest, deps: ServerDeps): Promise<StartResult> {
  const { store, now, rulesVersion } = deps
  if (!verifyIdentity(req.playerId, req.playerSecret) || !HEX_ID.test(req.clientRunId)) {
    return { ok: false, code: 'BAD_IDENTITY' }
  }
  const dailyKey = dailyKeyOf(new Date(now))

  const dayRules = await store.lockDayRules(dailyKey, rulesVersion)
  if (dayRules !== rulesVersion) return { ok: false, code: 'RULES_VERSION_LOCKED' }

  const runs = await store.listPlayerRuns(dailyKey, req.playerId)
  const same = await store.findTicket(dailyKey, req.clientRunId)
  if (same) {
    if (same.playerId !== req.playerId) return { ok: false, code: 'BAD_IDENTITY' }
    const tickets = await store.listTickets(dailyKey, req.playerId)
    return {
      ok: true,
      ticket: same,
      state: ticketStateOf(same, runs.some((r) => r.clientRunId === same.clientRunId), now),
      reused: true,
      abandoned: null,
      attemptsUsed: tickets.filter(countsAsAttempt).length,
      serverNow: now,
    }
  }

  const tickets = await store.listTickets(dailyKey, req.playerId)
  const used = tickets.filter(countsAsAttempt).length
  if (used >= ATTEMPTS_PER_DAY) return { ok: false, code: 'ATTEMPTS_EXCEEDED' }

  let abandoned: string | null = null
  const open = tickets.find((t) => isOpen(t, runs, now))
  if (open) {
    await store.closeTicket(dailyKey, open.clientRunId, 'abandoned')
    abandoned = open.clientRunId
  }

  const ticket: Ticket = {
    dailyKey,
    playerId: req.playerId,
    clientRunId: req.clientRunId,
    attemptNo: used + 1,
    issuedAt: now,
    expiresAt: expiryOf(dailyKey, now),
    rulesVersion,
    closedReason: null,
  }
  const inserted = await store.insertTicket(ticket)
  if (inserted.ok) {
    return {
      ok: true,
      ticket,
      state: 'open',
      reused: false,
      abandoned,
      attemptsUsed: used + 1,
      serverNow: now,
    }
  }
  if (inserted.reason === 'attempts-exceeded') return { ok: false, code: 'ATTEMPTS_EXCEEDED' }
  if (inserted.reason === 'duplicate-run-id') {
    // 同じ clientRunId が同時に入った（通信断後のretryが並走）。相手の登録を正とする
    const mine = await store.findTicket(dailyKey, req.clientRunId)
    if (mine && mine.playerId === req.playerId) {
      return {
        ok: true,
        ticket: mine,
        state: 'open',
        reused: true,
        abandoned,
        attemptsUsed: used + 1,
        serverNow: now,
      }
    }
    return { ok: false, code: 'RETRY' }
  }
  // attempt-taken：並列startで番号を取られた。再採番せず、相手の open ticket を返す
  const latest = await store.listTickets(dailyKey, req.playerId)
  const winner = latest.find((t) => isOpen(t, runs, now))
  if (winner) {
    return {
      ok: true,
      ticket: winner,
      state: 'open',
      reused: true,
      abandoned,
      attemptsUsed: latest.filter(countsAsAttempt).length,
      serverNow: now,
    }
  }
  return { ok: false, code: 'RETRY' }
}

export type SubmitRequest = {
  playerId: string
  playerSecret: string
  clientRunId: string
  /** ReplayInput のうちモデルに必要な部分 */
  input: { dailyKey: string; payload: string }
}

export type SubmitRejection =
  | 'BAD_IDENTITY'
  | 'NO_TICKET'
  | 'TICKET_CLOSED'
  | 'TICKET_EXPIRED'
  | 'RULES_VERSION_MISMATCH'
  | 'RATE_LIMITED'
  | 'REPLAY_REJECTED'
  | 'RUN_ID_CONFLICT'

export type SubmitResult =
  | { ok: true; accepted: 'stored' | 'duplicate'; score: number; attemptNo: number; runsUsed: number }
  | { ok: false; code: SubmitRejection; refunded?: boolean }

/** リプレイ検証の差し替え口。実物は Phase 4.1〜4.4 で検証済みなので、ここでは決定論の疑似検証 */
export type Verifier = (payload: string) => { ok: true; score: number } | { ok: false }

export const defaultVerifier: Verifier = (payload) => {
  if (payload.startsWith('bad')) return { ok: false }
  let h = 0
  for (let i = 0; i < payload.length; i++) h = (h * 31 + payload.charCodeAt(i)) >>> 0
  return { ok: true, score: 1000 + (h % 9000) }
}

/**
 * `POST /api/ranking/submit`
 *
 * **DB書き込みが起きるのは ticket 保持者だけ**。身元不明・ticket無しは読み取り1回で拒否する。
 *   1. 身元 → 2. ticket（無ければ拒否・書かない） → 3. 冪等（受理済み再送）
 *   → 4. closed/expired → 5. rulesVersion（不一致は void ＝ 枠を返還）
 *   → 6. 提出試行のレート制限（ここで初めて書く） → 7. 検証 → 8. 保存（最終権限）
 */
export async function submitRun(
  req: SubmitRequest,
  deps: ServerDeps & { verify?: Verifier },
): Promise<SubmitResult> {
  const { store, now, rulesVersion } = deps
  const verify = deps.verify ?? defaultVerifier

  if (!verifyIdentity(req.playerId, req.playerSecret) || !HEX_ID.test(req.clientRunId)) {
    return { ok: false, code: 'BAD_IDENTITY' }
  }
  const dailyKey = req.input?.dailyKey
  if (typeof dailyKey !== 'string' || !isValidDailyKey(dailyKey)) {
    return { ok: false, code: 'NO_TICKET' }
  }

  const ticket = await store.findTicket(dailyKey, req.clientRunId)
  if (!ticket) return { ok: false, code: 'NO_TICKET' }
  if (ticket.playerId !== req.playerId) return { ok: false, code: 'BAD_IDENTITY' }

  const existing = await store.findRun(dailyKey, req.clientRunId)
  if (existing) {
    const v = verify(req.input.payload)
    if (!v.ok) return { ok: false, code: 'REPLAY_REJECTED' }
    if (v.score !== existing.score) return { ok: false, code: 'RUN_ID_CONFLICT' }
    const runs = await store.listPlayerRuns(dailyKey, req.playerId)
    return {
      ok: true,
      accepted: 'duplicate',
      score: existing.score,
      attemptNo: existing.attemptNo,
      runsUsed: runs.length,
    }
  }

  if (ticket.closedReason) return { ok: false, code: 'TICKET_CLOSED' }
  if (now > ticket.expiresAt) return { ok: false, code: 'TICKET_EXPIRED' }
  if (ticket.rulesVersion !== rulesVersion) {
    // deploy を跨いだ run は比較不能。プレイヤーの落ち度ではないので枠を返す
    await store.closeTicket(dailyKey, req.clientRunId, 'voided')
    return { ok: false, code: 'RULES_VERSION_MISMATCH', refunded: true }
  }

  const attempts = await store.countSubmitAttempts(dailyKey, req.playerId)
  if (attempts >= MAX_SUBMIT_ATTEMPTS_PER_DAY) return { ok: false, code: 'RATE_LIMITED' }
  await store.recordSubmitAttempt(dailyKey, req.playerId)

  const v = verify(req.input.payload)
  if (!v.ok) return { ok: false, code: 'REPLAY_REJECTED' }

  const run: StoredRun = {
    dailyKey,
    playerId: req.playerId,
    clientRunId: req.clientRunId,
    attemptNo: ticket.attemptNo,
    score: v.score,
    submittedAt: now,
    rulesVersion,
  }
  const inserted = await store.insertRun(run)
  if (!inserted.ok) {
    const stored = await store.findRun(dailyKey, req.clientRunId)
    if (stored && stored.score === v.score) {
      const runs = await store.listPlayerRuns(dailyKey, req.playerId)
      return {
        ok: true,
        accepted: 'duplicate',
        score: stored.score,
        attemptNo: stored.attemptNo,
        runsUsed: runs.length,
      }
    }
    return { ok: false, code: 'RUN_ID_CONFLICT' }
  }
  const runs = await store.listPlayerRuns(dailyKey, req.playerId)
  return { ok: true, accepted: 'stored', score: v.score, attemptNo: ticket.attemptNo, runsUsed: runs.length }
}

/** テスト用：hex 32桁の run id を決定論的に作る */
export function runIdOf(n: number | string): string {
  return createHash('sha256').update(String(n)).digest('hex').slice(0, 32)
}

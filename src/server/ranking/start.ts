import { RULES, dailyKeyOf, getGameVersion } from './deps.js'
import { verifyIdentity } from './identity.js'
import type { RankingStore } from './store.js'
import {
  consumesAttempt,
  expiryOf,
  shiftDailyKey,
  ticketStateOf,
  type RunTicket,
  type TicketState,
} from './ticket.js'

/**
 * Phase 4.6（決定139 §4-4・§9・§12）：挑戦の開始＝**枠の予約**。
 *
 * ★これがランキングの公平性の要
 * 枠を消費するのは「提出」ではなく「開始」。ここを通らずに始めた挑戦は
 * そもそも提出できない（`submitRun` が ticket を要求する）。
 *
 * ★正当なプレイヤーが枠を失わないための設計
 * 通信断・二重クリック・reload・並列リクエストは日常的に起きる。これらで枠が減ると
 * 「3回勝負」が「運が悪ければ2回」になってしまう。そこで：
 *   - 同じ `clientRunId` の start は**何度呼んでも同じ ticket** を返す（冪等）
 *   - 並列startで番号がぶつかったら**再採番せず**、生きている ticket を読み直して返す
 *     （＝多重クリックが複数の枠を食わない。1枚に畳む）
 *   - 枠が残っていないときは、進行中の ticket を**放棄しない**（＝最後の挑戦を再開できる）
 *
 * ★時刻とdailyKeyはサーバーが決める
 * リクエストに `dailyKey` を含めない。端末時計を進めて「明日のDaily」を先に遊ぶ、
 * あるいは正当なプレイヤーの時計ずれでrunが消える——どちらも構造的に起こらない。
 */

export type StartDeps = {
  store: RankingStore
  /** 現在時刻（ミリ秒）。JSTの日付キーの算出と ticket の期限に使う */
  now: number
  /**
   * 現在deployされているコードの版。既定は `getGameVersion()`。
   * テストで版の切り替わり（deploy）を再現するために注入できるようにしてある。
   */
  gameVersion?: string
}

export type StartRejectionCode =
  /** 身元の形式が不正、秘密が公開IDと一致しない、または他人のrunを名乗った */
  | 'BAD_IDENTITY'
  /** その日の挑戦回数を使い切っている */
  | 'ATTEMPTS_EXCEEDED'
  /** その日は別の版で始まっている（deploy直後）。当日中は新しい挑戦を始められない */
  | 'RULES_VERSION_LOCKED'
  /** 競合が続いて確定できなかった（クライアントは同じ clientRunId で再試行してよい） */
  | 'RETRY'

export type StartRequest = {
  playerId: string
  playerSecret: string
  /** このrunの識別子。クライアントが1度だけ発行し、再送でも同じ値を使う */
  clientRunId: string
}

export type StartResult =
  | {
      ok: true
      ticket: RunTicket
      state: TicketState
      /** 既存の ticket を返した（reload・二重start・通信断後の再送） */
      reused: boolean
      /** この start で放棄された別runの `clientRunId`（無ければ null） */
      abandoned: string | null
      /** その日に消費済みの枠の数（この ticket を含む） */
      attemptsUsed: number
      /** サーバー時刻。クライアントは残り時間の表示にこれを使う（端末時計を信じない） */
      serverNow: number
    }
  | { ok: false; code: StartRejectionCode; message: string }

const HEX_RUN_ID = /^[0-9a-f-]{32,36}$/

function reject(code: StartRejectionCode, message: string): StartResult {
  return { ok: false, code, message }
}

export async function startRun(request: StartRequest, deps: StartDeps): Promise<StartResult> {
  const { store, now } = deps
  const gameVersion = deps.gameVersion ?? getGameVersion()

  // --- 1. 身元。ここを通らないとDBへ一切書かない（決定139 §7-2） ---
  if (typeof request.clientRunId !== 'string' || !HEX_RUN_ID.test(request.clientRunId)) {
    return reject('BAD_IDENTITY', '識別子の形式が不正です')
  }
  if (!(await verifyIdentity(request.playerId, request.playerSecret))) {
    return reject('BAD_IDENTITY', '身元を確認できませんでした')
  }

  // --- 2. 日付はサーバー時刻で決める（クライアントの申告は受け取らない） ---
  const dailyKey = dailyKeyOf(new Date(now))

  // --- 3. その日の版を固定する（day-lock） ---
  // 既に別の版で始まっている日には、新しい版の挑戦を混ぜない。
  // 「朝のスコアと夜のスコアが同じ条件で出たものか」を機械的に保証する唯一の手段。
  const dayVersion = await store.lockDayVersion(dailyKey, gameVersion)
  if (dayVersion !== gameVersion) {
    return reject(
      'RULES_VERSION_LOCKED',
      '本日の神域挑戦は別のバージョンで進行中です。日付が変わってから再度お試しください',
    )
  }

  const runs = await store.listPlayerRuns(dailyKey, request.playerId)
  const submitted = (ticket: RunTicket) =>
    runs.some((run) => run.clientRunId === ticket.clientRunId)
  const isOpen = (ticket: RunTicket) => ticketStateOf(ticket, submitted(ticket), now) === 'open'

  // --- 4. 同じ clientRunId は冪等に扱う（reload・二重start・通信断後の再送） ---
  const same = await store.findTicket(dailyKey, request.clientRunId)
  if (same) {
    if (same.playerId !== request.playerId) {
      return reject('BAD_IDENTITY', 'この挑戦は別のプレイヤーのものです')
    }
    const mine = await store.listTickets(dailyKey, request.playerId)
    return {
      ok: true,
      ticket: same,
      state: ticketStateOf(same, submitted(same), now),
      reused: true,
      abandoned: null,
      attemptsUsed: mine.filter(consumesAttempt).length,
      serverNow: now,
    }
  }

  // --- 5. 残り枠の確認（事前判定。最終権限は insertTicket） ---
  const tickets = await store.listTickets(dailyKey, request.playerId)
  const used = tickets.filter(consumesAttempt).length
  if (used >= RULES.daily.attemptsPerDay) {
    // ★ここで open ticket を放棄しない。最後の1回を再開する道を必ず残す
    return reject('ATTEMPTS_EXCEEDED', '本日の挑戦回数を使い切っています')
  }

  // --- 6. 進行中の挑戦があれば放棄する（「新しい挑戦を始める」の意思表示） ---
  let abandoned: string | null = null
  const open = tickets.find(isOpen)
  if (open) {
    await store.closeTicket(dailyKey, open.clientRunId, 'abandoned')
    abandoned = open.clientRunId
  }

  // --- 7. 発行（上限判定の最終権限） ---
  const ticket: RunTicket = {
    dailyKey,
    playerId: request.playerId,
    clientRunId: request.clientRunId,
    attemptNo: used + 1,
    issuedAt: now,
    expiresAt: expiryOf(dailyKey, now),
    gameVersion,
    closedReason: null,
  }
  const inserted = await store.insertTicket(ticket)

  if (inserted.ok) {
    await maybePrune(store, dailyKey, request.clientRunId)
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

  if (inserted.reason === 'attempts-exceeded') {
    return reject('ATTEMPTS_EXCEEDED', '本日の挑戦回数を使い切っています')
  }

  if (inserted.reason === 'duplicate-run-id') {
    // 同じ clientRunId が同時に入った（通信断後の再送が並走）。相手の登録を正とする
    const mine = await store.findTicket(dailyKey, request.clientRunId)
    if (mine && mine.playerId === request.playerId) {
      const all = await store.listTickets(dailyKey, request.playerId)
      return {
        ok: true,
        ticket: mine,
        state: ticketStateOf(mine, submitted(mine), now),
        reused: true,
        abandoned,
        attemptsUsed: all.filter(consumesAttempt).length,
        serverNow: now,
      }
    }
    return reject('RETRY', '挑戦の登録に失敗しました。もう一度お試しください')
  }

  // attempt-taken：並列startで番号を取られた。
  // ★再採番しない。再採番すると多重クリックのぶんだけ枠が減ってしまう。
  // 生きている ticket を読み直して返し、複数のstartを1枚に畳む。
  const latest = await store.listTickets(dailyKey, request.playerId)
  const winner = latest.find(isOpen)
  if (winner) {
    return {
      ok: true,
      ticket: winner,
      state: 'open',
      reused: true,
      abandoned,
      attemptsUsed: latest.filter(consumesAttempt).length,
      serverNow: now,
    }
  }
  return reject('RETRY', '挑戦の登録に失敗しました。もう一度お試しください')
}

/**
 * 古い日のデータの剪定。外部のcronを持ち込まず、startの N 回に1回だけ試みる
 * （`clientRunId` の末尾16進が 0 のとき）。ランキングは当日ぶんしか使わないので、
 * 履歴を無限に持たない＝Neon Free のストレージを守る。
 */
async function maybePrune(store: RankingStore, dailyKey: string, clientRunId: string) {
  const bucket = parseInt(clientRunId.slice(-1), 16)
  if (!Number.isFinite(bucket)) return
  if (bucket % RULES.ranking.pruneEveryStarts !== 0) return
  await store.pruneBefore(shiftDailyKey(dailyKey, -RULES.daily.retentionDays))
}

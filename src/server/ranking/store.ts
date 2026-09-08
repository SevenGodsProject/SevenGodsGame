import { RULES } from './deps'
import type { RunTicket, TicketClosedReason } from './ticket'
import { consumesAttempt } from './ticket'
import type { RankingRun } from './types'

/**
 * Phase 4.3〜4.6：保存層のポート（差し替え可能な口）。
 *
 * 実体は2つある：
 *   - `createMemoryRankingStore()`：テストとローカル開発用
 *   - `createPostgresRankingStore(sql)`：Neon/Postgres 用（`postgresStore.ts`）
 * どちらも同じ意味論を守る。呼び出し側（`startRun` / `submitRun` / `getLeaderboard`）は
 * どちらを渡されても同じ挙動になる。
 *
 * ★Phase 4.4 での変更点（Known Risk #3 の解消）
 * 「回数を数えてから挿入する」だけでは、2つの提出が同時に来たとき
 * どちらも「今2件だから3件目にできる」と判断して4件入りうる。
 * そこで **挿入そのものを最終権限にする**。
 *
 * ★Phase 4.6 での変更点（決定139 §10）
 * 枠を数える主体が run から **ticket** へ移った。`insertTicket` が上限判定の最終権限で、
 * `insertRun` は「ticketが確保した番号に1件だけ入る」ことを保証する役になる。
 * 判定はどちらもDB側の制約（CHECK / 部分UNIQUE / PRIMARY KEY）が不可分に行い、
 * ロックもトランザクションも要らない（`schema.ts`）。
 */

export type InsertRunResult =
  | { ok: true; attemptNo: number }
  /** 同じ `clientRunId` が既に登録済み */
  | { ok: false; reason: 'duplicate' }
  /** その ticket の番号に既に別の run が入っている（同一ticketへの同時提出） */
  | { ok: false; reason: 'attempt-taken' }

export type InsertTicketResult =
  | { ok: true }
  /** 同じ `clientRunId` の ticket が既にある（通信断後の再送が並走した） */
  | { ok: false; reason: 'duplicate-run-id' }
  /** その番号は既に使われている（並列startで競り負けた） */
  | { ok: false; reason: 'attempt-taken' }
  /** 1日の上限に達している */
  | { ok: false; reason: 'attempts-exceeded' }

export interface RankingStore {
  // --- その日の版（day-lock。決定139 §5） ---
  /**
   * その日に最初に記録された `gameVersion` を返す。未記録なら `gameVersion` を記録して返す。
   * **既に別の版が記録されていれば、その古い版を返す**（呼び出し側が不一致を検出する）。
   */
  lockDayVersion(dailyKey: string, gameVersion: string): Promise<string>

  // --- ticket（枠の予約。決定139 §10） ---
  findTicket(dailyKey: string, clientRunId: string): Promise<RunTicket | null>
  listTickets(dailyKey: string, playerId: string): Promise<RunTicket[]>
  /** ticketを1件足す。**1日の上限判定はここが最終権限** */
  insertTicket(ticket: RunTicket): Promise<InsertTicketResult>
  /** ticketを閉じる。既に閉じているticketは変更しない（最初の理由が残る） */
  closeTicket(dailyKey: string, clientRunId: string, reason: TicketClosedReason): Promise<void>

  // --- run（検証済みの結果） ---
  /** 同じrunが既に受理済みか（冪等な再送の判定に使う） */
  findRun(dailyKey: string, clientRunId: string): Promise<RankingRun | null>
  /** その日そのプレイヤーが既に受理された分 */
  listPlayerRuns(dailyKey: string, playerId: string): Promise<RankingRun[]>
  /** 受理したrunを1件足す。番号は ticket が決めたものを使う */
  insertRun(run: RankingRun): Promise<InsertRunResult>
  /** その日の全run（リーダーボードの材料） */
  listDayRuns(dailyKey: string): Promise<RankingRun[]>

  // --- 提出試行のレート制限 ---
  /** 提出**試行**の回数（受理・拒否とも数える。総当たり対策） */
  countAttempts(dailyKey: string, playerId: string): Promise<number>
  /** 提出試行を1回数える */
  recordAttempt(dailyKey: string, playerId: string): Promise<void>

  // --- 運用 ---
  /** `cutoffDailyKey` より**古い**日のデータを消す（外部cronを持ち込まないための剪定） */
  pruneBefore(cutoffDailyKey: string): Promise<void>
}

/**
 * メモリ実装。テストとローカル開発用で、プロセスが落ちれば消える。
 *
 * Postgres実装と**同じ意味論**を持たせてある：挿入系は `await` を挟まない同期区間で
 * 判定と書き込みを終える。JSは単一スレッドなので、await の無い区間は不可分に実行される
 * ＝Postgres側の「1文のINSERTが制約で不可分に判定する」と同じになる。
 */
export function createMemoryRankingStore(): RankingStore & { clear(): void } {
  const runs: RankingRun[] = []
  const tickets: RunTicket[] = []
  const dayVersions = new Map<string, string>()
  const attempts = new Map<string, number>()
  const key = (dailyKey: string, playerId: string) => `${dailyKey} ${playerId}`

  return {
    clear() {
      runs.length = 0
      tickets.length = 0
      dayVersions.clear()
      attempts.clear()
    },

    async lockDayVersion(dailyKey, gameVersion) {
      const existing = dayVersions.get(dailyKey)
      if (existing !== undefined) return existing
      dayVersions.set(dailyKey, gameVersion)
      return gameVersion
    },

    async findTicket(dailyKey, clientRunId) {
      const found = tickets.find((t) => t.dailyKey === dailyKey && t.clientRunId === clientRunId)
      return found ? { ...found } : null
    },

    async listTickets(dailyKey, playerId) {
      return tickets
        .filter((t) => t.dailyKey === dailyKey && t.playerId === playerId)
        .map((t) => ({ ...t }))
    },

    async insertTicket(ticket) {
      // ここから下は同期処理で完結させる（await を挟まない）
      if (ticket.attemptNo < 1 || ticket.attemptNo > RULES.daily.attemptsPerDay) {
        return { ok: false, reason: 'attempts-exceeded' }
      }
      const duplicate = tickets.some(
        (t) => t.dailyKey === ticket.dailyKey && t.clientRunId === ticket.clientRunId,
      )
      if (duplicate) return { ok: false, reason: 'duplicate-run-id' }
      // `voided` は番号を返還するので、衝突の対象から外す（＝部分UNIQUE）
      const taken = tickets.some(
        (t) =>
          t.dailyKey === ticket.dailyKey &&
          t.playerId === ticket.playerId &&
          t.attemptNo === ticket.attemptNo &&
          consumesAttempt(t),
      )
      if (taken) return { ok: false, reason: 'attempt-taken' }
      tickets.push({ ...ticket })
      return { ok: true }
    },

    async closeTicket(dailyKey, clientRunId, reason) {
      const found = tickets.find((t) => t.dailyKey === dailyKey && t.clientRunId === clientRunId)
      if (found && !found.closedReason) found.closedReason = reason
    },

    async findRun(dailyKey, clientRunId) {
      const found = runs.find((r) => r.dailyKey === dailyKey && r.clientRunId === clientRunId)
      return found ? { ...found } : null
    },

    async listPlayerRuns(dailyKey, playerId) {
      return runs
        .filter((r) => r.dailyKey === dailyKey && r.playerId === playerId)
        .map((r) => ({ ...r }))
    },

    async insertRun(run) {
      const duplicate = runs.some(
        (r) => r.dailyKey === run.dailyKey && r.clientRunId === run.clientRunId,
      )
      if (duplicate) return { ok: false, reason: 'duplicate' }
      const taken = runs.some(
        (r) =>
          r.dailyKey === run.dailyKey &&
          r.playerId === run.playerId &&
          r.attemptNo === run.attemptNo,
      )
      if (taken) return { ok: false, reason: 'attempt-taken' }
      runs.push({ ...run })
      return { ok: true, attemptNo: run.attemptNo }
    },

    async listDayRuns(dailyKey) {
      return runs.filter((r) => r.dailyKey === dailyKey).map((r) => ({ ...r }))
    },

    async countAttempts(dailyKey, playerId) {
      return attempts.get(key(dailyKey, playerId)) ?? 0
    },

    async recordAttempt(dailyKey, playerId) {
      const k = key(dailyKey, playerId)
      attempts.set(k, (attempts.get(k) ?? 0) + 1)
    },

    async pruneBefore(cutoffDailyKey) {
      // 日付キーは固定長 `YYYY-MM-DD` なので辞書順＝時系列順
      for (let i = runs.length - 1; i >= 0; i--) {
        if (runs[i].dailyKey < cutoffDailyKey) runs.splice(i, 1)
      }
      for (let i = tickets.length - 1; i >= 0; i--) {
        if (tickets[i].dailyKey < cutoffDailyKey) tickets.splice(i, 1)
      }
      for (const dailyKey of [...dayVersions.keys()]) {
        if (dailyKey < cutoffDailyKey) dayVersions.delete(dailyKey)
      }
      for (const k of [...attempts.keys()]) {
        if (k.slice(0, cutoffDailyKey.length) < cutoffDailyKey) attempts.delete(k)
      }
    },
  }
}

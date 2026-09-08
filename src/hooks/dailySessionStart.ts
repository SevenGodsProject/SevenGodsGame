import { RULES } from '../core/data/rules'
import { createClientRunId } from './clientRunId'
import { startRankedRun, type RankingClientOptions, type UnrankedReason } from './rankingClient'
import type { DailyRunSession } from './useGameEngine'

/**
 * Phase 4.6（決定139 §8・§12）：神域挑戦を始めるまでの段取り。
 *
 * 本番の順序は **start（枠の予約）→ ticketの控え → START_GAME**。
 * その最初の2つをここに閉じ込め、UI（`GameFlow`）は結果を受け取って
 * `startDailyGame` を呼ぶだけにする。React に依存しないので単体で検証できる。
 *
 * ★ゲーム本体を止めない
 * サーバーが落ちていても、kill switch が閉じていても、**Dailyは遊べる**。
 * その場合 `ranked: false` になり、UIが「ランキング対象外」を明示する。
 * ゲームを遊べなくする理由になるのは「サーバーが枠切れと言った」ときだけで、
 * これはランキングの公平性そのもの（1日3回勝負）だから止める必要がある。
 *
 * ★日付はサーバーが決める
 * デッキを組んでいる間にJSTの日付が変わることがある。ticketが返す `dailyKey` を
 * 正として扱えば、端末時計のずれでも日跨ぎでも「開始した日」と「提出先の日」がずれない。
 */

export type DailyStartPlan = {
  /** `startDailyGame` へ渡す。null なら識別子を作れなかった（記録・提出ができないrun） */
  session: DailyRunSession | null
  /** 実際に開始すべき日付キー。ランキング対象ならサーバーが決めた値 */
  dailyKey: string
  /** ランキング対象でない理由。null ならランキング対象 */
  unrankedReason: UnrankedReason | null
  /**
   * 開始してはいけない。サーバーが「本日の挑戦回数を使い切っている」と答えた場合だけ true。
   * 通信できない場合は **false**（＝遊べる。ランキングに載らないだけ）。
   */
  blocked: boolean
}

/**
 * 神域挑戦の開始準備。
 *
 * @param fallbackDailyKey ランキング対象にならなかった場合に使う日付キー（端末時計基準）
 */
export async function prepareDailyStart(
  fallbackDailyKey: string,
  options: RankingClientOptions = {},
): Promise<DailyStartPlan> {
  let clientRunId: string
  try {
    clientRunId = createClientRunId()
  } catch {
    // 安全な乱数が無い環境。記録も提出もできないが、対局そのものは妨げない
    return { session: null, dailyKey: fallbackDailyKey, unrankedReason: 'identity', blocked: false }
  }

  // kill switch が閉じている間は通信しない（`startRankedRun` が即 disabled を返す）
  const started = await startRankedRun(clientRunId, options)

  if (started.ranked) {
    return {
      session: { clientRunId, ranked: true },
      dailyKey: started.ticket.dailyKey,
      unrankedReason: null,
      blocked: false,
    }
  }

  return {
    session: { clientRunId, ranked: false },
    dailyKey: fallbackDailyKey,
    unrankedReason: started.reason,
    // ★枠切れのときだけ止める。通信障害では止めない
    blocked: started.reason === 'attempts-exceeded',
  }
}

/**
 * 「ランキング対象外」の理由をプレイヤーに説明する文言。
 * 責める言い方をせず、**遊べること**と**記録が残らないこと**の両方を必ず伝える。
 */
export function unrankedMessage(reason: UnrankedReason): string {
  switch (reason) {
    case 'disabled':
      return 'ランキングは準備中です。神域挑戦はいつもどおり遊べます'
    case 'unavailable':
      return 'ランキングサーバーに接続できませんでした。この挑戦は記録されませんが、そのまま遊べます'
    case 'attempts-exceeded':
      return '本日の神域挑戦は3回すべて終えています'
    case 'version-locked':
      return 'ゲームが更新されました。本日ぶんのランキングは日付が変わってから再開します（挑戦は記録されません）'
    case 'identity':
      return 'この環境では挑戦を記録できません。ランキング対象外として遊べます'
  }
}

/**
 * 挑戦を始める前に見せる注意文。**枠を失う条件を、失う前に伝える**（決定139 §12）。
 * ランキング対象でないときは何も出さない（消費する枠が無いため）。
 */
export function rankedStartNotice(attemptsLeft: number): string {
  return [
    `神域挑戦を始めると、本日の残り${attemptsLeft}回のうち1回を使います。`,
    `始めたあとは、途中でやめても・別の挑戦を始めても・${RULES.ranking.ticketTtlMinutes}分を過ぎても、この1回は戻りません。`,
  ].join('')
}

import { RULES, getGameVersion, isValidDailyKey, runReplay } from './deps.js'
import { verifyIdentity } from './identity.js'
import type { RankingStore } from './store.js'
import { ticketStateOf } from './ticket.js'
import type { RankingRun, SubmitRejectionCode, SubmitRequest, SubmitResult } from './types.js'

/**
 * Phase 4.3〜4.6：提出の受理。**ここがランキングの信頼の全て**。
 *
 * 手順は次の順序で、途中で落ちたら以降は行わない。
 * 順序そのものが乱用対策になっている（決定139 §7-2）——**高コストな処理と
 * DBへの書き込みは、身元とticketを確かめたあとにしか起こらない**：
 *
 *   1. 身元の照合（秘密のハッシュが公開IDと一致するか）  … 読み書きゼロ
 *   2. ticket の存在（無ければ拒否）                      … 読み取り1回・書き込みゼロ
 *   3. 冪等判定（受理済みの再送は、枠も試行回数も消費しない）
 *   4. ticket が閉じている／期限切れ
 *   5. 版の一致（不一致なら `voided` にして**枠を返す**）
 *   6. 提出試行のレート制限                                … ここで初めて書く
 *   7. **本番エンジンでリプレイ**して結果を計算する         … 最も高コスト
 *   8. 保存
 *
 * ★Phase 4.6 での変更点
 * - `playerSecret` が必須になった。公開IDだけでは他人になりすませない（決定139 T1）
 * - ticket が必須になった。枠を消費するのは開始時なので、ここでは「その枠が
 *   有効か」を見るだけでよく、上限の数え直しは要らない
 * - `STALE_DAILY_KEY` は廃止。日付の正しさは ticket の存在そのものが表す
 *   （別日を名乗れば ticket が見つからず `NO_TICKET`）。端末時計は判定に使わない
 *
 * ★冪等判定をレート制限より先に置く理由（Phase 4.3から不変）
 * 送信に成功したがレスポンスを受け取れなかったクライアントは、同じ `clientRunId` で
 * 再送する。これを「試行」として数えると、通信が不安定な人ほど枠を失う。
 *
 * ★時刻の扱い
 * `now` を引数で受け取る（`new Date()` を内部で呼ばない）。テストで固定でき、
 * サーバーの実装が決定論的になるため。
 */

export type SubmitDeps = {
  store: RankingStore
  /** 現在時刻（ミリ秒）。ticketの期限判定と `submittedAt` に使う */
  now: number
  /** 現在deployされているコードの版。既定は `getGameVersion()`（テストで注入できる） */
  gameVersion?: string
}

const HEX_RUN_ID = /^[0-9a-f-]{32,36}$/

function reject(code: SubmitRejectionCode, message: string, replayCode?: string): SubmitResult {
  return { ok: false, code, message, ...(replayCode ? { replayCode } : {}) }
}

export async function submitRun(request: SubmitRequest, deps: SubmitDeps): Promise<SubmitResult> {
  const { store, now } = deps
  const gameVersion = deps.gameVersion ?? getGameVersion()

  // --- 1. 身元 ---
  if (typeof request.clientRunId !== 'string' || !HEX_RUN_ID.test(request.clientRunId)) {
    return reject('BAD_IDENTITY', '識別子の形式が不正です')
  }
  if (!(await verifyIdentity(request.playerId, request.playerSecret))) {
    return reject('BAD_IDENTITY', '身元を確認できませんでした')
  }
  if (!request.input || typeof request.input !== 'object') {
    return reject('REPLAY_REJECTED', 'リプレイ入力がありません', 'MALFORMED')
  }
  const dailyKey = request.input.dailyKey
  if (typeof dailyKey !== 'string' || !isValidDailyKey(dailyKey)) {
    return reject('REPLAY_REJECTED', '日付キーが不正です', 'DAILY_KEY')
  }

  // --- 2. ticket（無ければ、ここから先は何も起こさない） ---
  // 挑戦を開始していない・別の日を名乗った・端末時計を偽装した——すべてここで止まる。
  const ticket = await store.findTicket(dailyKey, request.clientRunId)
  if (!ticket) {
    return reject('NO_TICKET', 'この挑戦は開始が記録されていません')
  }
  if (ticket.playerId !== request.playerId) {
    return reject('BAD_IDENTITY', 'この挑戦は別のプレイヤーのものです')
  }

  // --- 3. 冪等判定（再送は枠も試行回数も消費しない） ---
  const existing = await store.findRun(dailyKey, request.clientRunId)
  if (existing) {
    // 再送であっても**必ず再検証する**。同じIDで中身だけ差し替える攻撃を
    // 「冪等だから」で素通しさせないため。結果が保存済みと一致して初めて
    // 「同じrunの再送」と認める
    const replayed = runReplay(request.input)
    if (!replayed.ok) {
      return reject('REPLAY_REJECTED', replayed.message, replayed.code)
    }
    if (
      replayed.outcome.score !== existing.score ||
      replayed.outcome.rngCursor !== existing.rngCursor ||
      replayed.outcome.godId !== existing.godId
    ) {
      return reject('RUN_ID_CONFLICT', '同じ挑戦IDで別の内容が提出されました')
    }
    const runs = await store.listPlayerRuns(dailyKey, request.playerId)
    return {
      ok: true,
      accepted: 'duplicate',
      outcome: replayed.outcome,
      run: existing,
      bestScore: Math.max(...runs.map((r) => r.score)),
      runsUsed: runs.length,
    }
  }

  // --- 4. ticketの状態 ---
  const state = ticketStateOf(ticket, false, now)
  if (state === 'abandoned' || state === 'voided') {
    return reject('TICKET_CLOSED', 'この挑戦は既に終了しています')
  }
  if (state === 'expired') {
    return reject('TICKET_EXPIRED', 'この挑戦は提出期限を過ぎています')
  }

  // --- 5. 版の一致（day-lock。決定139 §5） ---
  if (ticket.gameVersion !== gameVersion) {
    // 開始してから遊んでいる間にランキング影響のある更新が入った。
    // 同じボードへ違う条件の結果を混ぜられないので受理はできないが、
    // **プレイヤーの落ち度ではない**ので枠は返す（voided＝番号を返還）
    await store.closeTicket(dailyKey, request.clientRunId, 'voided')
    return reject(
      'RULES_VERSION_MISMATCH',
      'ゲームが更新されたため、この挑戦は記録できません（挑戦回数は消費されません）',
    )
  }

  // --- 6. 提出試行のレート制限（ここで初めてDBへ書く） ---
  const attempts = await store.countAttempts(dailyKey, request.playerId)
  if (attempts >= RULES.ranking.maxSubmitAttemptsPerDay) {
    return reject('RATE_LIMITED', '本日の提出回数の上限に達しました')
  }
  await store.recordAttempt(dailyKey, request.playerId)

  // --- 7. 本番エンジンでリプレイして結果を計算する ---
  // クライアントの申告は一切参照しない（そもそも入力に存在しない）
  const replayed = runReplay(request.input)
  if (!replayed.ok) {
    return reject('REPLAY_REJECTED', replayed.message, replayed.code)
  }

  // --- 8. 保存（保存するのは計算値だけ／番号は ticket が決めたもの） ---
  const run: RankingRun = {
    dailyKey,
    playerId: request.playerId,
    clientRunId: request.clientRunId,
    attemptNo: ticket.attemptNo,
    gameVersion,
    godId: replayed.outcome.godId,
    score: replayed.outcome.score,
    win: replayed.outcome.win,
    round: replayed.outcome.round,
    rngCursor: replayed.outcome.rngCursor,
    actionCount: replayed.outcome.actionCount,
    submittedAt: now,
  }
  const inserted = await store.insertRun(run)
  if (!inserted.ok) {
    // 同じticketへの同時提出で競り負けた＝相手の登録が正。冪等な再送として扱う
    const stored = await store.findRun(dailyKey, request.clientRunId)
    if (!stored || stored.score !== replayed.outcome.score) {
      return reject('RUN_ID_CONFLICT', '挑戦の登録に失敗しました')
    }
    const runs = await store.listPlayerRuns(dailyKey, request.playerId)
    return {
      ok: true,
      accepted: 'duplicate',
      outcome: replayed.outcome,
      run: stored,
      bestScore: Math.max(...runs.map((r) => r.score)),
      runsUsed: runs.length,
    }
  }

  const runs = await store.listPlayerRuns(dailyKey, request.playerId)
  return {
    ok: true,
    accepted: 'stored',
    outcome: replayed.outcome,
    run,
    bestScore: Math.max(...runs.map((r) => r.score)),
    runsUsed: runs.length,
  }
}

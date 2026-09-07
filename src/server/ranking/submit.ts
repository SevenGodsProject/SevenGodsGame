import { RULES, dailyKeyOf, isValidDailyKey, runReplay } from './deps'
import type { RankingStore } from './store'
import type { RankingRun, SubmitRejectionCode, SubmitRequest, SubmitResult } from './types'

/**
 * Phase 4.3：提出の受理。**ここがランキングの信頼の全て**。
 *
 * 手順は次の順序で、途中で落ちたら以降は行わない：
 *   1. 身元の形式検査（乱数IDの形をしているか）
 *   2. 冪等判定（同じ `clientRunId` が既にあれば、保存を増やさず同じ結果を返す）
 *   3. 提出試行のレート制限
 *   4. 日付の検査（今日のDaily以外は受け付けない）
 *   5. **本番エンジンでリプレイ**して結果を計算する
 *   6. 1日の挑戦回数（`RULES.daily.attemptsPerDay`）の検査
 *   7. 保存
 *
 * ★冪等判定をレート制限より先に置く理由
 * 送信に成功したがレスポンスを受け取れなかったクライアントは、同じ `clientRunId` で
 * 再送する（Phase 4.2 の設計）。これを「試行」として数えると、通信が不安定な人ほど
 * 枠を失う。既に受理済みのrunの再送は**枠を消費しない**。
 *
 * ★時刻の扱い
 * `now` を引数で受け取る（`new Date()` を内部で呼ばない）。テストで固定でき、
 * サーバーの実装が決定論的になるため。`dailyKeyOf` は core と同じJST基準。
 */

export type SubmitDeps = {
  store: RankingStore
  /** 現在時刻（ミリ秒）。JSTの日付キーの算出と `submittedAt` に使う */
  now: number
}

const HEX_ID = /^[0-9a-f-]{32,36}$/

function reject(code: SubmitRejectionCode, message: string, replayCode?: string): SubmitResult {
  return { ok: false, code, message, ...(replayCode ? { replayCode } : {}) }
}

export async function submitRun(
  request: SubmitRequest,
  deps: SubmitDeps,
): Promise<SubmitResult> {
  const { store, now } = deps

  // --- 1. 身元の形式検査 ---
  // 受け取るのは端末生成の乱数IDだけ。氏名・メール等は形式的にも受け付けない
  if (
    typeof request.playerId !== 'string' ||
    !HEX_ID.test(request.playerId) ||
    typeof request.clientRunId !== 'string' ||
    !HEX_ID.test(request.clientRunId)
  ) {
    return reject('BAD_IDENTITY', '識別子の形式が不正です')
  }
  if (!request.input || typeof request.input !== 'object') {
    return reject('REPLAY_REJECTED', 'リプレイ入力がありません', 'MALFORMED')
  }
  const dailyKey = request.input.dailyKey
  if (typeof dailyKey !== 'string' || !isValidDailyKey(dailyKey)) {
    return reject('REPLAY_REJECTED', '日付キーが不正です', 'DAILY_KEY')
  }

  // --- 2. 冪等判定（再送は枠を消費しない） ---
  const existing = await store.findRun(dailyKey, request.clientRunId)
  if (existing) {
    if (existing.playerId !== request.playerId) {
      // 他人のrun IDを名乗る提出。受理も上書きもしない
      return reject('BAD_IDENTITY', 'この挑戦は別のプレイヤーのものです')
    }
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

  // --- 3. 提出試行のレート制限 ---
  const attempts = await store.countAttempts(dailyKey, request.playerId)
  if (attempts >= RULES.ranking.maxSubmitAttemptsPerDay) {
    return reject('RATE_LIMITED', '本日の提出回数の上限に達しました')
  }
  await store.recordAttempt(dailyKey, request.playerId)

  // --- 4. 今日のDailyか ---
  // 過去日のリプレイを後から作って提出することを防ぐ。seedは公開情報なので、
  // 日付を絞らないと「昨日の敵を今日じっくり最適化して出す」ができてしまう
  if (dailyKey !== dailyKeyOf(new Date(now))) {
    return reject('STALE_DAILY_KEY', '本日の神域挑戦ではありません')
  }

  // --- 5. 本番エンジンでリプレイして結果を計算する ---
  // クライアントの申告は一切参照しない（そもそも入力に存在しない）
  const replayed = runReplay(request.input)
  if (!replayed.ok) {
    return reject('REPLAY_REJECTED', replayed.message, replayed.code)
  }

  // --- 6. 1日の挑戦回数 ---
  const priorRuns = await store.listPlayerRuns(dailyKey, request.playerId)
  if (priorRuns.length >= RULES.daily.attemptsPerDay) {
    return reject('ATTEMPTS_EXCEEDED', '本日の挑戦回数を使い切っています')
  }

  // --- 7. 保存（保存するのは計算値だけ） ---
  const run: RankingRun = {
    dailyKey,
    playerId: request.playerId,
    clientRunId: request.clientRunId,
    godId: replayed.outcome.godId,
    score: replayed.outcome.score,
    win: replayed.outcome.win,
    round: replayed.outcome.round,
    rngCursor: replayed.outcome.rngCursor,
    actionCount: replayed.outcome.actionCount,
    submittedAt: now,
  }
  await store.insertRun(run)

  const runs = [...priorRuns, run]
  return {
    ok: true,
    accepted: 'stored',
    outcome: replayed.outcome,
    run,
    bestScore: Math.max(...runs.map((r) => r.score)),
    runsUsed: runs.length,
  }
}

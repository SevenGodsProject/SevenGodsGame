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
 *   6. 1日の挑戦回数の**事前**判定（速い経路。権限はここではない）
 *   7. 保存 ——**ここが上限判定の最終権限**
 *
 * ★Phase 4.4：「countしてからinsert」に依存しない（Known Risk #3の解消）
 * 6の事前判定だけに頼ると、2つの提出が同時に来たときどちらも
 * 「今2件だから3件目にできる」と判断して4件入りうる。そこで最終判定は
 * `store.insertRun` の戻り値に委ね、`attempts-exceeded` が返ったら
 * 事前判定を通っていても拒否する。Postgres実装ではDBのCHECK制約と
 * UNIQUE制約がこれを不可分に保証する（`schema.ts`）。
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

  // --- 6. 1日の挑戦回数（事前判定：無駄な書き込みを避けるための速い経路） ---
  const priorRuns = await store.listPlayerRuns(dailyKey, request.playerId)
  if (priorRuns.length >= RULES.daily.attemptsPerDay) {
    return reject('ATTEMPTS_EXCEEDED', '本日の挑戦回数を使い切っています')
  }

  // --- 7. 保存（保存するのは計算値だけ／ここが上限判定の最終権限） ---
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
  const inserted = await store.insertRun(run)
  if (!inserted.ok) {
    // 事前判定を通ったあとで競り負けた／同じIDが差し込まれた場合はここで確定する
    if (inserted.reason === 'attempts-exceeded') {
      return reject('ATTEMPTS_EXCEEDED', '本日の挑戦回数を使い切っています')
    }
    // 同時に同じclientRunIdが入った＝相手の登録が正。冪等な再送として扱う
    const stored = await store.findRun(dailyKey, request.clientRunId)
    if (!stored) return reject('RUN_ID_CONFLICT', '挑戦の登録に失敗しました')
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

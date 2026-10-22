/**
 * Phase 7 Entrance E1（決定193・仕様 §6）：Home の金色の Primary CTA を 1 つだけ決める純粋関数。
 *
 * 上から順に評価し、最初に成立した状態を採る：
 *   A resume      … 続きがある（`canResume`。未知の敵を含む保存では false＝決定191）      →「続きから」
 *   B firstBattle … プレイの痕跡が無い                                                    →「初陣へ」
 *   C' (normal)   … 痕跡が「初陣 1 戦まで」（`isFirstBattleOnly`）                           →「神を選ぶ」
 *   D daily       … 今日の神域挑戦がまだ手つかず（P1 Next Goal N4 と同じ条件）             →「神域へ挑む」
 *   C normal      … 上記以外                                                              →「神を選ぶ」
 *
 * Daily を強制しない：1 回でも挑戦した日は D にならない（Today ブロックの CTA からはいつでも行ける）。
 * この関数は画面の選択肢を決めるだけで、回数の消費・保存は一切しない。
 *
 * v1.0.3 束 #3（`docs/NEXT_QUALITY_IMPROVEMENT_PLAN_V1.md` §5-3・AI 判断）：C' を B と D の間に 1 つ挿入した。
 * 旧順序では初陣（★1）を終えた直後の 1 回だけ、必ず最高難度の神域（DAILY ★★★★★）が金色の Primary になり、
 * 「Daily を強制しない」（決定193 §6）の趣旨と食い違っていた。C' は状態値を増やさず既存の 'normal'（「神を選ぶ」）を返す。
 * Daily の semantics（同日同 Seed・3 回・開始時消費）と Today ブロック CTA（決定187 N4 の到達経路）は不変。
 */
export type HomePrimaryState = 'resume' | 'firstBattle' | 'daily' | 'normal'

export type PlayTraceInput = {
  /** 保存済みの進行中バトルがあるか（Resume を出せない壊れた保存も「痕跡あり」に数える） */
  hasSavedBattle: boolean
  /** 7 神それぞれの戦績（勝ち・負け・未撃破の回数） */
  godRecords: readonly { wins: number; losses: number; finished: number }[]
  /** 最後にデッキを確定した神（無ければ null） */
  lastUsedGodId: string | null
  /** 保存されている神域挑戦の各日の挑戦回数 */
  dailyAttemptsUsed: readonly number[]
}

/** 仕様 §6：「プレイの痕跡が無い」の定義。`tutorialSeen` は条件に使わない */
export function hasPlayTrace(input: PlayTraceInput): boolean {
  if (input.hasSavedBattle) return true
  if (input.godRecords.some((r) => r.wins + r.losses + r.finished > 0)) return true
  if (input.lastUsedGodId !== null) return true
  return input.dailyAttemptsUsed.some((n) => n > 0)
}

/**
 * v1.0.3 束 #3：「初陣 1 戦まで」の定義（C' の条件）。決着した対局（勝ち＋負け＋未撃破）が合計 1 以下で、
 * 神域挑戦が一度も無く、進行中の保存バトルも無い。`lastUsedGodId` は見ない（デッキを確定しただけでは 2 戦目に数えない）。
 * 旧セーブ（v1.0.0／v1.0.1）でも `godRecords` の読み取りだけで決まる（書き込み・version 変更なし）。
 */
export function isFirstBattleOnly(input: PlayTraceInput): boolean {
  if (input.hasSavedBattle) return false
  if (input.dailyAttemptsUsed.some((n) => n > 0)) return false
  const battles = input.godRecords.reduce((sum, r) => sum + r.wins + r.losses + r.finished, 0)
  return battles <= 1
}

export type HomePrimaryInput = {
  canResume: boolean
  playTrace: boolean
  /** v1.0.3 束 #3：痕跡が「初陣 1 戦まで」なら Daily を Primary にしない（`isFirstBattleOnly` の結果） */
  firstBattleOnly: boolean
  todayAttemptsUsed: number
  todayAttemptsLeft: number
}

export function selectHomePrimary(input: HomePrimaryInput): HomePrimaryState {
  if (input.canResume) return 'resume'
  if (!input.playTrace) return 'firstBattle'
  // C'（v1.0.3 束 #3）：初陣 1 戦まで → 2 戦目は「神を選ぶ」。Daily は Today ブロックの CTA から到達できる
  if (input.firstBattleOnly) return 'normal'
  if (input.todayAttemptsUsed === 0 && input.todayAttemptsLeft > 0) return 'daily'
  return 'normal'
}

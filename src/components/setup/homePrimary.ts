/**
 * Phase 7 Entrance E1（決定193・仕様 §6）：Home の金色の Primary CTA を 1 つだけ決める純粋関数。
 *
 * 上から順に評価し、最初に成立した状態を採る：
 *   A resume      … 続きがある（`canResume`。未知の敵を含む保存では false＝決定191）      →「続きから」
 *   B firstBattle … プレイの痕跡が無い                                                    →「初陣へ」
 *   D daily       … 今日の神域挑戦がまだ手つかず（P1 Next Goal N4 と同じ条件）             →「神域へ挑む」
 *   C normal      … 上記以外                                                              →「神を選ぶ」
 *
 * Daily を強制しない：1 回でも挑戦した日は D にならない（Today ブロックの CTA からはいつでも行ける）。
 * この関数は画面の選択肢を決めるだけで、回数の消費・保存は一切しない。
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

export type HomePrimaryInput = {
  canResume: boolean
  playTrace: boolean
  todayAttemptsUsed: number
  todayAttemptsLeft: number
}

export function selectHomePrimary(input: HomePrimaryInput): HomePrimaryState {
  if (input.canResume) return 'resume'
  if (!input.playTrace) return 'firstBattle'
  if (input.todayAttemptsUsed === 0 && input.todayAttemptsLeft > 0) return 'daily'
  return 'normal'
}

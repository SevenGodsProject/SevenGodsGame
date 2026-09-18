import type { GameMode, GameStatus } from '../../core/types'

/**
 * 決定196（Solve Loop v1）：再戦の意味を 1 か所で決める純関数。
 *
 * ## なぜ必要か
 *
 * 通常戦で負けたあと、結果画面の「次の目標」は N1「○○を撃破する」と出る。
 * ところが押した先は新しい seed だったため、初期手札と山札の並びが入れ替わり、
 * **敗因を検証する前に問題そのものが差し替わっていた**（決定195 §8）。
 * これでは
 *
 *   Failure → Observation → Hypothesis → Same-condition Retry → Learning → Solve
 *
 * のうち Hypothesis と Retry が繋がらない。
 *
 * ## 規則
 *
 * - **通常戦で敗北・未撃破**（`lost` / `finished`）→ **同じ盤面**（同じ seed）で再戦する
 * - **勝利** → 従来どおり新しい seed。勝った盤面を固定して反復させない
 * - **神域挑戦（Daily）** → `startDailyGame` の既存経路のまま。seed の意味論には一切触れない
 *   （同日共有 seed・1日3回・JSTリセット。決定196 はここを変更しない）
 *
 * 「敗北のときだけ」に限ったのは、同じ盤面の固定が学習のためであって作業のためではないから。
 * 勝てばその盤面は解けている＝次は新しい問題に進む、という往復で暗記化は自然に終わる。
 *
 * 逃げ道は既存の出口がそのまま持っている：「デッキを調整」「神・デッキを選び直す」は
 * どちらも新しい seed で始まるため、詰んだ盤面に閉じ込められることはない。
 */
export type RematchContext = {
  /** 省略（undefined）は決定29以前の旧セーブ由来＝通常モードとして扱う */
  mode: GameMode | undefined
  status: GameStatus
}

/** この決着からの再戦を「同じ盤面（同じ seed）」にするか */
export function isSameBoardRematch(ctx: RematchContext): boolean {
  if ((ctx.mode ?? 'normal') !== 'normal') return false
  return ctx.status === 'lost' || ctx.status === 'finished'
}

/**
 * 再戦で引き継ぐ seed。`undefined` を返したときは呼び出し側が従来どおり
 * 新しい seed を発行する（＝勝利後・神域挑戦は現行挙動のまま）。
 */
export function resolveRematchSeed(ctx: RematchContext & { seed: string }): string | undefined {
  return isSameBoardRematch(ctx) ? ctx.seed : undefined
}

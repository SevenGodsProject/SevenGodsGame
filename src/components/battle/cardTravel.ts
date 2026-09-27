/**
 * Card Travel v1「神へ捧げる」（docs/CARD_PLAY_TRAVEL_PRE_AUDIT.md §5〜§6）。
 *
 * 出したカードの複製（ゴースト）を手札の外へ出し、神の立ち絵の胸元へ飛ばして吸い込ませるための
 * 純粋関数と定数。DOM には触れない（DOM 側は useCardTravel.ts）。
 *
 * - 時刻はタップ＝0ms。commit（useGameEngine の CARD_PLAY_REVEAL_MS 280）の 40ms 前に必ず終わる
 *   ＝入力ロック・着弾時刻・神の突きの時刻表（決定162／232）は変えない
 * - rules.ts に置かない理由：ゲーム数値ではなく演出の時刻・距離（HIT_STOP_MS 等と同じ扱い）
 */

/** 出したカードが神へ届くまで。commit（CARD_PLAY_REVEAL_MS 280）の 40ms 前に必ず終わる */
export const CARD_TRAVEL_MS = 240
/** 0〜60ms「掴んだ」持ち上げ */
export const CARD_TRAVEL_LIFT_PX = 16
export const CARD_TRAVEL_LIFT_SCALE = 1.1
/** 飛翔の弧の最大高さ（長距離でも暴れない） */
export const CARD_TRAVEL_ARC_MAX_PX = 40
/** 神の胸元へ着いた瞬間の大きさ（204ms） */
export const CARD_TRAVEL_MID_SCALE = 0.42
/** 吸い込まれて消える大きさ（240ms） */
export const CARD_TRAVEL_END_SCALE = 0.22
/** 神の側へ傾く最大角 */
export const CARD_TRAVEL_TILT_DEG = 10
/** 終点：神の立ち絵の中心 x・上から 45%（胸元） */
export const CARD_TRAVEL_TARGET_Y = 0.45

export type TravelRect = { left: number; top: number; width: number; height: number }

/** 飛翔の端点（テスト・計測用に keyframes と同じ式で公開） */
export type TravelVector = { dx: number; dy: number; side: 1 | -1; arc: number; s0: number }

const r2 = (n: number): number => Math.round(n * 100) / 100

/** 元カード from →神の立ち絵 to の変位。dy は from の中心から to の胸元（上から 45%）まで */
export function travelVector(from: TravelRect, baseWidth: number, to: TravelRect): TravelVector {
  const s0 = baseWidth > 0 ? from.width / baseWidth : 1
  const dx = to.left + to.width / 2 - (from.left + from.width / 2)
  const dy = to.top + to.height * CARD_TRAVEL_TARGET_Y - (from.top + from.height / 2)
  const side: 1 | -1 = dx < 0 ? -1 : 1
  const arc = Math.min(CARD_TRAVEL_ARC_MAX_PX, Math.hypot(dx, dy) * 0.1)
  return { dx: r2(dx), dy: r2(dy), side, arc: r2(arc), s0: r2(s0) }
}

/**
 * 元カードの見た目上の矩形 from（getBoundingClientRect）と、未変形の幅 baseWidth（offsetWidth）、
 * 神の立ち絵の矩形 to から、WAAPI の keyframes を作る。transform と opacity だけを使う
 * （合成スレッドで動く＝Layout／Paint を起こさない）。
 *
 * 0（0ms）持ち上げ開始 → 0.25（60ms）掴んだ → 0.55（132ms）弧の頂点を越えて加速 →
 * 0.85（204ms）神の胸元に到着 → 1（240ms）吸い込まれて消える
 */
export function planCardTravel(from: TravelRect, baseWidth: number, to: TravelRect): Keyframe[] {
  const { dx, dy, side, arc, s0 } = travelVector(from, baseWidth, to)
  const tilt = side * CARD_TRAVEL_TILT_DEG
  return [
    {
      offset: 0,
      transform: `translate(0px, 0px) scale(${s0}) rotate(0deg)`,
      opacity: 1,
      easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)',
    },
    {
      offset: 0.25,
      transform: `translate(0px, ${-CARD_TRAVEL_LIFT_PX}px) scale(${CARD_TRAVEL_LIFT_SCALE}) rotate(0deg)`,
      opacity: 1,
      easing: 'cubic-bezier(0.55, 0, 0.85, 0.35)',
    },
    {
      offset: 0.55,
      transform: `translate(${r2(dx * 0.45)}px, ${r2(dy * 0.55 - arc)}px) scale(0.78) rotate(${side * 6}deg)`,
      opacity: 1,
      easing: 'linear',
    },
    {
      offset: 0.85,
      transform: `translate(${dx}px, ${dy}px) scale(${CARD_TRAVEL_MID_SCALE}) rotate(${tilt}deg)`,
      opacity: 1,
      easing: 'linear',
    },
    {
      offset: 1,
      transform: `translate(${dx}px, ${dy}px) scale(${CARD_TRAVEL_END_SCALE}) rotate(${tilt}deg)`,
      opacity: 0,
    },
  ]
}

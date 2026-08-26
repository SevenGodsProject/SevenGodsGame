/**
 * 表示スケール（STEP-SCORE2-D2b、UX-AUDIT承認済みprototype）。
 *
 * CEO実プレイFB「攻撃力20より200のほうが攻撃した感じが出る」への対応。
 *
 * ★設計原則：内部値（GameState・rules.ts・カード効果・セーブ・ランキング記録）は
 * 一切変えない。決定109の84,000試合・STEP-SCORE2-D-PROTOの21,000試合で検証済みの
 * BASE-D内部バランスを1点も動かさず、**表示の瞬間だけ**×10する。
 *
 * 【倍率対象】damage / HP / block / heal / atk系バフ / Battle Score
 * 【対象外（絶対に×10しない）】AP・共鳴ゲージ（「7」のモチーフ）・ラウンド数・
 *   カード枚数・combo枚数・託宣回数・Mastery%・Grade
 *
 * カード本文（手書きtext）だけは表示層で変換できないため、データ側のtext文字列を
 * この倍率と一致するよう書き換えており、`cardTextScale.test.ts`が
 * 「effect値×倍率がtextに存在するか」を機械的に照合して事故を防いでいる。
 */
export const DISPLAY_SCALE = 10

/** 内部値→表示数値（×10）。カンマ区切りはformatScaledを使う */
export function scaleDisplay(value: number): number {
  return value * DISPLAY_SCALE
}

/** 内部値→表示文字列（×10＋4桁以上はカンマ区切り）。damage/HP/block/heal/スコア用 */
export function formatScaled(value: number): string {
  return (value * DISPLAY_SCALE).toLocaleString('en-US')
}

/** 表示スケール済みの値をそのままカンマ区切りにする（既に×10済みの合成値用） */
export function formatPlain(value: number): string {
  return value.toLocaleString('en-US')
}

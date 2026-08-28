/**
 * ENEMY-VFX-02：敵必殺技/連撃のpresentation timeline定数（ms）。
 * 表示・音のタイミングだけを共有する（combat計算には一切関与しない）。
 *
 * battle.cssのkeyframes・animation-delayはこの値と一致するように書かれている
 * （CSS側の該当箇所に「enemyVfxTiming.tsと一致」のコメントを付けている）。
 * JS側（フローティング数字・SE hook）はこのモジュールを直接importする。
 *
 * ■ 機工師「主砲・神滅甲」sequence（カットインと攻撃を連続させる）
 *   T+0      darken＋desaturate開始（〜180ms、完全暗転はしない）
 *   T+120    cinematic strip slide-in（portraitはKen Burns 1.00→1.06）
 *   T+400    技名peak（pop）
 *   T+870    energy flash（150ms、カットイン終端と重ねる）
 *   T+1050   カットイン終了（onAnimationEnd）→ 即BEAM発射
 *   T+1260   God着弾：impact ring＋-240（emphasis）＋hugeシェイク＋hit stop風hold
 *
 * ■ 魔獣「双牙乱撃」sequence（TEMPO-B「1・2・ドン！」採用）
 *   T+0      カットイン（同strip）
 *   T+1100   HIT1：lunge→slash A（左下→右上）→flash→-40→microシェイク
 *   T+1280   HIT2：lunge→slash B（右下→左上）→flash→-40→microシェイク
 *   （220ms＋タメ100ms）
 *   T+1600   HIT3：溜め→クロスslash（双牙X字）→大impact→-40（大）→最大シェイク＋hold
 *
 * TEMPO比較（localhost実測用に定数化。切替はMULTI_HIT_OFFSETS_MSの差し替えのみ）：
 *   TEMPO-A（等間隔・V1）      [0, 260, 520]
 *   TEMPO-B（1→2速く、3前にタメ）[0, 180, 500]  ←採用
 *   TEMPO-C（加速）            [0, 260, 440]
 */

/** 敵必殺カットインの総時間（darken→strip→flash→終了） */
export const ENEMY_CUTIN_TOTAL_MS = 1050

/** 神滅甲タイプ（kind==='special'）：着弾（ring/数字/シェイク/SE）の遅延。
 * カットイン1050ms＋ビーム到達（0.38s×55%）≒1260ms */
export const SPECIAL_IMPACT_MS = 1260

/** 連撃の各hitのoffset（TEMPO-B）。hit1/hit2/hit3の発生時刻（lead加算前） */
export const MULTI_HIT_OFFSETS_MS = [0, 180, 500] as const

/** 技名付き連撃（双牙乱撃）：カットイン後にHIT1が始まるまでのlead */
export const MULTI_CUTIN_LEAD_MS = 1100

/** hitのoffsetを取得（4hit以上は最後の間隔180msで外挿） */
export function multiHitOffsetMs(index: number): number {
  if (index < MULTI_HIT_OFFSETS_MS.length) return MULTI_HIT_OFFSETS_MS[index]
  return (
    MULTI_HIT_OFFSETS_MS[MULTI_HIT_OFFSETS_MS.length - 1] +
    (index - MULTI_HIT_OFFSETS_MS.length + 1) * 180
  )
}

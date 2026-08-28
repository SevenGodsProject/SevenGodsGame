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

/*
 * ■ 神BURST（共鳴7/7）sequence（VFX-03）
 *   combat（共鳴burst・神の一撃ダメージ・OTOMO進化）はカード使用の同一トランザクションで
 *   確定済み。ここは「見せる順番」だけを揃える（GameState・score・Masteryは不変）。
 *   T+0      共鳴7/7 → resonance cut-in（暗転→神キービジュアルslide-in、0.9s）
 *   T+900    cut-in終了（onAnimationEnd）→ React再描画（実測≒200ms）→
 *   T+1100   「✨ 神の一撃！」burst-banner（0.9s）出現
 *            ＋ 神の攻撃モーション（god-lunge 0.45s、CSS delay=BURST_GOD_ATTACK_MS）
 *   T+1260   着弾：敵側hit-shake＋slash＋フローティング数字（-360等、emphasis）＋SE
 *            （god-lungeのpeak＝35%≒160ms後）
 *   T+2000   burst-banner終了（onAnimationEnd）→ React再描画 →
 *   T+2300   「🌱 成長」evolve-banner ＋ OTOMO立ち絵を新形態へ切替（evolve-glow）
 *            ＋OTOMOリアクション＋SE（立ち絵切替はbanner keyのJSハンドオフ、SEのみ定数）
 *   VFX-03以前は数字・god-lunge・evolve-glowがT+0（暗転の下）に出ていた。
 *   ハンドオフ遅延（onAnimationEnd→setState→描画）はheadless/実機とも≒200ms前後で
 *   実測されたため、JS/CSS側の定数は「バナーより先行しない」側へ丸めてある。
 */

/** 共鳴カットインの総時間（battle.cssのresonance-cutin-timer 0.9sと一致） */
export const RESONANCE_CUTIN_MS = 900

/** burst-bannerの表示時間（battle.cssのburst-flash 0.9sと一致） */
export const BURST_BANNER_MS = 900

/** cut-in終了→burst-banner出現までのReactハンドオフ余白（実測≒190〜200ms） */
export const BURST_HANDOFF_MS = 200

/** 神の攻撃モーション開始（＝burst-banner出現と同時。CSS .god-lunge-delay-burst 1.1sと一致） */
export const BURST_GOD_ATTACK_MS = RESONANCE_CUTIN_MS + BURST_HANDOFF_MS

/** 神の一撃の着弾（敵シェイク・slash・数字・SE）。god-lunge 0.45sのpeak（35%）≒160ms後。
 * CSS .hit-delay-burst 1.26sと一致 */
export const BURST_IMPACT_MS = BURST_GOD_ATTACK_MS + 160

/** OTOMO進化の見せ場（evolve-banner出現）。立ち絵切替自体はbanner keyのハンドオフで
 * 行うためJS側はSE用（banner 0.9s＋ハンドオフ余白） */
export const BURST_EVOLVE_MS = BURST_GOD_ATTACK_MS + BURST_BANNER_MS + BURST_HANDOFF_MS + 100

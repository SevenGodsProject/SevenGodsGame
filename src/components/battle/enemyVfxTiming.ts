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
 *
 *   Phase 6-A（決定162）で次のように更新した（上の時刻は VFX-03 当時の記録）：
 *   T+0      共鳴7/7 → ゲージ満タン発光（到達反応）。HP・トースト・数字は出さない（結果を隠す）
 *   T+200    resonance cut-in 開始（BURST_READY_LEAD_MS）
 *   T+1300   burst-banner ＋ 神の god-burst-strike（0.6s：溜め→突き）
 *   T+1600   着弾（BURST_IMPACT_MS）：hit stop 80ms → 数字・敵リアクション → 表示HP
 *   致死なら、この着弾を「最後の一撃」として撃破演出へつなぐ（報酬はその後）
 */

/**
 * Phase 6-A（決定162）：共鳴7/7到達の「到達反応」を見せる間。ゲージ満タンの発光
 * （resonance-gauge-ready-flash）を見せてからカットインを始める。この間も操作はブロック
 */
export const BURST_READY_LEAD_MS = 200

/** 共鳴カットインの総時間（battle.cssのresonance-cutin-timer 0.9sと一致） */
export const RESONANCE_CUTIN_MS = 900

/** burst-bannerの表示時間（battle.cssのburst-flash 0.9sと一致） */
export const BURST_BANNER_MS = 900

/** cut-in終了→burst-banner出現までのReactハンドオフ余白（実測≒190〜200ms） */
export const BURST_HANDOFF_MS = 200

/** 神の攻撃モーション開始（＝burst-banner出現と同時。到達反応＋カットイン＋ハンドオフ） */
export const BURST_GOD_ATTACK_MS = BURST_READY_LEAD_MS + RESONANCE_CUTIN_MS + BURST_HANDOFF_MS

/**
 * Phase 6-A：神の一撃の「溜め→技」。battle.css の god-burst-strike（0.6s）は
 * 0〜30% で引いて溜め、50%（300ms）で最も前へ出る＝着弾。
 */
export const BURST_STRIKE_PEAK_MS = 300

/** 神の一撃の着弾（敵リアクション・slash・数字・SE・表示HP）。CSS は inline の --impact-delay で受け取る */
export const BURST_IMPACT_MS = BURST_GOD_ATTACK_MS + BURST_STRIKE_PEAK_MS

/** OTOMO進化の見せ場（evolve-banner出現）。立ち絵切替自体はbanner keyのハンドオフで
 * 行うためJS側はSE用（banner 0.9s＋ハンドオフ余白） */
export const BURST_EVOLVE_MS = BURST_GOD_ATTACK_MS + BURST_BANNER_MS + BURST_HANDOFF_MS + 100

/*
 * ■ Phase 6-A Combat Juice（決定162）：anticipation → impact → recovery
 *   すべて「見せ方」の時刻（commit＝engineが結果を確定した瞬間を0msとする）。
 *   engine の状態更新タイミング（CARD_PLAY_REVEAL_MS 280ms・ENEMY_TURN_REVEAL_MS 700ms）は変えない。
 *
 *   カード（通常）：クリック → cast-flash＋神の構え（windup、280ms の間）→ commit →
 *     神の突き god-strike（0.34s、26%＝90msで最前）＝着弾 CARD_IMPACT_MS →
 *     対象のみ hit stop（段階別）→ ダメージ数字・敵リアクション →
 *     表示HP（主バー）が HP_LAG_MS 後に動き出し、ゴーストが遅れて縮む
 *   条件⚡：本体の着弾から BONUS_GAP_MS 後に追加の着弾（小さな反応＋⚡数字）
 *   敵の通常攻撃：敵の突進（enemy-lunge）の最前（35%）＝着弾
 *   最後の一撃：常に L4＋FINAL_HIT_STOP_MS → 表示HP 0 → 敵フラッシュ → 崩壊 → 「撃破」→ 報酬
 */

/** 通常カードの着弾（god-strike 0.34s の 26%） */
export const CARD_IMPACT_MS = 90
/** 1枚のカードが複数回ダメージを与えるときの間隔 */
export const CARD_HIT_GAP_MS = 110
/** 本体→条件⚡追加効果（および神の得意技の追加ダメージ）の間隔 */
export const BONUS_GAP_MS = 150
/** ラウンド終了時の得意技（蒼毘「反撃の構え」）：敵の着弾から反撃までの間 */
export const PASSIVE_AFTER_ENEMY_MS = 280

/** 対象要素だけに掛ける hit stop（演出段階＝FeelTier 別。ダメージ計算とは無関係） */
export const HIT_STOP_MS: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 20, 3: 45, 4: 60 }
/**
 * 決定224：条件⚡の追加着弾の hit stop。通常ヒットの最大（L3＝45）より上、L4（60）・神の一撃（80）より下。
 * 豪快な一撃は姉御の号令込みで本体が L3 になるため、40 では⚡が本体に並んでしまう
 */
export const BONUS_HIT_STOP_MS = 50
/** 神の一撃の hit stop */
export const BURST_HIT_STOP_MS = 80
/** 最後の一撃の hit stop */
export const FINAL_HIT_STOP_MS = 90

/** hit stop 終了 → 表示HP（主バー）が動き出すまで。着弾を認識してから HP が動く */
export const HP_LAG_MS = 90
/** 表示HP 主バーの変化時間 */
export const HP_MAIN_MS = 180
/** ゴースト（直前HP）の保持時間と縮む時間 */
export const HP_GHOST_HOLD_MS = 120
export const HP_GHOST_DRAIN_MS = 340

/** 敵の通常攻撃の着弾＝enemy-lunge の 35%（0.45s／速攻型0.3s／耐久型0.65s） */
export const ENEMY_LUNGE_PEAK_MS: Record<'normal' | 'fast' | 'heavy', number> = { normal: 158, fast: 105, heavy: 228 }

/** 撃破：最後の一撃の hit stop 後、敵フラッシュまでの間（表示HPが0へ動くのを見せる） */
export const DEFEAT_FLASH_AFTER_MS = 170
/** 敵の崩壊（flash→脱色→沈み込み→消える）。battle.css の enemy-defeat と一致 */
export const DEFEAT_COLLAPSE_MS = 520
/** 崩壊開始から「撃破」表示までの間（崩壊の終盤に重ねる） */
export const DEFEAT_BEAT_OFFSET_MS = 380
/** 「撃破」表示（victory-beat）の時間。battle.css と一致 */
export const VICTORY_BEAT_MS = 850
/** reduced-motion 時の崩壊・撃破表示 */
export const DEFEAT_COLLAPSE_REDUCED_MS = 250
export const VICTORY_BEAT_REDUCED_MS = 600

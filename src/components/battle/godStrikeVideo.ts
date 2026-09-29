import type { GodId } from '../../core/types'
import { GOD_IDS } from '../../core/data/gods'

/**
 * 決定250：God Strike Premium Cut-in v1（Pilot は大耀のみ）。
 *
 * 共鳴 7/7 カットイン（`BattleResonanceCutin`）の円形ポートレートの上に、
 * 1.2 秒の砲撃動画（H3 Try1 候補 D・720²・24fps・無音・MP4/H.264 のみ）を重ねる。
 * **presentation layer のみ**：engine・reducer・イベント順・入力ロック（900ms＝
 * `RESONANCE_CUTIN_MS`）・突き（1,300）・着弾（1,600）・seed・score・戦闘結果は
 * 一切変えない。動画は「カットインの退場」だけを最大 1.2s まで延ばす
 * （`BattleResonanceCutin` の `onExit`）。
 *
 * 採用判定は commit 時に 1 回だけ（`isGodStrikeVideoReady`）：
 *   ・prefers-reduced-motion → 動画なし（現行の静止カットイン）
 *   ・戦闘開始時の先読みが `readyState >= HAVE_FUTURE_DATA` に達していない／error → 静止
 * 再生中の `error`・`play()` reject・`ended` 取りこぼしは `BattleResonanceCutin` 側の
 * 三重の安全弁（ended／error／timeout）で必ず同じ退場へ落ちる。
 *
 * 動画ファイルは必須資産ではない：404 でも decode 失敗でも Production と同じ体験になる。
 * 他 6 神への展開は Pilot の Human QA（決定250 §15）を通ってから 1 柱ずつ。
 */
export const GOD_STRIKE_VIDEO_SRC: Partial<Record<GodId, string>> = {
  [GOD_IDS.taiyo]: '/assets/gods/taiyo/god-strike-v2.mp4',
}

/**
 * 決定250 Pilot v2：動画採用時にカットインの円へ最初から敷く静止ポスター（動画の先頭 frame と同じ画・同じ 720² 構図）。
 * keyvisual（厚塗り）→ 動画（線画）の 120ms の切り替わり（Q3 監査 #1・Human QA Q6）を消すためのもの。
 * 動画が採用されないとき（reduced／未先読み／404）は使わず、現行の keyvisual 静止カットインのまま。
 * 素材は Try2 原本の静止 frame（入力板＝front_640 由来）から切り出した非生成の派生。
 */
export const GOD_STRIKE_POSTER_SRC: Partial<Record<GodId, string>> = {
  [GOD_IDS.taiyo]: '/assets/gods/taiyo/god-strike-v2-poster.webp',
}

/** 動画の尺（Pilot v2＝H3 Max Try2 の W2 1.083〜2.250s・等速 29 frame @24fps ＝ 1,208ms。カットイン mount＝T+200 から再生し T+1,400 で終わる） */
export const GOD_STRIKE_VIDEO_MS = 1200

/** `ended` を取りこぼしても（背景タブ・描画落ち）時刻で必ず退場する安全弁 */
export const GOD_STRIKE_VIDEO_FALLBACK_MS = 400

/** HTMLMediaElement.HAVE_FUTURE_DATA。これ未満なら再生開始が遅れうるので静止カットインへ */
export const VIDEO_READY_STATE_MIN = 3

/** テスト用の最小インターフェース（HTMLVideoElement の部分集合） */
export type GodStrikeVideoLike = { readyState: number; error: unknown }

/** commit 時に 1 回だけ呼ぶ採用判定。途中で切り替えない */
export function isGodStrikeVideoReady(video: GodStrikeVideoLike | null | undefined, reduced: boolean): boolean {
  if (reduced || !video) return false
  if (video.error) return false
  return video.readyState >= VIDEO_READY_STATE_MIN
}

/**
 * 戦闘開始時に選択神の動画を 1 本だけ、非表示の `<video>` として先読みする
 * （HTTP cache 任せにせず decode 済みの要素をそのままカットインへ挿すため）。
 * 対象外の神・reduced-motion・ブラウザ外では null。
 */
export function createGodStrikeVideoPreload(godId: GodId | undefined, reduced: boolean): HTMLVideoElement | null {
  if (!godId || reduced || typeof document === 'undefined') return null
  const src = GOD_STRIKE_VIDEO_SRC[godId]
  if (!src) return null
  const video = document.createElement('video')
  video.className = 'resonance-cutin-video'
  video.muted = true
  video.defaultMuted = true
  video.playsInline = true
  video.setAttribute('muted', '')
  video.setAttribute('playsinline', '')
  video.setAttribute('aria-hidden', 'true')
  video.disablePictureInPicture = true
  video.preload = 'auto'
  video.src = src
  video.load()
  return video
}

/**
 * 戦闘開始時にポスターを HTTP cache へ入れておく（keyvisual の先読みと同じ方式）。対象外の神・reduced・ブラウザ外では何もしない。
 * 取得できなくてもカットインは成立する（ポスターの <img> が透明なら下の keyvisual が見える＝v1 と同じ挙動）
 */
export function preloadGodStrikePoster(godId: GodId | undefined, reduced: boolean): HTMLImageElement | null {
  if (!godId || reduced || typeof Image === 'undefined') return null
  const src = GOD_STRIKE_POSTER_SRC[godId]
  if (!src) return null
  const img = new Image()
  img.src = src
  return img
}

/** 戦闘終了時に解放する（decode バッファを持ち続けない） */
export function releaseGodStrikeVideo(video: HTMLVideoElement | null): void {
  if (!video) return
  video.pause()
  video.removeAttribute('src')
  video.load()
  video.remove()
}

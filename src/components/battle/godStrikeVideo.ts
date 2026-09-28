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
  [GOD_IDS.taiyo]: '/assets/gods/taiyo/god-strike-v1.mp4',
}

/** 動画の尺（候補 D：29 frame @24fps ＝ 1,208ms。カットイン mount＝T+200 から再生し T+1,400 で終わる） */
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

/** 戦闘終了時に解放する（decode バッファを持ち続けない） */
export function releaseGodStrikeVideo(video: HTMLVideoElement | null): void {
  if (!video) return
  video.pause()
  video.removeAttribute('src')
  video.load()
  video.remove()
}

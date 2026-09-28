import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { getGodDef } from '../../core/data/gods'
import { GOD_THEME_COLOR, KEYVISUAL_OBJECT_POSITION } from '../setup/godStyle'
import { RESONANCE_CUTIN_MS } from './enemyVfxTiming'
import { GOD_STRIKE_VIDEO_FALLBACK_MS, GOD_STRIKE_VIDEO_MS } from './godStrikeVideo'

/** Phase 6-A（決定162）：animationend を取りこぼしても操作不能にしないための安全弁 */
export const CUTIN_FALLBACK_MS = 400
import type { GodId } from '../../core/types'

type BattleResonanceCutinProps = {
  /** カットインを表示する神。表示可否の判断（burst発生時に毎回表示する）は呼び出し側（BattleScreen.tsx）で行う */
  godId: GodId
  /** カットインの表示アニメーションが終わったら呼ばれる（burst-bannerへのhandoff用） */
  onComplete: () => void
  /**
   * 決定250：commit 時に採用が決まった先読み済み `<video>`（大耀のみ）。null なら現行の静止カットイン。
   * 円形ポートレートの上に重ねて mount と同時に再生し、`onComplete` の時刻（900ms）は一切変えない
   */
  video?: HTMLVideoElement | null
  /**
   * 決定250：カットインを外してよい時刻に呼ばれる（呼び出し側はここで unmount する）。
   * 静止：`onComplete` と同時。動画：`onComplete` 以後で動画の ended／error／timeout のいずれか
   */
  onExit?: () => void
}

/**
 * 共鳴7/7カットイン（STEP-R2：蒼毘のみのプロトタイプとして導入 → STEP-R3で
 * 全7神へ横展開 → Phase 6-D Visual Patch v1（決定168）で「神の一撃の専用舞台」へ）。
 * 表示専用コンポーネントで、GameState・reducer・core/engineには
 * 一切触れない。マウント/アンマウントの
 * タイミングはBattleScreen.tsx側が完全に制御する（このコンポーネント自身は
 * 「今どのkeyが来ているか」を持たず、マウントされたら即座に演出を開始する）。
 *
 * タイムライン（STEP-R1で確定。Phase 6-Dでも変更していない）：
 * 0ms 暗転開始 → 200ms 暗転完了・スライド開始 → 600ms スライド完了・静止開始
 * → 900ms カットイン終了（onComplete→既存burst-bannerへバトンタッチ）
 *
 * 既存のevolve-banner（BattleScreen.tsx）が確立した「onAnimationEndでCSSの
 * 実測終了を起点にする」パターンをそのまま踏襲し、setTimeoutでCSSの
 * animation-durationを別途JS側に持たない（将来ズレを防ぐ、決定80踏襲）。
 * ルート要素には暗転用(0.2s)とタイマー用(0.9s)の2つのanimationを同時に
 * 付与しており、900ms側（resonance-cutin-timer）の終了だけをonCompleteの
 * 起点にする（animationNameで判定、子要素からのバブリングはtarget比較で除外）。
 * **Phase 6-Dで子要素を増やしたが、ルート要素・resonance-cutin-timer・
 * handleAnimationEndの判定条件は一切変えていない**（バトンタッチの時間的
 * 受け渡しを壊さないための最重要事項。子のanimationendはtarget比較で弾かれる）。
 *
 * Phase 6-D Visual Patch v1 の構造（決定168。すべて既存素材＋CSS＋presentation JSX）：
 *   rays（集中線＋周辺減光で戦場を一段沈める）
 *   → band（神を置く舞台の帯）
 *   → group（円マスクの神＋七つ刻みの環＋神名／神の一撃／共鳴発動）
 * 神色は`GOD_THEME_COLOR`（godStyle.ts＝per-god色の正式source）だけを使い、
 * 顔の見え方は神選択カードと同じ`KEYVISUAL_OBJECT_POSITION`（1:1クロップ用の
 * 実測値）を使う。どちらもCSSカスタムプロパティとして渡すだけで、
 * コンポーネント側に色もトリミング値も直書きしない。
 *
 * 決定250 God Strike Premium Cut-in v1（大耀のみ）：
 *   `video` が渡されたときだけ、円形ポートレートの `<img>` の上に 1.2s の砲撃動画を重ねる。
 *   ・onComplete（900ms＝入力ロック解除・burst-banner・突き・着弾の起点）は**静止と同じ時刻**
 *   ・900ms で `is-exiting`（暗転・集中線・帯・文字を 0.3s で引く）。円の中の動画だけ最後まで見せる
 *   ・退場（onExit）は「onComplete 済み かつ 動画 done」。動画 done は ended／error／
 *     timeout（1.2s＋0.4s）／play() reject の最初の 1 つ＝三重の安全弁
 *   ・play() reject・error のときは動画を出さず（is-video なし）、下の静止画がそのまま見える
 *   ・reduced-motion・未先読み・404 は呼び出し側で video=null になり、この経路に入らない
 */
export function BattleResonanceCutin({ godId, onComplete, video = null, onExit }: BattleResonanceCutinProps) {
  const god = getGodDef(godId)
  // 完了通知は1回だけ。animationend が来なくても（背景タブ・描画落ち）時刻で必ず完了する
  const doneRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const onExitRef = useRef(onExit)
  onExitRef.current = onExit
  // 決定250：動画は「退場」だけを遅らせる。video が無ければ最初から done 扱い＝退場は onComplete と同時
  const videoDoneRef = useRef(video === null)
  const exitedRef = useRef(false)
  const [exiting, setExiting] = useState(false)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const videoFrameRef = useRef<HTMLDivElement>(null)

  const tryExit = () => {
    if (exitedRef.current || !doneRef.current || !videoDoneRef.current) return
    exitedRef.current = true
    onExitRef.current?.()
  }
  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    onCompleteRef.current()
    if (!videoDoneRef.current) setExiting(true)
    tryExit()
  }
  const markVideoDone = () => {
    if (videoDoneRef.current) return
    videoDoneRef.current = true
    tryExit()
  }
  const finishRef = useRef(finish)
  finishRef.current = finish
  const markVideoDoneRef = useRef(markVideoDone)
  markVideoDoneRef.current = markVideoDone

  useEffect(() => {
    const t = window.setTimeout(() => finishRef.current(), RESONANCE_CUTIN_MS + CUTIN_FALLBACK_MS)
    return () => window.clearTimeout(t)
  }, [])

  // 決定250：先読み済みの <video> を円の中へ挿して mount と同時に再生する
  useEffect(() => {
    if (!video) return undefined
    const host = videoFrameRef.current
    if (!host) {
      markVideoDoneRef.current()
      return undefined
    }
    host.appendChild(video)
    let cancelled = false
    const onPlaying = () => {
      if (!cancelled) setVideoPlaying(true)
    }
    const onError = () => {
      if (cancelled) return
      setVideoPlaying(false)
      markVideoDoneRef.current()
    }
    const onEnded = () => {
      if (!cancelled) markVideoDoneRef.current()
    }
    video.addEventListener('playing', onPlaying)
    video.addEventListener('ended', onEnded)
    video.addEventListener('error', onError)
    const t = window.setTimeout(() => markVideoDoneRef.current(), GOD_STRIKE_VIDEO_MS + GOD_STRIKE_VIDEO_FALLBACK_MS)
    try {
      video.currentTime = 0
    } catch {
      /* 未取得の要素は currentTime を持たない。play() 側の reject で静止画へ落ちる */
    }
    const played = video.play()
    if (played && typeof played.catch === 'function') played.catch(onError)
    return () => {
      cancelled = true
      window.clearTimeout(t)
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('error', onError)
      video.pause()
      if (video.parentNode === host) host.removeChild(video)
    }
  }, [video])

  const handleAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.animationName !== 'resonance-cutin-timer') return
    finish()
  }

  const stageStyle = {
    '--god-accent': GOD_THEME_COLOR[godId].base,
    '--god-keyvisual-pos': KEYVISUAL_OBJECT_POSITION[godId],
  } as CSSProperties

  return (
    <div
      className={exiting ? 'resonance-cutin is-exiting' : 'resonance-cutin'}
      onAnimationEnd={handleAnimationEnd}
      style={stageStyle}
      data-god={godId}
      data-premium={video ? 'video' : undefined}
    >
      <div className="resonance-cutin-rays" aria-hidden="true" />
      <div className="resonance-cutin-band" aria-hidden="true" />
      <div className="resonance-cutin-group">
        <div className={videoPlaying ? 'resonance-cutin-portrait is-video' : 'resonance-cutin-portrait'}>
          {/* 神選択カードと同じ1:1クロップ（KEYVISUAL_OBJECT_POSITION）で円に収める。
              笑蓮だけ原本が1254×1254の正方形だが、1:1に対しては無クロップなので
              他6神と同じ扱いでよい（STEP-R3で入れていた3:4の個別クロップは、
              カットインが縦長カードから円になったため不要になり撤去した）。 */}
          <img className="resonance-cutin-image" src={god.art.keyvisual} alt={god.nameJa} data-god={godId} />
          {/* 決定250：動画の円（<video> は先読み済みの要素をここへ appendChild する）。
              静止画の上・環の下。再生が始まる（playing）までは透明で、下の静止画が見えている */}
          <div className="resonance-cutin-video-frame" ref={videoFrameRef} aria-hidden="true" />
          {/* 七＝共鳴ゲージと同じ7つ刻みの環。SEVEN GODS独自の記号で、
              画像は増やさずconic-gradientとmaskだけで描く */}
          <span className="resonance-cutin-ring" aria-hidden="true" />
        </div>
        <div className="resonance-cutin-caption">
          <div className="resonance-cutin-god">{god.nameJa}</div>
          <div className="resonance-cutin-title">神の一撃</div>
          <div className="resonance-cutin-sub">共鳴発動</div>
        </div>
      </div>
    </div>
  )
}

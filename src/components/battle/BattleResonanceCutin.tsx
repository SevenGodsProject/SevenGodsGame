import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { getGodDef } from '../../core/data/gods'
import { GOD_THEME_COLOR, KEYVISUAL_OBJECT_POSITION } from '../setup/godStyle'
import { RESONANCE_CUTIN_MS } from './enemyVfxTiming'

/** Phase 6-A（決定162）：animationend を取りこぼしても操作不能にしないための安全弁 */
export const CUTIN_FALLBACK_MS = 400
import type { GodId } from '../../core/types'

type BattleResonanceCutinProps = {
  /** カットインを表示する神。表示可否の判断（burst発生時に毎回表示する）は呼び出し側（BattleScreen.tsx）で行う */
  godId: GodId
  /** カットインの表示アニメーションが終わったら呼ばれる（burst-bannerへのhandoff用） */
  onComplete: () => void
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
 */
export function BattleResonanceCutin({ godId, onComplete }: BattleResonanceCutinProps) {
  const god = getGodDef(godId)
  // 完了通知は1回だけ。animationend が来なくても（背景タブ・描画落ち）時刻で必ず完了する
  const doneRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    onCompleteRef.current()
  }
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (doneRef.current) return
      doneRef.current = true
      onCompleteRef.current()
    }, RESONANCE_CUTIN_MS + CUTIN_FALLBACK_MS)
    return () => window.clearTimeout(t)
  }, [])

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
    <div className="resonance-cutin" onAnimationEnd={handleAnimationEnd} style={stageStyle} data-god={godId}>
      <div className="resonance-cutin-rays" aria-hidden="true" />
      <div className="resonance-cutin-band" aria-hidden="true" />
      <div className="resonance-cutin-group">
        <div className="resonance-cutin-portrait">
          {/* 神選択カードと同じ1:1クロップ（KEYVISUAL_OBJECT_POSITION）で円に収める。
              笑蓮だけ原本が1254×1254の正方形だが、1:1に対しては無クロップなので
              他6神と同じ扱いでよい（STEP-R3で入れていた3:4の個別クロップは、
              カットインが縦長カードから円になったため不要になり撤去した）。 */}
          <img className="resonance-cutin-image" src={god.art.keyvisual} alt={god.nameJa} data-god={godId} />
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

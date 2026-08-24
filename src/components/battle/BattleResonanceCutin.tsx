import { getGodDef } from '../../core/data/gods'
import type { GodId } from '../../core/types'

type BattleResonanceCutinProps = {
  /** カットインを表示する神。表示可否の判断（burst発生時に毎回表示する）は呼び出し側（BattleScreen.tsx）で行う */
  godId: GodId
  /** カットインの表示アニメーションが終わったら呼ばれる（burst-bannerへのhandoff用） */
  onComplete: () => void
}

/**
 * 共鳴7/7カットイン（STEP-R2：蒼毘のみのプロトタイプとして導入 → STEP-R3で
 * 全7神へ横展開）。表示専用コンポーネントで、GameState・reducer・core/engineには
 * 一切触れない。マウント/アンマウントの
 * タイミングはBattleScreen.tsx側が完全に制御する（このコンポーネント自身は
 * 「今どのkeyが来ているか」を持たず、マウントされたら即座に演出を開始する）。
 *
 * タイムライン（STEP-R1で確定）：
 * 0ms 暗転開始 → 200ms 暗転完了・スライド開始 → 600ms スライド完了・静止開始
 * → 900ms カットイン終了（onComplete→既存burst-bannerへバトンタッチ）
 *
 * 既存のevolve-banner（BattleScreen.tsx）が確立した「onAnimationEndでCSSの
 * 実測終了を起点にする」パターンをそのまま踏襲し、setTimeoutでCSSの
 * animation-durationを別途JS側に持たない（将来ズレを防ぐ、決定80踏襲）。
 * ルート要素には暗転用(0.2s)とタイマー用(0.9s)の2つのanimationを同時に
 * 付与しており、900ms側（resonance-cutin-timer）の終了だけをonCompleteの
 * 起点にする（animationNameで判定、子要素からのバブリングはtarget比較で除外）。
 */
export function BattleResonanceCutin({ godId, onComplete }: BattleResonanceCutinProps) {
  const god = getGodDef(godId)

  const handleAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.animationName !== 'resonance-cutin-timer') return
    onComplete()
  }

  return (
    <div className="resonance-cutin" onAnimationEnd={handleAnimationEnd}>
      <div className="resonance-cutin-group">
        {/* STEP-R3：笑蓮（900×900の正方形・横臥ポーズ）だけ他6神（675〜720×900の
            縦長ポートレート）と構図が大きく異なるため、data-godでCSS側から個別に
            object-fit:coverのトリミングをかける（battle.css参照）。他神は
            data-godを持っていてもマッチするCSSルールが無いため完全に無変更。 */}
        <img className="resonance-cutin-image" src={god.art.keyvisual} alt={god.nameJa} data-god={godId} />
        <div className="resonance-cutin-text">{god.nameJa}、共鳴発動！</div>
      </div>
    </div>
  )
}

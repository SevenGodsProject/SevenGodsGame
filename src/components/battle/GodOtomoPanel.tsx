import type { OtomoState } from '../../core/types'
import { getOtomoDef } from '../../core/data/otomo'

const FORM_LABEL: Record<OtomoState['form'], string> = {
  spirit: '精霊態',
  incarnate: '受肉態',
  doji: '童子',
}

type GodOtomoPanelProps = {
  otomo: OtomoState
  resonance: { value: number; max: number }
  /** 変わるたびにOTOMOの成長グローを再生する */
  evolveKey: number
}

/**
 * OTOMOの成長と共鳴ゲージだけを表示する中央パネル。
 * 神の立ち絵は決定31でPlayerPanelへ移し、敵vsプレイヤーの対称レイアウトにした。
 */
export function GodOtomoPanel({ otomo, resonance, evolveKey }: GodOtomoPanelProps) {
  const otomoDef = getOtomoDef(otomo.defId)
  const ratio = resonance.max > 0 ? Math.min(1, resonance.value / resonance.max) : 0

  return (
    <div className="panel god-otomo-panel">
      <div className="panel-title">共鳴</div>
      <div className="god-otomo-portraits">
        <figure
          key={`otomo-${evolveKey}`}
          className={`portrait portrait-otomo${evolveKey > 0 ? ' evolve-glow' : ''}`}
        >
          <img src={otomoDef.art[otomo.form]} alt={otomoDef.nameJa} />
          <figcaption>
            {otomoDef.nameJa}（{FORM_LABEL[otomo.form]}）
          </figcaption>
        </figure>
      </div>
      <div className="resonance-gauge">
        <div className="resonance-gauge-fill" style={{ width: `${ratio * 100}%` }} />
        <span className="resonance-gauge-label">
          共鳴 {resonance.value} / {resonance.max}
        </span>
      </div>
    </div>
  )
}

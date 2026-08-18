import type { GodId, OtomoState } from '../../core/types'
import { getOtomoDef } from '../../core/data/otomo'
import { getGodDef } from '../../core/data/gods'
import { describeEffectList } from '../setup/otomoEffectText'

const FORM_LABEL: Record<OtomoState['form'], string> = {
  spirit: '精霊態',
  incarnate: '受肉態',
  doji: '童子',
}

type GodOtomoPanelProps = {
  godId: GodId
  otomo: OtomoState
  resonance: { value: number; max: number }
  /** 変わるたびにOTOMOの成長グローを再生する */
  evolveKey: number
}

/**
 * OTOMOの成長と共鳴ゲージだけを表示する中央パネル。
 * 神の立ち絵は決定31でPlayerPanelへ移し、敵vsプレイヤーの対称レイアウトにした。
 */
/**
 * 決定95：共鳴満タン直前の「助走」演出。resonance.valueが5/6に達すると
 * `.resonance-gauge`へ段階的にクラスを足すだけで、ロジック・数値・発動条件には
 * 一切触れない（表示専用の分岐）。7に達した瞬間はreducer側で同一トランザクション内に
 * 即0リセットされる（決定8・10）ため、'high'は常に6の間だけ描画され、7が
 * レンダリングされることは無い＝既存burst-bannerとの競合が構造的に起こらない。
 */
function getResonanceStage(value: number): '' | 'resonance-gauge-mid' | 'resonance-gauge-high' {
  if (value >= 6) return 'resonance-gauge-high'
  if (value >= 5) return 'resonance-gauge-mid'
  return ''
}

export function GodOtomoPanel({ godId, otomo, resonance, evolveKey }: GodOtomoPanelProps) {
  const otomoDef = getOtomoDef(otomo.defId)
  const ratio = resonance.max > 0 ? Math.min(1, resonance.value / resonance.max) : 0
  const resonanceStage = getResonanceStage(resonance.value)
  // 第二次完成フェーズP0-4：神ごとに個性化されたresonanceEffects（gods.ts）を
  // バトル中いつでも確認できるようにする。DeckBuilderScreen.tsxが既に同じ
  // describeEffectList(god.resonanceEffects)を「共鳴発動：…」という文言で
  // 表示しており、ここでも同じ関数・同じ文言を再利用することで、実データを
  // JSXへ手書きで複製しない（single source of truth）。神・数値・発動条件は
  // 一切変更していない、純粋な表示専用の追加。
  const resonanceEffectText = describeEffectList(getGodDef(godId).resonanceEffects) ?? '変化なし'

  return (
    <div className="panel god-otomo-panel">
      <div className="panel-title">共鳴</div>
      <p className="resonance-effect-text">共鳴発動：{resonanceEffectText}</p>
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
      <div className={`resonance-gauge-wrap ${resonanceStage}`.trim()}>
        <div className="resonance-gauge">
          <div className="resonance-gauge-fill" style={{ width: `${ratio * 100}%` }} />
          <span className="resonance-gauge-label">
            共鳴 {resonance.value} / {resonance.max}
          </span>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import type { GodId, GrowthPath, OtomoForm, OtomoState } from '../../core/types'
import { OTOMO_FORM_ORDER } from '../../core/types'
import { getOtomoDef } from '../../core/data/otomo'
import { getGodDef } from '../../core/data/gods'
import { describeEffectList } from '../setup/otomoEffectText'
import '../polish.css'

const FORM_LABEL: Record<OtomoState['form'], string> = {
  spirit: '精霊態',
  incarnate: '受肉態',
  doji: '童子',
}

type GodOtomoPanelProps = {
  godId: GodId
  otomo: OtomoState
  resonance: { value: number; max: number }
  /** VFX-03：evolve-banner（🌱成長）が表示された回数（BattleScreen.tsxのevolveBannerKey）。
   * 立ち絵の新形態への切替・成長グロー・リアクションは、この「見せ場」のタイミングで行う
   * （以前のevolveKey＝fx.evolveKeyは暗転の下で即時発動していたため置き換えた） */
  evolveRevealKey: number
  /** STEP-UX2：現在選択中の育成方針（守り/力）。OTOMO自身の効果テキストを
      現在の形態・方針に合わせて算出するためだけに使う表示専用の値で、
      GameStateの読み取りのみ（reducer・core/engineには一切触れない）。 */
  otomoGrowthPath: GrowthPath
  /** STEP-UX2：burst-banner表示と同じタイミングでOTOMOの短いリアクション
      演出を再生するためのキー（BattleScreen.tsxのcutinBurstBannerKeyを
      そのまま渡すだけ。新しいGameState・タイマーは一切追加しない）。 */
  reactionKey: number
  /** 決定128：7/7 到達（BURST）の瞬間にゲージを満たして発光させるキー（fx.burstKey）。省略可 */
  readyFlashKey?: number
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

export function GodOtomoPanel({
  godId,
  otomo,
  resonance,
  evolveRevealKey,
  otomoGrowthPath,
  reactionKey,
  readyFlashKey = 0,
}: GodOtomoPanelProps) {
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

  // 8/31 P0-2：「7に達したら何が起きるか」を初戦から分かるように常時表示する。
  // 発動時の順序はeffects.tsのapplyResonance（進化→神の一撃→OTOMO効果）そのもの
  // なので、OTOMO効果は「今の形態」ではなく「発動で成長した後の形態」（童子なら据え置き）
  // のテーブルを、現在の育成方針（守り/力）で引く。表示専用でGameStateには触れない。
  const burstFormIndex = OTOMO_FORM_ORDER.indexOf(otomo.form)
  const burstForm: OtomoForm = OTOMO_FORM_ORDER[burstFormIndex + 1] ?? otomo.form
  const burstOtomoEffects =
    otomoGrowthPath === 'power' ? otomoDef.powerPathEffectsByForm[burstForm] : otomoDef.effectsByForm[burstForm]
  const burstOtomoText = describeEffectList(burstOtomoEffects)
  const remaining = Math.max(0, resonance.max - resonance.value)

  // VFX-03：共鳴BURSTの見せる順番（cut-in→神の一撃→着弾→🌱成長）に合わせ、
  // OTOMOの立ち絵は「🌱成長バナー」（evolveRevealKey）が出るまで旧形態のまま見せる。
  // engine上の進化（otomo.form）はカード使用の同一トランザクションで確定済みで
  // ここでは一切触れない＝表示専用の遅延。
  // 表示形態はローカルstateで持つ：propsから導出（evolveKey > evolveRevealKey）すると、
  // GameState更新の描画→useBattleFxのeffectでevolveKeyが進む描画、の間の1フレームだけ
  // 新形態が映るフリッカーが起きる（headless実測426→562msで再現）ため。
  // 同期規則：①🌱成長バナーが出た瞬間に現在の形態へ更新 ②OTOMOが変わった／形態が
  // 戻った（新規対局・再開）ときは即時同期（進化は決して戻らないので「戻り」＝別対局）。
  const [displayedForm, setDisplayedForm] = useState<OtomoForm>(otomo.form)
  const shownRevealKeyRef = useRef(0)
  const displayedDefIdRef = useRef(otomo.defId)
  useEffect(() => {
    if (
      otomo.defId !== displayedDefIdRef.current ||
      OTOMO_FORM_ORDER.indexOf(otomo.form) < OTOMO_FORM_ORDER.indexOf(displayedForm)
    ) {
      displayedDefIdRef.current = otomo.defId
      setDisplayedForm(otomo.form)
    }
  }, [otomo.defId, otomo.form, displayedForm])
  const evolvePending = displayedForm !== otomo.form

  // STEP-UX2で蒼毘の百勝のみのプロトタイプとして導入し、STEP-UX2-Cのラベル
  // 折り返し修正を経て、STEP-UX3で全7OTOMOへ横展開した。「常時アニメーション
  // させず、発動した瞬間だけ」という方針のため、burst-banner表示と同じ
  // reactionKey（=cutinBurstBannerKey）を監視し、そのバッチでOTOMO自身の効果
  // （DeckBuilderScreen.tsx同様、育成方針でeffectsByForm/powerPathEffectsByForm
  // を切り替える既存パターンをそのまま踏襲）が実際にあった時だけ、名前＋効果を
  // 0.5秒だけ見せる。効果が空（spirit形態等）の回は「助けてくれた」と嘘を
  // つかないよう、そもそもリアクションを発生させない。7OTOMOとも全く同じ
  // ロジック・同じCSSで、神ごとの分岐は一切持たない（GOD_IDSでの神判定は
  // 削除済み）。GameState・reducer・core/engine・OTOMO効果の数値は一切
  // 変更していない、表示専用のローカルstateのみ。
  // VFX-03：進化を伴うバーストでは、効果は進化後の形態で適用されている
  // （effects.tsのapplyResonance：進化→神効果→OTOMO効果の順）ため、リアクションは
  // 立ち絵が新形態になる「🌱成長」の瞬間（evolveRevealKey）に合わせて出す。
  // 進化を伴わないバーストは従来どおりburst-bannerの瞬間（reactionKey）。
  const otomoOwnEffects =
    otomoGrowthPath === 'power' ? otomoDef.powerPathEffectsByForm[otomo.form] : otomoDef.effectsByForm[otomo.form]
  const otomoOwnEffectText = describeEffectList(otomoOwnEffects)
  const [reactionActive, setReactionActive] = useState(false)
  const shownReactionKeyRef = useRef(0)
  useEffect(() => {
    if (reactionKey > shownReactionKeyRef.current) {
      shownReactionKeyRef.current = reactionKey
      if (otomoOwnEffectText && !evolvePending) setReactionActive(true)
    }
  }, [reactionKey, evolvePending, otomoOwnEffectText])
  useEffect(() => {
    if (evolveRevealKey > shownRevealKeyRef.current) {
      shownRevealKeyRef.current = evolveRevealKey
      // 🌱成長の瞬間：立ち絵を新形態へ切替え、その形態の効果でリアクション
      setDisplayedForm(otomo.form)
      if (otomoOwnEffectText) setReactionActive(true)
    }
  }, [evolveRevealKey, otomo.form, otomoOwnEffectText])
  const handleReactionAnimationEnd = (event: React.AnimationEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.animationName !== 'otomo-reaction-pop') return
    setReactionActive(false)
  }

  return (
    <div className="panel god-otomo-panel">
      <div className="panel-title">共鳴</div>
      <div className="god-otomo-portraits">
        {/* VFX-03：成長グロー（evolve-glow）は立ち絵切替と同じ「🌱成長」の瞬間に再生する
            （keyをevolveRevealKeyに変更。以前はevolveKey＝暗転の下で発動していた） */}
        <figure
          key={`otomo-${evolveRevealKey}`}
          className={`portrait portrait-otomo${evolveRevealKey > 0 ? ' evolve-glow' : ''}${reactionActive ? ' otomo-reacting' : ''}`}
          onAnimationEnd={reactionActive ? handleReactionAnimationEnd : undefined}
        >
          <img src={otomoDef.art[displayedForm]} alt={otomoDef.nameJa} />
          <figcaption>
            {otomoDef.nameJa}（{FORM_LABEL[displayedForm]}）
          </figcaption>
          {reactionActive && otomoOwnEffectText && (
            <div className="otomo-reaction-label">
              {otomoDef.nameJa}「{otomoOwnEffectText}」
            </div>
          )}
        </figure>
      </div>
      <div key={`ready-${readyFlashKey}`} className={`resonance-gauge-wrap ${resonanceStage}${readyFlashKey > 0 ? ' resonance-gauge-ready-flash' : ''}`.trim()}>
        <div className="resonance-gauge">
          <div className="resonance-gauge-fill" style={{ width: `${ratio * 100}%` }} />
          <span className="resonance-gauge-label">
            共鳴 {resonance.value} / {resonance.max}
          </span>
        </div>
      </div>
      <div className="burst-preview" data-testid="burst-preview">
        <div className={`burst-preview-head${remaining === 0 ? ' burst-preview-ready' : ''}`}>
          {remaining > 0 ? `あと${remaining}で神技発動` : '神技発動！'}
        </div>
        <div className="burst-preview-row">
          <span className="burst-preview-label">神の一撃</span>
          <span>{resonanceEffectText}</span>
        </div>
        <div className="burst-preview-row">
          <span className="burst-preview-label">
            {otomoDef.nameJa}
            {burstForm !== otomo.form ? `（${FORM_LABEL[burstForm]}に成長）` : `（${FORM_LABEL[burstForm]}）`}
          </span>
          <span>{burstOtomoText ?? '効果なし'}</span>
        </div>
        <div className="burst-preview-note">共鳴が7に達すると自動で発動します</div>
      </div>
    </div>
  )
}

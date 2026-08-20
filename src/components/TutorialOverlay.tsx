import { GlyphIcon, type GlyphKey } from './battle/cardIcon'
import { HpBar } from './battle/HpBar'
import { ENEMY_IDS, getEnemyDef } from '../core/data/enemies'
import './tutorial.css'

type TutorialOverlayProps = {
  onClose: () => void
}

type Visual =
  | { kind: 'glyph'; glyph: GlyphKey }
  | { kind: 'image'; src: string; alt: string }
  /** 目的：実戦の敵HPバー（HpBar）＋「ラウンド N/7」を縮小引用する */
  | { kind: 'objective' }
  /** 神力（AP）：実戦の`.battle-topbar-ap`と同じ「神力 N/M」＋青いAPゲージを縮小引用する */
  | { kind: 'apGauge' }
  /** 敵の「予告」：実戦のEnemyPanel `.intent`（⚔ 次の攻撃：N）をそのまま縮小引用する */
  | { kind: 'enemyIntent' }
  /** 共鳴ゲージ：実戦のGodOtomoPanel `.resonance-gauge`（金〜オレンジのバー）を縮小引用する */
  | { kind: 'resonanceGauge' }
  /** 託宣：実戦のDivinationPanelと同じ3グリフ（加護=shield／導き=cards／天啓=star）を横並びで引用する */
  | { kind: 'divinationGlyphs' }

const TRIAL_ENEMY = getEnemyDef(ENEMY_IDS.trial)

/**
 * 「遊び方で見た記号を、そのまま実戦画面で発見できる」UXにするため、各項目の
 * visualは実戦のUIコンポーネント・CSSクラスをそのまま縮小引用する（決定：
 * TutorialOverlay UX改善、実戦UI統一）。新しい抽象アイコンや画像は追加せず、
 * `HpBar`（EnemyPanelと共通）・`.ap-gauge`（BattleScreenと共通）・`.intent`
 * （EnemyPanelと共通）・`.resonance-gauge`（GodOtomoPanelと共通）・
 * `.divination-choice-glyph`（DivinationPanelと共通）をそのまま流用している。
 * 表示する数値はいずれも対局中のスナップショットではなく、説明用の固定値
 * （目的のみ`TRIAL_ENEMY`の実データから導出）。
 */
const SECTIONS: { title: string; body: string; visual: Visual }[] = [
  {
    title: '目的',
    body: '7ラウンド以内に敵を倒せば勝利。倒せなくても、そこまでに与えたダメージ分のスコアは残ります。',
    visual: { kind: 'objective' },
  },
  {
    title: '神力（AP）',
    body: 'カードのコスト。ラウンドが進むと供給量が増えますが、余っても持ち越せません。',
    visual: { kind: 'apGauge' },
  },
  {
    title: '敵の「予告」',
    body: '敵は次の行動を事前に見せます。守るか、攻め切るか毎ラウンド選びましょう。',
    visual: { kind: 'enemyIntent' },
  },
  {
    title: '共鳴ゲージ',
    body: '共鳴カードで貯まり、満タンで神の一撃が自動発動。神とOTOMOで内容が変わります。',
    visual: { kind: 'resonanceGauge' },
  },
  {
    title: '託宣',
    body: '神力を消費せずに使える3択の後押し。1ゲームに数回、かつ1ラウンド1回まで使えます。',
    visual: { kind: 'divinationGlyphs' },
  },
]

/** 各visual kindを、実戦と同じCSSクラス・コンポーネントで描画する */
function renderVisual(visual: Visual) {
  switch (visual.kind) {
    case 'image':
      return <img src={visual.src} alt={visual.alt} loading="lazy" decoding="async" />
    case 'glyph':
      return <GlyphIcon glyph={visual.glyph} className="tutorial-section-glyph" />
    case 'objective':
      // 実戦のEnemyPanelと同じHpBar（`.hp-bar`、色`#e5484d`）＋ラウンド表示。
      // 数値は対局中のスナップショットではなく説明用の固定値。
      return (
        <>
          <HpBar current={Math.round(TRIAL_ENEMY.maxHp * 0.4)} max={TRIAL_ENEMY.maxHp} color="#e5484d" />
          <span className="tutorial-visual-round">ラウンド 3 / 7</span>
        </>
      )
    case 'apGauge':
      // 実戦の`.battle-topbar-ap`と同じ構造（テキスト＋`.ap-gauge`）をそのまま流用。
      return (
        <>
          <span className="tutorial-visual-ap-text">神力 2 / 4</span>
          <span className="ap-gauge">
            <span className="ap-gauge-fill" style={{ width: '50%' }} />
          </span>
        </>
      )
    case 'enemyIntent': {
      // 実戦のEnemyPanelと同じ`.intent`クラス・同じ書式。数値はTRIAL_ENEMYの実データ（R1、攻撃行動）。
      const firstAction = TRIAL_ENEMY.actions[0]
      const amount = firstAction.kind === 'attack' ? firstAction.amount : 0
      return <div className="intent tutorial-visual-intent">⚔ 次の攻撃：{amount}</div>
    }
    case 'resonanceGauge':
      // 実戦のGodOtomoPanelと同じ`.resonance-gauge`構造をそのまま流用。
      return (
        <div className="resonance-gauge">
          <div className="resonance-gauge-fill" style={{ width: '57%' }} />
          <span className="resonance-gauge-label">共鳴 4 / 7</span>
        </div>
      )
    case 'divinationGlyphs':
      // 実戦のDivinationPanelと同じ3グリフ（加護=shield／導き=cards／天啓=star）を同じクラスで描画。
      return (
        <div className="tutorial-visual-divination">
          <GlyphIcon glyph="shield" className="divination-choice-glyph" />
          <GlyphIcon glyph="cards" className="divination-choice-glyph" />
          <GlyphIcon glyph="star" className="divination-choice-glyph" />
        </div>
      )
  }
}

/**
 * 決定39：初回プレイヤー向けの簡易チュートリアル。
 * `GameFlow`が初回起動時に自動表示し、「？ 遊び方」ボタンからいつでも再表示できる。
 * 決定47：タイトルを`HomeScreen`と揃え「共鳴カードバトル」を明記し、各項目に
 * 図解を追加した。TutorialOverlay UX改善（実戦UI統一）：各項目の図解を実戦の
 * UIコンポーネント・CSSクラスの縮小引用に置き換え、「遊び方で見た記号を、
 * そのまま実戦画面で発見できる」ようにした。
 */
export function TutorialOverlay({ onClose }: TutorialOverlayProps) {
  return (
    <div className="tutorial-overlay" role="dialog" aria-modal="true" aria-label="遊び方">
      <div className="tutorial-card">
        <h1 className="tutorial-title">SEVEN GODS の遊び方</h1>
        <p className="tutorial-genre">共鳴カードバトル</p>
        <dl className="tutorial-sections">
          {SECTIONS.map((section) => (
            <div key={section.title} className="tutorial-section">
              <div className="tutorial-section-visual">{renderVisual(section.visual)}</div>
              <div className="tutorial-section-text">
                <dt>{section.title}</dt>
                <dd>{section.body}</dd>
              </div>
            </div>
          ))}
        </dl>
        <button type="button" className="tutorial-close" onClick={onClose}>
          わかった
        </button>
      </div>
    </div>
  )
}

import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { GlyphIcon } from './battle/cardIcon'
import { HpBar } from './battle/HpBar'
import { ENEMY_IDS, getEnemyDef } from '../core/data/enemies'
import './tutorial.css'
import { SECTIONS, TIPS, type Visual } from './tutorialContent'
import { formatScaled } from './displayScale'

type TutorialOverlayProps = {
  onClose: () => void
}

const TRIAL_ENEMY = getEnemyDef(ENEMY_IDS.trial)

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
      // v1.0.2 語彙整合（FIRST_PLAYER_TUTORIAL_AUDIT_V1 §10-1 (c)）：実戦の予告と同じ SVG グリフ＋×10 表示値（決定240・displayScale）。
      // 絵文字・「次の攻撃：」接頭語・内部値 5 は実戦画面に存在しないため、図で見た記号をそのまま実戦で発見できる形に揃える
      return (
        <div className="intent tutorial-visual-intent">
          <GlyphIcon glyph="sword" className="intent-glyph" />
          {formatScaled(amount)}
        </div>
      )
    }
    case 'resonanceAndDivination':
      // 実戦のGodOtomoPanelと同じ`.resonance-gauge`＋DivinationPanelと同じ
      // `.divination-choice-glyph`を、1つのスロット内に縦に並べて両方引用する。
      return (
        <>
          <div className="resonance-gauge">
            <div className="resonance-gauge-fill" style={{ width: '57%' }} />
            <span className="resonance-gauge-label">共鳴 4 / 7</span>
          </div>
          <div className="tutorial-visual-divination">
            <GlyphIcon glyph="shield" className="divination-choice-glyph" />
            <GlyphIcon glyph="cards" className="divination-choice-glyph" />
            <GlyphIcon glyph="star" className="divination-choice-glyph" />
          </div>
        </>
      )
    case 'endRoundFlow':
      // 実戦の「ラウンドを終える」ボタン（`.end-round-button`）と同じ配色
      // （金の縁取り・グラデーション）をこのモーダル内だけで軽量に再現する。
      return (
        <div className="tutorial-visual-endround">
          <span className="tutorial-visual-endround-button">ラウンドを終える</span>
          <span className="tutorial-visual-endround-note">▶ 敵の番へ</span>
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
 * 初心者向け再設計（8/31版、CEO+相棒監査）：用語辞書だった旧構成（目的／
 * 神力／敵の予告／共鳴ゲージ／託宣の5項目）を、実プレイ順の6ステップ＋
 * 「攻略のコツ」へ作り直した。「ラウンドを終える」という具体的な操作手順を
 * 明記したのが最大の変更点。
 */
/** ダイアログ内で Tab が巡る要素 */
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function TutorialOverlay({ onClose }: TutorialOverlayProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  // A11y Minimum Pack（2026-10-09）：Esc で閉じる。capture で先に受けて止める
  //（FirstBattleBrief から開いたとき、下の Brief の Esc 受け手まで届いて 2 枚とも閉じないように）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      e.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  // 開いたらダイアログ本体へフォーカス（スクロール位置は動かさない。「わかった」へ飛ばすと本文を読む前に末尾へ送られる）。
  // 閉じたら開く前の要素（本のアイコン／「詳しい遊び方」）へ戻す
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cardRef.current?.focus({ preventScroll: true })
    return () => previous?.focus({ preventScroll: true })
  }, [])

  // Tab はダイアログの中で循環させる（focus trap）
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return
    const root = cardRef.current
    if (!root) return
    const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (focusables.length === 0) {
      e.preventDefault()
      return
    }
    const first = focusables[0]!
    const last = focusables[focusables.length - 1]!
    const active = document.activeElement
    if (e.shiftKey && (active === first || active === root)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="tutorial-overlay" role="dialog" aria-modal="true" aria-label="遊び方" onKeyDown={onKeyDown}>
      <div className="tutorial-card" ref={cardRef} tabIndex={-1}>
        <h1 className="tutorial-title">SEVEN GODS の遊び方</h1>
        <p className="tutorial-genre">共鳴カードバトル</p>
        <dl className="tutorial-sections">
          {SECTIONS.map((section) => (
            <div key={section.title} className="tutorial-section">
              <div className="tutorial-section-visual">{renderVisual(section.visual)}</div>
              <div className="tutorial-section-text">
                <dt>{section.title}</dt>
                <dd>{section.body}</dd>
                {section.note && <p className="tutorial-section-note">{section.note}</p>}
              </div>
            </div>
          ))}
        </dl>
        <div className="tutorial-tips">
          <p className="tutorial-tips-title">攻略のコツ</p>
          <ul className="tutorial-tips-list">
            {TIPS.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
        <button type="button" className="tutorial-close" onClick={onClose}>
          わかった
        </button>
      </div>
    </div>
  )
}

import { GlyphIcon, type GlyphKey } from './battle/cardIcon'
import { getCardArt } from '../core/data/cardArt'
import { CARD_IDS } from '../core/data/cards'
import { ENEMY_IDS, getEnemyDef } from '../core/data/enemies'
import { GODS } from '../core/data/gods'
import './tutorial.css'

type TutorialOverlayProps = {
  onClose: () => void
}

type Visual = { kind: 'glyph'; glyph: GlyphKey } | { kind: 'image'; src: string; alt: string }

const FEATURED_GOD = GODS[0]
const TRIAL_ENEMY = getEnemyDef(ENEMY_IDS.trial)

/**
 * 各項目の説明に、抽象的な図形（GlyphIcon）か実際のゲーム内画像かのどちらかを
 * 添える（CEOフィードバック「画像を入れるなど視覚的にもわかりやすく」への対応）。
 * 新しい画像を用意するのではなく、既に実装済みのカード・敵・神の絵をそのまま
 * 引用することで、追加のアセット制作なしで「実物を見せる」説明にした。
 */
const SECTIONS: { title: string; body: string; visual: Visual }[] = [
  {
    title: '目的',
    body: '7ラウンド以内に敵を倒せば勝利。倒せなくても、そこまでに与えたダメージ分のスコアは残ります。',
    visual: { kind: 'glyph', glyph: 'flag' },
  },
  {
    title: '神力（AP）',
    body: 'カードを使うためのコスト。ラウンドが進むほど供給量が増えますが、余っても次のラウンドには持ち越せません。カード左上の数字がコストです。',
    visual: { kind: 'image', src: getCardArt(CARD_IDS.heavyBlow) ?? '', alt: '「剛撃」のカード' },
  },
  {
    title: '敵の「予告」',
    body: '敵は次に何をしてくるか事前に見せてきます。防御カードで守るか、リスクを取って攻め切るかを毎ラウンド選びましょう。',
    visual: { kind: 'image', src: TRIAL_ENEMY.art, alt: TRIAL_ENEMY.name },
  },
  {
    title: '共鳴ゲージ',
    body: '共鳴カードを使うと貯まり、満タンになると自動で神の一撃が発動します。選んだ神とOTOMOによって内容が変わります。',
    visual: { kind: 'image', src: FEATURED_GOD.art.main, alt: FEATURED_GOD.nameJa },
  },
  {
    title: '託宣',
    body: '神力を消費せずに使える3択の後押し。1ゲームに数回、かつ1ラウンド1回まで使えます。',
    visual: { kind: 'glyph', glyph: 'star' },
  },
]

/**
 * 決定39：初回プレイヤー向けの簡易チュートリアル。
 * `GameFlow`が初回起動時に自動表示し、「？ 遊び方」ボタンからいつでも再表示できる。
 * 決定47：タイトルを`HomeScreen`と揃え「共鳴カードバトル」を明記し、各項目に
 * 図解（アイコンまたは実際のゲーム内画像）を追加した。
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
              <div className="tutorial-section-visual">
                {section.visual.kind === 'image' ? (
                  <img src={section.visual.src} alt={section.visual.alt} loading="lazy" decoding="async" />
                ) : (
                  <GlyphIcon glyph={section.visual.glyph} className="tutorial-section-glyph" />
                )}
              </div>
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

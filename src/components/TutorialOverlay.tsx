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
  /**
   * 共鳴＋託宣（初心者向け再設計）：実戦の共鳴ゲージ（GodOtomoPanel）と
   * 託宣3グリフ（DivinationPanel）を1つのステップにまとめて縦に並べて引用する。
   * 「共鳴と託宣を使おう」という1見出しの下に両方の実UIを見せることで、
   * 別モジュールであることを視覚的にも示す。
   */
  | { kind: 'resonanceAndDivination' }
  /**
   * 「ラウンドを終える」（初心者向け再設計の最重要追加）：既存の実戦ボタン
   * （`.end-round-button`、金色の丸ボタン）と同じ配色をこのモーダル内だけで
   * 再現する軽量CSS表現。ボタン画像そのものやbattle.cssへの依存は持たず、
   * `tutorial.css`内に完結させている（TutorialOverlayはHomeScreenからも
   * 開けるため、battle.cssの読み込み順に依存させないため）。
   */
  | { kind: 'endRoundFlow' }

const TRIAL_ENEMY = getEnemyDef(ENEMY_IDS.trial)

type Section = {
  title: string
  body: string
  visual: Visual
  /**
   * 最終ステップ（⑥）専用のOTOMO育成への短い導線。戦闘ルールの説明を
   * 圧迫しないよう、本文（body）とは別に小さく添える1〜2文だけに留める
   * （形態解放条件・絆Lv計算式・七柱との絆の集計方法などの詳細は含めない）。
   */
  note?: string
}

/**
 * 初心者向け「遊び方」再設計（CEO+相棒監査、8/31版）：
 * 「用語辞書」から「これを読めば初見でも1戦できる説明書」へ。
 * 実プレイ順（①神とデッキを選ぶ→②予告を見る→③神力でカードを出す→
 * ④共鳴と託宣→⑤ラウンドを終える→⑥7ラウンド以内に倒す）に沿って
 * 6ステップへ再構成した。最重要追加は⑤「ラウンドを終える」で、
 * 「カードを出した後どうすればいいか」という、旧版に欠けていた
 * 具体的な操作手順を明記する。
 *
 * 「遊び方で見た記号を、そのまま実戦画面で発見できる」方針（決定：
 * TutorialOverlay UX改善）は維持し、各項目のvisualは引き続き実戦の
 * UIコンポーネント・CSSクラスをそのまま縮小引用する。
 */
const SECTIONS: Section[] = [
  {
    title: '① 神とデッキを選ぼう',
    body: '好きな神と難易度を選び、デッキを組みます。最初は「おすすめデッキ」のままで大丈夫です。',
    visual: { kind: 'glyph', glyph: 'cards' },
  },
  {
    title: '② 敵の予告を見よう',
    body: '毎ラウンド、敵は次の行動を事前に見せます。攻撃が大きいときは防御を検討しましょう。',
    visual: { kind: 'enemyIntent' },
  },
  {
    title: '③ 神力を使ってカードを出そう',
    body: 'カード左上の数字が、必要な神力です。神力はラウンドが進むごとに増えます。余っても次のラウンドには持ち越せません。神力の範囲で、攻撃・防御・回復のカードを使えます。',
    visual: { kind: 'apGauge' },
  },
  {
    title: '④ 共鳴と託宣を使おう',
    body: '共鳴カードでゲージを貯めると、7で神の一撃が自動発動します。託宣は神力を使わず、3つの効果から1つを選べます。デッキに入る「神託」カードとは別物です。',
    visual: { kind: 'resonanceAndDivination' },
  },
  {
    title: '⑤「ラウンドを終える」で敵の番へ',
    body: 'カードを使い終えたら「ラウンドを終える」を押しましょう。敵が予告どおりに行動し、次のラウンドが始まります。',
    visual: { kind: 'endRoundFlow' },
  },
  {
    title: '⑥ 敵を倒してスコアを狙おう',
    body: '7ラウンド以内に敵のHPを0にすれば勝利。倒しきれなくても、それまでのスコアはちゃんと残ります。',
    visual: { kind: 'objective' },
    note: '対局後はOTOMOとの絆も育ちます。育てると形態の記録が解放され、七柱との絆も進みます。',
  },
]

/**
 * 攻略のコツ（初心者向け再設計、STEP2）：6ステップを読み終えた初心者が
 * 「知っているとすぐ上手くなる」基本を最大4項目・各1文だけ添える。
 * いずれも現在の実装仕様（rules.ts・共鳴発動・託宣の残り回数）と矛盾しない
 * 内容のみを採用し、「絶対」「必ず」等の断定表現は使わない。
 */
const TIPS: string[] = [
  '敵の予告を見てからカードを使うと、無駄なく対応できます。',
  '神力（AP）を余らせすぎると、スコアが少し減ってしまいます。',
  '共鳴ゲージを意識して貯めると、大きな一撃を狙えます。',
  '託宣は各ラウンド1回まで使えます。神力を使わないので、迷ったら使ってみましょう。',
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

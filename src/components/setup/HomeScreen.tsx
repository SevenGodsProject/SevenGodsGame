import type { GameState } from '../../core/types'
import { GODS } from '../../core/data/gods'
import { ARCHETYPE_LABEL } from './godStyle'
import { BookIcon, HeartIcon, TrophyIcon } from '../icons'
import './setup.css'

type HomeScreenProps = {
  /** 保存済みの進行中バトル（無ければnull）。決定29のTitleScreenの役割をここに統合した */
  savedBattle: GameState | null
  onStartFresh: () => void
  onResume: () => void
  onShowTutorial: () => void
  /** Task C2：OTOMO育成画面を開く */
  onShowOtomoGrowth: () => void
  /** Task E1：戦績画面を開く */
  onShowRecord: () => void
}

/** ホーム画面で見せる代表の神（決定16・18のMVP基準神と同じ恵比寿で統一） */
const FEATURED_GOD = GODS[0]

/**
 * 起動直後に必ず表示するヒーロー画面。
 *
 * CEOが共有した他ゲームのタイトル画面（配色・レイアウトの意匠参考のみ、
 * 文言・ランキング等の機能はSEVEN GODS独自のものに置き換え）をもとに、
 * 「ブランドを一目で伝える入口」を追加した。決定29の`TitleScreen`が
 * 担っていた「続きから／はじめから」もここに統合し、保存データの有無に
 * 関わらず起動時は必ずこの画面を経由するようにした（従来は保存データが
 * 無いと神選択画面へ直行していた）。
 *
 * ランキング・シーズン・プロフィール等（参考画像にあった要素）は、
 * 運営プラットフォームとの連携が前提の別スコープのため今回は含めない。
 */
export function HomeScreen({
  savedBattle,
  onStartFresh,
  onResume,
  onShowTutorial,
  onShowOtomoGrowth,
  onShowRecord,
}: HomeScreenProps) {
  const savedGod = savedBattle ? GODS.find((g) => g.id === savedBattle.godId) : undefined

  return (
    <div className="home-screen">
      <div className="home-hero">
        <div className="home-hero-text">
          <p className="home-eyebrow">SEVENDAO GAMES</p>
          <h1 className="home-title">
            SEVEN <span className="home-title-accent">GODS</span>
          </h1>
          <p className="home-genre-label">共鳴カードバトル</p>
          <p className="home-tagline">七柱の神と挑む、七日間の物語。</p>

          <div className="home-cta-row">
            <button type="button" className="home-cta-primary" onClick={onStartFresh}>
              神を選ぶ
            </button>
            {savedBattle && savedGod && (
              <button type="button" className="home-cta-secondary" onClick={onResume}>
                続きから（{savedGod.nameJa}・ラウンド{savedBattle.round}）
              </button>
            )}
          </div>

          <button type="button" className="home-howto-button" onClick={onShowTutorial}>
            <BookIcon className="home-howto-icon" />
            遊び方を見る
          </button>
          <button type="button" className="home-howto-button" onClick={onShowOtomoGrowth}>
            <HeartIcon className="home-howto-icon" />
            OTOMOとの絆を見る
          </button>
          <button type="button" className="home-howto-button" onClick={onShowRecord}>
            <TrophyIcon className="home-howto-icon" />
            戦績を見る
          </button>
        </div>

        <div className="home-portrait-card">
          <img src={FEATURED_GOD.art.main} alt={FEATURED_GOD.nameJa} />
          <div className="home-portrait-overlay">
            <span className={`god-archetype-badge god-archetype-${FEATURED_GOD.archetype}`}>
              {ARCHETYPE_LABEL[FEATURED_GOD.archetype]}
            </span>
            <span className="home-portrait-name">{FEATURED_GOD.nameJa}</span>
            <span className="home-portrait-tagline">「{FEATURED_GOD.tagline}」</span>
          </div>
        </div>
      </div>
    </div>
  )
}

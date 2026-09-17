import type { GameState } from '../../core/types'
import { GODS } from '../../core/data/gods'
import { isKnownEnemyId, safeEnemyName } from '../enemyLookup'
import { HomeProgressRow, HomeTodayPanel } from './HomeTodayPanel'
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
  /** DAILY-01：今日の神域挑戦画面を開く */
  onShowDaily: () => void
}

/** ホーム画面で見せる代表の神（決定16・18のMVP基準神と同じ恵比寿で統一） */
const FEATURED_GOD = GODS[0]

/**
 * トップ画面専用の高品質キービジュアル（恵比寿のみ）。
 *
 * `god.art.keyvisual`（675×900・quality72、神選択画面の120px角サムネイル用に
 * 最適化した軽量版）をそのままトップ画面のヒーロー枠（`.home-portrait-card`、
 * PC幅で実測CSS約454px、devicePixelRatio 1.5〜2.0の高DPI環境では実質900px超の
 * 解像度が必要）に使うと、高DPI環境で明確に画質が粗く見えることが実機確認で
 * 判明した（CEO実プレイ報告）。トップ画面はゲームの第一印象を左右するため、
 * 原本（`art-source/reference/gods/ebisu-keyvisual.png`、1086×1448。決定170 で配信対象外へ移動、
 * 保護対象・変更禁止）の解像度をアップスケールせずそのまま維持したWebP
 * （quality88、511KB）を別ファイルとして新規に用意した。
 * 神選択画面・recap・他6神はこれまでどおり`god.art.keyvisual`（軽量版）を
 * 使い続けるため、ここではFEATURED_GOD側の`art.keyvisual`を上書きせず、
 * トップ画面専用のローカル定数として分離している。
 */
const EBISU_HERO_IMAGE = '/assets/gods/ebisu/keyvisual-hero.webp'

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
  onShowDaily,
}: HomeScreenProps) {
  const savedGod = savedBattle ? GODS.find((g) => g.id === savedBattle.godId) : undefined
  const savedIsDaily = savedBattle?.mode === 'daily'
  // Phase 7 P1（決定187）：続きがあるときは「続きから」をページ最上位の Primary にし、相手の敵名も出す
  // Post-P2 Hardening（決定191）：保存データが壊れて現在の敵定義に存在しない ID が入っていた場合、
  // Battle 側は安全に処理できない（多数の getEnemyDef 呼び出しが未防御）ため、Resume 自体を出さない。
  // 保存データは削除・修正しない（「神を選ぶ」で新しく始めることはできる）
  const savedEnemyKnown = savedBattle ? isKnownEnemyId(savedBattle.enemy.defId) : false
  const savedEnemyName = savedBattle ? safeEnemyName(savedBattle.enemy.defId) : ''
  const canResume = !!(savedBattle && savedGod && savedEnemyKnown)

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

          {/* Phase 7 P1（決定187・仕様 §8）：続き（ある時）→ 神を選ぶ → 今日の神域挑戦 → 進行 → リンク */}
          <div className={`home-cta-row${canResume ? ' home-cta-row-resume' : ''}`}>
            {canResume && savedBattle && savedGod && (
              <button type="button" className="home-cta-primary home-cta-resume" data-testid="home-resume" onClick={onResume}>
                <span className="home-cta-resume-label">続きから</span>
                <span className="home-cta-resume-detail">
                  {savedIsDaily ? '神域挑戦・' : ''}
                  {savedGod.nameJa} vs {savedEnemyName}・ラウンド{savedBattle.round}
                </span>
              </button>
            )}
            <button
              type="button"
              className={canResume ? 'home-cta-secondary' : 'home-cta-primary'}
              data-testid="home-start"
              onClick={onStartFresh}
            >
              神を選ぶ
            </button>
          </div>

          <HomeTodayPanel onOpenDaily={onShowDaily} />
          <HomeProgressRow />

          <div className="home-links">
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
        </div>

        <div className="home-portrait-card">
          {/* 七神キービジュアル採用：`.home-portrait-card`は元々aspect-ratio:3/4で、
              恵比寿キービジュアル原本（1086×1448＝ちょうど3:4）と寸法がほぼ一致するため
              クロップがごく少なく収まる。object-positionの個別調整は不要だった。
              トップ画質改善：軽量版（god.art.keyvisual）ではなくトップ専用の
              高品質版（EBISU_HERO_IMAGE）を使う。 */}
          <img src={EBISU_HERO_IMAGE} alt={FEATURED_GOD.nameJa} width={1086} height={1448} />
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

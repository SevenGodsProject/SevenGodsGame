import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../../core/types'
import { GODS } from '../../core/data/gods'
import { RULES } from '../../core/data/rules'
import { isKnownEnemyId, safeEnemyName } from '../enemyLookup'
import { HomeProgressRow, HomeTodayPanel } from './HomeTodayPanel'
import { ARCHETYPE_LABEL } from './godStyle'
import { heroImageOf, selectHeroGod } from './heroGod'
import { hasPlayTrace, selectHomePrimary } from './homePrimary'
import { HeartIcon, TrophyIcon } from '../icons'
import { loadLastUsedGodId } from '../../hooks/deckPreferenceStorage'
import { loadGodRecord } from '../../hooks/recordStorage'
import { dailyAttemptsLeft, loadDailyDay, loadRecentDailyDays } from '../../hooks/dailyStorage'
import { todayDailyKey } from '../../hooks/dailyClock'
import { dailyBossFor } from '../../core/data/dailyBoss'
import { useMinuteClock } from '../../hooks/useMinuteClock'
import './setup.css'

type HomeScreenProps = {
  /** 保存済みの進行中バトル（無ければnull）。決定29のTitleScreenの役割をここに統合した */
  savedBattle: GameState | null
  onStartFresh: () => void
  onResume: () => void
  /** Phase 7 Entrance E1（決定193）：「初陣へ」。短い説明を開き、そこから初陣を始める */
  onStartFirstBattle: () => void
  /** Task C2：OTOMO育成画面を開く */
  onShowOtomoGrowth: () => void
  /** Task E1：戦績画面を開く */
  onShowRecord: () => void
  /** DAILY-01：今日の神域挑戦画面を開く */
  onShowDaily: () => void
}

/**
 * 起動直後に必ず表示するホーム画面。
 *
 * Phase 7 Entrance E1（決定193、`docs/PHASE7_ENTRANCE_E1_MINIMAL_SPEC.md`）で、
 * 「左に文字・右に枠入りの恵比寿」のランディングページ型の構図から、
 * **神の絵そのものを入口の場面にする**構図へ組み替えた：
 *   - 中心の神（Hero God）＝続きの神 → 最後にデッキを確定した神 → 恵比寿（`heroGod.ts`）
 *   - 金色の Primary は常に 1 個（`homePrimary.ts`）：続きから／初陣へ／神域へ挑む／神を選ぶ
 *   - 今日の敵は `dailyBossFor` の定義から（storage を経由しない）Today ブロックに小さく出す
 *   - 「遊び方を見る」はヘッダーの本のアイコン（同じ機能）に一本化。戦績・OTOMO の 2 リンクを残す
 * Home は表示のために storage を一切書かない（読み取り関数だけを呼ぶ）。
 */
export function HomeScreen({
  savedBattle,
  onStartFresh,
  onResume,
  onStartFirstBattle,
  onShowOtomoGrowth,
  onShowRecord,
  onShowDaily,
}: HomeScreenProps) {
  const nowMs = useMinuteClock()
  // Entrance E1（決定193・仕様 §14）：LCP は Hero 画像の読み込み完了で決まる。回線の細い端末では、同じ初期画面にある
  // 今日の敵の絵（〜180KB）を同時に取りに行くと帯域を取り合って Hero が遅れる（実測：SP 1.6Mbps で LCP 5.4 → 6.8 秒）。
  // そこで敵の絵は Hero 画像の読み込みが終わってから（失敗した場合も）読み込む。箱の寸法は固定なので CLS は出ない。
  const heroImgRef = useRef<HTMLImageElement>(null)
  const [heroSettled, setHeroSettled] = useState(false)
  useEffect(() => {
    // キャッシュ済みで React が onLoad を付ける前に読み終わっていた場合の取りこぼし防止
    if (heroImgRef.current?.complete) setHeroSettled(true)
  }, [])
  const savedGod = savedBattle ? GODS.find((g) => g.id === savedBattle.godId) : undefined
  const savedIsDaily = savedBattle?.mode === 'daily'
  // Phase 7 P1（決定187）：続きがあるときは「続きから」をページ最上位の Primary にし、相手の敵名も出す
  // Post-P2 Hardening（決定191）：保存データが壊れて現在の敵定義に存在しない ID が入っていた場合、
  // Battle 側は安全に処理できない（多数の getEnemyDef 呼び出しが未防御）ため、Resume 自体を出さない。
  // 保存データは削除・修正しない（「神を選ぶ」で新しく始めることはできる）
  const savedEnemyKnown = savedBattle ? isKnownEnemyId(savedBattle.enemy.defId) : false
  const savedEnemyName = savedBattle ? safeEnemyName(savedBattle.enemy.defId) : ''
  const canResume = !!(savedBattle && savedGod && savedEnemyKnown)

  // Entrance E1：Hero God と Primary の状態（すべて読み取りのみ）
  const lastUsedGodId = loadLastUsedGodId()
  const { god: heroGod } = selectHeroGod({
    resumeGodId: canResume && savedGod ? savedGod.id : null,
    lastUsedGodId,
  })
  const heroImage = heroImageOf(heroGod)
  const todayKey = todayDailyKey(new Date(nowMs))
  const today = loadDailyDay(todayKey)
  const playTrace = hasPlayTrace({
    hasSavedBattle: savedBattle !== null,
    godRecords: GODS.map((god) => loadGodRecord(god.id)),
    lastUsedGodId,
    dailyAttemptsUsed: loadRecentDailyDays(RULES.daily.retentionDays).map((day) => day.attemptsUsed),
  })
  const primary = selectHomePrimary({
    canResume,
    playTrace,
    todayAttemptsUsed: today.attemptsUsed,
    todayAttemptsLeft: dailyAttemptsLeft(todayKey),
  })
  const todayEnemyName = safeEnemyName(dailyBossFor(todayKey).enemyId)

  return (
    <div className={`home-screen home-state-${primary}`} data-testid="home-screen" data-primary={primary}>
      <div className="home-hero-art" data-testid="home-hero-god" data-god={heroGod.id}>
        <img
          ref={heroImgRef}
          className="home-hero-img"
          src={heroImage.src}
          alt={heroGod.nameJa}
          width={heroImage.width}
          height={heroImage.height}
          style={{ objectPosition: heroImage.focus }}
          fetchPriority="high"
          decoding="async"
          onLoad={() => setHeroSettled(true)}
          onError={() => setHeroSettled(true)}
        />
        <div className="home-hero-caption">
          <span className={`god-archetype-badge god-archetype-${heroGod.archetype}`}>
            {ARCHETYPE_LABEL[heroGod.archetype]}
          </span>
          <span className="home-hero-name">{heroGod.nameJa}</span>
          <span className="home-hero-tagline">「{heroGod.tagline}」</span>
        </div>
      </div>

      <div className="home-panel">
        <div className="home-brand">
          <p className="home-eyebrow">SEVENDAO GAMES</p>
          <h1 className="home-title">
            SEVEN <span className="home-title-accent">GODS</span>
          </h1>
          <p className="home-genre-label">共鳴カードバトル</p>
          <p className="home-tagline">七柱の神と挑む、七日間の物語。</p>
        </div>

        {/* Entrance E1（仕様 §6）：金色の Primary はちょうど 1 個。Secondary は枠のみで最大 1 個 */}
        <div className={`home-cta-row${canResume ? ' home-cta-row-resume' : ''}`}>
          {primary === 'resume' && savedBattle && savedGod && (
            <button type="button" className="home-cta-primary home-cta-resume" data-testid="home-resume" onClick={onResume}>
              <span className="home-cta-resume-label">続きから</span>
              <span className="home-cta-resume-detail">
                {savedIsDaily ? '神域挑戦・' : ''}
                {savedGod.nameJa} vs {savedEnemyName}・ラウンド{savedBattle.round}
              </span>
            </button>
          )}
          {primary === 'firstBattle' && (
            <button
              type="button"
              className="home-cta-primary home-cta-resume"
              data-testid="home-first-battle"
              onClick={onStartFirstBattle}
            >
              <span className="home-cta-resume-label">初陣へ</span>
              <span className="home-cta-resume-detail">おすすめの構成ですぐ戦う</span>
            </button>
          )}
          {primary === 'daily' && (
            <button type="button" className="home-cta-primary home-cta-resume" data-testid="home-today-cta" onClick={onShowDaily}>
              <span className="home-cta-resume-label">神域へ挑む</span>
              <span className="home-cta-resume-detail">
                今日の試練：{todayEnemyName}・残り {dailyAttemptsLeft(todayKey)}/{RULES.daily.attemptsPerDay}
              </span>
            </button>
          )}
          <button
            type="button"
            className={primary === 'normal' ? 'home-cta-primary' : 'home-cta-secondary'}
            data-testid="home-start"
            onClick={onStartFresh}
          >
            神を選ぶ
          </button>
        </div>

        <HomeTodayPanel onOpenDaily={onShowDaily} showCta={primary !== 'daily'} showEnemyArt={heroSettled} />
        <HomeProgressRow showLockedStake={playTrace} />

        <div className="home-links">
          <button type="button" className="home-howto-button" onClick={onShowRecord}>
            <TrophyIcon className="home-howto-icon" />
            戦績を見る
          </button>
          <button type="button" className="home-howto-button" onClick={onShowOtomoGrowth}>
            <HeartIcon className="home-howto-icon" />
            OTOMOとの絆を見る
          </button>
        </div>
      </div>
    </div>
  )
}

import { GODS } from '../../core/data/gods'
import { getEnemyDef } from '../../core/data/enemies'
import { dailyBossFor } from '../../core/data/dailyBoss'
import { RULES } from '../../core/data/rules'
import { stakeLabel } from '../../core/data/stakes'
import { formatDailyCountdown, msUntilNextDailyKey, todayDailyKey } from '../../hooks/dailyClock'
import { bestResultOf, dailyAttemptsLeft, loadDailyDay } from '../../hooks/dailyStorage'
import { loadGodRecord } from '../../hooks/recordStorage'
import { isStakeUnlocked, loadGodStakeRecord } from '../../hooks/stakeStorage'
import { loadOtomoBond } from '../../hooks/otomoBondStorage'
import { useMinuteClock } from '../../hooks/useMinuteClock'
import { formatScaled } from '../displayScale'
import { DailyStatusBadge } from './DailyStatusBadge'
import { DAILY_THREAT_STARS } from './DailyChallengeScreen'
import { computeSevenBondSummary } from './otomoGrowthDisplay'
import './setup.css'
import './daily.css'

/**
 * Phase 7 P1（決定187・仕様 §8）：ホームの「今日の神域挑戦」パネル。
 *
 * 起動後 3 秒で「今日何をするか」が分かることが目的なので、出すのは 4 つだけ：
 * 今日の敵／残り N/3／今日のベスト／挑戦ボタン。「次の敵まで HH:MM」は残り 0 回のときだけ。
 *
 * **表示専用・読み取りのみ**。神域挑戦の開始（回数の消費）は従来どおり神域挑戦画面の
 * 「挑戦開始」→ … → `beginDailyChallenge` だけで、このパネルのボタンは神域挑戦画面を開くだけ。
 * 画像は出さない（ファーストビューの高さと CLS を増やさないため。敵の絵は神域挑戦画面にある）。
 */
export function HomeTodayPanel({ onOpenDaily }: { onOpenDaily: () => void }) {
  // 分単位で再描画する：残り時間の表示と、日付が変わったときの今日の敵の切替のため
  const nowMs = useMinuteClock()
  const now = new Date(nowMs)
  const dateKey = todayDailyKey(now)
  const boss = dailyBossFor(dateKey)
  const def = getEnemyDef(boss.enemyId)
  const day = loadDailyDay(dateKey)
  const attemptsLeft = dailyAttemptsLeft(dateKey)
  const exhausted = attemptsLeft <= 0
  const best = bestResultOf(day)
  const bestGod = day.bestGodId ? GODS.find((g) => g.id === day.bestGodId)?.nameJa : undefined

  return (
    <section
      className={`home-today${exhausted ? ' home-today-exhausted' : ''}`}
      data-testid="home-today"
      aria-label="今日の神域挑戦"
      style={{ ['--daily-accent' as string]: def.stage.accent }}
    >
      <div className="home-today-head">
        <span className="home-today-title">今日の神域挑戦</span>
        <span className="daily-stars" aria-label={`脅威度 ${DAILY_THREAT_STARS} / 5`}>
          {'★'.repeat(DAILY_THREAT_STARS)}
        </span>
        <span className="home-today-date" data-testid="home-today-date">
          {dateKey}
        </span>
      </div>
      <div className="home-today-body">
        <div className="home-today-info">
          <p className="home-today-enemy" data-testid="home-today-enemy">
            <strong>{def.name}</strong>
            <span className="home-today-type">【{def.typeLabel}】</span>
            <span className="daily-chip">神域強化</span>
          </p>
          <p className="home-today-status" data-testid="home-today-status">
            <span data-testid="home-today-attempts">
              {exhausted ? `今日の${RULES.daily.attemptsPerDay}回は終了` : `残り ${attemptsLeft}/${RULES.daily.attemptsPerDay}`}
            </span>
            <span className="home-today-sep" aria-hidden="true">
              ・
            </span>
            {day.bestScore > 0 ? (
              <span data-testid="home-today-best">
                今日のベスト {formatScaled(day.bestScore)}
                {bestGod ? `（${bestGod}）` : ''}
                {best && (
                  <>
                    {' '}
                    <DailyStatusBadge status={best.status} />
                  </>
                )}
              </span>
            ) : (
              <span data-testid="home-today-best">まだ挑戦していません</span>
            )}
          </p>
          {exhausted && (
            <p className="home-today-countdown" data-testid="home-today-countdown">
              次の敵まで {formatDailyCountdown(msUntilNextDailyKey(now))}
            </p>
          )}
        </div>
        <button type="button" className="home-today-cta" data-testid="home-today-cta" onClick={onOpenDaily}>
          {exhausted ? '今日の記録を見る' : `挑戦する（残り${attemptsLeft}回）`}
        </button>
      </div>
    </section>
  )
}

/**
 * Phase 7 P1（仕様 §8-1）：ホームの「進行」行。神階／七柱との絆／自己ベストを小さな文字チップで 1 行に。
 * データの無いチップは出さない。**操作要素にはしない**（同じ行き先＝OTOMO・戦績は直下のリンク行に
 * 既にあり、ボタンを増やすと CTA 過多と PC 660px 高での押し出しを招くため）。
 */
export function HomeProgressRow() {
  const stakeRecords = GODS.map((god) => ({ god, rec: loadGodStakeRecord(god.id) }))
  const topStake = stakeRecords.reduce<(typeof stakeRecords)[number] | null>(
    (top, cur) => (cur.rec.maxCleared > (top?.rec.maxCleared ?? 0) ? cur : top),
    null,
  )
  const unlockedGod = GODS.find((god) => isStakeUnlocked(god.id))
  const stakeText = topStake
    ? `神階：最高 ${stakeLabel(topStake.rec.maxCleared)}（${topStake.god.nameJa}）`
    : unlockedGod
      ? `神階：解放済み（${unlockedGod.nameJa}）`
      : '神階：🔒「むずかしい」撃破で解放'

  const bond = computeSevenBondSummary(GODS.map((god) => loadOtomoBond(god.id)))
  const bestRecord = GODS.map((god) => ({ god, best: loadGodRecord(god.id).bestBattleScore })).reduce<{
    god: (typeof GODS)[number]
    best: number
  } | null>((top, cur) => (cur.best > (top?.best ?? 0) ? cur : top), null)

  return (
    <ul className="home-progress" data-testid="home-progress" aria-label="これまでの進行">
      <li className="home-progress-chip">{stakeText}</li>
      {bond.achievedCount > 0 && (
        <li className="home-progress-chip">
          七柱との絆 {bond.achievedCount}/{bond.total}
        </li>
      )}
      {bestRecord && (
        <li className="home-progress-chip">
          自己ベスト {formatScaled(bestRecord.best)}（{bestRecord.god.nameJa}）
        </li>
      )}
    </ul>
  )
}

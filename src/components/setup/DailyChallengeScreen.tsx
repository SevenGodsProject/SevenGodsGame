import { GODS } from '../../core/data/gods'
import { getEnemyDef } from '../../core/data/enemies'
import { dailyBossFor } from '../../core/data/dailyBoss'
import { RULES } from '../../core/data/rules'
import { bestResultOf, bestResultsByGod, dailyAttemptsLeft, loadDailyDay } from '../../hooks/dailyStorage'
import { formatScaled } from '../displayScale'
import { DailyStatusBadge } from './DailyStatusBadge'
import './setup.css'
import './daily.css'
import '../polish.css'

type DailyChallengeScreenProps = {
  /** 今日の日付キー（JST）。GameFlowが`todayDailyKey()`で確定して渡す */
  dateKey: string
  /** 「挑戦開始」→ 神選択へ（難易度ステップは無し） */
  onStart: () => void
  onBack: () => void
}

/** Daily専用の★表示。`EnemyDef.rank`ではなく「神域強化状態＝5」を常に満たす */
export const DAILY_THREAT_STARS = 5

function godName(godId: string | null): string {
  if (!godId) return '—'
  return GODS.find((g) => g.id === godId)?.nameJa ?? '—'
}

/**
 * DAILY-01：神域挑戦の入口。
 * 「毎日、全員が同じボス・同じSeedに3回だけ挑戦し、神・OTOMO・デッキ・プレイングを
 * 工夫してその日の最高スコアを狙う」ことを、この1画面で説明し切る。
 * 敵選択・難易度選択はDailyには無い（挑戦開始→神選択→デッキ→バトル）。
 * 「ランキング」の語はオンライン実装まで使わない（決定73の免責と同じ方針）。
 */
export function DailyChallengeScreen({ dateKey, onStart, onBack }: DailyChallengeScreenProps) {
  const boss = dailyBossFor(dateKey)
  const def = getEnemyDef(boss.enemyId)
  const day = loadDailyDay(dateKey)
  const attemptsLeft = dailyAttemptsLeft(dateKey)
  const exhausted = attemptsLeft <= 0
  const stars = '★'.repeat(DAILY_THREAT_STARS)
  // 8/31 P0-3：神別ベストは保存済みbestByGodの値を、勝敗付きで表示するだけ（新しい計算は無い）
  const bestResult = bestResultOf(day)
  const byGodResults = bestResultsByGod(day)
  const byGod = GODS.filter((g) => (day.bestByGod[g.id] ?? 0) > 0)

  return (
    <div className="setup-screen daily-screen">
      <h1 className="setup-title">今日の神域挑戦</h1>
      <p className="setup-subtitle">
        毎日ひとつの敵が「神域強化」されて現れます。今日は全員が同じ敵・同じ運（Seed）に挑み、
        神・OTOMO・デッキ・プレイングの工夫でその日の最高スコアを競います。
      </p>

      <div className="daily-boss-card" style={{ ['--daily-accent' as string]: def.stage.accent }}>
        <img className="daily-boss-art" src={def.art} alt={def.name} />
        <div className="daily-boss-body">
          <span className="daily-boss-label">TODAY&apos;S BOSS ・ {dateKey}</span>
          <h2 className="daily-boss-name">{def.name}</h2>
          <div className="daily-boss-meta">
            <span className="daily-threat" aria-label={`脅威度 ${DAILY_THREAT_STARS} / 5`}>
              {stars}
            </span>
            <span className="daily-chip">神域強化</span>
            <span className="daily-chip daily-chip-stage">{def.stage.nameJa}</span>
            <span>【{def.typeLabel}】</span>
          </div>
          <p className="daily-boss-hint">{def.typeDescription}</p>
        </div>
      </div>

      <div className="daily-facts">
        <div className="daily-fact">
          <span className="daily-fact-label">SEED ID</span>
          <span className="daily-fact-value daily-seed-id">{boss.seedId}</span>
          <span className="daily-fact-sub">全員この値です（共通条件）</span>
        </div>
        <div className="daily-fact">
          <span className="daily-fact-label">今日の自己ベスト</span>
          <span className="daily-fact-value">
            {day.bestScore > 0 ? formatScaled(day.bestScore) : '—'}
            {bestResult && (
              <>
                {' '}
                <DailyStatusBadge status={bestResult.status} />
              </>
            )}
          </span>
          <span className="daily-fact-sub">{day.bestScore > 0 ? `使用神：${godName(day.bestGodId)}` : 'まだ挑戦していません'}</span>
        </div>
        <div className="daily-fact">
          <span className="daily-fact-label">残り挑戦回数</span>
          <span className="daily-fact-value">
            {attemptsLeft} / {RULES.daily.attemptsPerDay}
          </span>
          <span className="daily-fact-sub">3回のうち最高スコアが「今日のベスト」</span>
        </div>
      </div>

      {byGod.length > 0 && (
        <>
          <h3 className="daily-bygod-title">神別の今日のベスト</h3>
          <table className="daily-bygod-table" aria-label="神別の今日のベスト">
            <thead>
              <tr>
                <th>神</th>
                <th className="num">今日のベスト</th>
                <th>勝敗</th>
                <th className="num">到達R</th>
              </tr>
            </thead>
            <tbody>
              {byGod.map((g) => {
                const r = byGodResults[g.id]
                return (
                  <tr key={g.id}>
                    <td>{g.nameJa}</td>
                    <td className="num">{formatScaled(day.bestByGod[g.id] ?? 0)}</td>
                    <td>{r ? <DailyStatusBadge status={r.status} /> : '—'}</td>
                    <td className="num">{r ? `R${r.round}` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}

      <div className="daily-rules">
        <strong>全員共通の条件：</strong>敵・Seed・神域強化（敵HP ×{RULES.daily.modifier.enemyHpMul}・攻撃 ×
        {RULES.daily.modifier.enemyAtkMul}、難易度は「ふつう」基準）。
        <br />
        <strong>自由に選べるもの：</strong>神・OTOMOの絆・デッキ。敵選択と難易度選択はありません。
        <br />
        スコアの計算は通常と同じです。日付は日本時間の0:00に切り替わります。
      </div>

      <div className="daily-actions">
        <button type="button" className="home-cta-primary" onClick={onStart} disabled={exhausted}>
          {exhausted ? '今日の挑戦は終了' : `挑戦開始（残り${attemptsLeft}回）`}
        </button>
        <button type="button" className="home-cta-secondary" onClick={onBack}>
          ‹ ホームへ戻る
        </button>
        {exhausted && <span className="daily-note-exhausted">また明日、新しい敵が待っています。</span>}
      </div>
    </div>
  )
}

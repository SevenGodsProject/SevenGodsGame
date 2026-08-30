import type { Difficulty } from '../../core/types'
import { GODS } from '../../core/data/gods'
import { loadGodRecord, type GodRecord } from '../../hooks/recordStorage'
import { bestResultOf, loadRecentDailyDays } from '../../hooks/dailyStorage'
import { loadGodStakeRecord } from '../../hooks/stakeStorage'
import { STAKE_LEVELS, getStakeLevelDef } from '../../core/data/stakes'
import { DailyStatusBadge } from './DailyStatusBadge'
import { getEnemyDef } from '../../core/data/enemies'
import { RULES } from '../../core/data/rules'
import { formatScaled } from '../displayScale'
import { ARCHETYPE_LABEL } from './godStyle'
import './setup.css'
import './daily.css'

type RecordScreenProps = {
  onBack: () => void
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'かんたん',
  normal: 'ふつう',
  hard: 'むずかしい',
}

/** 1件も対局していない神かどうか（表示を「まだ記録がありません」に切り替える判定） */
function hasAnyRecord(record: GodRecord): boolean {
  return record.wins > 0 || record.losses > 0 || record.finished > 0
}

/**
 * Task E1（決定73）：戦績画面。
 *
 * `recordStorage.ts`（決定48フォローアップ）に既に保存されている戦績を、
 * 7神を横並びで比較できる形で可視化するだけの画面。**新しいランキング
 * ロジック・スコア計算・保存フィールドは一切追加しない**（CEO指示どおり
 * 既存データの可視化に限定。`GodRecord`の形は無変更）。
 *
 * `GodSelectScreen`が自己ベスト（`bestScore`・`wins`のみ）をカードの隅に
 * 一言添える形だったのに対し、この画面は`GodRecord`の全フィールド
 * （bestScore・bestScoreDifficulty・wins・losses・finished・
 * fastestWinRound）を1箇所にまとめて見せる、戦績専用の画面という位置づけ。
 *
 * `OtomoGrowthScreen`（決定71）と同じ「マウント時点でlocalStorageを
 * 1回だけ読む」設計・同じカードグリッドの視覚言語を踏襲する。
 */
export function RecordScreen({ onBack }: RecordScreenProps) {
  // DAILY-01：神域挑戦の直近7日。通常モードの神別自己ベストとは別のkeyから読む（混ぜない）
  const dailyDays = loadRecentDailyDays(7)
  return (
    <div className="setup-screen">
      <h1 className="setup-title">戦績</h1>
      <p className="setup-subtitle">
        神ごとの自己ベストと対局数です（この端末に保存された記録の表示のみ。ランキングやオンライン通信はありません）。
      </p>

      <section className="record-daily" aria-label="神域挑戦の記録">
        <h2 className="record-daily-title">神域挑戦（直近7日）</h2>
        {dailyDays.length === 0 ? (
          <p className="record-daily-empty">まだ神域挑戦の記録がありません。ホームの「今日の神域挑戦」から挑めます。</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="record-daily-table">
              <thead>
                <tr>
                  <th>日付</th>
                  <th>今日の敵</th>
                  <th className="num">今日のベスト</th>
                  <th>勝敗</th>
                  <th>使用神</th>
                  <th className="num">挑戦</th>
                </tr>
              </thead>
              <tbody>
                {dailyDays.map((day) => (
                  <tr key={day.dateKey}>
                    <td>{day.dateKey}</td>
                    <td>{getEnemyDef(day.enemyId).name}</td>
                    <td className="num">{day.bestScore > 0 ? formatScaled(day.bestScore) : '—'}</td>
                    <td>{(() => { const r = bestResultOf(day); return r ? <DailyStatusBadge status={r.status} /> : '—' })()}</td>
                    <td>{day.bestGodId ? (GODS.find((g) => g.id === day.bestGodId)?.nameJa ?? '—') : '—'}</td>
                    <td className="num">
                      {day.attemptsUsed} / {RULES.daily.attemptsPerDay}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="record-grid">
        {GODS.map((god) => {
          const record = loadGodRecord(god.id)
          const played = hasAnyRecord(record)
          // 決定126：神階の到達と段別ベスト（別キー。通常の自己ベストには混ぜない）
          const stakeRec = loadGodStakeRecord(god.id)
          const stakeBests = STAKE_LEVELS.filter((lv) => (stakeRec.bestByStake[String(lv.level)] ?? 0) > 0)
          return (
            <div className="record-card" key={god.id}>
              <div className="record-card-head">
                <span className={`god-archetype-badge god-archetype-${god.archetype}`}>
                  {ARCHETYPE_LABEL[god.archetype]}
                </span>
                <span className="record-card-name">{god.nameJa}</span>
              </div>

              {played ? (
                <>
                  {/* STEP-SCORE2-D-PROTO：自己ベストは新スコア式（bestBattleScore）を表示。
                      新式での記録がまだ無い場合のみ、旧式の記録を「（旧形式）」付きで表示する
                      （新旧のスコア式はスケールが異なり直接比較できないため）。 */}
                  <div className="record-best">
                    自己ベスト{' '}
                    <strong>
                      {/* D2b：新式ベストは表示×10。旧形式の記録は当時のスケールのまま出す
                          （×10すると新式と同次元に見えて混乱するため） */}
                      {record.bestBattleScore > 0
                        ? formatScaled(record.bestBattleScore)
                        : record.bestScore}
                    </strong>
                    {record.bestBattleScore > 0
                      ? record.bestBattleScoreDifficulty && (
                          <span className="record-best-difficulty">
                            （{DIFFICULTY_LABEL[record.bestBattleScoreDifficulty]}）
                          </span>
                        )
                      : record.bestScore > 0 && (
                          <span className="record-best-difficulty">（旧形式）</span>
                        )}
                  </div>
                  <div className="record-stats">
                    <div className="record-stat">
                      <span className="record-stat-value">{record.wins}</span>
                      <span className="record-stat-label">勝利</span>
                    </div>
                    <div className="record-stat">
                      <span className="record-stat-value">{record.losses}</span>
                      <span className="record-stat-label">敗北</span>
                    </div>
                    <div className="record-stat">
                      <span className="record-stat-value">{record.finished}</span>
                      <span className="record-stat-label">未撃破</span>
                    </div>
                    <div className="record-stat">
                      <span className="record-stat-value">
                        {record.fastestWinRound !== null ? `R${record.fastestWinRound}` : '—'}
                      </span>
                      <span className="record-stat-label">最速撃破</span>
                    </div>
                  </div>
                  {(stakeRec.maxCleared > 0 || stakeBests.length > 0) && (
                    <div className="record-stake">
                      <div className="record-stake-reach">
                        神階 最高到達{' '}
                        <strong>
                          {stakeRec.maxCleared > 0
                            ? `${getStakeLevelDef(stakeRec.maxCleared)?.numeral} ${getStakeLevelDef(stakeRec.maxCleared)?.nameJa}`
                            : '—'}
                        </strong>
                      </div>
                      {stakeBests.length > 0 && (
                        <div className="record-stake-bests">
                          {stakeBests.map((lv) => (
                            <span key={lv.level} className="record-stake-best">
                              {lv.numeral} {formatScaled(stakeRec.bestByStake[String(lv.level)] ?? 0)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="record-empty">まだ記録がありません</div>
              )}
            </div>
          )
        })}
      </div>

      <button type="button" className="home-cta-secondary record-back" onClick={onBack}>
        ‹ ホームへ戻る
      </button>
    </div>
  )
}

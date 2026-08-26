import type { Difficulty } from '../../core/types'
import { GODS } from '../../core/data/gods'
import { loadGodRecord, type GodRecord } from '../../hooks/recordStorage'
import { formatScaled } from '../displayScale'
import { ARCHETYPE_LABEL } from './godStyle'
import './setup.css'

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
  return (
    <div className="setup-screen">
      <h1 className="setup-title">戦績</h1>
      <p className="setup-subtitle">
        神ごとの自己ベストと対局数です（この端末に保存された記録の表示のみ。ランキングやオンライン通信はありません）。
      </p>

      <div className="record-grid">
        {GODS.map((god) => {
          const record = loadGodRecord(god.id)
          const played = hasAnyRecord(record)
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

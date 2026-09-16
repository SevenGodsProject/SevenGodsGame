import { useState } from 'react'
import { GODS } from '../../core/data/gods'
import { ENEMIES } from '../../core/data/enemies'
import { dailyKeyOf } from '../../core/data/dailyBoss'
import {
  countMatchupsByEnemy,
  countMatchupsTotal,
  isMatchupCleared,
  loadMatchups,
  MATCHUP_TOTAL,
} from '../../hooks/matchupStorage'
import './setup.css'

/**
 * Phase 7 P2（決定189・仕様 §8・§13・§14）：戦績画面の「神×敵 攻略」。
 *
 * 7×7 の表にはしない（390px で敵を判別できないため）。**敵ごとの行**に、その敵を倒した神を
 * 7 柱のチップで並べる。見せたいのは「この敵、まだ◯◯（別の神）では倒していない」。
 *
 * - 撃破済み：神の顔を通常色＋金の実線枠＋✓、名前を金色太字
 * - 未撃破：顔を灰色＋点線枠、✓ なし、名前を灰色（色だけで区別しない）
 * - チップは表示のみ（押して対戦を始める導線は作らない）
 * - 数字は「この敵 k/7 神」と節見出しの「N/49」だけ（Home・結果画面には N/49 を出さない）
 * - 画像は既存の神の立ち絵・敵の絵を縮小表示するだけ（新規 asset なし）
 *
 * マウント時に 1 回だけ読む（他の戦績と同じ）。記録キーが無ければこの読み込みで導入時の取り込みが行われる。
 */
export function MatchupBoard() {
  const [view] = useState(() => loadMatchups())
  const { data } = view
  const total = countMatchupsTotal(data)
  const seededDate = data.seeded.at > 0 ? dailyKeyOf(new Date(data.seeded.at)) : null

  return (
    <section className="matchup-board" aria-label="神×敵 攻略" data-testid="matchup-board">
      <div className="matchup-board-head">
        <h2 className="matchup-board-title">神×敵 攻略</h2>
        <span className="matchup-board-total" data-testid="matchup-total">
          {total} / {MATCHUP_TOTAL}
        </span>
      </div>
      <p className="matchup-board-rule" data-testid="matchup-rule">
        その神でその敵に1回勝つと ✓ が付きます（難易度・神階・神域挑戦を問いません）。
      </p>
      {!view.available && (
        <p className="matchup-board-note">この端末では記録を保存できないため、攻略状況を表示できません。</p>
      )}
      {view.available && seededDate && (
        <p className="matchup-board-note" data-testid="matchup-seeded-note">
          {seededDate} 以降の勝利と、神域挑戦の直近の勝利から記録しています。
        </p>
      )}
      <div className="matchup-rows">
        {ENEMIES.map((enemy) => {
          const count = countMatchupsByEnemy(data, enemy.id)
          return (
            <section className="matchup-row" key={enemy.id} data-testid="matchup-row" data-enemy={enemy.id} aria-label={`${enemy.name}：${count} / ${GODS.length} 神で撃破`}>
              <div className="matchup-row-head">
                <img className="matchup-enemy-art" src={enemy.art} alt="" width={48} height={48} loading="lazy" decoding="async" />
                <div className="matchup-enemy-text">
                  <span className="matchup-enemy-name">{enemy.name}</span>
                  <span className="matchup-enemy-type">【{enemy.typeLabel}】</span>
                </div>
                <span className={`matchup-enemy-count${count > 0 ? ' matchup-enemy-count-some' : ''}`} data-testid="matchup-enemy-count">
                  {count} / {GODS.length} 神
                </span>
              </div>
              <ul className="matchup-chips">
                {GODS.map((god) => {
                  const cleared = isMatchupCleared(data, god.id, enemy.id)
                  return (
                    <li
                      key={god.id}
                      className={`matchup-chip ${cleared ? 'matchup-chip-cleared' : 'matchup-chip-open'}`}
                      data-testid="matchup-chip"
                      data-god={god.id}
                      data-cleared={cleared ? 'true' : 'false'}
                      aria-label={`${god.nameJa}：${cleared ? '撃破済み' : '未撃破'}`}
                    >
                      <span className="matchup-chip-face">
                        <img src={god.art.front} alt="" width={34} height={34} loading="lazy" decoding="async" />
                        {cleared && (
                          <span className="matchup-chip-check" aria-hidden="true" data-testid="matchup-check">
                            ✓
                          </span>
                        )}
                      </span>
                      <span className="matchup-chip-name">{god.nameJa}</span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </section>
  )
}

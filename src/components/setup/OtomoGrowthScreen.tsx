import { GODS } from '../../core/data/gods'
import { getOtomoDef } from '../../core/data/otomo'
import { loadOtomoBond } from '../../hooks/otomoBondStorage'
import { computeOtomoGrowthDisplay } from './otomoGrowthDisplay'
import { OTOMO_THEME_COLOR } from './godStyle'
import './setup.css'

/** 絆ランク★の最大数（bondTierの最大値と一致。tier0〜3の4段階だが★は1〜3の3段階で表現） */
const BOND_RANK_MAX = 3

type OtomoGrowthScreenProps = {
  onBack: () => void
}

/**
 * Task C2（決定71）：OTOMO育成画面。
 *
 * 7神ぶんのOTOMOについて、`otomoBondStorage.ts`（決定70）が対局終了ごとに
 * 記録した育成データ（表示専用、戦闘バランスには一切影響しない）を、
 * 親密度Lv・進捗バー・共鳴成長ポイント・絆テキストとして一覧表示する。
 *
 * `GodSelectScreen`の自己ベスト表示と同じ「マウント時点でlocalStorageを
 * 1回だけ読む」設計。この画面自体、ホーム⇔遷移のたびに再マウントされる
 * （`GameFlow`が条件分岐でコンポーネントを切り替える方式のため）ので、
 * 常に最新の記録が表示される。
 *
 * OTOMOの絵は「成長の到達点」を見せる意図で常に童子（doji）形態の
 * イラストを使う（現在のLv・戦闘中の形態とは無関係。GodSelectScreenが
 * 状態に関わらず`god.art.main`を表示するのと同じ「代表イラストを出す」
 * 方針）。
 */
export function OtomoGrowthScreen({ onBack }: OtomoGrowthScreenProps) {
  return (
    <div className="setup-screen">
      <h1 className="setup-title">OTOMOとの絆</h1>
      <p className="setup-subtitle">
        対局を重ねるほど、OTOMOとの絆が育ちます（表示専用の記録です。戦闘の強さには影響しません）。
      </p>

      <div className="otomo-growth-grid">
        {GODS.map((god) => {
          const otomoDef = getOtomoDef(god.otomoId)
          const record = loadOtomoBond(god.id)
          const display = computeOtomoGrowthDisplay(record)
          const theme = OTOMO_THEME_COLOR[god.id]
          return (
            <div
              className="otomo-growth-card"
              data-tier={display.bondTier}
              key={god.id}
              style={{
                ['--otomo-theme' as string]: theme.base,
                ['--otomo-theme-bg' as string]: theme.bg,
                ['--otomo-theme-border' as string]: theme.border,
              }}
            >
              <img src={otomoDef.art.doji} alt={otomoDef.nameJa} />
              <div className="otomo-growth-body">
                <div className="otomo-growth-head">
                  <span className="otomo-growth-name">{otomoDef.nameJa}</span>
                  <span className="otomo-growth-level-group">
                    <span className="otomo-growth-level">Lv.{display.level}</span>
                    {/* レベルアップの証（STEP4）：絆ランク★。bondTierと同じ判定基準を
                        流用しているため、絆称号（下のotomo-growth-title-text）と必ず
                        一致する。数値の暗記なしで「育っているか」が一目で分かるようにする。 */}
                    <span className="otomo-growth-rank-stars" aria-hidden="true" title={`絆ランク ${display.bondTier}/${BOND_RANK_MAX}`}>
                      {Array.from({ length: BOND_RANK_MAX }, (_, i) => (
                        <span key={i} className={i < display.bondTier ? 'star-filled' : 'star-empty'}>
                          ★
                        </span>
                      ))}
                    </span>
                  </span>
                </div>
                <div className="otomo-growth-god">{god.nameJa}の相棒</div>
                <div className="otomo-growth-bar-track">
                  <span
                    className="otomo-growth-bar-fill"
                    style={{ width: `${Math.round(display.progressRatio * 100)}%` }}
                  />
                </div>
                <div className="otomo-growth-points">
                  共鳴成長ポイント {display.pointsInLevel}/{display.pointsPerLevel}（累計{record.resonanceCount}）
                </div>
                {display.nextUnlockText && (
                  <div className="otomo-growth-next-unlock">🔓 次の解放：{display.nextUnlockText}</div>
                )}
                <div className="otomo-growth-title-block">
                  <span className="otomo-growth-title-label">絆称号</span>
                  <span className="otomo-growth-title-text">「{display.bondText}」</span>
                </div>
                {record.battlesPlayed > 0 && (
                  <div className="otomo-growth-stats">
                    共に戦った対局 {record.battlesPlayed}回・童子到達 {record.dojiReached}回
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <button type="button" className="home-cta-secondary otomo-growth-back" onClick={onBack}>
        ‹ ホームへ戻る
      </button>
    </div>
  )
}

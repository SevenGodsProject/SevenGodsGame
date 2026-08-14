import { GODS } from '../../core/data/gods'
import { getOtomoDef } from '../../core/data/otomo'
import { loadOtomoBond } from '../../hooks/otomoBondStorage'
import { computeOtomoGrowthDisplay } from './otomoGrowthDisplay'
import './setup.css'

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
          return (
            <div className="otomo-growth-card" key={god.id}>
              <img src={otomoDef.art.doji} alt={otomoDef.nameJa} />
              <div className="otomo-growth-body">
                <div className="otomo-growth-head">
                  <span className="otomo-growth-name">{otomoDef.nameJa}</span>
                  <span className="otomo-growth-level">Lv.{display.level}</span>
                </div>
                <div className="otomo-growth-god">{god.nameJa}の相棒</div>
                <div className="otomo-growth-bar-track">
                  <span
                    className="otomo-growth-bar-fill"
                    style={{ width: `${Math.round(display.progressRatio * 100)}%` }}
                  />
                </div>
                <div className="otomo-growth-points">
                  共鳴成長ポイント {record.resonanceCount}（次のLvまで{' '}
                  {display.pointsPerLevel - display.pointsInLevel}）
                </div>
                <div className="otomo-growth-text">{display.bondText}</div>
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

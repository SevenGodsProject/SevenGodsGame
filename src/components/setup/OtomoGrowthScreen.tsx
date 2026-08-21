import { OTOMO_FORM_ORDER } from '../../core/types'
import type { OtomoForm } from '../../core/types'
import { GODS } from '../../core/data/gods'
import { getOtomoDef } from '../../core/data/otomo'
import { loadOtomoBond, type OtomoBondRecord } from '../../hooks/otomoBondStorage'
import { computeOtomoGrowthDisplay, computeSevenBondSummary } from './otomoGrowthDisplay'
import { OTOMO_BACKGROUND_IMAGE, OTOMO_THEME_COLOR } from './godStyle'
import './setup.css'

/** 絆ランク★の最大数（bondTierの最大値と一致。tier0〜3の4段階だが★は1〜3の3段階で表現） */
const BOND_RANK_MAX = 3

/** Phase1.5：3形態ギャラリーの表示ラベル。既存の`GodOtomoPanel.tsx`等と同じ文言・同じ「ローカル定数」方針を踏襲。 */
const GALLERY_FORM_LABEL: Record<OtomoForm, string> = {
  spirit: '精霊態',
  incarnate: '受肉態',
  doji: '童子',
}

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
  // Phase1.5（TASK3）：「七柱との絆」全体進捗。GODS.mapの中で毎回loadOtomoBondを
  // 呼ぶと二重読み込みになるため、先に7体ぶんまとめて1回だけ読み、
  // 集計（computeSevenBondSummary）とカード描画の両方で使い回す。
  // 新規保存データは使わず、既存otomoBondレコードから毎回導出するだけ。
  const recordsByGodId = new Map<string, OtomoBondRecord>(GODS.map((god) => [god.id, loadOtomoBond(god.id)]))
  const sevenBondSummary = computeSevenBondSummary(Array.from(recordsByGodId.values()))
  const allSevenAchieved = sevenBondSummary.achievedCount === sevenBondSummary.total

  return (
    <div className="setup-screen">
      <h1 className="setup-title">OTOMOとの絆</h1>
      <p className="setup-subtitle">
        対局を重ねて、7体のOTOMOとの絆を深めよう！
        <br />
        <br />
        絆が深まると「精霊態・受肉態・童子」の形態の記録が少しずつ解放されます。
        <br />
        すべてのOTOMOと絆を結び、「七柱との絆」7/7を目指そう！
        <br />
        <br />
        ※育成はコレクション要素です。戦闘の強さやスコアには影響しません。
      </p>

      {/* Phase1.5（TASK3）：7体グリッドの直前に全体進捗を表示。1体達成条件はbondTier>=1
          （＝一度でも対局を終えた）。7/7達成時のみ完成メッセージへ切り替え、
          既存tier3カードのグロー配色（金）をこのブロックにも軽く再利用する。 */}
      <div className={`otomo-seven-bond${allSevenAchieved ? ' otomo-seven-bond-complete' : ''}`}>
        <div className="otomo-seven-bond-head">
          <span className="otomo-seven-bond-title">七柱との絆</span>
          <span className="otomo-seven-bond-count">
            {sevenBondSummary.achievedCount} / {sevenBondSummary.total}
          </span>
        </div>
        <div className="otomo-seven-bond-track">
          <span
            className="otomo-seven-bond-fill"
            style={{ width: `${Math.round((sevenBondSummary.achievedCount / sevenBondSummary.total) * 100)}%` }}
          />
        </div>
        <p className="otomo-seven-bond-text">
          {allSevenAchieved
            ? '七柱すべてと絆を結んだ、真の道連れ'
            : `${sevenBondSummary.achievedCount}体のOTOMOと絆を結びました`}
        </p>
      </div>

      <div className="otomo-growth-grid">
        {GODS.map((god) => {
          const otomoDef = getOtomoDef(god.otomoId)
          const record = recordsByGodId.get(god.id)!
          const display = computeOtomoGrowthDisplay(record)
          const theme = OTOMO_THEME_COLOR[god.id]
          const backgroundImage = OTOMO_BACKGROUND_IMAGE[god.id]
          // OTOMOカード背景 個別化（第2版）：CEO承認の参考イメージから切り出した
          // 専用背景画像（godId由来の修飾クラスは維持しつつ、実体はCSS変数
          // --otomo-bg-imageとして注入し、setup.css側でbackground-imageに使う）。
          // 枠色・グロー等（--otomo-theme/-border）は従来どおり維持。
          return (
            <div
              className={`otomo-growth-card otomo-growth-card--${god.id}`}
              data-tier={display.bondTier}
              key={god.id}
              style={{
                ['--otomo-theme' as string]: theme.base,
                ['--otomo-theme-border' as string]: theme.border,
                ['--otomo-bg-image' as string]: `url(${backgroundImage})`,
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
                {/* Phase1.5（TASK1）：3形態ギャラリー。メイン肖像（上のimg、doji固定）は
                    変更せず、記録として閲覧できる形態を小サムネイルで並べるだけの追加行。
                    解放条件はdisplay.unlockedForms（bondTierから導出、新しい閾値なし）。
                    未解放は既存画像を出さず暗転+🔒のみ（新規画像は使わない）。
                    UX改善（CEO+相棒確認フィードバック）：初見でも「育てて解放する
                    コレクション」だと伝わるよう「形態の記録」ラベルを同じ行に併記する
                    （新しい行を増やさず、高さ増分を最小化するためlabel+サムネイルを
                    1つのflex行にまとめている）。 */}
                <div className="otomo-growth-gallery">
                  <span className="otomo-growth-gallery-label">形態の記録</span>
                  {OTOMO_FORM_ORDER.map((form) => {
                    const unlocked = display.unlockedForms.includes(form)
                    return (
                      <div
                        key={form}
                        className={`otomo-growth-gallery-slot${unlocked ? '' : ' otomo-growth-gallery-slot-locked'}`}
                        title={unlocked ? GALLERY_FORM_LABEL[form] : `${GALLERY_FORM_LABEL[form]}（未解放）`}
                      >
                        {unlocked ? (
                          <img src={otomoDef.art[form]} alt={GALLERY_FORM_LABEL[form]} loading="lazy" />
                        ) : (
                          <span className="otomo-growth-gallery-lock" aria-hidden="true">
                            🔒
                          </span>
                        )}
                      </div>
                    )
                  })}
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

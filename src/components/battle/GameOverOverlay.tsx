import type { EnemyState, GameStatus, GodId, OtomoState, ScoreState } from '../../core/types'
import { getGodDef } from '../../core/data/gods'
import { getOtomoDef } from '../../core/data/otomo'
import { getFinalScore, type MasteryResult } from '../../core/engine'
import { formatScaled } from '../displayScale'
import { describeMastery } from './masteryDisplay'
import type { DailyRecordResult } from '../../hooks/dailyStorage'

const STATUS_LABEL: Record<Exclude<GameStatus, 'playing'>, string> = {
  won: '勝利',
  lost: '敗北',
  finished: '未撃破（7ラウンド終了）',
}

/**
 * 決定64（Task A5）→BASE-D（決定109プロトタイプ）対応：スコア内訳の各項目が
 * 「次はどうすれば伸ばせるか」を一目で分かるようにする短い補足。
 * 文言はrules.tsのBASE-D係数（perDamage/comboSteps/victoryBase/tempoByRound/
 * survivalMax/difficultyBonus/finalScale）と矛盾しないように選んだ：
 * - 実効ダメージ：敵の残りHPを超えた分（overkill）は入らない
 * - 連携：逓減のため「2枚目以降でUP」だけを言う（枚数無限に伸びる誤解を避ける）
 * - 撃破・早期撃破・生存・難易度は勝利時のみ加算される
 */
const SCORE_HINT: Record<Exclude<keyof ScoreState, 'total' | 'legacy'>, string> = {
  damage: '敵に効いたダメージ分',
  combo: '1ラウンドに2枚以上でUP',
  victory: '敵を倒すと加算',
  tempo: '早く倒すほどUP',
  survival: '残りHPが多いほどUP',
  difficultyBonus: '難しいほどUP',
}

type GameOverOverlayProps = {
  status: Exclude<GameStatus, 'playing'>
  score: ScoreState
  /**
   * 決定96（C-3）：勝利時のみ神＋OTOMOポートレートを表示するために必要。
   * BattleScreen.tsxが既にPlayerPanel/GodOtomoPanelへ渡しているのと同じ値を
   * そのまま渡すだけで、GameState・core/engineの変更は一切不要。
   */
  godId: GodId
  otomo: OtomoState
  /**
   * STEP-UX6-B：敗北／未撃破時に「あと一歩だった」を伝えるための敵の残りHP。
   * BattleScreen.tsxが既にEnemyPanel等へ渡しているのと同じstate.enemyを
   * そのまま渡すだけで、GameState・core/engineの変更は一切不要。
   */
  enemy: EnemyState
  /** この1戦でその神のスコア自己ベストを更新したか（決定48フォローアップ） */
  newBest: boolean
  /**
   * STEP-UX6-B：この1戦で上書きされる前の自己ベスト（未記録なら0）。
   * newBestがfalseの時のみ「自己ベストまであとN点」の表示に使う。
   */
  prevBest: number
  /**
   * 決定74（Task C3）：この1戦でOTOMOの親密度Lvが上がった場合のみ渡される
   * （上がっていなければnull）。勝敗を問わず出る（OTOMOは敗北戦でも育つ、
   * 決定70の設計どおり）。
   */
  otomoLevelUp: { otomoName: string; prevLevel: number; nextLevel: number } | null
  /**
   * STEP-SCORE2-D-PROTO（決定110）：神技評価（Mastery）。対応する神技が
   * 未実装の神ではnull。Battle Scoreとは完全分離の表示専用情報で、
   * スコアには一切加算されない。勝利時のみ表示する。
   */
  mastery: MasteryResult | null
  /** 同じ神・同じデッキでもう一度戦う */
  onRematch: () => void
  /** 神選択からやり直す（決定24：Phase 5） */
  onReselect: () => void
  /**
   * DAILY-01：神域挑戦の決着なら「今日のベスト」の情報（更新したか・更新前・残り回数）。
   * 通常モードではnull/省略。通常の自己ベスト表示（newBest/prevBest）とは独立
   */
  daily?: DailyRecordResult | null
  /** DAILY-01：「もう一度」ボタンの文言（残り回数の表示）と無効化（残り0） */
  rematchLabel?: string
  rematchDisabled?: boolean
}

export function GameOverOverlay({
  status,
  score,
  godId,
  otomo,
  enemy,
  newBest,
  prevBest,
  otomoLevelUp,
  mastery,
  onRematch,
  onReselect,
  daily = null,
  rematchLabel,
  rematchDisabled = false,
}: GameOverOverlayProps) {
  const god = getGodDef(godId)
  const otomoDef = getOtomoDef(otomo.defId)
  // BASE-D：ユーザーへ見せるスコアは最終スコア（素点合計×1.3）。内訳は素点を
  // 四捨五入して表示する（perDamageが小数のためdamageのみ端数がありうる）。
  const finalScore = getFinalScore(score)
  // STEP-UX6-B：敗北／未撃破時のみ、敵の残りHPで「あと一歩だった」を伝える
  // （決定64「敗北時は祝祭感を出さない」方針とは別軸の情報表示のため、
  // 勝利演出とは競合しない）。残りHP率10%以下の時だけ煽り文言を追加する
  // 1段階のみとし、11〜30%用の中間文言は今回は入れない（CEO指示、表示ルールを
  // 増やしすぎないため）。新しいGameState・敵数値は一切追加していない。
  const showEnemyHp = status !== 'won'
  const enemyHpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0
  const showCloseCall = showEnemyHp && enemyHpRatio > 0 && enemyHpRatio <= 0.1
  // STEP-UX6-B：自己ベスト未更新かつ、過去に一度でも記録がある（prevBest>0）場合のみ
  // 差分を表示する。newBest時は既存の「自己ベスト更新！」演出を優先し重複表示しない。
  const bestGap = !newBest && prevBest > 0 && prevBest > finalScore ? prevBest - finalScore : null

  return (
    <div className="game-over-overlay">
      {/* 決定64：勝敗・未撃破で装飾トーンを分ける（status別クラス）。文字色だけでなく
          カード枠・ボタン装飾も変えることで、文字を読まなくても感覚的に区別できるようにする */}
      <div className={`game-over-card game-over-card-${status}`}>
        <div className={`game-over-status game-over-status-${status}`}>{STATUS_LABEL[status]}</div>
        {showEnemyHp && (
          <div className="game-over-enemy-hp">
            敵の残りHP {formatScaled(enemy.hp)} / {formatScaled(enemy.maxHp)}
            {showCloseCall && '　あと一歩だった！'}
          </div>
        )}
        {newBest && <div className="game-over-new-best">✨ 自己ベスト更新！</div>}
        {daily && (
          <div className="game-over-daily">
            {daily.isNewBest ? (
              <>
                ✨ <strong>今日のベスト更新！</strong>（{STATUS_LABEL[status]}・スコア {formatScaled(finalScore)}）
              </>
            ) : daily.prevBest > finalScore ? (
              <>
                今日のベストまであと<strong>{formatScaled(daily.prevBest - finalScore)}</strong>点（{STATUS_LABEL[status]}）
              </>
            ) : (
              <>今日のベストと同点です（{STATUS_LABEL[status]}）</>
            )}
            <br />
            神域挑戦の残り回数 <strong>{daily.attemptsLeft}</strong> 回
          </div>
        )}
        {bestGap !== null && <div className="game-over-best-gap">自己ベストまであと{formatScaled(bestGap)}点</div>}
        {otomoLevelUp && (
          <div className="game-over-otomo-levelup">
            💠 絆Lv UP！ {otomoLevelUp.otomoName} Lv.{otomoLevelUp.prevLevel} → Lv.{otomoLevelUp.nextLevel}
          </div>
        )}
        {/*
         * 決定96（C-3）：勝利時のみ、神＋OTOMOポートレートを表示する（決定64の
         * 「敗北時は祝祭感を出さない」方針を守るため勝利限定）。OTOMOはotomo.formを
         * そのままart[form]に渡すだけで、直前の共鳴発動で進化していた場合も
         * 進化後の姿が表示される（reducerが進化を先に確定させてから同一トランザクション内で
         * 撃破・勝利判定を処理するため、Reactに進化前の中間状態がレンダリングされる
         * 経路が無い）。名前ラベルは付けない（神は選択済みで自明、OTOMO名は絆Lv UP
         * バッジと重複するため）。art.backは白背景未処理のため使用しない。
         */}
        {status === 'won' && (
          <div className="game-over-portraits">
            <img className="game-over-portrait-god" src={god.art.front} alt={god.nameJa} />
            <img className="game-over-portrait-otomo" src={otomoDef.art[otomo.form]} alt={otomoDef.nameJa} />
          </div>
        )}
        <div className="score-total">スコア {formatScaled(finalScore)}</div>
        {/* STEP-SCORE2-D2a：神技評価の3行構成。CEO実測「A/Sって何かわからない」への対応。
            gradeに和語補助、何を測ったかの1行、次Grade目標（C評価は励まし文）を表示する */}
        {status === 'won' && mastery && (() => {
          const display = describeMastery(mastery, godId, god.nameJa)
          return (
            <div className="game-over-mastery">
              <div className="game-over-mastery-grade">
                神技評価 <strong>{display.gradeLabel}</strong>
                <span className="score-breakdown-hint">スコアとは別の、その神らしい戦い方の評価</span>
              </div>
              <div className="game-over-mastery-desc">{display.description}</div>
              <div className="game-over-mastery-goal">{display.goal}</div>
            </div>
          )
        })()}
        <dl className="score-breakdown">
          <dt>
            実効ダメージ
            <span className="score-breakdown-hint">{SCORE_HINT.damage}</span>
          </dt>
          <dd>{formatScaled(Math.round(score.damage))}</dd>
          <dt>
            連携
            <span className="score-breakdown-hint">{SCORE_HINT.combo}</span>
          </dt>
          <dd>{formatScaled(score.combo)}</dd>
          <dt>
            撃破
            <span className="score-breakdown-hint">{SCORE_HINT.victory}</span>
          </dt>
          <dd>{formatScaled(score.victory)}</dd>
          <dt>
            早期撃破
            <span className="score-breakdown-hint">{SCORE_HINT.tempo}</span>
          </dt>
          <dd>{formatScaled(score.tempo)}</dd>
          <dt>
            生存
            <span className="score-breakdown-hint">{SCORE_HINT.survival}</span>
          </dt>
          <dd>{formatScaled(score.survival)}</dd>
          <dt>
            難易度
            <span className="score-breakdown-hint">{SCORE_HINT.difficultyBonus}</span>
          </dt>
          <dd>{formatScaled(score.difficultyBonus)}</dd>
          {score.legacy !== 0 && (
            <>
              <dt>
                旧形式分
                <span className="score-breakdown-hint">再開した旧セーブの引き継ぎ分</span>
              </dt>
              <dd>{formatScaled(score.legacy)}</dd>
            </>
          )}
          <dt className="score-breakdown-subtotal">
            小計 ×1.3
            <span className="score-breakdown-hint">最終スコア＝小計の1.3倍</span>
          </dt>
          <dd className="score-breakdown-subtotal">{formatScaled(Math.round(score.total))} → {formatScaled(finalScore)}</dd>
        </dl>
        <div className="game-over-actions">
          <button type="button" onClick={onRematch} disabled={rematchDisabled}>
            {rematchLabel ?? '同じ構成でもう一度'}
          </button>
          <button type="button" onClick={onReselect}>
            神・デッキを選び直す
          </button>
        </div>
      </div>
    </div>
  )
}

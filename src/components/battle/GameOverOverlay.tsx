import type { GameStatus, ScoreState } from '../../core/types'

const STATUS_LABEL: Record<Exclude<GameStatus, 'playing'>, string> = {
  won: '勝利',
  lost: '敗北',
  finished: '未撃破（7ラウンド終了）',
}

type GameOverOverlayProps = {
  status: Exclude<GameStatus, 'playing'>
  score: ScoreState
  /** この1戦でその神のスコア自己ベストを更新したか（決定48フォローアップ） */
  newBest: boolean
  /** 同じ神・同じデッキでもう一度戦う */
  onRematch: () => void
  /** 神選択からやり直す（決定24：Phase 5） */
  onReselect: () => void
}

export function GameOverOverlay({ status, score, newBest, onRematch, onReselect }: GameOverOverlayProps) {
  return (
    <div className="game-over-overlay">
      <div className="game-over-card">
        <div className={`game-over-status game-over-status-${status}`}>{STATUS_LABEL[status]}</div>
        {newBest && <div className="game-over-new-best">✨ 自己ベスト更新！</div>}
        <div className="score-total">スコア {score.total}</div>
        <dl className="score-breakdown">
          <dt>ダメージ</dt>
          <dd>{score.damage}</dd>
          <dt>コンボ</dt>
          <dd>{score.combo}</dd>
          <dt>神力効率</dt>
          <dd>{score.apEfficiency}</dd>
          <dt>撃破ボーナス</dt>
          <dd>{score.roundBonus}</dd>
          <dt>神託・共鳴</dt>
          <dd>{score.oracleBonus}</dd>
        </dl>
        <div className="game-over-actions">
          <button type="button" onClick={onRematch}>
            同じ構成でもう一度
          </button>
          <button type="button" onClick={onReselect}>
            神・デッキを選び直す
          </button>
        </div>
      </div>
    </div>
  )
}

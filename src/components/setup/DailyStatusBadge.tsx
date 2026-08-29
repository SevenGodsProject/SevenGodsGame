import type { GameStatus } from '../../core/types'
import '../polish.css'

/** 8/31 P0-3：勝敗ラベル（GameOverOverlayのSTATUS_LABELと同じ語） */
const DAILY_STATUS_LABEL: Record<Exclude<GameStatus, 'playing'>, string> = {
  won: '勝利',
  lost: '敗北',
  finished: '未撃破',
}

/** Daily画面・戦績表で、敗北スコアを勝利スコアと誤認しないための小さなバッジ */
export function DailyStatusBadge({ status }: { status: GameStatus }) {
  if (status === 'playing') return null
  return <span className={`daily-status daily-status-${status}`}>{DAILY_STATUS_LABEL[status]}</span>
}

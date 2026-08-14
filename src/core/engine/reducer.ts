import type { GameAction, GameEvent, GameState } from '../types'
import { createInitialState } from './createInitialState'
import { playCard } from './playCard'
import { endRound } from './endRound'
import { applyDivination } from './applyDivination'

export type ReduceResult = { state: GameState; events: GameEvent[] }

/**
 * ゲームを唯一動かす入り口。
 * (今のGameState, 操作) → 新しいGameState を毎回作り直します（不変ルール）。
 *
 * START_GAME だけは state が null（ゲーム未開始）でも呼べます。
 */
export function applyAction(
  state: GameState | null,
  action: GameAction,
): ReduceResult {
  const before = state?.status ?? null

  const result = ((): ReduceResult => {
    switch (action.type) {
      case 'START_GAME':
        return createInitialState(action)

      case 'PLAY_CARD':
        if (!state) throw new Error('ゲームが開始されていません')
        return playCard(state, action)

      case 'END_ROUND':
        if (!state) throw new Error('ゲームが開始されていません')
        return endRound(state)

      case 'USE_DIVINATION':
        if (!state) throw new Error('ゲームが開始されていません')
        return applyDivination(state, action)
    }
  })()

  if (before === 'playing' && result.state.status !== 'playing') {
    result.events.push({
      t: 'GAME_ENDED',
      status: result.state.status,
      totalScore: result.state.score.total,
    })
  }

  return result
}

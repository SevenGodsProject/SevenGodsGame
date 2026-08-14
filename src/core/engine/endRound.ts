import type { GameEvent, GameState } from '../types'
import { createRng } from '../rng/seededRandom'
import { runEnemyTurn, finishRound } from './round'

/**
 * ラウンドを終えます：敵のターン → ラウンド終了処理（決着判定 or 次ラウンド開始）。
 */
export function endRound(state: GameState): { state: GameState; events: GameEvent[] } {
  if (state.status !== 'playing' || state.phase !== 'playerTurn') {
    throw new Error('今はラウンドを終えられません')
  }

  const events: GameEvent[] = []

  const enemyTurn = runEnemyTurn(state)
  let next = enemyTurn.state
  events.push(...enemyTurn.events)

  const rng = createRng(state.seed, state.rngCursor)
  const round = finishRound(next, rng)
  next = { ...round.state, rngCursor: state.rngCursor + rng.callCount() }
  events.push(...round.events)

  return { state: next, events }
}

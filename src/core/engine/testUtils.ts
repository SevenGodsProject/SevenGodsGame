import type { GameState } from '../types'
import { GOD_IDS } from '../data/gods'
import { ENEMY_IDS } from '../data/enemies'
import { STARTER_DECK } from '../data/decks'
import { applyAction } from './reducer'

/** テスト専用：ゲームを開始した直後のGameStateを作ります */
export function startTestGame(seed = 'test-seed'): GameState {
  const result = applyAction(null, {
    type: 'START_GAME',
    seed,
    godId: GOD_IDS.ebisu,
    enemyId: ENEMY_IDS.trial,
    deck: STARTER_DECK,
  })
  return result.state
}

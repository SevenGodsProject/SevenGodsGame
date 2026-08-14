import type { GameAction, GameEvent, GameState } from '../types'
import { DIVINATION_CHOICES } from '../data/divination'
import { createRng } from '../rng/seededRandom'
import { applyEffects } from './effects'

type UseDivinationAction = Extract<GameAction, { type: 'USE_DIVINATION' }>

/**
 * 託宣を使います（決定21）。
 *
 * カードとは別枠のリソース：神力を消費せず、1ゲームにつき
 * `state.divination.remaining` 回まで、プレイヤーターン中いつでも使えます。
 */
export function applyDivination(
  state: GameState,
  action: UseDivinationAction,
): { state: GameState; events: GameEvent[] } {
  if (state.status !== 'playing' || state.phase !== 'playerTurn') {
    throw new Error('今は託宣を使えません')
  }

  if (state.divination.remaining <= 0) {
    throw new Error('託宣の残り回数がありません')
  }
  if (state.divination.usedThisRound) {
    throw new Error('託宣は1ラウンドに1回までです')
  }

  const choice = DIVINATION_CHOICES[action.choiceIndex]
  if (!choice) {
    throw new Error(`存在しない託宣です: ${action.choiceIndex}`)
  }

  const remaining = state.divination.remaining - 1
  let next: GameState = {
    ...state,
    divination: { remaining, usedThisRound: true },
  }

  const events: GameEvent[] = [
    { t: 'DIVINATION_USED', choiceIndex: action.choiceIndex, remaining },
  ]

  const rng = createRng(state.seed, state.rngCursor)
  const result = applyEffects(next, choice.effects, rng)
  next = { ...result.state, rngCursor: state.rngCursor + rng.callCount() }
  events.push(...result.events)

  return { state: next, events }
}

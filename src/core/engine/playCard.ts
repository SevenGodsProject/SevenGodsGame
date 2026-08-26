import type { GameAction, GameEvent, GameState } from '../types'
import { RULES } from '../data/rules'
import { getCardDef } from '../data/cards'
import { createRng } from '../rng/seededRandom'
import { applyEffects, addScore } from './effects'

type PlayCardAction = Extract<GameAction, { type: 'PLAY_CARD' }>

/**
 * 手札からカードを1枚使います。
 *
 * プレイヤーが選べるのは「手札にある実際にAPを払えるカード」だけである前提で、
 * UI側が事前に絞り込みます。ここでの不正な呼び出し（手札に無い等）は
 * バグとして早期に落とします。
 */
export function playCard(
  state: GameState,
  action: PlayCardAction,
): { state: GameState; events: GameEvent[] } {
  if (state.status !== 'playing' || state.phase !== 'playerTurn') {
    throw new Error('今はカードを使えません')
  }

  const instance = state.hand.find((c) => c.uid === action.uid)
  if (!instance) {
    throw new Error(`手札にないカードです: ${action.uid}`)
  }

  const cardDef = getCardDef(instance.defId)
  const cost = cardDef.cost + (instance.costModifier ?? 0)
  if (cost > state.ap.current) {
    throw new Error(`神力が足りません: ${cardDef.name}（必要${cost} / 残り${state.ap.current}）`)
  }

  // BASE-D（決定109）：連携は逓減加点。このラウンドの1枚目は0点、
  // 2枚目以降はcomboSteps（12/8/4）、それを超える枚数はcomboOverflow（3）。
  // 線形加点（旧comboPerExtraCard）は「枚数を出すほど青天井」の枚数バイアスの
  // 主因だったため逓減へ変更した。
  const position = state.cardsPlayedThisRound // このカードを使う前の、ラウンド内使用済み枚数
  const comboBonus =
    position === 0 ? 0 : RULES.score.comboSteps[position - 1] ?? RULES.score.comboOverflow

  let next: GameState = {
    ...state,
    hand: state.hand.filter((c) => c.uid !== action.uid),
    discard: [...state.discard, instance],
    ap: { ...state.ap, current: state.ap.current - cost },
    cardsPlayedThisRound: state.cardsPlayedThisRound + 1,
    totalApSpent: state.totalApSpent + cost,
    score: addScore(state.score, 'combo', comboBonus),
  }

  const events: GameEvent[] = [
    { t: 'CARD_PLAYED', uid: instance.uid, defId: instance.defId, cost },
  ]
  if (comboBonus > 0) {
    events.push({ t: 'SCORE_GAINED', reason: 'combo', amount: comboBonus })
  }

  const rng = createRng(state.seed, state.rngCursor)
  const result = applyEffects(next, cardDef.effects, rng)
  next = { ...result.state, rngCursor: state.rngCursor + rng.callCount() }
  events.push(...result.events)

  return { state: next, events }
}

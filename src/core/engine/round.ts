import type { EnemyActionDef, GameEvent, GameState } from '../types'
import { RULES } from '../data/rules'
import { getEnemyDef } from '../data/enemies'
import { performDraw } from './deck'
import { applyDamage } from './effects'
import { sumBuff, tickBuffs } from './buffs'
import type { Rng } from '../rng/seededRandom'

type StepResult = { state: GameState; events: GameEvent[] }

function intentEvent(action: EnemyActionDef): GameEvent {
  return action.kind === 'attack'
    ? { t: 'ENEMY_INTENT_SET', kind: 'attack', amount: action.amount }
    : { t: 'ENEMY_INTENT_SET', kind: 'charge', amount: 0 }
}

function actionForRound(actions: EnemyActionDef[], round: number): EnemyActionDef {
  return actions[round - 1] ?? actions[actions.length - 1]
}

/** 決定39：難易度の敵攻撃力倍率を反映する（'charge'はダメージを持たないため対象外） */
function scaleEnemyAction(action: EnemyActionDef, multiplier: number): EnemyActionDef {
  return action.kind === 'attack' ? { ...action, amount: Math.round(action.amount * multiplier) } : action
}

/** そのラウンドの敵の行動を、難易度補正込みで決める（予告表示・実行の両方がこれを使う） */
function nextEnemyAction(state: GameState): EnemyActionDef {
  const enemyDef = getEnemyDef(state.enemy.defId)
  const raw = actionForRound(enemyDef.actions, state.round)
  return scaleEnemyAction(raw, RULES.difficulty[state.difficulty].enemyAtkMultiplier)
}

/**
 * ラウンド開始処理（決定6・4）。
 * 神力を補充し、ブロックをリセットし、カードを引き、
 * このラウンドの敵の行動を予告します。
 *
 * drawCountを省略すると通常ドロー枚数（決定12）。
 * ラウンド1の初期手札（決定11）はcreateInitialStateから明示的に渡します。
 */
export function startRound(
  state: GameState,
  rng: Rng,
  drawCount: number = RULES.deck.drawPerRound,
): StepResult {
  const events: GameEvent[] = []
  const apAmount = RULES.ap.perRound[state.round - 1]
  const intent = nextEnemyAction(state)

  let next: GameState = {
    ...state,
    phase: 'roundStart',
    ap: { current: apAmount, max: apAmount },
    cardsPlayedThisRound: 0,
    totalApGranted: state.totalApGranted + apAmount,
    player: { ...state.player, block: 0 },
    enemy: { ...state.enemy, block: 0, intent },
    divination: { ...state.divination, usedThisRound: false },
    // Mastery（決定110）：「1ラウンド最大実効ダメージ」のラウンド内集計をリセット。
    // bestRoundDamage（試合内最大）は維持する。
    mastery: { ...state.mastery, roundDamage: 0 },
  }
  events.push({ t: 'ROUND_STARTED', round: state.round, apGranted: apAmount })
  events.push(intentEvent(intent))

  next = { ...next, phase: 'draw' }
  const draw = performDraw(next, drawCount, rng)
  next = draw.state
  events.push(...draw.events)

  next = { ...next, phase: 'playerTurn' }

  return { state: next, events }
}

/**
 * 敵のターン（決定4）。予告済みの行動をそのまま実行します。
 */
export function runEnemyTurn(state: GameState): StepResult {
  const events: GameEvent[] = []
  const action = state.enemy.intent ?? nextEnemyAction(state)

  let next: GameState = { ...state, phase: 'enemyTurn' }

  if (action.kind === 'attack') {
    const atkBuff = sumBuff(next.enemy.buffs, 'atk')
    const amount = Math.max(0, action.amount + atkBuff)
    events.push({ t: 'ENEMY_ACTED', kind: 'attack', amount })
    const result = applyDamage(next, 'self', amount)
    next = result.state
    events.push(...result.events)
  } else {
    events.push({ t: 'ENEMY_ACTED', kind: 'charge', amount: 0 })
  }

  next = {
    ...next,
    enemy: { ...next.enemy, intent: null, buffs: tickBuffs(next.enemy.buffs) },
    player: { ...next.player, buffs: tickBuffs(next.player.buffs) },
  }

  return { state: next, events }
}

/**
 * ラウンド終了処理。
 * BASE-D（決定109）：未使用APペナルティは廃止した（実測寄与が極小で、
 * スコア上の意味が薄かったため）。unusedApはROUND_ENDEDイベントの情報としてのみ残す。
 * 決着していなければ次のラウンドへ、7ラウンド終えていれば「未撃破」で終了します（決定3）。
 */
export function finishRound(state: GameState, rng: Rng): StepResult {
  const events: GameEvent[] = []
  const unusedAp = state.status === 'playing' ? state.ap.current : 0
  events.push({ t: 'ROUND_ENDED', round: state.round, unusedAp })

  let next: GameState = state

  if (next.status !== 'playing') {
    return { state: next, events }
  }

  if (next.round >= RULES.totalRounds) {
    next = { ...next, status: 'finished', phase: 'gameOver' }
    return { state: next, events }
  }

  next = { ...next, round: next.round + 1 }
  const nextRound = startRound(next, rng)
  next = nextRound.state
  events.push(...nextRound.events)

  return { state: next, events }
}

import type { GameEvent, GameState } from '../types'
import { createRng } from '../rng/seededRandom'
import { runEnemyTurn, finishRound } from './round'
import { applyEffects } from './effects'
import { passiveNominalAmount, resolveGodPassive } from './godPassive'

/**
 * ラウンドを終えます：敵のターン → 神の得意技（afterEnemyTurn） → ラウンド終了処理。
 *
 * Phase 3 FINAL SPEC v0.1：蒼毘「反撃の構え」はここで発動する。順序は
 * 「敵の攻撃を実際に受ける（ブロック消費）→ 残ったブロックが確定 → 反撃 → 次ラウンド」。
 * `finishRound`（＝次ラウンド開始でブロックを0に戻す）より前でなければならない。
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

  const passive = resolveGodPassive(next.godId)
  if (passive?.afterEnemyTurn && next.status === 'playing') {
    const extra = passive.afterEnemyTurn(next)
    if (extra.length > 0) {
      events.push({
        t: 'PASSIVE_TRIGGERED',
        passiveId: passive.def.id,
        amount: passiveNominalAmount(extra),
      })
      const passiveResult = applyEffects(next, extra, rng)
      next = passiveResult.state
      events.push(...passiveResult.events)
    }
  }

  const round = finishRound(next, rng)
  next = { ...round.state, rngCursor: state.rngCursor + rng.callCount() }
  events.push(...round.events)

  return { state: next, events }
}

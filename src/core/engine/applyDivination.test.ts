import { describe, expect, it } from 'vitest'
import { applyDivination } from './applyDivination'
import { startTestGame } from './testUtils'

describe('applyDivination', () => {
  it('applies the chosen effect and decrements the remaining count', () => {
    const base = startTestGame()
    const state = {
      ...base,
      player: { ...base.player, hp: 10 },
      enemy: { ...base.enemy, intent: { kind: 'attack' as const, amount: 14 } },
    }
    const { state: next, events } = applyDivination(state, {
      type: 'USE_DIVINATION',
      choiceIndex: 0,
    })

    // choiceIndex 0 = 加護の託宣（Phase 5-D）：予告14 × 0.5 ＝ ブロック7。HPは回復しない
    expect(next.player.block).toBe(7)
    expect(next.player.hp).toBe(10)
    expect(next.divination.remaining).toBe(state.divination.remaining - 1)
    expect(events).toContainEqual({
      t: 'DIVINATION_USED',
      choiceIndex: 0,
      remaining: next.divination.remaining,
    })
  })

  it('throws when out of remaining uses', () => {
    const state = {
      ...startTestGame(),
      divination: { remaining: 0, usedThisRound: false },
    }
    expect(() =>
      applyDivination(state, { type: 'USE_DIVINATION', choiceIndex: 0 }),
    ).toThrow()
  })

  it('throws when already used this round (決定21)', () => {
    const state = {
      ...startTestGame(),
      divination: { remaining: 3, usedThisRound: true },
    }
    expect(() =>
      applyDivination(state, { type: 'USE_DIVINATION', choiceIndex: 0 }),
    ).toThrow()
  })

  it('throws for an unknown choice index', () => {
    const state = startTestGame()
    expect(() =>
      applyDivination(state, { type: 'USE_DIVINATION', choiceIndex: 99 }),
    ).toThrow()
  })

  it('throws outside the player turn', () => {
    const state = { ...startTestGame(), phase: 'enemyTurn' as const }
    expect(() =>
      applyDivination(state, { type: 'USE_DIVINATION', choiceIndex: 0 }),
    ).toThrow()
  })
})

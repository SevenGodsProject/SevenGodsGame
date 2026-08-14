import { describe, expect, it } from 'vitest'
import { ALL_CARDS } from './index'
import { GODS } from '../gods'

describe('ALL_CARDS', () => {
  it('has a unique id per card', () => {
    const ids = ALL_CARDS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every card at least one effect and a non-negative cost', () => {
    for (const card of ALL_CARDS) {
      expect(card.effects.length).toBeGreaterThan(0)
      expect(card.cost).toBeGreaterThanOrEqual(0)
    }
  })

  it('gives every god exactly 4 exclusive rare cards (決定25)', () => {
    for (const god of GODS) {
      const exclusiveCards = ALL_CARDS.filter((c) => c.godId === god.id)
      expect(exclusiveCards.length).toBe(4)
      for (const card of exclusiveCards) {
        expect(card.rarity).toBe('rare')
      }
    }
  })
})

import { describe, expect, it } from 'vitest'
import { RULES } from './rules'
import { STARTER_DECK } from './decks'
import { getCardDef } from './cards'

describe('STARTER_DECK', () => {
  it('has exactly the deck size defined in RULES', () => {
    expect(STARTER_DECK).toHaveLength(RULES.deck.size)
  })

  it('references only card ids that resolve to a definition', () => {
    for (const defId of STARTER_DECK) {
      expect(() => getCardDef(defId)).not.toThrow()
    }
  })
})

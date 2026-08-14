import { describe, expect, it } from 'vitest'
import { cardDefId } from '../types/ids'
import { createRng } from '../rng/seededRandom'
import { buildDeckInstances, drawCards } from './deck'

const a = cardDefId('a')
const b = cardDefId('b')

describe('buildDeckInstances', () => {
  it('assigns a unique uid per position', () => {
    const deck = buildDeckInstances([a, a, b])
    const uids = deck.map((c) => c.uid)
    expect(new Set(uids).size).toBe(3)
    expect(deck.map((c) => c.defId)).toEqual([a, a, b])
  })
})

describe('drawCards', () => {
  it('draws the requested count from the deck', () => {
    const deck = buildDeckInstances([a, a, a, b, b])
    const rng = createRng('seed')
    const result = drawCards(deck, [], [], 3, rng)

    expect(result.hand).toHaveLength(3)
    expect(result.deck).toHaveLength(2)
    expect(result.reshuffled).toBe(false)
  })

  it('reshuffles the discard pile into the deck once the deck is empty (決定14)', () => {
    const deck = buildDeckInstances([a, a])
    const discard = buildDeckInstances([b, b, b])
    const rng = createRng('seed')

    const result = drawCards(deck, discard, [], 4, rng)

    expect(result.hand).toHaveLength(4)
    expect(result.reshuffled).toBe(true)
    expect(result.discard).toHaveLength(0)
    // 山札2 + 捨札3 = 5枚のうち4枚引いたので、残り1枚が新しい山札に残る
    expect(result.deck).toHaveLength(1)
  })

  it('stops drawing once both the deck and discard are empty', () => {
    const rng = createRng('seed')
    const result = drawCards([], [], [], 3, rng)

    expect(result.hand).toHaveLength(0)
    expect(result.drawn).toHaveLength(0)
  })
})

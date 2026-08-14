import { describe, expect, it } from 'vitest'
import { getCardPoolForGod, getMaxCopies, getRecommendedDeck, validateDeck } from './deckBuilder'
import { STARTER_DECK } from './decks'
import { GOD_IDS, GODS } from './gods'
import { RULES } from './rules'
import { CARD_IDS } from './cards/common'

describe('getCardPoolForGod', () => {
  it('includes common cards plus the exclusive cards for that god only', () => {
    const ebisuPool = getCardPoolForGod(GOD_IDS.ebisu)
    const taiyoPool = getCardPoolForGod(GOD_IDS.taiyo)

    expect(ebisuPool.some((c) => c.godId === GOD_IDS.ebisu)).toBe(true)
    expect(taiyoPool.some((c) => c.godId === GOD_IDS.ebisu)).toBe(false)
    expect(taiyoPool.some((c) => c.godId === GOD_IDS.taiyo)).toBe(true)
    expect(taiyoPool.every((c) => !c.godId || c.godId === GOD_IDS.taiyo)).toBe(true)
  })
})

describe('validateDeck', () => {
  it('accepts the starter deck for ebisu', () => {
    expect(validateDeck(STARTER_DECK, GOD_IDS.ebisu).valid).toBe(true)
  })

  it('rejects the starter deck for another god (contains ebisu-exclusive cards)', () => {
    const result = validateDeck(STARTER_DECK, GOD_IDS.taiyo)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('rejects a deck with the wrong size', () => {
    const result = validateDeck(STARTER_DECK.slice(0, 19), GOD_IDS.ebisu)
    expect(result.valid).toBe(false)
  })

  it('rejects too many copies of the same card', () => {
    const tooManyCopies = Array.from({ length: RULES.deck.size }, () => STARTER_DECK[0])
    const result = validateDeck(tooManyCopies, GOD_IDS.ebisu)
    expect(result.valid).toBe(false)
  })

  it('決定43: bonusCopies raises the per-card limit without affecting other cards', () => {
    const manyCopies = Array.from({ length: RULES.deck.size }, () => STARTER_DECK[0])
    const bonus = new Map([[STARTER_DECK[0], RULES.deck.size - RULES.deckBuilding.maxCopiesPerCard]])
    expect(validateDeck(manyCopies, GOD_IDS.ebisu, bonus).valid).toBe(true)
    // 未指定・別カードへのボーナスは、これまでどおりの上限のまま
    expect(validateDeck(manyCopies, GOD_IDS.ebisu).valid).toBe(false)
    expect(validateDeck(manyCopies, GOD_IDS.ebisu, new Map([[STARTER_DECK[1], 5]])).valid).toBe(false)
  })
})

describe('getMaxCopies (決定43)', () => {
  it('defaults to RULES.deckBuilding.maxCopiesPerCard with no bonus', () => {
    expect(getMaxCopies(STARTER_DECK[0])).toBe(RULES.deckBuilding.maxCopiesPerCard)
  })

  it('adds the bonus for that specific card only', () => {
    const bonus = new Map([[STARTER_DECK[0], 2]])
    expect(getMaxCopies(STARTER_DECK[0], bonus)).toBe(RULES.deckBuilding.maxCopiesPerCard + 2)
    expect(getMaxCopies(STARTER_DECK[1], bonus)).toBe(RULES.deckBuilding.maxCopiesPerCard)
  })
})

describe('getRecommendedDeck', () => {
  it('returns the starter deck for ebisu', () => {
    expect(getRecommendedDeck(GOD_IDS.ebisu)).toEqual(STARTER_DECK)
  })

  it('returns a valid deck of the correct size for every god', () => {
    for (const god of GODS) {
      const deck = getRecommendedDeck(god.id)
      expect(deck.length).toBe(RULES.deck.size)
      expect(validateDeck(deck, god.id).valid).toBe(true)
    }
  })

  // 決定45：防御・支援寄りの専用カードを持つ神（蒼毘・寿楽・笑蓮）はdefensive戦略が
  // 勝率0%に陥るため1枚のまま、それ以外（恵比寿を除く）は2枚に引き上げた
  const REDUCED_COPY_GOD_IDS = new Set([GOD_IDS.sobi, GOD_IDS.juraku, GOD_IDS.shouren])

  it('includes exclusive cards 2 copies each, except sobi/juraku/shouren which stay at 1 (決定45)', () => {
    for (const god of GODS) {
      if (god.id === GOD_IDS.ebisu) continue // 恵比寿はSTARTER_DECK（決定12）をそのまま使うため対象外
      const expectedCopies = REDUCED_COPY_GOD_IDS.has(god.id) ? 1 : 2
      const pool = getCardPoolForGod(god.id)
      const exclusiveIds = pool.filter((c) => c.godId === god.id).map((c) => c.id)
      const deck = getRecommendedDeck(god.id)
      for (const id of exclusiveIds) {
        expect(deck.filter((cardId) => cardId === id).length).toBe(expectedCopies)
      }
    }
  })

  // 決定51：新規カードは種別ごとの目標枚数（TARGET_TYPE_COUNT）が既存カードで
  // 既に満たされているため、おすすめデッキには自動採用されない
  // （デッキ構築画面の+/-ステッパーで手動編成したときのみ選べるロースター専用）。
  it('does not auto-include the 決定51 roster-only cards (fightingSpirit/renGeki/foresight/purifyingLight)', () => {
    const rosterOnlyIds = [
      CARD_IDS.fightingSpirit,
      CARD_IDS.renGeki,
      CARD_IDS.foresight,
      CARD_IDS.purifyingLight,
    ]
    for (const god of GODS) {
      const deck = getRecommendedDeck(god.id)
      for (const id of rosterOnlyIds) {
        expect(deck.includes(id)).toBe(false)
      }
    }
  })
})

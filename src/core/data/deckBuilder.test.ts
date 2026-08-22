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
  // 8/31版STEP1（v4おすすめデッキ）：恵比寿の「おすすめデッキ」は決定12の
  // STARTER_DECKから、専用カード2枚投入・共通カード原則1枚のv4構成へ切り替えた。
  // STARTER_DECK自体は`decks.ts`に変更せず残置している（他のテスト・過去の
  // 固定フィクスチャとしての参照は引き続き有効）。
  it('no longer returns the starter deck for ebisu (v4化、STARTER_DECKは残置)', () => {
    const deck = getRecommendedDeck(GOD_IDS.ebisu)
    expect(deck).not.toEqual(STARTER_DECK)
    expect(deck.length).toBe(RULES.deck.size)
    expect(validateDeck(deck, GOD_IDS.ebisu).valid).toBe(true)
  })

  it('returns a valid deck of the correct size for every god', () => {
    for (const god of GODS) {
      const deck = getRecommendedDeck(god.id)
      expect(deck.length).toBe(RULES.deck.size)
      expect(validateDeck(deck, god.id).valid).toBe(true)
    }
  })

  // 決定45：防御・支援寄りの専用カードを持つ神（蒼毘・寿楽・笑蓮）はdefensive戦略が
  // 勝率0%に陥るため1枚のまま、それ以外（恵比寿を除く）は2枚に引き上げた。
  // 8/31版STEP1（v4おすすめデッキ）：恵比寿・蒼毘・才華・寿楽は固定リスト化され、
  // 専用カードは4神とも一律2枚投入になった（決定45の非対称ルールはこの4神には
  // もはや適用されない）。この決定45ルールが今も生きているのは大耀・福永・笑蓮のみ。
  const REDUCED_COPY_GOD_IDS = new Set([GOD_IDS.sobi, GOD_IDS.juraku, GOD_IDS.shouren])
  const V4_GOD_IDS = new Set([GOD_IDS.ebisu, GOD_IDS.sobi, GOD_IDS.saika, GOD_IDS.juraku])

  it('includes exclusive cards 2 copies each, except sobi/juraku/shouren which stay at 1 (決定45、v4対象4神を除く)', () => {
    for (const god of GODS) {
      if (V4_GOD_IDS.has(god.id)) continue // v4対象：専用カードは一律2枚（下の専用テストで確認）
      const expectedCopies = REDUCED_COPY_GOD_IDS.has(god.id) ? 1 : 2
      const pool = getCardPoolForGod(god.id)
      const exclusiveIds = pool.filter((c) => c.godId === god.id).map((c) => c.id)
      const deck = getRecommendedDeck(god.id)
      for (const id of exclusiveIds) {
        expect(deck.filter((cardId) => cardId === id).length).toBe(expectedCopies)
      }
    }
  })

  it('v4対象4神（恵比寿・蒼毘・才華・寿楽）は専用カードが一律2枚ずつになっている', () => {
    for (const godId of V4_GOD_IDS) {
      const pool = getCardPoolForGod(godId)
      const exclusiveIds = pool.filter((c) => c.godId === godId).map((c) => c.id)
      const deck = getRecommendedDeck(godId)
      expect(exclusiveIds.length).toBe(4)
      for (const id of exclusiveIds) {
        expect(deck.filter((cardId) => cardId === id).length).toBe(2)
      }
    }
  })

  // 決定51：新規カードは種別ごとの目標枚数（TARGET_TYPE_COUNT）が既存カードで
  // 既に満たされているため、おすすめデッキには自動採用されない
  // （デッキ構築画面の+/-ステッパーで手動編成したときのみ選べるロースター専用）。
  // 8/31版STEP1（v4おすすめデッキ）：才華(renGeki/foresight)・寿楽(purifyingLight)は
  // v4で意図的にこのロースター専用カードを採用した（連鎖・妨害重ねがけの核として
  // 効果的だったため、Opus監査で確認済み）。この2神＋恵比寿・蒼毘（v4対象）は対象外。
  it('does not auto-include the 決定51 roster-only cards for non-v4 gods (fightingSpirit/renGeki/foresight/purifyingLight)', () => {
    const rosterOnlyIds = [
      CARD_IDS.fightingSpirit,
      CARD_IDS.renGeki,
      CARD_IDS.foresight,
      CARD_IDS.purifyingLight,
    ]
    for (const god of GODS) {
      if (V4_GOD_IDS.has(god.id)) continue
      const deck = getRecommendedDeck(god.id)
      for (const id of rosterOnlyIds) {
        expect(deck.includes(id)).toBe(false)
      }
    }
  })
})

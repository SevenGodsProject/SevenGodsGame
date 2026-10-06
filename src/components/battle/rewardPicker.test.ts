import { describe, expect, it } from 'vitest'
import { GOD_IDS } from '../../core/data/gods'
import { CARD_IDS, TAIYO_CARD_IDS } from '../../core/data/cards'
import { getCardPoolForGod, getRecommendedDeck } from '../../core/data/deckBuilder'
import type { CardDef, CardDefId } from '../../core/types'
import {
  affinityScore,
  collectDeckCardIds,
  formatRewardCopies,
  pickRewardCandidates,
  pickRewardOffer,
  type RewardPickInput,
} from './rewardPicker'

/**
 * 決定267：3 役ローテーションの純関数テスト（Final Design §13-2）。
 * fixture は大耀。おすすめデッキはアルゴリズム生成のため、deck20 は Final Design §1-3 の例
 * （専用 4 種×2＋共通 12 種×1）を明示的に組む。
 */
const god = GOD_IDS.taiyo
const pool = getCardPoolForGod(god)
const recommended = getRecommendedDeck(god)
const EXCLUSIVES = [
  TAIYO_CARD_IDS.boldStrike,
  TAIYO_CARD_IDS.sisterlyCommand,
  TAIYO_CARD_IDS.singleMinded,
  TAIYO_CARD_IDS.lookingAfterJuniors,
]
const COMMON12 = [
  CARD_IDS.strike,
  CARD_IDS.heavyBlow,
  CARD_IDS.quickStrike,
  CARD_IDS.oracle,
  CARD_IDS.prophecy,
  CARD_IDS.resonate,
  CARD_IDS.kaguraDance,
  CARD_IDS.mikoDance,
  CARD_IDS.guard,
  CARD_IDS.ironStance,
  CARD_IDS.parry,
  CARD_IDS.curse,
]
const DECK20: CardDefId[] = [...EXCLUSIVES, ...EXCLUSIVES, ...COMMON12]

const base = (over: Partial<RewardPickInput> = {}): RewardPickInput => ({
  godId: god,
  seed: 'd267-test',
  pool,
  deck20: DECK20,
  bonuses: new Map(),
  history: { offered: [], declined: [] },
  recommended,
  ...over,
})

type Offer = ReturnType<typeof pickRewardOffer>
const ids = (o: Offer) => o.candidates.map((c) => c.card.id)
const roles = (o: Offer) => o.candidates.map((c) => c.role)

/** 不変条件（Final Design §1-5）を検査してから offer を返す */
const invariants = (input: RewardPickInput): Offer => {
  const o = pickRewardOffer(input)
  expect(o.candidates).toHaveLength(3)
  expect(new Set(ids(o)).size).toBe(3)
  const poolIds = new Set(input.pool.map((c) => c.id))
  for (const c of o.candidates) {
    expect(poolIds.has(c.card.id)).toBe(true)
    if (c.role === 'identity') {
      expect(c.card.godId).toBe(input.godId)
      expect(input.bonuses.get(c.card.id) ?? 0).toBe(0)
    } else {
      expect(c.card.godId).toBeUndefined()
    }
    if (c.role === 'next') expect(c.copiesInDeck).toBe(0)
  }
  return o
}

describe('pickRewardOffer (決定267)', () => {
  it('P1: same input → same offer; different seed → different offer', () => {
    expect(DECK20).toHaveLength(20)
    const a = invariants(base())
    const b = pickRewardOffer(base())
    expect(JSON.stringify(b)).toBe(JSON.stringify(a))
    expect(a.legacyFallback).toBe(false)
    const seeds = ['d267-test-2', 'd267-test-3', 'd267-test-4']
    const changed = seeds.some((seed) => JSON.stringify(ids(pickRewardOffer(base({ seed })))) !== JSON.stringify(ids(a)))
    expect(changed).toBe(true)
  })

  it('P2: ready prefers a common card already at its cap (2 copies, bonus 0)', () => {
    const deck = DECK20.filter((id) => id !== CARD_IDS.mikoDance).concat(CARD_IDS.quickStrike)
    const o = invariants(base({ deck20: deck }))
    expect(o.candidates[0]).toMatchObject({ role: 'ready', copiesInDeck: 2, maxCopies: 2 })
    expect(o.candidates[0].card.id).toBe(CARD_IDS.quickStrike)
  })

  it('P3: ready falls back to a 1-copy common when nothing is at cap', () => {
    const o = invariants(base())
    expect(o.candidates[0].role).toBe('ready')
    expect(o.candidates[0].copiesInDeck).toBe(1)
    expect(o.candidates[0].card.godId).toBeUndefined()
    expect(COMMON12).toContain(o.candidates[0].card.id)
  })

  it('P4: cards with unused bonus headroom are excluded from every role', () => {
    const spare = invariants(base({ bonuses: new Map([[CARD_IDS.quickStrike, 1]]) }))
    expect(ids(spare)).not.toContain(CARD_IDS.quickStrike)
    const deck = DECK20.filter((id) => id !== CARD_IDS.mikoDance && id !== CARD_IDS.curse).concat(
      CARD_IDS.quickStrike,
      CARD_IDS.quickStrike,
    )
    const full = invariants(base({ deck20: deck, bonuses: new Map([[CARD_IDS.quickStrike, 1]]) }))
    expect(full.candidates[0]).toMatchObject({ role: 'ready', copiesInDeck: 3, maxCopies: 3 })
    expect(full.candidates[0].card.id).toBe(CARD_IDS.quickStrike)
  })

  it('P5: identity appears only when a fresh exclusive exists', () => {
    const o = invariants(base())
    const identity = o.candidates.filter((c) => c.role === 'identity')
    expect(identity).toHaveLength(1)
    expect(o.hasIdentitySlot).toBe(true)
    const first = identity[0].card.id
    const again = invariants(base({ history: { offered: [first], declined: [] } }))
    const second = again.candidates.filter((c) => c.role === 'identity')
    expect(second).toHaveLength(1)
    expect(second[0].card.id).not.toBe(first)
    expect(EXCLUSIVES).toContain(second[0].card.id)
  })

  it('P6: no fresh exclusive → two next cards', () => {
    const o = invariants(base({ bonuses: new Map(EXCLUSIVES.map((id) => [id, 1] as const)) }))
    expect(o.hasIdentitySlot).toBe(false)
    expect(roles(o)).toEqual(['ready', 'next', 'next'])
  })

  it('P7: next excludes in-deck cards and ranks by affinity (乱舞 first for 大耀)', () => {
    const o = invariants(base())
    const next = o.candidates.filter((c) => c.role === 'next')
    expect(next.length).toBeGreaterThan(0)
    expect(next[0].card.id).toBe(CARD_IDS.flurry)
    for (const c of next) {
      expect(c.copiesInDeck).toBe(0)
      expect(DECK20).not.toContain(c.card.id)
    }
    // 相性の根拠：大耀の専用札は attack／support・条件は charged → 乱舞（attack＋charged）＝4 点以上
    const exclusives = pool.filter((c) => c.godId === god)
    const ctx = {
      exclusiveTypes: new Set(exclusives.map((c) => c.type)),
      strongConds: new Set(exclusives.flatMap((c) => (c.bonus ? [c.bonus.when] : []))),
      recommendedSet: new Set(recommended),
    }
    const flurry = pool.find((c) => c.id === CARD_IDS.flurry) as CardDef
    expect(affinityScore(flurry, ctx)).toBeGreaterThanOrEqual(4)
  })

  it('P8: offered and declined cards are excluded', () => {
    const offered = [
      CARD_IDS.flurry,
      CARD_IDS.recklessBlow,
      CARD_IDS.windStep,
      CARD_IDS.warCry,
      CARD_IDS.heal,
      CARD_IDS.breathOfLife,
    ]
    const declined = [
      CARD_IDS.wellspring,
      CARD_IDS.catchBreath,
      CARD_IDS.greatHeal,
      CARD_IDS.fightingSpirit,
      CARD_IDS.renGeki,
      CARD_IDS.foresight,
    ]
    const o = invariants(base({ history: { offered, declined } }))
    for (const id of [...offered, ...declined]) expect(ids(o)).not.toContain(id)
    expect(o.legacyFallback).toBe(false)
  })

  it('P9: release order declined → offered, then legacy order (tiny pool)', () => {
    const tinyIds = [CARD_IDS.strike, CARD_IDS.guard, CARD_IDS.heal, CARD_IDS.curse, CARD_IDS.flurry, CARD_IDS.parry]
    const tiny = tinyIds.map((id) => pool.find((c) => c.id === id) as CardDef)
    const offered = tiny.slice(0, 3).map((c) => c.id)
    const declined = tiny.slice(3, 6).map((c) => c.id)
    const o = pickRewardOffer(base({ pool: tiny, deck20: [], history: { offered, declined } }))
    expect(o.candidates).toHaveLength(3)
    expect(o.legacyFallback).toBe(false)
    for (const id of ids(o)) expect(declined).toContain(id)
    // 全部除外かつ補充候補（共通札）が無い pool では旧等確率と同じ 3 枚になる
    const exclusivesOnly = pool.filter((c) => c.godId === god).slice(0, 3)
    const legacy = pickRewardOffer(
      base({
        pool: exclusivesOnly,
        deck20: [],
        bonuses: new Map(exclusivesOnly.map((c) => [c.id, 1] as const)),
        history: { offered: exclusivesOnly.map((c) => c.id), declined: [] },
      }),
    )
    expect(legacy.legacyFallback).toBe(true)
    expect(ids(legacy)).toEqual(pickRewardCandidates(exclusivesOnly, 'd267-test-reward', 3).map((c) => c.id))
  })

  it('P10: helpers: collectDeckCardIds sums 4 piles; formatRewardCopies variants', () => {
    const inst = (defId: CardDefId, n: number) => ({ uid: `u${n}`, defId }) as never
    const piles = {
      deck: [inst(CARD_IDS.strike, 1), inst(CARD_IDS.guard, 2)],
      hand: [inst(CARD_IDS.heal, 3)],
      discard: [inst(CARD_IDS.curse, 4)],
      exhausted: [inst(CARD_IDS.flurry, 5)],
    }
    expect(collectDeckCardIds(piles)).toEqual([
      CARD_IDS.strike,
      CARD_IDS.guard,
      CARD_IDS.heal,
      CARD_IDS.curse,
      CARD_IDS.flurry,
    ])
    expect(formatRewardCopies(2, 2)).toEqual({ now: 'いま 2 枚編成中', limit: '上限 2 → 3', hint: null })
    expect(formatRewardCopies(1, 2).hint).toBe('2 枚目を足してから 3 枚目')
    expect(formatRewardCopies(0, 2)).toMatchObject({ now: 'いま 0 枚', hint: 'まず 1〜2 枚入れてみよう' })
    expect(formatRewardCopies(3, 3).limit).toBe('上限 3 → 4')
  })
})

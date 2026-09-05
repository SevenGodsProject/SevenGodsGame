/**
 * 静的構造解析：60カード・7神・OTOMO・共鳴・神託の「データとしての」差別化度を測る。
 * simulationを回さず、定義データだけから分かる事実を out/static.json / static.md に出す。
 */
import { describe, it } from 'vitest'
import { OTOMOS } from '../../src/core/data/otomo'
import { DIVINATION_CHOICES } from '../../src/core/data/divination'
import type { CardDef, Effect, GodId } from '../../src/core/types'
import {
  ALL_CARDS, GODS, GOD_ORDER, GOD_NAME, RULES, getRecommendedDeck, getCardPoolForGod, getCardDef,
  cardDamage, cardBlock, cardHeal, cardResonance, cardDraw, cardGainAp, cardDebuff, cardBuff, cardSelfDamage,
  writeOut, mdTable, r2,
} from './harness'

function sig(card: CardDef): string {
  return card.effects
    .map((e) => (e.kind === 'damage' ? `${e.kind}:${e.target}` : e.kind === 'buff' || e.kind === 'debuff' ? `${e.kind}:${e.target}:${e.stat}` : e.kind))
    .sort()
    .join('+')
}

/** 「AP1あたりの価値」を1AP=5dmg基準で粗く換算（block/heal=1:1、resonance=2.5/pt、draw=4、gainAp=5、debuff=amount×rounds、buff=amount×rounds） */
function valueOf(card: CardDef): number {
  return card.effects.reduce((s, e) => {
    switch (e.kind) {
      case 'damage': return s + (e.target === 'enemy' ? e.amount : -e.amount)
      case 'block': return s + e.amount
      case 'heal': return s + e.amount
      case 'resonance': return s + e.amount * 2.5
      case 'draw': return s + e.amount * 4
      case 'gainAp': return s + e.amount * 5
      case 'debuff': return s + e.amount * e.rounds
      case 'buff': return s + e.amount * e.rounds
      default: return s
    }
  }, 0)
}

describe('Phase3 Step1 static audit', () => {
  it('60カード・7神・OTOMO の静的構造を出力する', () => {
    const cards = ALL_CARDS
    const commons = cards.filter((c) => !c.godId)
    const exclusives = cards.filter((c) => c.godId)

    // 1) Effect kind 分布
    const kindCount: Record<string, number> = {}
    const kindCards: Record<string, number> = {}
    for (const c of cards) {
      const seen = new Set<string>()
      for (const e of c.effects) {
        const k = e.kind === 'damage' ? `damage:${e.target}` : e.kind
        kindCount[k] = (kindCount[k] ?? 0) + 1
        seen.add(k)
      }
      for (const k of seen) kindCards[k] = (kindCards[k] ?? 0) + 1
    }
    const effectsPerCard = cards.map((c) => c.effects.length)
    const singleEffect = cards.filter((c) => c.effects.length === 1).length
    const twoEffect = cards.filter((c) => c.effects.length === 2).length
    const threePlus = cards.filter((c) => c.effects.length >= 3).length

    // 2) 効果シグネチャ（効果種類の組み合わせ）の種類数
    const sigCount: Record<string, string[]> = {}
    for (const c of cards) (sigCount[sig(c)] ??= []).push(c.name)

    // 3) 条件付き・連鎖・参照効果の存在量：Effect型は全て無条件の数値効果
    const effectKindsInType = ['damage', 'block', 'heal', 'resonance', 'draw', 'gainAp', 'buff', 'debuff', 'score']
    const conditional = 0 // Effect型に condition/trigger フィールドは存在しない
    const intentReferencing = 0
    const chain = 0

    // 4) AP効率（種類別）
    const eff = cards.map((c) => ({
      id: c.id, name: c.name, god: c.godId ? GOD_NAME[c.godId] : '共通', type: c.type, cost: c.cost,
      dmg: cardDamage(c.id), self: cardSelfDamage(c.id), block: cardBlock(c.id), heal: cardHeal(c.id), res: cardResonance(c.id),
      draw: cardDraw(c.id), ap: cardGainAp(c.id), debuff: cardDebuff(c.id), buff: cardBuff(c.id),
      value: valueOf(c), valuePerAp: r2(valueOf(c) / c.cost), sig: sig(c),
    }))

    // 5) 神ごとの専用カード・おすすめデッキの構成
    const godRows = GOD_ORDER.map((gid) => {
      const god = GODS.find((g) => g.id === gid)!
      const otomo = OTOMOS.find((o) => o.godId === gid)!
      const deck = getRecommendedDeck(gid)
      const defs = deck.map((id) => getCardDef(id))
      const sum = (f: (id: CardDef['id']) => number) => deck.reduce((s, id) => s + f(id), 0)
      const excl = defs.filter((d) => d.godId).length
      const exclSig = exclusives.filter((c) => c.godId === gid).map((c) => `${c.name}[${c.cost}]=${sig(c)}`)
      const burstSig = god.resonanceEffects.map((e: Effect) => `${e.kind}${'amount' in e ? e.amount : ''}`).join('+')
      const otomoG = (['incarnate', 'doji'] as const).map((f) => `${f}:${otomo.effectsByForm[f].map((e) => `${e.kind}${'amount' in e ? e.amount : ''}`).join('+')}`).join(' / ')
      const otomoP = (['incarnate', 'doji'] as const).map((f) => `${f}:${otomo.powerPathEffectsByForm[f].map((e) => `${e.kind}${'amount' in e ? e.amount : ''}`).join('+')}`).join(' / ')
      return {
        god: god.nameJa, archetype: god.archetype, burst: burstSig, otomoGuardian: otomoG, otomoPower: otomoP,
        exclusiveCards: exclSig,
        deck: {
          exclusiveCount: excl,
          totalCost: sum((id) => getCardDef(id).cost),
          avgCost: r2(sum((id) => getCardDef(id).cost) / 20),
          dmg: sum(cardDamage), block: sum(cardBlock), heal: sum(cardHeal), resonance: sum(cardResonance),
          draw: sum(cardDraw), gainAp: sum(cardGainAp), debuff: sum(cardDebuff), buff: sum(cardBuff), selfDmg: sum(cardSelfDamage),
          resonanceCardCount: defs.filter((d) => cardResonance(d.id) > 0).length,
          byType: defs.reduce<Record<string, number>>((acc, d) => ((acc[d.type] = (acc[d.type] ?? 0) + 1), acc), {}),
          uniqueDefs: new Set(deck).size,
          // 理論最大BURST回数：デッキ内共鳴総量 ÷ 7（全カードを引いて全部使えた場合）
          maxBurstsIfAllPlayed: Math.floor(sum(cardResonance) / RULES.resonance.max),
        },
        poolSize: getCardPoolForGod(gid).length,
      }
    })

    // 6) 神データの差別化に使われているフィールド一覧（GodDef の中で数値差があるもの）
    const godFieldsDiffer = ['resonanceEffects', 'otomoId(→effectsByForm/powerPath)', 'archetype(表示のみ)', 'tagline/motif(表示のみ)']
    const godFieldsSame = ['HP(30)', 'AP curve(2..8)', 'hand(5)', 'draw/R(2)', 'resonance max(7)', 'divination(7)', 'deck size(20)', 'passive effect(なし)', 'カード効果への神別修正(なし)']

    // 7) 共鳴・BURST 経済（静的）
    const commonRes = commons.filter((c) => cardResonance(c.id) > 0).map((c) => `${c.name}[${c.cost}]=+${cardResonance(c.id)}`)

    const out = {
      totals: { cards: cards.length, commons: commons.length, exclusives: exclusives.length, exclusivesPerGod: 4 },
      effectKindsInType, kindCount, kindCards,
      effectsPerCard: { single: singleEffect, two: twoEffect, threePlus, avg: r2(effectsPerCard.reduce((a, b) => a + b, 0) / cards.length) },
      signatures: Object.entries(sigCount).map(([s, names]) => ({ sig: s, count: names.length, names })).sort((a, b) => b.count - a.count),
      conditional, intentReferencing, chain,
      cards: eff,
      gods: godRows,
      godFieldsDiffer, godFieldsSame,
      commonResonanceCards: commonRes,
      divination: DIVINATION_CHOICES.map((d) => ({ name: d.name, effects: d.effects })),
      rules: { resonanceMax: RULES.resonance.max, divinationCount: RULES.divination.count, stakesDivination: RULES.stakes.divinationCount, ap: RULES.ap.perRound, hand: RULES.deck.initialHand, draw: RULES.deck.drawPerRound },
    }
    writeOut('static.json', out)

    const md: string[] = []
    md.push('# Static audit')
    md.push(`cards=${cards.length} (common ${commons.length} / exclusive ${exclusives.length})`)
    md.push(`effects per card: single=${singleEffect} two=${twoEffect} 3+=${threePlus}`)
    md.push(`conditional=${conditional} intentRef=${intentReferencing} chain=${chain}`)
    md.push('\n## effect kind usage (effect count / cards containing)')
    md.push(mdTable(['kind', 'effects', 'cards'], Object.keys(kindCount).map((k) => [k, kindCount[k], kindCards[k]])))
    md.push('\n## signatures')
    md.push(mdTable(['signature', 'count', 'cards'], out.signatures.map((s) => [s.sig, s.count, s.names.join('、')])))
    md.push('\n## gods / recommended decks')
    md.push(mdTable(
      ['god', 'arche', 'burst', 'otomo(guardian)', 'excl', 'avgCost', 'dmg', 'block', 'heal', 'res', 'resCards', 'maxBurst', 'draw', 'ap', 'debuff', 'buff', 'self'],
      godRows.map((g) => [g.god, g.archetype, g.burst, g.otomoGuardian, g.deck.exclusiveCount, g.deck.avgCost, g.deck.dmg, g.deck.block, g.deck.heal, g.deck.resonance, g.deck.resonanceCardCount, g.deck.maxBurstsIfAllPlayed, g.deck.draw, g.deck.gainAp, g.deck.debuff, g.deck.buff, g.deck.selfDmg]),
    ))
    md.push('\n## card value per AP')
    md.push(mdTable(['card', 'god', 'type', 'cost', 'dmg', 'blk', 'heal', 'res', 'draw', 'ap', 'debuff', 'buff', 'self', 'val/AP', 'sig'],
      eff.sort((a, b) => b.valuePerAp - a.valuePerAp).map((c) => [c.name, c.god, c.type, c.cost, c.dmg, c.block, c.heal, c.res, c.draw, c.ap, c.debuff, c.buff, c.self, c.valuePerAp, c.sig])))
    writeOut('static.md', md.join('\n'))
    console.log(md.join('\n'))
  })
})

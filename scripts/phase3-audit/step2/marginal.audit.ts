/**
 * Step 2.5 Card Preference Validation：God × Card marginal value（対応seed・1枚差し替え法）。
 *
 * 使用率（played/seen）はAP余剰で天井に張り付くため、代わりに
 *   「おすすめデッキ20枚のうち1枠（filler）を候補カードcに差し替えたときの勝率・スコアの差」
 * を、同じseed・同じ敵（対応標本）で測る。
 *   - base19 = おすすめデッキ − filler（その神のデッキ内で最も価値の低い1枚のみの共通カード）
 *   - inclusion：cがbase19に2枚未満 → base19 + c
 *   - removal ：cがbase19に既に2枚 → base19 − c + filler（符号を反転して「持っている価値」に換算）
 *   - value(c) = 結果 − 基準（base19 + filler ＝ 現行おすすめデッキそのもの）
 * 対応標本の差 d_i ∈ {−1,0,+1} から SE を直接計算する。
 *
 * env: RULESET=C0|C3-4v2 ..., COND=stress|s7|s4, SEEDS=32
 */
import { describe, it } from 'vitest'
import type { CardDefId, GodId } from '../../../src/core/types'
import { GOD_ORDER, GOD_NAME, ENEMY_ORDER, PROFILES, getCardPoolForGod, getCardDef, getRecommendedDeck, writeOut, mdTable, r1, r2,
  cardDamage, cardBlock, cardHeal, cardResonance, cardDraw, cardGainAp, cardDebuff, cardBuff } from '../harness'
import { activate, deactivate, runGame2, searchAgent2 } from './harness2'
import { rulesetByName } from './designs'

const RULESET = process.env.RULESET ?? 'C0'
const COND = (process.env.COND ?? 'stress') as 'stress' | 's7' | 's4'
const SEEDS = Number(process.env.SEEDS ?? 32)
const rs = rulesetByName(RULESET)
/** 別ルールセット同士を同一seedで比べるための共通タグ（未指定ならルールセット名） */
const SEEDTAG = process.env.SEEDTAG ?? RULESET
const GODS_FILTER = process.env.GODS ? process.env.GODS.split(",") : null

function staticValuePerAp(id: CardDefId): number {
  const d = getCardDef(id)
  const v = cardDamage(id) + cardBlock(id) + cardHeal(id) + cardResonance(id) * 2.5 + cardDraw(id) * 4 + cardGainAp(id) * 5 + cardDebuff(id) + cardBuff(id)
  return v / Math.max(1, d.cost)
}

function pickFiller(deck: CardDefId[]): CardDefId {
  const counts = new Map<CardDefId, number>()
  for (const id of deck) counts.set(id, (counts.get(id) ?? 0) + 1)
  const singles = [...counts.entries()].filter(([id, n]) => n === 1 && !getCardDef(id).godId).map(([id]) => id)
  const pool = singles.length ? singles : [...counts.keys()].filter((id) => !getCardDef(id).godId)
  return pool.sort((a, b) => staticValuePerAp(a) - staticValuePerAp(b))[0]
}

type Res = { won: number; score: number }
function play(god: GodId, deck: CardDefId[], seed: string): Res {
  const m = runGame2({
    seed, godId: god, enemyId: ENEMY_ORDER[Number(seed.split('#')[1]) % 7], deck,
    stake: COND === 's4' ? 4 : 7, stakeChoice: COND === 's4' ? undefined : 'pressure', difficulty: COND === 'stress' ? 'hard' : 'normal',
  }, searchAgent2(PROFILES.balanced, 400))
  return { won: m.status === 'won' ? 1 : 0, score: m.finalScore }
}

describe(`Step2.5 marginal value ${RULESET} ${COND}`, () => {
  it('god × card marginal value (paired seeds)', () => {
    const t0 = Date.now()
    activate(rs)
    const out: Record<string, unknown> = { ruleset: RULESET, cond: COND, seeds: SEEDS, gods: {} as Record<string, unknown> }
    const md: string[] = [`# Step 2.5 marginal value — ${RULESET}（${rs.notes}） / ${COND} / N=${SEEDS * 7} paired games per card`]
    const seeds: string[] = []
    for (let s = 0; s < SEEDS; s++) for (let e = 0; e < 7; e++) seeds.push(`m25-${SEEDTAG}-${COND}-${s}#${e}`)

    for (const god of GOD_ORDER) {
      if (GODS_FILTER && !GODS_FILTER.includes(god)) continue
      const base = getRecommendedDeck(god)
      const filler = pickFiller(base)
      const base19 = [...base]
      base19.splice(base19.indexOf(filler), 1)
      const count19 = new Map<CardDefId, number>()
      for (const id of base19) count19.set(id, (count19.get(id) ?? 0) + 1)
      const baseRes = seeds.map((sd) => play(god, base, sd))
      const baseWR = baseRes.reduce((s, r) => s + r.won, 0) / seeds.length
      const baseScore = baseRes.reduce((s, r) => s + r.score, 0) / seeds.length
      const rows: { id: CardDefId; name: string; excl: boolean; mode: 'inclusion' | 'removal' | 'base'; dWin: number; se: number; dScore: number; inBase: number }[] = []
      for (const c of getCardPoolForGod(god).map((x) => x.id)) {
        const n19 = count19.get(c) ?? 0
        let deck: CardDefId[]
        let mode: 'inclusion' | 'removal' | 'base'
        if (c === filler) { deck = base; mode = 'base' }
        else if (n19 < 2) { deck = [...base19, c]; mode = 'inclusion' }
        else {
          // removal：base20 − c ＝ base19 − c + filler、空いた1枠は filler の2枚目で埋める（Δ ＝ filler − c、符号反転で c − filler）
          deck = [...base19]; deck.splice(deck.indexOf(c), 1); deck.push(filler, filler); mode = 'removal'
        }
        const res = mode === 'base' ? baseRes : seeds.map((sd) => play(god, deck, sd))
        const sign = mode === 'removal' ? -1 : 1
        const d = res.map((r, i) => sign * (r.won - baseRes[i].won))
        const dWin = (d.reduce((s, x) => s + x, 0) / d.length) * 100
        const mean = d.reduce((s, x) => s + x, 0) / d.length
        const varD = d.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, d.length - 1)
        const se = Math.sqrt(varD / d.length) * 100
        const dScore = (res.reduce((s, r) => s + r.score, 0) / res.length - baseScore) * sign
        rows.push({ id: c, name: getCardDef(c).name, excl: !!getCardDef(c).godId, mode, dWin: r1(dWin), se: r1(se), dScore: Math.round(dScore), inBase: base.filter((x) => x === c).length })
      }
      ;(out.gods as Record<string, unknown>)[god] = { filler: getCardDef(filler).name, baseWR: r1(baseWR * 100), baseScore: Math.round(baseScore), cards: rows }
      md.push(`\n## ${GOD_NAME[god]}：base WR ${r1(baseWR * 100)}% / score ${Math.round(baseScore)} / filler=${getCardDef(filler).name}`)
      md.push(mdTable(['card', 'excl', 'mode', 'inBase', 'dWin pt', '±SE', 'dScore'], rows.sort((a, b) => b.dWin + b.dScore / 100 - (a.dWin + a.dScore / 100)).map((r) => [r.name, r.excl ? '専用' : '', r.mode, r.inBase, r.dWin, r.se, r.dScore])))
      console.log(`${RULESET} ${COND} ${GOD_NAME[god]} done ${((Date.now() - t0) / 1000).toFixed(0)}s`)
    }
    deactivate()
    writeOut(`step25_marginal_${RULESET}_${COND}.json`, out)
    writeOut(`step25_marginal_${RULESET}_${COND}.md`, md.join('\n'))
  })
})

/**
 * Card Preference 深掘り：使用率（played/seen）はAP余剰で天井に張り付くため、
 *  - 各ラウンド「最初に使うカード」の種別分布（＝優先順位の代理指標）
 *  - 使用カード全体の種別分布
 *  - 共通カードのデッキ内価値 dWin（神別）と、それに基づく報酬3択一致率
 * を C0 と候補ルールセットで比較する。ランダム合法デッキ × 探索AI balanced。
 */
import { describe, it } from 'vitest'
import { createRng } from '../../../src/core/rng/seededRandom'
import type { CardDefId, CardType, GameState, GodId } from '../../../src/core/types'
import { GOD_ORDER, GOD_NAME, ENEMY_ORDER, PROFILES, getCardPoolForGod, getCardDef, writeOut, mdTable, r1, r2, avg } from '../harness'
import { activate, deactivate, runGame2, searchAgent2, type Agent2 } from './harness2'
import { rulesetByName } from './designs'

const DECKS = Number(process.env.DECKS ?? 300)
const targets = (process.env.RULESETS ?? 'C0,C3-6v2').split(',').map(rulesetByName)
const TYPES: CardType[] = ['attack', 'guard', 'support', 'resonance', 'hinder', 'oracle']

function randomDeck(godId: GodId, rng: ReturnType<typeof createRng>): CardDefId[] {
  const pool = getCardPoolForGod(godId).map((c) => c.id)
  const counts = new Map<CardDefId, number>()
  const deck: CardDefId[] = []
  while (deck.length < 20) { const id = pool[rng.nextInt(0, pool.length)]; const c = counts.get(id) ?? 0; if (c >= 2) continue; counts.set(id, c + 1); deck.push(id) }
  return deck
}

/** 探索AIをラップし、ラウンド最初のカード種別と全使用種別を記録する */
function observe(agent: Agent2, firstBy: Record<string, number>, allBy: Record<string, number>): Agent2 {
  return (state: GameState) => {
    const a = agent(state)
    if (a && a.type === 'PLAY_CARD') {
      const t = getCardDef(state.hand.find((c) => c.uid === a.uid)!.defId).type
      allBy[t] = (allBy[t] ?? 0) + 1
      if (state.cardsPlayedThisRound === 0) firstBy[t] = (firstBy[t] ?? 0) + 1
    }
    return a
  }
}

describe('Step2 card preference', () => {
  it('first-card type share / dWin / reward agreement', () => {
    const md: string[] = ['# Card preference (random decks, search AI balanced)', `DECKS=${DECKS}/god/condition`]
    const out: Record<string, unknown> = {}
    for (const rs of targets) {
      activate(rs)
      for (const cond of ['stake5', 'stress'] as const) {
        const first: Record<string, Record<string, number>> = {}
        const all: Record<string, Record<string, number>> = {}
        type CS = { inG: number; inW: number; outG: number; outW: number }
        const B = new Map<string, CS>()
        const getB = (k: string) => { let s = B.get(k); if (!s) { s = { inG: 0, inW: 0, outG: 0, outW: 0 }; B.set(k, s) } return s }
        for (const god of GOD_ORDER) {
          first[god] = {}; all[god] = {}
          const pool = getCardPoolForGod(god).map((c) => c.id)
          const rng = createRng(`s2cp-${god}-${cond}`)
          for (let d = 0; d < DECKS; d++) {
            const deck = randomDeck(god, rng)
            const m = runGame2({ seed: `s2cp-${rs.name}-${god}-${cond}-${d}`, godId: god, enemyId: ENEMY_ORDER[d % 7], deck, stake: cond === 'stake5' ? 5 : 7, stakeChoice: cond === 'stress' ? 'pressure' : undefined, difficulty: cond === 'stress' ? 'hard' : 'normal' }, observe(searchAgent2(PROFILES.balanced, 400), first[god], all[god]))
            const won = m.status === 'won' ? 1 : 0
            const inDeck = new Set(deck)
            for (const id of pool) { const s = getB(`${god}|${id}`); if (inDeck.has(id)) { s.inG++; s.inW += won } else { s.outG++; s.outW += won } }
          }
        }
        const share = (rec: Record<string, number>) => { const n = Object.values(rec).reduce((a, b) => a + b, 0); return Object.fromEntries(TYPES.map((t) => [t, n ? ((rec[t] ?? 0) / n) * 100 : 0])) }
        md.push(`\n## ${rs.name}（${rs.notes}）— ${cond}`)
        md.push('\n### ラウンド最初に使うカードの種別（%）')
        const fs = Object.fromEntries(GOD_ORDER.map((g) => [g, share(first[g])]))
        md.push(mdTable(['god', ...TYPES], GOD_ORDER.map((g) => [GOD_NAME[g], ...TYPES.map((t) => r1(fs[g][t]))])))
        const spreadFirst = TYPES.map((t) => { const v = GOD_ORDER.map((g) => fs[g][t]); return Math.max(...v) - Math.min(...v) })
        md.push(`種別ごとの神間スプレッド(pt): ${TYPES.map((t, i) => `${t}=${r1(spreadFirst[i])}`).join(' ')} / 合計=${r1(spreadFirst.reduce((a, b) => a + b, 0))}`)
        md.push('\n### 使用カード全体の種別（%）')
        const as = Object.fromEntries(GOD_ORDER.map((g) => [g, share(all[g])]))
        md.push(mdTable(['god', ...TYPES], GOD_ORDER.map((g) => [GOD_NAME[g], ...TYPES.map((t) => r1(as[g][t]))])))
        const spreadAll = TYPES.map((t) => { const v = GOD_ORDER.map((g) => as[g][t]); return Math.max(...v) - Math.min(...v) })
        md.push(`種別ごとの神間スプレッド(pt): ${TYPES.map((t, i) => `${t}=${r1(spreadAll[i])}`).join(' ')} / 合計=${r1(spreadAll.reduce((a, b) => a + b, 0))}`)
        // dWin per common card
        const commons = getCardPoolForGod(GOD_ORDER[0]).filter((c) => !c.godId).map((c) => c.id)
        const dWin = (g: GodId, id: CardDefId) => { const s = getB(`${g}|${id}`); return (s.inG ? s.inW / s.inG : 0) * 100 - (s.outG ? s.outW / s.outG : 0) * 100 }
        const rows = commons.map((id) => { const v = GOD_ORDER.map((g) => dWin(g, id)); return { id, v, spread: Math.max(...v) - Math.min(...v), signFlip: v.some((x) => x > 3) && v.some((x) => x < -3) } }).sort((a, b) => b.spread - a.spread)
        md.push('\n### 共通カード dWin（デッキに入れたときの勝率差 pt）上位12')
        md.push(mdTable(['card', ...GOD_ORDER.map((g) => GOD_NAME[g]), 'spread', 'signFlip'], rows.slice(0, 12).map((r) => [getCardDef(r.id).name, ...r.v.map((x) => r1(x)), r1(r.spread), r.signFlip ? '◯' : ''])))
        const flips = rows.filter((r) => r.signFlip).length
        const posAll = commons.filter((id) => GOD_ORDER.every((g) => dWin(g, id) > 0)).length
        const negAll = commons.filter((id) => GOD_ORDER.every((g) => dWin(g, id) < 0)).length
        // reward agreement by dWin
        const rng = createRng(`s2cp-reward-${rs.name}-${cond}`)
        let same = 0, T = 3000, distinct = 0
        for (let t = 0; t < T; t++) { const sh = rng.shuffle(commons).slice(0, 3); const picks = GOD_ORDER.map((g) => sh.reduce((b, id) => (dWin(g, id) > dWin(g, b) ? id : b), sh[0])); const d = new Set(picks).size; distinct += d; if (d === 1) same++ }
        md.push(`神で符号が反転する共通カード（+3/−3pt以上）: ${flips}/32、全神プラス: ${posAll}、全神マイナス: ${negAll}、報酬3択一致率(dWin基準): ${r1((same / T) * 100)}% (avg distinct ${r2(distinct / T)})`)
        out[`${rs.name}|${cond}`] = { first: fs, all: as, spreadFirst: r1(spreadFirst.reduce((a, b) => a + b, 0)), spreadAll: r1(spreadAll.reduce((a, b) => a + b, 0)), flips, posAll, negAll, rewardSame: r1((same / T) * 100), avgDistinct: r2(distinct / T) }
        console.log(`${rs.name} ${cond} done`)
      }
      deactivate()
    }
    writeOut('step2_cardpref.json', out)
    writeOut('step2_cardpref.md', md.join('\n'))
    console.log(md.join('\n'))
  })
})
void avg

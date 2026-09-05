/**
 * Step 2 本simulation：有望ルールセット（env RULESETS）について
 *  A) 探索AI×6プロファイル × 7神×7敵 × 神階{0,4,7} × SEEDS_A → 最良プロファイル分岐・神階Ⅶスプレッド・神階0 Safety・スコア整合
 *  B) ランダム合法デッキ × 探索AI balanced × 神階{0,5} → God×Card 使用率スプレッド・専用カード価値・報酬3択一致率
 *  C) ヒューリスティック3戦略 × 神階{0,7}（既存balanceSim互換の確認）
 */
import { describe, it } from 'vitest'
import { createRng } from '../../../src/core/rng/seededRandom'
import type { CardDefId, GodId } from '../../../src/core/types'
import { GOD_ORDER, GOD_NAME, ENEMY_ORDER, ENEMY_NAME, PROFILES, getCardPoolForGod, getCardDef, writeOut, mdTable, r1, r2, avg } from '../harness'
import { activate, deactivate, getDeckFor, runGame2, searchAgent2, heuristicAgent2, type Metrics2 } from './harness2'
import { rulesetByName } from './designs'

const SEEDS_A = Number(process.env.SEEDS_A ?? 16)
const DECKS_B = Number(process.env.DECKS_B ?? 220)
const PROFILE_NAMES = Object.keys(PROFILES)
const targets = (process.env.RULESETS ?? 'C0').split(',').map(rulesetByName)

type Cell = { n: number; win: number; score: number; winScore: number; rounds: number[]; bursts: number; block: number; unusedBlock: number; heal: number; healReq: number; dmgCard: number; dmgBurst: number; dmgPassive: number; debuffEff: number; enemyRaw: number; cards: number; drawExtra: number; apGained: number; otomo: number }
const newCell = (): Cell => ({ n: 0, win: 0, score: 0, winScore: 0, rounds: [], bursts: 0, block: 0, unusedBlock: 0, heal: 0, healReq: 0, dmgCard: 0, dmgBurst: 0, dmgPassive: 0, debuffEff: 0, enemyRaw: 0, cards: 0, drawExtra: 0, apGained: 0, otomo: 0 })
function add(c: Cell, m: Metrics2) {
  c.n++; c.score += m.finalScore
  if (m.status === 'won') { c.win++; c.winScore += m.finalScore; c.rounds.push(m.round) }
  c.bursts += m.bursts; c.block += m.blockGained; c.unusedBlock += m.unusedBlock; c.heal += m.healed; c.healReq += m.healRequested
  c.dmgCard += m.dmgCard; c.dmgBurst += m.dmgBurst; c.dmgPassive += m.dmgPassive; c.debuffEff += m.debuffEffective; c.enemyRaw += m.enemyRawDamage
  c.cards += m.cardsPlayedTotal; c.drawExtra += m.drawExtra; c.apGained += m.apGained; c.otomo += m.otomoFinalForm
}
const wr = (c: Cell) => (c.n ? (c.win / c.n) * 100 : 0)
const sc = (c: Cell) => (c.n ? c.score / c.n : 0)

function randomDeck(godId: GodId, rng: ReturnType<typeof createRng>): CardDefId[] {
  const pool = getCardPoolForGod(godId).map((c) => c.id)
  const counts = new Map<CardDefId, number>()
  const deck: CardDefId[] = []
  while (deck.length < 20) { const id = pool[rng.nextInt(0, pool.length)]; const c = counts.get(id) ?? 0; if (c >= 2) continue; counts.set(id, c + 1); deck.push(id) }
  return deck
}

describe('Step2 full', () => {
  it('A/B/C for rulesets', () => {
    const t0 = Date.now()
    for (const rs of targets) {
      activate(rs)
      const md: string[] = [`# Step 2 full — ${rs.name}（${rs.notes}）`]
      const out: Record<string, unknown> = { ruleset: rs.name }

      // ---------------- A ----------------
      const A = new Map<string, Cell>()
      const getA = (k: string) => { let c = A.get(k); if (!c) { c = newCell(); A.set(k, c) } return c }
      for (const god of GOD_ORDER) {
        const deck = getDeckFor(god, rs.deckMode)
        for (const stake of [0, 4, 7, 8]) for (const pn of PROFILE_NAMES) for (const enemy of ENEMY_ORDER) for (let i = 0; i < SEEDS_A; i++) {
          // stake 8 ＝ 分析専用ストレス条件（難易度hard×神階Ⅶ）。勝率天井の分離用
          const st = stake === 8 ? 7 : stake
          const m = runGame2({ seed: `s2f-${god}-${enemy}-${stake}-${pn}-${i}`, godId: god, enemyId: enemy, deck, stake: st || undefined, stakeChoice: st === 7 ? 'pressure' : undefined, difficulty: stake === 8 ? 'hard' : 'normal' }, searchAgent2(PROFILES[pn], 400))
          add(getA(`${god}|${stake}|${pn}|ALL`), m); add(getA(`${god}|${stake}|${pn}|${enemy}`), m)
        }
      }
      const gateA: Record<string, unknown> = {}
      for (const stake of [0, 4, 7, 8]) {
        md.push(`\n## A) 神階${stake === 8 ? 'Ⅶ×hard（ストレス・分析専用）' : stake}：プロファイル別 勝率/平均スコア（${SEEDS_A * 7}試合/セル）`)
        const rows: (string | number)[][] = []
        const best: Record<string, { pn: string; wr: number; gain: number; score: number }> = {}
        for (const god of GOD_ORDER) {
          const per = PROFILE_NAMES.map((pn) => { const c = getA(`${god}|${stake}|${pn}|ALL`); return { pn, wr: wr(c), score: sc(c), comp: wr(c) + sc(c) / 100, c } })
          const b = per.reduce((x, y) => (y.comp > x.comp ? y : x))
          const ref = Math.max(per.find((p) => p.pn === 'balanced')!.wr, per.find((p) => p.pn === 'rush')!.wr)
          best[GOD_NAME[god]] = { pn: b.pn, wr: r1(b.wr), gain: r1(b.wr - ref), score: Math.round(b.score) }
          const bal = per.find((p) => p.pn === 'balanced')!.c
          rows.push([GOD_NAME[god], ...per.map((p) => `${r1(p.wr)}/${Math.round(p.score)}`), b.pn, r1(b.wr - ref), r1(bal.bursts / bal.n), r2(bal.otomo / bal.n), r1(bal.dmgCard / bal.n), r1(bal.dmgBurst / bal.n), r1(bal.dmgPassive / bal.n), r1(bal.block / bal.n), r1(bal.unusedBlock / bal.n), r1(bal.heal / bal.n), r1(bal.healReq / bal.n), r1(bal.debuffEff / bal.n), r1(bal.drawExtra / bal.n), r1(bal.apGained / bal.n), r1(bal.cards / bal.n)])
        }
        md.push(mdTable(['god', ...PROFILE_NAMES, 'best', 'gain', 'burst/g', 'otomo', 'dmgCard', 'dmgBurst', 'dmgPassive', 'block', 'unusedBlk', 'heal', 'healReq', 'debuffEff', 'draw+', 'ap+', 'cards'], rows))
        const bests = Object.values(best)
        const distinct = new Set(bests.map((b) => b.pn)).size
        const meaningful = bests.filter((b) => b.gain >= 5).length
        const nonRB = bests.filter((b) => b.pn !== 'rush' && b.pn !== 'balanced').length
        const wrs = bests.map((b) => b.wr)
        const scores = bests.map((b) => b.score)
        gateA[`stake${stake}`] = { best, distinct, meaningful, nonRushBalancedBest: nonRB, godSpread: r1(Math.max(...wrs) - Math.min(...wrs)), overall: r1(avg(wrs)), min: Math.min(...wrs), scoreSpread: r1(Math.max(...scores) / Math.max(1, Math.min(...scores))) }
        md.push(`distinctBest=${distinct} meaningful(≥5pt vs bal/rush)=${meaningful} nonRush/BalBest=${nonRB} godSpread=${r1(Math.max(...wrs) - Math.min(...wrs))} overall=${r1(avg(wrs))} min=${Math.min(...wrs)} scoreRatio(max/min)=${r1(Math.max(...scores) / Math.max(1, Math.min(...scores)))}`)
        // 神×敵の最良プロファイル
        md.push(`\n### 神×敵 最良プロファイル（神階${stake}）`)
        md.push(mdTable(['god', ...ENEMY_ORDER.map((e) => ENEMY_NAME[e])], GOD_ORDER.map((god) => [GOD_NAME[god], ...ENEMY_ORDER.map((e) => { const per = PROFILE_NAMES.map((pn) => { const c = getA(`${god}|${stake}|${pn}|${e}`); return { pn, comp: wr(c) + sc(c) / 100, wr: wr(c) } }); const b = per.reduce((x, y) => (y.comp > x.comp ? y : x)); return `${b.pn} ${r1(b.wr)}%` })])))
      }
      out.A = gateA
      console.log(`${rs.name} A done ${((Date.now() - t0) / 1000).toFixed(0)}s`)

      // ---------------- B ----------------
      type CS = { seen: number; played: number; inG: number; inW: number; inS: number; outG: number; outW: number; outS: number }
      const B = new Map<string, CS>()
      const getB = (k: string) => { let s = B.get(k); if (!s) { s = { seen: 0, played: 0, inG: 0, inW: 0, inS: 0, outG: 0, outW: 0, outS: 0 }; B.set(k, s) } return s }
      for (const god of GOD_ORDER) {
        const pool = getCardPoolForGod(god).map((c) => c.id)
        for (const stake of [0, 5]) {
          const rng = createRng(`s2f-decks-${god}-${stake}`)
          for (let d = 0; d < DECKS_B; d++) {
            const deck = randomDeck(god, rng)
            const m = runGame2({ seed: `s2fB-${god}-${stake}-${d}`, godId: god, enemyId: ENEMY_ORDER[d % 7], deck, stake: stake || undefined }, searchAgent2(PROFILES.balanced, 400))
            const won = m.status === 'won' ? 1 : 0
            const inDeck = new Set(deck)
            for (const id of pool) { const s = getB(`${god}|${stake}|${id}`); if (inDeck.has(id)) { s.inG++; s.inW += won; s.inS += m.finalScore } else { s.outG++; s.outW += won; s.outS += m.finalScore } }
            for (const [id, n] of Object.entries(m.cardsSeen)) getB(`${god}|${stake}|${id}`).seen += n
            for (const [id, n] of Object.entries(m.cardsPlayed)) getB(`${god}|${stake}|${id}`).played += n
          }
        }
      }
      const commons = getCardPoolForGod(GOD_ORDER[0]).filter((c) => !c.godId).map((c) => c.id)
      const gateB: Record<string, unknown> = {}
      for (const stake of [0, 5]) {
        const usage = (g: GodId, id: CardDefId) => { const s = getB(`${g}|${stake}|${id}`); return s.seen ? (s.played / s.seen) * 100 : 0 }
        const dWin = (g: GodId, id: CardDefId) => { const s = getB(`${g}|${stake}|${id}`); return (s.inG ? s.inW / s.inG : 0) * 100 - (s.outG ? s.outW / s.outG : 0) * 100 }
        const rows = commons.map((id) => { const cells = GOD_ORDER.map((g) => usage(g, id)); return { id, cells, spread: Math.max(...cells) - Math.min(...cells) } }).sort((a, b) => b.spread - a.spread)
        const spread15 = rows.filter((r) => r.spread >= 15).length
        const meanAll: Record<string, number> = {}; for (const id of commons) meanAll[id] = avg(GOD_ORDER.map((g) => usage(g, id)))
        const devCount = GOD_ORDER.map((g) => commons.filter((id) => Math.abs(usage(g, id) - meanAll[id]) >= 10).length)
        const negExcl = GOD_ORDER.flatMap((g) => getCardPoolForGod(g).filter((c) => c.godId === g).map((c) => ({ god: GOD_NAME[g], name: c.name, dWin: r1(dWin(g, c.id)), usage: r1(usage(g, c.id)) })))
        const negCount = negExcl.filter((x) => x.dWin < 0).length
        // 報酬一致率（使用率ベース＝低ノイズ）
        const rng = createRng(`s2f-reward-${stake}`)
        let same = 0, T = 3000, distinctSum = 0
        for (let t = 0; t < T; t++) { const sh = rng.shuffle(commons).slice(0, 3); const picks = GOD_ORDER.map((g) => sh.reduce((b, id) => (usage(g, id) > usage(g, b) ? id : b), sh[0])); const d = new Set(picks).size; distinctSum += d; if (d === 1) same++ }
        gateB[`stake${stake}`] = { spread15, meanSpread: r1(avg(rows.map((r) => r.spread))), devCountByGod: Object.fromEntries(GOD_ORDER.map((g, i) => [GOD_NAME[g], devCount[i]])), negativeExclusives: negCount, rewardSameRate: r1((same / T) * 100), rewardAvgDistinct: r2(distinctSum / T), exclusives: negExcl }
        md.push(`\n## B) 神階${stake}：共通カード使用率スプレッド（上位15）`)
        md.push(mdTable(['card', ...GOD_ORDER.map((g) => GOD_NAME[g]), 'spread'], rows.slice(0, 15).map((r) => [getCardDef(r.id).name, ...r.cells.map((c) => r1(c)), r1(r.spread)])))
        md.push(`spread≥15pt: ${spread15}/32, mean spread ${r1(avg(rows.map((r) => r.spread)))}, 神別偏差≥10pt枚数: ${devCount.join('/')}, 専用負価値 ${negCount}/28, 報酬一致率 ${r1((same / T) * 100)}% (avg distinct ${r2(distinctSum / T)})`)
        md.push(`\n### 専用カード価値（神階${stake}）`)
        md.push(mdTable(['god', 'card', 'usage%', 'dWin'], negExcl.map((x) => [x.god, x.name, x.usage, x.dWin])))
      }
      out.B = gateB
      console.log(`${rs.name} B done ${((Date.now() - t0) / 1000).toFixed(0)}s`)

      // ---------------- C ----------------
      const C = new Map<string, Cell>()
      const getC = (k: string) => { let c = C.get(k); if (!c) { c = newCell(); C.set(k, c) } return c }
      for (const god of GOD_ORDER) {
        const deck = getDeckFor(god, rs.deckMode)
        for (const stake of [0, 7]) for (const st of ['balanced', 'aggressive', 'defensive'] as const) for (const enemy of ENEMY_ORDER) for (let i = 0; i < 20; i++) {
          const m = runGame2({ seed: `s2fC-${god}-${enemy}-${stake}-${st}-${i}`, godId: god, enemyId: enemy, deck, stake: stake || undefined, stakeChoice: stake === 7 ? 'pressure' : undefined }, heuristicAgent2(st))
          add(getC(`${god}|${stake}|${st}`), m)
        }
      }
      md.push('\n## C) ヒューリスティック3戦略（既存balanceSim互換）勝率 神階0 / 神階7')
      md.push(mdTable(['god', 'bal@0', 'agg@0', 'def@0', 'bal@7', 'agg@7', 'def@7', 'best@7'], GOD_ORDER.map((god) => { const v = [0, 7].flatMap((s) => (['balanced', 'aggressive', 'defensive'] as const).map((st) => wr(getC(`${god}|${s}|${st}`)))); return [GOD_NAME[god], ...v.map((x) => r1(x)), r1(Math.max(v[3], v[4], v[5]))] })))
      out.C = Object.fromEntries(GOD_ORDER.map((god) => [GOD_NAME[god], Object.fromEntries([0, 7].flatMap((s) => (['balanced', 'aggressive', 'defensive'] as const).map((st) => [`${st}@${s}`, r1(wr(getC(`${god}|${s}|${st}`)))])))]))

      deactivate()
      writeOut(`step2_full_${rs.name}.json`, out)
      writeOut(`step2_full_${rs.name}.md`, md.join('\n'))
      console.log(`${rs.name} full done ${((Date.now() - t0) / 1000).toFixed(0)}s`)
    }
  })
})

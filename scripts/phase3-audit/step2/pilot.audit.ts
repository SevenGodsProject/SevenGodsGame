/**
 * Step 2 pilot：全ルールセットを同条件（7神×7敵×神階{4,7}×6プロファイル×SEEDS）で回し、
 * Gate候補の一次スクリーニングを出す。環境変数 RULESETS="C0,B1,..." で対象を絞れる。
 */
import { describe, it } from 'vitest'
import { GOD_ORDER, GOD_NAME, ENEMY_ORDER, PROFILES, writeOut, mdTable, r1, avg } from '../harness'
import { activate, deactivate, getDeckFor, runGame2, searchAgent2, type Metrics2 } from './harness2'
import { RULESETS, rulesetByName } from './designs'

const SEEDS = Number(process.env.SEEDS ?? 6)
const STAKES = (process.env.STAKES ?? '4,7').split(',').map(Number)
// 飽和対策：勝率が天井（100%）に張り付く強い構成を分離するためのストレス測定（分析専用。難易度hard×神階）
const DIFF = (process.env.DIFF ?? 'normal') as 'normal' | 'hard'
const PROFILE_NAMES = Object.keys(PROFILES)
const targets = process.env.RULESETS ? process.env.RULESETS.split(',').map(rulesetByName) : RULESETS

type Cell = { n: number; win: number; score: number; bursts: number; cards: number; block: number; unusedBlock: number; heal: number; healReq: number; dmgPassive: number; round: number[] }
const newCell = (): Cell => ({ n: 0, win: 0, score: 0, bursts: 0, cards: 0, block: 0, unusedBlock: 0, heal: 0, healReq: 0, dmgPassive: 0, round: [] })
function add(c: Cell, m: Metrics2) {
  c.n++; if (m.status === 'won') { c.win++; c.round.push(m.round) }
  c.score += m.finalScore; c.bursts += m.bursts; c.cards += m.cardsPlayedTotal; c.block += m.blockGained; c.unusedBlock += m.unusedBlock; c.heal += m.healed; c.healReq += m.healRequested; c.dmgPassive += m.dmgPassive
}

export type GateSummary = {
  ruleset: string; stake: number
  bestByGod: Record<string, string>; gainByGod: Record<string, number>; spreadByGod: Record<string, number>
  distinctBest: number; meaningfulDistinct: number; nonRushBalancedBest: number; nonRushBalancedCompetitive: number
  godSpreadBest: number; overallBest: number; minGodBest: number; maxGodBest: number
  burstsPerGame: Record<string, number>; winScoreByGod: Record<string, number>
  scoreGapFortress: Record<string, number>
}

describe('Step2 pilot', () => {
  it('rulesets × profiles', () => {
    const t0 = Date.now()
    const all: GateSummary[] = []
    const md: string[] = [`# Step 2 pilot (SEEDS=${SEEDS}×7敵=${SEEDS * 7}/cell, stakes=${STAKES.join('/')})`]
    for (const rs of targets) {
      activate(rs)
      const cells = new Map<string, Cell>()
      const get = (k: string) => { let c = cells.get(k); if (!c) { c = newCell(); cells.set(k, c) } return c }
      for (const god of GOD_ORDER) {
        const deck = getDeckFor(god, rs.deckMode)
        for (const stake of STAKES) for (const pn of PROFILE_NAMES) for (const enemy of ENEMY_ORDER) for (let i = 0; i < SEEDS; i++) {
          const m = runGame2({ seed: `s2p-${god}-${enemy}-${stake}-${pn}-${i}`, godId: god, enemyId: enemy, deck, stake: stake || undefined, stakeChoice: stake === 7 ? 'pressure' : undefined, difficulty: DIFF }, searchAgent2(PROFILES[pn], 400))
          add(get(`${god}|${stake}|${pn}`), m)
        }
      }
      deactivate()
      for (const stake of STAKES) {
        const rows: (string | number)[][] = []
        const g: GateSummary = { ruleset: rs.name, stake, bestByGod: {}, gainByGod: {}, spreadByGod: {}, distinctBest: 0, meaningfulDistinct: 0, nonRushBalancedBest: 0, nonRushBalancedCompetitive: 0, godSpreadBest: 0, overallBest: 0, minGodBest: 0, maxGodBest: 0, burstsPerGame: {}, winScoreByGod: {}, scoreGapFortress: {} }
        const bests: number[] = []
        for (const god of GOD_ORDER) {
          const per = PROFILE_NAMES.map((pn) => { const c = get(`${god}|${stake}|${pn}`); return { pn, wr: (c.win / c.n) * 100, score: c.score / c.n, comp: (c.win / c.n) * 100 + c.score / c.n / 100, bursts: c.bursts / c.n, cards: c.cards / c.n, block: c.block / c.n, unused: c.unusedBlock / c.n, heal: c.heal / c.n, healReq: c.healReq / c.n, dmgP: c.dmgPassive / c.n } })
          const best = per.reduce((a, b) => (b.comp > a.comp ? b : a))
          const bal = per.find((p) => p.pn === 'balanced')!
          const rush = per.find((p) => p.pn === 'rush')!
          const wrs = per.map((p) => p.wr)
          const gain = best.wr - Math.max(bal.wr, rush.wr)
          g.bestByGod[GOD_NAME[god]] = best.pn
          g.gainByGod[GOD_NAME[god]] = r1(gain)
          g.spreadByGod[GOD_NAME[god]] = r1(Math.max(...wrs) - Math.min(...wrs))
          g.burstsPerGame[GOD_NAME[god]] = r1(bal.bursts)
          g.winScoreByGod[GOD_NAME[god]] = Math.round(best.score)
          const fort = per.find((p) => p.pn === 'fortress')!
          const ctrl = per.find((p) => p.pn === 'control')!
          g.scoreGapFortress[GOD_NAME[god]] = Math.round(Math.max(fort.score, ctrl.score) - Math.max(bal.score, rush.score))
          ;(g as unknown as { scoreGainByGod: Record<string, number> }).scoreGainByGod ??= {}
          ;(g as unknown as { scoreGainByGod: Record<string, number> }).scoreGainByGod[GOD_NAME[god]] = r1(((best.score - Math.max(bal.score, rush.score)) / Math.max(1, Math.max(bal.score, rush.score))) * 100)
          const nonRB = per.filter((p) => p.pn !== 'rush' && p.pn !== 'balanced')
          if (best.pn !== 'rush' && best.pn !== 'balanced') g.nonRushBalancedBest++
          if (nonRB.some((p) => p.comp >= best.comp - 2)) g.nonRushBalancedCompetitive++
          bests.push(best.wr)
          rows.push([GOD_NAME[god], ...per.map((p) => `${r1(p.wr)}/${Math.round(p.score)}`), best.pn, r1(gain), r1(bal.bursts), r1(bal.block), r1(bal.unused), r1(bal.heal), r1(bal.healReq), r1(bal.dmgP)])
        }
        const bestSet = new Set(Object.values(g.bestByGod))
        g.distinctBest = bestSet.size
        g.meaningfulDistinct = GOD_ORDER.filter((god) => g.gainByGod[GOD_NAME[god]] >= 5).length
        g.godSpreadBest = r1(Math.max(...bests) - Math.min(...bests))
        g.overallBest = r1(avg(bests)); g.minGodBest = r1(Math.min(...bests)); g.maxGodBest = r1(Math.max(...bests))
        all.push(g)
        md.push(`\n## ${rs.name}（${rs.notes}） 神階${stake}`)
        md.push(mdTable(['god', ...PROFILE_NAMES.map((p) => `${p} WR/score`), 'best', 'gain vs bal/rush', 'burst/g', 'block', 'unusedBlk', 'heal', 'healReq', 'dmgPassive'], rows))
        md.push(`distinctBest=${g.distinctBest} meaningful(≥5pt)=${g.meaningfulDistinct} nonRushBalBest=${g.nonRushBalancedBest} competitive=${g.nonRushBalancedCompetitive} godSpread=${g.godSpreadBest} overall=${g.overallBest} (min ${g.minGodBest} / max ${g.maxGodBest})`)
      }
      console.log(`${rs.name} done ${((Date.now() - t0) / 1000).toFixed(0)}s`)
    }
    // 総括表
    md.push('\n# Gate screening summary')
    md.push(mdTable(['ruleset', 'stake', 'distinctBest', 'meaningful≥5', 'non-rush/bal best', 'competitive(±2)', 'godSpread', 'overall', 'min', 'best profiles'],
      all.map((g) => [g.ruleset, g.stake, g.distinctBest, g.meaningfulDistinct, g.nonRushBalancedBest, g.nonRushBalancedCompetitive, g.godSpreadBest, g.overallBest, g.minGodBest, GOD_ORDER.map((x) => `${GOD_NAME[x]}:${g.bestByGod[GOD_NAME[x]].slice(0, 4)}(${g.gainByGod[GOD_NAME[x]]}/${(g as unknown as { scoreGainByGod: Record<string, number> }).scoreGainByGod[GOD_NAME[x]]}%)`).join(' ')])))
    const tag = `${DIFF === 'hard' ? 'stress_' : ''}${process.env.RULESETS ? `pilot_${process.env.RULESETS.replace(/,/g, '_')}` : 'pilot_all'}`
    writeOut(`step2_${tag}.json`, all)
    writeOut(`step2_${tag}.md`, md.join('\n'))
    console.log(md.slice(-3).join('\n'))
  })
})

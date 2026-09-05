/**
 * Baseline simulation：既存 balanceSim 互換の3戦略ヒューリスティックAIで
 * 7神×7敵×神階{0,1,3,5,7}×3戦略×SEEDS を回し、勝率・スコアに加えて
 * BURST頻度/到達R・Draw/AP/Block/Heal・ダメージ構成・OTOMO進化・託宣使用R を出す。
 * 神階Ⅶは3択（pressure/race/tempo）を全て回し、既定(pressure)と最良を併記。
 */
import { describe, it } from 'vitest'
import type { StakeChoiceId } from '../../src/core/types'
import {
  GOD_ORDER, GOD_NAME, ENEMY_ORDER, ENEMY_NAME, getRecommendedDeck, runGame, heuristicAgent,
  newAgg, addAgg, summarizeAgg, writeOut, mdTable, r1, avg,
  type Strategy, type Agg, type AggSummary,
} from './harness'

const SEEDS = 30
const STAKES = [0, 1, 3, 5, 7]
const STRATS: Strategy[] = ['balanced', 'aggressive', 'defensive']

describe('Phase3 Step1 baseline (heuristic 3 strategies)', () => {
  it('7神×7敵×神階×3戦略', () => {
    const t0 = Date.now()
    // key: god|stake|choice|strategy|enemy
    const cells = new Map<string, Agg>()
    const get = (k: string) => { let a = cells.get(k); if (!a) { a = newAgg(); cells.set(k, a) } return a }

    for (const god of GOD_ORDER) {
      const deck = getRecommendedDeck(god)
      for (const stake of STAKES) {
        const choices: (StakeChoiceId | 'none')[] = stake === 7 ? ['pressure', 'race', 'tempo'] : ['none']
        for (const choice of choices) {
          for (const strat of STRATS) {
            const agent = heuristicAgent(strat)
            for (const enemy of ENEMY_ORDER) {
              for (let i = 0; i < SEEDS; i++) {
                const m = runGame({
                  seed: `p3b-${god}-${enemy}-${stake}-${choice}-${strat}-${i}`,
                  godId: god, enemyId: enemy, deck, stake: stake || undefined,
                  stakeChoice: choice === 'none' ? undefined : choice,
                }, agent)
                addAgg(get(`${god}|${stake}|${choice}|${strat}|${enemy}`), m)
                addAgg(get(`${god}|${stake}|${choice}|${strat}|ALL`), m)
              }
            }
          }
        }
      }
    }
    console.log(`baseline games done in ${((Date.now() - t0) / 1000).toFixed(1)}s`)

    const summaries: Record<string, AggSummary> = {}
    for (const [k, a] of cells) summaries[k] = summarizeAgg(a)
    writeOut('baseline.json', summaries)

    const md: string[] = ['# Baseline (heuristic AI, recommended decks)', `SEEDS=${SEEDS} per cell (7 enemies → ${SEEDS * 7} games per god×stake×strategy)`]

    // 神×神階：戦略別勝率 / 最良戦略
    for (const stake of STAKES) {
      md.push(`\n## 神階 ${stake}${stake === 7 ? '（既定=猛威pressure／best=3択最良）' : ''}`)
      const rows = GOD_ORDER.map((god) => {
        const choice = stake === 7 ? 'pressure' : 'none'
        const per = STRATS.map((s) => summaries[`${god}|${stake}|${choice}|${s}|ALL`])
        const best = per.reduce((b, s, i) => (s.winRate > b.rate ? { rate: s.winRate, i } : b), { rate: -1, i: 0 })
        let best7 = ''
        if (stake === 7) {
          let bb = { rate: -1, label: '' }
          for (const c of ['pressure', 'race', 'tempo']) for (const s of STRATS) {
            const v = summaries[`${god}|7|${c}|${s}|ALL`].winRate
            if (v > bb.rate) bb = { rate: v, label: `${s}/${c}` }
          }
          best7 = `${bb.rate}% (${bb.label})`
        }
        const b = per[best.i]
        return [GOD_NAME[god], ...per.map((s) => `${s.winRate}%`), `${STRATS[best.i]} ${best.rate}%`, best7, b.avgWinScore, b.avgWinRound, b.burstsPerGame, `${b.burstReach}%`, b.avgFirstBurstRound, b.otomoForm,
          b.dmgCard, b.dmgBurst, b.dmgDiv, b.block, b.blockAbsorbed, b.heal, b.drawExtra, b.apGained, b.debuffApplied, b.debuffEff, b.enemyRaw, b.divUses, b.avgDivRound, b.cardsPlayed]
      })
      md.push(mdTable(['god', 'bal', 'agg', 'def', 'best', 'best(Ⅶ3択)', 'winScore', 'winR', 'burst/g', 'reach', 'burstR', 'otomo', 'dmgCard', 'dmgBurst', 'dmgDiv', 'block', 'absorbed', 'heal', 'draw+', 'ap+', 'debuffApp', 'debuffEff', 'enemyRaw', 'div', 'divR', 'cards'], rows))
    }

    // 神×敵（balanced）神階0 / 7
    for (const stake of [0, 7]) {
      const choice = stake === 7 ? 'pressure' : 'none'
      md.push(`\n## 神×敵 勝率（balanced、神階${stake}）`)
      md.push(mdTable(['god', ...ENEMY_ORDER.map((e) => ENEMY_NAME[e]), 'spread(max-min)'],
        GOD_ORDER.map((god) => {
          const v = ENEMY_ORDER.map((e) => summaries[`${god}|${stake}|${choice}|balanced|${e}`].winRate)
          return [GOD_NAME[god], ...v.map((x) => `${x}%`), r1(Math.max(...v) - Math.min(...v))]
        })))
      md.push(`\n## 神×敵 最良戦略勝率（神階${stake}）`)
      md.push(mdTable(['god', ...ENEMY_ORDER.map((e) => ENEMY_NAME[e])],
        GOD_ORDER.map((god) => [GOD_NAME[god], ...ENEMY_ORDER.map((e) => {
          const per = STRATS.map((s) => ({ s, w: summaries[`${god}|${stake}|${choice}|${s}|${e}`].winRate }))
          const b = per.reduce((x, y) => (y.w > x.w ? y : x))
          return `${b.w}% ${b.s.slice(0, 3)}`
        })])))
    }

    // 神階曲線（全体）
    md.push('\n## 神階曲線（balanced、全神平均 / 神別）')
    md.push(mdTable(['stake', 'overall', ...GOD_ORDER.map((g) => GOD_NAME[g]), 'god spread'],
      STAKES.map((stake) => {
        const choice = stake === 7 ? 'pressure' : 'none'
        const v = GOD_ORDER.map((g) => summaries[`${g}|${stake}|${choice}|balanced|ALL`].winRate)
        return [stake, r1(avg(v)), ...v.map((x) => `${x}%`), r1(Math.max(...v) - Math.min(...v))]
      })))

    writeOut('baseline.md', md.join('\n'))
    console.log(md.join('\n'))
  })
})

/**
 * Phase 7 Entrance E1 — 「初陣」の神を決めるための決定論シミュレーション（分析専用・本番コード非変更）。
 *
 *   SEEDS=300 OUT_DIR=<出力先> npx vitest run --config scripts/entrance-e1/vitest.audit.config.ts
 *
 * 条件：敵＝試練の影（enemy_01）固定／おすすめデッキ／神階なし／OTOMO 経路 guardian（既定）／難易度 easy・normal。
 * 初心者の代理エージェント（3 種）：
 *   Tapper   … 手札の左から、出せるカードを出せるだけ出す。託宣は使わない（何も読まずに触る人）
 *   Attacker … 既存ヒューリスティック aggressive（守らない人）
 *   Balanced … 既存ヒューリスティック balanced（Phase 7 監査の「New Player」と同じ）
 * 計測：勝率・敗北率・未撃破率・勝利時の平均撃破ラウンド・平均被ダメージ・自傷・平均残 HP・
 *       「出せるカードが 1 枚も無いラウンド」の率（手札事故）・ラウンド終了時の余り神力・神技評価の分布。
 */
import { describe, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import type { GameState, GodId } from '../../src/core/types'
import { ENEMY_IDS } from '../../src/core/data/enemies'
import { GOD_ORDER, GOD_NAME, getRecommendedDeck, mdTable, r1, avg } from '../phase3-audit/harness'
import { runGame2, heuristicAgent2, effectiveCost, type Agent2 } from '../phase3-audit/step2/harness2'

const SEEDS = Number(process.env.SEEDS ?? 300)
const OUT_DIR = process.env.OUT_DIR ?? path.resolve(__dirname, 'out')

const tapper: Agent2 = (state) => {
  const c = state.hand.find((card) => effectiveCost(state, card) <= state.ap.current)
  return c ? { type: 'PLAY_CARD', uid: c.uid } : null
}

type Probe = { rounds: number; deadRounds: number; unusedAp: number }
/** エージェントを包み、ラウンドごとの「出せるカードが無い」「余り神力」を数える */
function probed(agent: Agent2, probe: Probe): Agent2 {
  let lastRound = -1
  return (state: GameState) => {
    if (state.round !== lastRound) {
      lastRound = state.round
      probe.rounds++
      if (!state.hand.some((card) => effectiveCost(state, card) <= state.ap.current)) probe.deadRounds++
    }
    const action = agent(state)
    if (action === null) probe.unusedAp += state.ap.current
    return action
  }
}

const AGENTS: { name: string; make: () => Agent2 }[] = [
  { name: 'Tapper', make: () => tapper },
  { name: 'Attacker', make: () => heuristicAgent2('aggressive') },
  { name: 'Balanced', make: () => heuristicAgent2('balanced') },
]

describe('Entrance E1 first battle simulation', () => {
  it('7 神 × 試練の影 × easy/normal × 初心者 3 種', () => {
    const rows: Record<string, string | number>[] = []
    for (const difficulty of ['easy', 'normal'] as const) {
      for (const agentDef of AGENTS) {
        for (const god of GOD_ORDER as GodId[]) {
          const deck = getRecommendedDeck(god)
          const results = []
          const probe: Probe = { rounds: 0, deadRounds: 0, unusedAp: 0 }
          for (let i = 0; i < SEEDS; i++) {
            results.push(runGame2({ seed: `e1-first-${god}-${i}`, godId: god, enemyId: ENEMY_IDS.trial, deck, difficulty }, probed(agentDef.make(), probe)))
          }
          const won = results.filter((m) => m.status === 'won')
          const grades: Record<string, number> = {}
          for (const m of won) if (m.mastery) grades[m.mastery.grade] = (grades[m.mastery.grade] ?? 0) + 1
          rows.push({
            difficulty,
            agent: agentDef.name,
            god: GOD_NAME[god],
            win: r1((100 * won.length) / results.length),
            lost: r1((100 * results.filter((m) => m.status === 'lost').length) / results.length),
            finished: r1((100 * results.filter((m) => m.status === 'finished').length) / results.length),
            winRound: r1(avg(won.map((m) => m.round))),
            dmgTaken: r1(avg(results.map((m) => Math.max(0, m.enemyRawDamage - m.blockAbsorbed)))),
            hpLeft: r1(avg(results.map((m) => m.playerHp))),
            deadRoundPct: r1((100 * probe.deadRounds) / Math.max(1, probe.rounds)),
            unusedApPerRound: r1(probe.unusedAp / Math.max(1, probe.rounds)),
            bursts: r1(avg(results.map((m) => m.bursts))),
            score: Math.round(avg(results.map((m) => m.finalScore))),
            mastery: Object.keys(grades).length ? Object.entries(grades).sort().map(([g, n]) => `${g}:${n}`).join(' ') : '—',
          })
        }
      }
    }
    fs.mkdirSync(OUT_DIR, { recursive: true })
    fs.writeFileSync(path.join(OUT_DIR, 'first_battle.json'), JSON.stringify(rows, null, 1), 'utf8')
    const headers = Object.keys(rows[0])
    const md = [`# Entrance E1 first battle simulation`, `SEEDS=${SEEDS}／敵＝試練の影／おすすめデッキ／神階なし`, '', mdTable(headers, rows.map((r) => headers.map((h) => r[h])))].join('\n')
    fs.writeFileSync(path.join(OUT_DIR, 'first_battle.md'), md, 'utf8')
    console.log(md)
  })
})

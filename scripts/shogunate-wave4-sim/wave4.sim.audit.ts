/**
 * W4 将軍家 第四陣 Preflight sim（決定288 v1.1・`docs/FINAL_SCOPE_ROADMAP_V1.md` §2-2／§10-3）：忠勝（enemy_16）・ドーマン（enemy_17）の
 * 「判断の型」が成立しているかを決定論で測る（Planner ツール・`npm test` の対象外・専用 config）。
 *
 *   npx vitest run --config scripts/shogunate-wave4-sim/vitest.audit.config.ts
 *
 * 走査：7 神 × seed 40 × 難易度 {normal, hard} × 方策 {greedy, hold, guard}。
 *   greedy：攻撃優先・危険時のみ守る（読まない。共鳴札も出せれば全部出す＝満タンで自動発動）
 *   hold  ：ドーマンの溜め R（R3／R6）だけ「ゲージを 4〜6 に置く」：4 未満なら溢れない共鳴札を優先、4 以上なら溢れる札（value+gain ≥ 7）を出さない。他は greedy
 *   guard ：予告が自 HP の 40% 以上なら守りを優先（「受ける」側の方策。忠勝の R4／R7 向け）
 * Gate（AI 判断・W2／W3 と同じ流儀）：
 *   ドーマン G1：normal greedy の R4 then 率 15〜50%（読まなければ塔が来る）かつ hold の R4 then 率 ≥55% かつ 差 ≥25pt／hard も hold ≥50%
 *   ドーマン G2：hold の勝率 ≥ greedy − 5pt（温存の対価が致命にならない）
 *   ドーマン G3：hard の最善方策の勝率 ≥ 50%（決定58 と同じ詰み基準）
 *   忠勝     G3：本 sim の方策（greedy／guard）は素朴で hard 勝率を低く見積もる（24〜35%）ため、忠勝の詰み判定は `balanceSim.test.ts` 決定287 ケース
 *            （balanced／aggressive／defensive × 40 戦・hard × 全神 ≥50%）を正とする（npm test で機械保証）。本 sim は忠勝の勝率を記録するだけ
 * 乱数は seed のみ（Math.random 不使用）。結果は docs/evidence/shogunate-wave4/sim.json に書く。
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GODS } from '../../src/core/data/gods'
import { SHOGUNATE_ENEMY_IDS, getEnemyDef } from '../../src/core/data/enemies'
import { getCardDef } from '../../src/core/data/cards'
import { getRecommendedDeck } from '../../src/core/data/deckBuilder'
import type { CardInstance, Difficulty, EnemyId, GameState } from '../../src/core/types'
import { applyAction } from '../../src/core/engine/reducer'
import { enemyActionTotal } from '../../src/core/engine/intent'
import { getFinalScore } from '../../src/core/engine/score'
import { tacticResonanceNeeded } from '../../src/core/engine/tactic'

const SEEDS = 40
const DIFFS: Difficulty[] = ['normal', 'hard']
type Policy = 'greedy' | 'hold' | 'guard'
const POLICIES: Policy[] = ['greedy', 'hold', 'guard']
const OUT_DIR = process.env.W4_SIM_OUT ?? 'docs/evidence/shogunate-wave4'

const costOf = (c: CardInstance) => getCardDef(c.defId).cost + (c.costModifier ?? 0)
const damageOf = (c: CardInstance) => getCardDef(c.defId).effects.reduce((s, e) => s + (e.kind === 'damage' && e.target === 'enemy' ? e.amount : 0), 0)
const blockOf = (c: CardInstance) => getCardDef(c.defId).effects.reduce((s, e) => s + (e.kind === 'block' ? e.amount : 0), 0)
const resonanceOf = (c: CardInstance) => getCardDef(c.defId).effects.reduce((s, e) => s + (e.kind === 'resonance' ? e.amount : 0), 0)
const incomingOf = (s: GameState) => (s.enemy.intent ? enemyActionTotal(s.enemy.intent) : 0)
const dangerous = (s: GameState) => s.player.hp - Math.max(0, incomingOf(s) - s.player.block) < s.player.maxHp * 0.35
const affordable = (s: GameState) => s.hand.filter((c) => costOf(c) <= s.ap.current)

type Outcome = { status: string; round: number; then4: boolean | null; then7: boolean | null; score: number }

function pickCard(s: GameState, policy: Policy, enemyId: EnemyId): CardInstance | null {
  let hand = affordable(s)
  if (hand.length === 0) return null
  const def = getEnemyDef(enemyId)
  const chargeRound = s.round === 3 || s.round === 6
  const next = def.actions[s.round]
  if (policy === 'hold' && chargeRound && next?.kind === 'tactic' && next.cond.type === 'resonanceAtLeast') {
    const needed = tacticResonanceNeeded(next, s.resonance.max, s.difficulty)
    const v = s.resonance.value
    const overflow = (c: CardInstance) => v + resonanceOf(c) >= s.resonance.max
    if (v < needed) {
      const fill = hand.filter((c) => resonanceOf(c) > 0 && !overflow(c)).sort((a, b) => resonanceOf(b) - resonanceOf(a))[0]
      if (fill) return fill
    }
    hand = hand.filter((c) => resonanceOf(c) === 0 || !overflow(c))
    if (hand.length === 0) return null
  }
  if (dangerous(s) || (policy === 'guard' && incomingOf(s) - s.player.block >= s.player.maxHp * 0.4)) {
    const guard = hand.filter((c) => blockOf(c) > 0).sort((a, b) => blockOf(b) - blockOf(a))[0]
    if (guard) return guard
  }
  const atk = hand.filter((c) => damageOf(c) > 0).sort((a, b) => damageOf(b) - damageOf(a))[0]
  return atk ?? hand[0]
}

function playOut(seed: string, godId: string, enemyId: EnemyId, difficulty: Difficulty, policy: Policy): Outcome {
  let s = applyAction(null, { type: 'START_GAME', seed, godId: godId as GameState['godId'], enemyId, deck: getRecommendedDeck(godId as GameState['godId']), difficulty, otomoGrowthPath: 'guardian' }).state
  let then4: Outcome['then4'] = null
  let then7: Outcome['then7'] = null
  let guard = 0
  const def = getEnemyDef(enemyId)
  while (s.status === 'playing' && guard++ < 400) {
    for (const [r, key] of [[4, 'then4'], [7, 'then7']] as const) {
      if (s.round === r && (key === 'then4' ? then4 : then7) === null) {
        const a = def.actions[r - 1]
        if (a.kind === 'tactic') {
          const it = s.enemy.intent
          const th = a.then
          const isThen = !!it && it.kind === th.kind && ((it as { name?: string }).name ?? null) === ((th as { name?: string }).name ?? null)
          if (key === 'then4') then4 = isThen
          else then7 = isThen
        }
      }
    }
    const card = pickCard(s, policy, enemyId)
    if (card) {
      const r = applyAction(s, { type: 'PLAY_CARD', uid: card.uid })
      if (r.state === s) s = applyAction(s, { type: 'END_ROUND' }).state
      else s = r.state
      continue
    }
    s = applyAction(s, { type: 'END_ROUND' }).state
  }
  return { status: s.status, round: s.round, then4, then7, score: getFinalScore(s.score, s.stake) }
}

type Cell = { games: number; reach4: number; then4: number; then4Rate: number; reach7: number; then7: number; then7Rate: number; win: number; winRate: number; avgScore: number; byGod: Record<string, number> }

describe('W4 Preflight sim（忠勝・ドーマン）', () => {
  it('Gate G1〜G3', () => {
    const enemies: { id: EnemyId; key: string }[] = [
      { id: SHOGUNATE_ENEMY_IDS.tadakatsu, key: 'tadakatsu' },
      { id: SHOGUNATE_ENEMY_IDS.doman, key: 'doman' },
    ]
    const result: Record<string, Record<string, Record<string, Cell>>> = {}
    for (const e of enemies) {
      result[e.key] = {}
      for (const d of DIFFS) {
        result[e.key][d] = {}
        for (const p of POLICIES) {
          let games = 0, reach4 = 0, then4 = 0, reach7 = 0, then7 = 0, win = 0, score = 0
          const byGod: Record<string, number> = {}
          for (const g of GODS) {
            let gWin = 0
            for (let i = 1; i <= SEEDS; i++) {
              const o = playOut(`w4-${e.key}-${i}`, g.id, e.id, d, p)
              games++
              if (o.then4 !== null) { reach4++; if (o.then4) then4++ }
              if (o.then7 !== null) { reach7++; if (o.then7) then7++ }
              if (o.status === 'won') { win++; gWin++ }
              score += o.score
            }
            byGod[g.id] = +(100 * gWin / SEEDS).toFixed(1)
          }
          result[e.key][d][p] = {
            games, reach4, then4, then4Rate: +(100 * then4 / Math.max(1, reach4)).toFixed(1), reach7, then7, then7Rate: +(100 * then7 / Math.max(1, reach7)).toFixed(1),
            win, winRate: +(100 * win / games).toFixed(1), avgScore: +(score / games).toFixed(1), byGod,
          }
        }
      }
    }
    mkdirSync(OUT_DIR, { recursive: true })
    writeFileSync(`${OUT_DIR}/sim.json`, JSON.stringify({ generatedAt: new Date().toISOString(), seeds: SEEDS, policies: POLICIES, result }, null, 2))
    const lines: string[] = []
    for (const e of enemies) for (const d of DIFFS) for (const p of POLICIES) { const r = result[e.key][d][p]; lines.push(`${e.key} ${d} ${p}: then4 ${r.then4Rate}% (reach ${r.reach4}) then7 ${r.then7Rate}% (reach ${r.reach7}) win ${r.winRate}% score ${r.avgScore}`) }
    console.log(lines.join('\n'))
    const dom = result.doman, tad = result.tadakatsu
    expect(dom.normal.greedy.then4Rate, 'ドーマン G1 normal greedy R4 then 15〜50').toBeGreaterThanOrEqual(15)
    expect(dom.normal.greedy.then4Rate).toBeLessThanOrEqual(50)
    expect(dom.normal.hold.then4Rate, 'ドーマン G1 normal hold R4 then ≥55').toBeGreaterThanOrEqual(55)
    expect(dom.normal.hold.then4Rate - dom.normal.greedy.then4Rate, 'ドーマン G1 差 ≥25pt').toBeGreaterThanOrEqual(25)
    expect(dom.hard.hold.then4Rate, 'ドーマン hard hold ≥50').toBeGreaterThanOrEqual(50)
    expect(dom.normal.hold.winRate, 'ドーマン G2 hold 勝率 ≥ greedy −5').toBeGreaterThanOrEqual(dom.normal.greedy.winRate - 5)
    expect(Math.max(dom.hard.greedy.winRate, dom.hard.hold.winRate, dom.hard.guard.winRate), 'ドーマン G3 hard 最善 ≥50').toBeGreaterThanOrEqual(50)
    // 忠勝：記録のみ（詰み判定は balanceSim.test 決定287 が正）
    expect(tad.hard.greedy.games).toBe(280)
  }, 30 * 60 * 1000)
})

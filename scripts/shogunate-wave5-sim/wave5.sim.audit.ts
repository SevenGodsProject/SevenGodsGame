/**
 * W5 将軍家 最終 Preflight sim（決定288 v1.1・`docs/FINAL_SCOPE_ROADMAP_V1.md` §2-2／§10-3）：康虎（enemy_18・Boss ★5）の
 * 「判断の型」（R3 までに半分・R6 までに 1/4 まで追い込めるか）が成立しているかを決定論で測る（Planner ツール・`npm test` の対象外・専用 config）。
 *
 *   npx vitest run --config scripts/shogunate-wave5-sim/vitest.audit.config.ts
 *
 * 走査：7 神 × seed 40 × 難易度 {normal, hard} × 方策 {greedy, guard, rush}。
 *   greedy：攻撃優先・危険時のみ守る（読まない）
 *   guard ：予告が自 HP の 40% 以上なら守りを優先（「受ける」側の方策）
 *   rush  ：致死でない限り守らず攻める（「追い込む」側の方策）
 * Gate（AI 判断・W2〜W4 と同じ流儀）：
 *   G1：normal で R4 then 率（半分まで追い込めた率）が rush ≥ guard + 10pt（攻めれば止まり・守れば来る＝判断が存在する）
 *   G2：normal greedy の R4 then 率が 20〜90%（常に止まる／常に来る のどちらでもない）
 *   G3：normal greedy の R7 then 率が 5〜95%（2 段目も同様）
 *   勝率：記録のみ。詰み判定（hard × 全神 ≥50%）は `balanceSim.test.ts` 決定287 ケース（balanced／aggressive／defensive × 40 戦）が正
 * 乱数は seed のみ（Math.random 不使用）。結果は docs/evidence/shogunate-wave5/sim.json に書く。
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

const SEEDS = 40
const DIFFS: Difficulty[] = ['normal', 'hard']
type Policy = 'greedy' | 'guard' | 'rush'
const POLICIES: Policy[] = ['greedy', 'guard', 'rush']
const OUT_DIR = process.env.W5_SIM_OUT ?? 'docs/evidence/shogunate-wave5'

const costOf = (c: CardInstance) => getCardDef(c.defId).cost + (c.costModifier ?? 0)
const damageOf = (c: CardInstance) => getCardDef(c.defId).effects.reduce((s, e) => s + (e.kind === 'damage' && e.target === 'enemy' ? e.amount : 0), 0)
const blockOf = (c: CardInstance) => getCardDef(c.defId).effects.reduce((s, e) => s + (e.kind === 'block' ? e.amount : 0), 0)
const incomingOf = (s: GameState) => (s.enemy.intent ? enemyActionTotal(s.enemy.intent) : 0)
const lethal = (s: GameState) => s.player.hp - Math.max(0, incomingOf(s) - s.player.block) <= 0
const dangerous = (s: GameState) => s.player.hp - Math.max(0, incomingOf(s) - s.player.block) < s.player.maxHp * 0.35
const affordable = (s: GameState) => s.hand.filter((c) => costOf(c) <= s.ap.current)

type Outcome = { status: string; round: number; then4: boolean | null; then7: boolean | null; score: number }

function pickCard(s: GameState, policy: Policy): CardInstance | null {
  const hand = affordable(s)
  if (hand.length === 0) return null
  const wantGuard = policy === 'rush' ? lethal(s) : dangerous(s) || (policy === 'guard' && incomingOf(s) - s.player.block >= s.player.maxHp * 0.4)
  if (wantGuard) {
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
    const card = pickCard(s, policy)
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

describe('W5 Preflight sim（康虎 Boss ★5）', () => {
  it('Gate G1〜G3', () => {
    const e = { id: SHOGUNATE_ENEMY_IDS.yasutora, key: 'yasutora' }
    const result: Record<string, Record<string, Cell>> = {}
    for (const d of DIFFS) {
      result[d] = {}
      for (const p of POLICIES) {
        let games = 0, reach4 = 0, then4 = 0, reach7 = 0, then7 = 0, win = 0, score = 0
        const byGod: Record<string, number> = {}
        for (const g of GODS) {
          let gWin = 0
          for (let i = 1; i <= SEEDS; i++) {
            const o = playOut(`w5-${e.key}-${i}`, g.id, e.id, d, p)
            games++
            if (o.then4 !== null) { reach4++; if (o.then4) then4++ }
            if (o.then7 !== null) { reach7++; if (o.then7) then7++ }
            if (o.status === 'won') { win++; gWin++ }
            score += o.score
          }
          byGod[g.id] = +(100 * gWin / SEEDS).toFixed(1)
        }
        result[d][p] = {
          games, reach4, then4, then4Rate: +(100 * then4 / Math.max(1, reach4)).toFixed(1), reach7, then7, then7Rate: +(100 * then7 / Math.max(1, reach7)).toFixed(1),
          win, winRate: +(100 * win / games).toFixed(1), avgScore: +(score / games).toFixed(1), byGod,
        }
      }
    }
    mkdirSync(OUT_DIR, { recursive: true })
    writeFileSync(`${OUT_DIR}/sim.json`, JSON.stringify({ generatedAt: new Date().toISOString(), enemy: e.id, maxHp: getEnemyDef(e.id).maxHp, seeds: SEEDS, policies: POLICIES, result }, null, 2))
    const lines: string[] = []
    for (const d of DIFFS) for (const p of POLICIES) { const r = result[d][p]; lines.push(`${e.key} ${d} ${p}: then4 ${r.then4Rate}% (reach ${r.reach4}) then7 ${r.then7Rate}% (reach ${r.reach7}) win ${r.winRate}% score ${r.avgScore}`) }
    console.log(lines.join('\n'))
    const n = result.normal
    expect(n.rush.then4Rate - n.guard.then4Rate, 'G1 normal R4 then：rush ≥ guard + 10pt').toBeGreaterThanOrEqual(10)
    expect(n.greedy.then4Rate, 'G2 normal greedy R4 then 20〜90').toBeGreaterThanOrEqual(20)
    expect(n.greedy.then4Rate).toBeLessThanOrEqual(90)
    expect(n.greedy.then7Rate, 'G3 normal greedy R7 then 5〜95').toBeGreaterThanOrEqual(5)
    expect(n.greedy.then7Rate).toBeLessThanOrEqual(95)
    expect(result.hard.greedy.games).toBe(280)
  }, 30 * 60 * 1000)
})

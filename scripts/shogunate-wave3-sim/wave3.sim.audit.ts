/**
 * W3 将軍家 第三陣 Preflight sim（決定288 v1.1・`docs/FINAL_SCOPE_ROADMAP_V1.md` §2-2／§10-2）：直政（enemy_11）・康政（enemy_12）・岡っ引き（enemy_10）の
 * 「判断の型」が成立しているかを決定論で測る（Planner ツール・`npm test` の対象外・専用 config）。
 *
 *   npx vitest run --config scripts/shogunate-wave2-sim/vitest.audit.config.ts
 *
 * 走査：7 神 × seed 40 × 難易度 {normal, hard} × 方策 {greedy, burst}。
 *   greedy：攻撃優先・危険時のみ守る（読まない・R2 も R3 も出せる札は全部出す）
 *   burst ：R2 は札を温存（出さない）し、R3 に攻撃札を全部＋天啓（託宣が残っていれば）＝「1 ラウンドに一点集中」
 * Gate（AI 判断・LANE3_NEXT_PLAN_V1 §3-1 の再定義）：
 *   直政  G1：normal・greedy の then 率 35〜65%（忠次型の帯）／hard も同帯（既存 RULES.enemyTactic の hard 0.6 を流用）
 *   康政  G1：normal「狙わない（greedy）」then 15〜35% かつ「狙う（burst）」55〜80% かつ 差 ≥30pt／hard は burst ≥50%
 *   康政  G2：burst の勝率 ≥ greedy − 3pt（温存の対価が致命にならない）
 *   共通  G3：3 体とも hard の最善方策の勝率 ≥ 50%（決定58 と同じ詰み基準。balanceSim.test の決定287 ケースでも機械保証）
 * 乱数は seed のみ（Math.random 不使用）。結果は docs/evidence/shogunate-wave2/sim.json に書く。
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
type Policy = 'greedy' | 'burst'
const POLICIES: Policy[] = ['greedy', 'burst']
const OUT_DIR = process.env.W3_SIM_OUT ?? 'docs/evidence/shogunate-wave3'

const costOf = (c: CardInstance) => getCardDef(c.defId).cost + (c.costModifier ?? 0)
const damageOf = (c: CardInstance) => getCardDef(c.defId).effects.reduce((s, e) => s + (e.kind === 'damage' && e.target === 'enemy' ? e.amount : 0), 0)
const blockOf = (c: CardInstance) => getCardDef(c.defId).effects.reduce((s, e) => s + (e.kind === 'block' ? e.amount : 0), 0)
const incomingOf = (s: GameState) => (s.enemy.intent ? enemyActionTotal(s.enemy.intent) : 0)
const dangerous = (s: GameState) => s.player.hp - Math.max(0, incomingOf(s) - s.player.block) < s.player.maxHp * 0.35
const affordable = (s: GameState) => s.hand.filter((c) => costOf(c) <= s.ap.current)
const TENKEI = 2
const canOracle = (s: GameState) => s.divination.remaining > 0 && !s.divination.usedThisRound

type Outcome = { status: string; round: number; branch: 'then' | 'else' | null; score: number; r3Damage: number }

function pickCard(s: GameState, policy: Policy): CardInstance | null {
  const hand = affordable(s)
  if (hand.length === 0) return null
  if (policy === 'burst' && s.round === 2) return null // R2 温存
  if (dangerous(s)) {
    const guard = hand.filter((c) => blockOf(c) > 0).sort((a, b) => blockOf(b) - blockOf(a))[0]
    if (guard) return guard
  }
  const atk = hand.filter((c) => damageOf(c) > 0).sort((a, b) => damageOf(b) - damageOf(a))[0]
  return atk ?? hand[0]
}

function playOut(seed: string, godId: string, enemyId: EnemyId, difficulty: Difficulty, policy: Policy): Outcome {
  let s = applyAction(null, { type: 'START_GAME', seed, godId: godId as GameState['godId'], enemyId, deck: getRecommendedDeck(godId as GameState['godId']), difficulty, otomoGrowthPath: 'guardian' }).state
  let branch: Outcome['branch'] = null
  let r3Damage = 0
  let guard = 0
  while (s.status === 'playing' && guard++ < 400) {
    // W3：鬼半蔵は R4・影は R5 の軍略を見る（くノ一は tactic なし）
    const tacticRound = enemyId === SHOGUNATE_ENEMY_IDS.kage ? 5 : 4
    if (s.round === tacticRound && branch === null) {
      const r4 = getEnemyDef(enemyId).actions[tacticRound - 1]
      // intent は難易度倍率後の値なので kind と技名で判定（then：康政＝attack／直政＝multiAttack special、else：special）
      if (r4.kind === 'tactic') { const it = s.enemy.intent; const th = r4.then; branch = !!it && it.kind === th.kind && ((it as { name?: string }).name ?? null) === ((th as { name?: string }).name ?? null) ? 'then' : 'else' }
    }
    if (policy === 'burst' && s.round === 3 && canOracle(s)) {
      const r = applyAction(s, { type: 'USE_DIVINATION', choiceIndex: TENKEI })
      s = r.state
      continue
    }
    const card = pickCard(s, policy)
    if (card) {
      const r = applyAction(s, { type: 'PLAY_CARD', uid: card.uid })
      if (r.state === s) {
        s = applyAction(s, { type: 'END_ROUND' }).state
      } else s = r.state
      continue
    }
    if (s.round === 3) r3Damage = s.mastery.roundDamage
    s = applyAction(s, { type: 'END_ROUND' }).state
  }
  return { status: s.status, round: s.round, branch, score: getFinalScore(s.score, s.stake), r3Damage }
}

describe('W3 Preflight sim（影・くノ一・鬼半蔵）', () => {
  it('Gate G1〜G3', () => {
    const enemies: { id: EnemyId; key: string }[] = [
      { id: SHOGUNATE_ENEMY_IDS.kage, key: 'kage' },
      { id: SHOGUNATE_ENEMY_IDS.kunoichi, key: 'kunoichi' },
      { id: SHOGUNATE_ENEMY_IDS.onihanzo, key: 'onihanzo' },
    ]
    const result: Record<string, Record<string, Record<string, { games: number; then: number; thenRate: number; win: number; winRate: number; avgScore: number; byGod: Record<string, number> }>>> = {}
    for (const e of enemies) {
      result[e.key] = {}
      for (const d of DIFFS) {
        result[e.key][d] = {}
        for (const p of POLICIES) {
          let games = 0, thenN = 0, win = 0, score = 0
          const byGod: Record<string, number> = {}
          for (const g of GODS) {
            let gThen = 0
            for (let i = 1; i <= SEEDS; i++) {
              const o = playOut(`w2-${e.key}-${i}`, g.id, e.id, d, p)
              games++
              if (o.branch === 'then') { thenN++; gThen++ }
              if (o.status === 'won') win++
              score += o.score
            }
            byGod[g.id] = +(100 * gThen / SEEDS).toFixed(1)
          }
          result[e.key][d][p] = { games, then: thenN, thenRate: +(100 * thenN / games).toFixed(1), win, winRate: +(100 * win / games).toFixed(1), avgScore: +(score / games).toFixed(1), byGod }
        }
      }
    }
    mkdirSync(OUT_DIR, { recursive: true })
    writeFileSync(`${OUT_DIR}/sim.json`, JSON.stringify({ generatedAt: new Date().toISOString(), seeds: SEEDS, policies: POLICIES, result }, null, 2))
    const lines: string[] = []
    for (const e of enemies) for (const d of DIFFS) for (const p of POLICIES) { const r = result[e.key][d][p]; lines.push(`${e.key} ${d} ${p}: then ${r.thenRate}% win ${r.winRate}% score ${r.avgScore}`) }
    console.log(lines.join('\n'))
    // Gates（W3）：影 R5 then（greedy・normal）35〜65／鬼半蔵 R4 then（greedy・normal）35〜65／3 体とも hard 最善 ≥50
    const kage = result.kage, oni = result.onihanzo, kun = result.kunoichi
    expect(kage.normal.greedy.thenRate, '影 G1 normal greedy then 35〜65').toBeGreaterThanOrEqual(35)
    expect(kage.normal.greedy.thenRate).toBeLessThanOrEqual(65)
    expect(oni.normal.greedy.thenRate, '鬼半蔵 G1 normal greedy then 35〜65').toBeGreaterThanOrEqual(35)
    expect(oni.normal.greedy.thenRate).toBeLessThanOrEqual(65)
    for (const [k, r] of [['kage', kage], ['kunoichi', kun], ['onihanzo', oni]] as const) {
      expect(Math.max(r.hard.greedy.winRate, r.hard.burst.winRate), `${k} G3 hard 最善 ≥50`).toBeGreaterThanOrEqual(50)
    }
  }, 30 * 60 * 1000)
})

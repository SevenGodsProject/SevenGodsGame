import { describe, expect, it } from 'vitest'
import { GODS } from '../../src/core/data/gods.js'
import { ENEMIES } from '../../src/core/data/enemies.js'
import { ALL_CARDS, getCardDef } from '../../src/core/data/cards/index.js'
import { getRecommendedDeck } from '../../src/core/data/deckBuilder.js'
import { RULES } from '../../src/core/data/rules.js'
import { applyAction } from '../../src/core/engine/reducer.js'
import { previewBonusTrigger } from '../../src/core/engine/cardBonus.js'
import type { StakeChoiceId } from '../../src/core/data/stakes.js'
import type { CardDef, CardDefId, CardInstance, EnemyId, GameState, GodId } from '../../src/core/types/index.js'

/**
 * Phase 5-B：神階ラダーの再センタリング用の感度分析（`P5B_RUN=1` のときだけ走る）。
 *
 * ★何を測るか
 * `RULES.stakes` の各 modifier を1つずつ・組み合わせて動かし、Phase 5-A 後の
 * 神階Ⅰ〜Ⅶの勝率カーブがどう応答するかを、**同じ seed（paired）**で比べる。
 * 方策は `balanceSim.test.ts` の STAKE-01 と同じ3戦略（balanced/aggressive/defensive）を
 * そのまま写してあるので、ここの overall は本番ゲートの STAKE-01 と直接比較できる。
 *
 * ★Phase 5-A の面白さが消えていないかも同時に測る
 * 難易度を締めた結果、bonus の成立や「順番を変える判断」（aware と blind の選択差）が
 * 減っていないかを、同じ盤面で計測する（`phase5a-cards/cardsAudit.test.ts` と同じ定義）。
 *
 *   P5B_RUN=1 npx vitest run scripts/phase5b-stakes/stakesAudit.test.ts --reporter=verbose
 *   P5B_CONFIGS="cur,atk115" で対象を絞れる（既定は全部）
 */

const RUN = process.env.P5B_RUN === '1'

type Strategy = 'balanced' | 'aggressive' | 'defensive'
type Policy = 'blind' | 'aware'

// --- balanceSim と同じ価値関数（STAKE-01 の overall と一致させるため写し） --------------

function damageOf(def: CardDef, fromBonus = false): number {
  const list = fromBonus ? (def.bonus?.effects ?? []) : def.effects
  return list.reduce((s, e) => s + (e.kind === 'damage' && e.target === 'enemy' ? e.amount : 0), 0)
}
function blockOf(def: CardDef, fromBonus = false): number {
  const list = fromBonus ? (def.bonus?.effects ?? []) : def.effects
  return list.reduce((s, e) => s + (e.kind === 'block' ? e.amount : 0), 0)
}
function healOf(def: CardDef, fromBonus = false): number {
  const list = fromBonus ? (def.bonus?.effects ?? []) : def.effects
  return list.reduce((s, e) => s + (e.kind === 'heal' ? e.amount : 0), 0)
}
function utilityOf(def: CardDef, fromBonus = false): number {
  const list = fromBonus ? (def.bonus?.effects ?? []) : def.effects
  return list.reduce((sum, e) => {
    switch (e.kind) {
      case 'draw':
        return sum + e.amount * 4
      case 'gainAp':
        return sum + e.amount * 4
      case 'resonance':
        return sum + e.amount * 2
      case 'buff':
        return sum + (e.target === 'self' ? e.amount * e.rounds : 0)
      case 'debuff':
        return sum + (e.target === 'enemy' ? e.amount * e.rounds : 0)
      default:
        return sum
    }
  }, 0)
}
const costOf = (c: CardInstance) => getCardDef(c.defId).cost + (c.costModifier ?? 0)

function incomingOf(state: GameState): number {
  const intent = state.enemy.intent
  if (!intent) return 0
  if (intent.kind === 'attack' || intent.kind === 'special') return intent.amount
  if (intent.kind === 'multiAttack') return intent.hits.reduce((s, h) => s + h, 0)
  return 0
}
function isDangerous(state: GameState): boolean {
  const projected = Math.max(0, incomingOf(state) - state.player.block)
  return state.player.hp - projected < state.player.maxHp * 0.35
}
function pickDivinationChoice(state: GameState, strategy: Strategy): number {
  if (strategy === 'defensive' || (strategy === 'balanced' && isDangerous(state))) return 0
  return 2
}

/** STAKE-01 と同じ pickCard（blind）。aware は bonus が今立つなら価値に足す */
function pickCard(state: GameState, strategy: Strategy, policy: Policy): CardInstance | null {
  const affordable = state.hand.filter((c) => costOf(c) <= state.ap.current)
  if (affordable.length === 0) return null
  const bonusPart = (c: CardInstance, kind: 'd' | 'b' | 'h' | 'u') => {
    if (policy === 'blind') return 0
    const def = getCardDef(c.defId)
    if (!def.bonus || !previewBonusTrigger(state, def)) return 0
    return kind === 'd' ? damageOf(def, true) : kind === 'b' ? blockOf(def, true) : kind === 'h' ? healOf(def, true) : utilityOf(def, true)
  }
  const dmg = (c: CardInstance) => damageOf(getCardDef(c.defId)) + bonusPart(c, 'd')
  const blk = (c: CardInstance) => blockOf(getCardDef(c.defId)) + bonusPart(c, 'b')
  const heal = (c: CardInstance) => healOf(getCardDef(c.defId)) + bonusPart(c, 'h')
  const util = (c: CardInstance) => utilityOf(getCardDef(c.defId)) + bonusPart(c, 'u')

  const dangerous = isDangerous(state)
  const alreadyGuarded = state.player.block >= incomingOf(state)
  if (strategy === 'defensive' || (strategy === 'balanced' && dangerous)) {
    if (!alreadyGuarded) {
      const b = affordable.filter((c) => blk(c) > 0).sort((a, c) => blk(c) - blk(a))[0]
      if (b) return b
    }
    const h = affordable.filter((c) => heal(c) > 0).sort((a, c) => heal(c) - heal(a))[0]
    if (h && state.player.hp < state.player.maxHp * 0.6) return h
  }
  const d = affordable.filter((c) => dmg(c) > 0).sort((a, c) => dmg(c) / costOf(c) - dmg(a) / costOf(a))[0]
  if (d) return d
  const u = affordable.filter((c) => util(c) > 0).sort((a, c) => util(c) / costOf(c) - util(a) / costOf(a))[0]
  if (u) return u
  return affordable.sort((a, c) => costOf(c) - costOf(a))[0]
}

type Game = {
  win: boolean
  round: number
  score: number
  damageTaken: number
  bonus: number
  burst: number
  divergences: number
  plays: number
  attacks: number
}

function playOne(
  seed: string,
  strategy: Strategy,
  policy: Policy,
  godId: GodId,
  deck: CardDefId[],
  enemyId: EnemyId,
  stake: number,
  choice?: StakeChoiceId,
): Game {
  let { state } = applyAction(null, {
    type: 'START_GAME',
    seed,
    godId,
    enemyId,
    deck,
    otomoGrowthPath: 'guardian',
    difficulty: 'normal',
    stake,
    ...(choice ? { stakeChoice: choice } : {}),
  })
  const g: Game = { win: false, round: 0, score: 0, damageTaken: 0, bonus: 0, burst: 0, divergences: 0, plays: 0, attacks: 0 }
  let guard = 0
  while (state.status === 'playing' && guard < 500) {
    guard++
    if (state.phase !== 'playerTurn') break
    const card = pickCard(state, strategy, policy)
    if (card) {
      const other = pickCard(state, strategy, policy === 'aware' ? 'blind' : 'aware')
      if (other && other.uid !== card.uid) g.divergences++
      g.plays++
      if (getCardDef(card.defId).type === 'attack') g.attacks++
      const r = applyAction(state, { type: 'PLAY_CARD', uid: card.uid })
      for (const e of r.events) {
        if (e.t === 'BONUS_TRIGGERED') g.bonus++
        if (e.t === 'RESONANCE_BURST') g.burst++
      }
      state = r.state
      continue
    }
    if (state.divination.remaining > 0 && !state.divination.usedThisRound) {
      state = applyAction(state, { type: 'USE_DIVINATION', choiceIndex: pickDivinationChoice(state, strategy) }).state
      continue
    }
    const hpBefore = state.player.hp
    const r = applyAction(state, { type: 'END_ROUND' })
    for (const e of r.events) if (e.t === 'RESONANCE_BURST') g.burst++
    state = r.state
    g.damageTaken += Math.max(0, hpBefore - state.player.hp)
  }
  g.win = state.status === 'won'
  g.round = state.round
  g.score = state.score.total
  return g
}

// --- 設定（RULES.stakes を実行時に差し替える） ------------------------------------------

type StakeKnobs = Partial<{
  enemyAtkStep: number
  enemyHpStep: number
  lateRoundAtkMul: number
  specialMul: number
  blockEfficiency: number
  healEfficiency: number
  divinationCount: number
  /** Phase 5-A 前の近似：共通16枚の bonus を外す（神専用4枚は残す） */
  stripCommonBonus: boolean
}>
const mutable = RULES.stakes as unknown as Record<string, number | string>
const ORIGINAL: Record<string, number | string> = { ...mutable }

const COMMON_BONUS = ALL_CARDS.filter((c) => c.bonus && !c.godId).map((c) => ({ card: c as { bonus?: unknown }, bonus: c.bonus }))
function apply(knobs: StakeKnobs) {
  for (const k of Object.keys(ORIGINAL)) mutable[k] = ORIGINAL[k]
  for (const { card, bonus } of COMMON_BONUS) card.bonus = bonus
  for (const [k, v] of Object.entries(knobs)) {
    if (k === 'stripCommonBonus') {
      if (v) for (const { card } of COMMON_BONUS) card.bonus = undefined
      continue
    }
    mutable[k] = v as number
  }
}

/** 感度分析の候補。cur＝Phase 5-A 現在値 */
const CONFIGS: Array<[string, StakeKnobs]> = [
  ['pre5a', { stripCommonBonus: true }],
  ['cur', {}],
  ['adopt', { enemyAtkStep: 1.15, enemyHpStep: 1.15, lateRoundAtkMul: 1.3 }],
  ['near_late125', { enemyAtkStep: 1.15, enemyHpStep: 1.15, lateRoundAtkMul: 1.25 }],
  ['near_hp120', { enemyAtkStep: 1.15, enemyHpStep: 1.2 }],
  // 単独感度（敵側）
  ['atk115', { enemyAtkStep: 1.15 }],
  ['atk120', { enemyAtkStep: 1.2 }],
  ['hp115', { enemyHpStep: 1.15 }],
  ['hp120', { enemyHpStep: 1.2 }],
  ['late130', { lateRoundAtkMul: 1.3 }],
  ['late140', { lateRoundAtkMul: 1.4 }],
  ['spc130', { specialMul: 1.3 }],
  ['spc140', { specialMul: 1.4 }],
  // 単独感度（参考：プレイヤー側）
  ['blk065', { blockEfficiency: 0.65 }],
  ['heal050', { healEfficiency: 0.5 }],
  // 組み合わせ（敵側のみ）
  ['atk115_hp115', { enemyAtkStep: 1.15, enemyHpStep: 1.15 }],
  ['atk115_late130', { enemyAtkStep: 1.15, lateRoundAtkMul: 1.3 }],
  ['hp115_late130', { enemyHpStep: 1.15, lateRoundAtkMul: 1.3 }],
  ['atk115_hp115_late130', { enemyAtkStep: 1.15, enemyHpStep: 1.15, lateRoundAtkMul: 1.3 }],
  ['atk120_late130', { enemyAtkStep: 1.2, lateRoundAtkMul: 1.3 }],
]

const SEEDS = 6
const STRATEGIES: Strategy[] = ['aggressive', 'balanced', 'defensive']
const CHOICES: Array<StakeChoiceId | undefined> = [undefined, 'race', 'tempo']

type StakeSummary = {
  overall: number
  godBest: Record<string, number>
  godPooled: Record<string, number>
  enemyPooled: Record<string, number>
  round: number
  damageTaken: number
  score: number
  bonus: number
  burst: number
  divergences: number
  attackShare: number
}

/** STAKE-01 と同じ集計（overall＝3戦略プール、Ⅶは pressure(既定)+race をプール、best は3択含む最良） */
function measureStake(stake: number, policy: Policy): StakeSummary {
  let W = 0
  let N = 0
  const godBest: Record<string, number> = {}
  const godPooled: Record<string, number> = {}
  const enemyAcc: Record<string, { w: number; n: number }> = {}
  let rounds = 0
  let dmg = 0
  let score = 0
  let bonus = 0
  let burst = 0
  let div = 0
  let plays = 0
  let attacks = 0
  let games = 0
  for (const god of GODS) {
    const deck = getRecommendedDeck(god.id)
    let best = 0
    let gw = 0
    let gn = 0
    for (const choice of stake === 7 ? CHOICES : [undefined]) {
      for (const strategy of STRATEGIES) {
        let w = 0
        let n = 0
        for (const enemy of ENEMIES) {
          for (let i = 0; i < SEEDS; i++) {
            const r = playOne(
              `stake-${stake}-${god.id}-${enemy.id}-${strategy}-${choice ?? 'p'}-${i}`,
              strategy,
              policy,
              god.id,
              deck,
              enemy.id,
              stake,
              choice,
            )
            n++
            if (r.win) w++
            if (!choice || choice === 'race') {
              const ea = (enemyAcc[enemy.id] ??= { w: 0, n: 0 })
              ea.n++
              if (r.win) ea.w++
              rounds += r.round
              dmg += r.damageTaken
              score += r.score
              bonus += r.bonus
              burst += r.burst
              div += r.divergences
              plays += r.plays
              attacks += r.attacks
              games++
            }
          }
        }
        const rate = (w / n) * 100
        if (rate > best) best = rate
        if (!choice || choice === 'race') {
          W += w
          N += n
          gw += w
          gn += n
        }
      }
    }
    godBest[god.id] = best
    godPooled[god.id] = (gw / gn) * 100
  }
  const enemyPooled: Record<string, number> = {}
  for (const [id, a] of Object.entries(enemyAcc)) enemyPooled[id] = (a.w / a.n) * 100
  return {
    overall: (W / N) * 100,
    godBest,
    godPooled,
    enemyPooled,
    round: rounds / games,
    damageTaken: dmg / games,
    score: score / games,
    bonus: bonus / games,
    burst: burst / games,
    divergences: div / games,
    attackShare: (attacks / plays) * 100,
  }
}

const f0 = (n: number) => n.toFixed(0)
const f2 = (n: number) => n.toFixed(2)

describe.skipIf(!RUN)('Phase 5-B 神階ラダー感度分析', () => {
  it('候補ごとに神階Ⅰ〜Ⅶの勝率カーブと Phase 5-A 指標を出す', () => {
    const only = process.env.P5B_CONFIGS?.split(',').map((s) => s.trim())
    const targets = only ? CONFIGS.filter(([name]) => only.includes(name)) : CONFIGS
    const detail = process.env.P5B_DETAIL === '1'
    const lines: string[] = []
    for (const [name, knobs] of targets) {
      apply(knobs)
      const curve: string[] = []
      const rows: string[] = []
      for (let stake = 1; stake <= 7; stake++) {
        const s = measureStake(stake, 'blind')
        curve.push(f0(s.overall))
        if (detail || stake === 7 || stake === 3 || stake === 5) {
          const gods = GODS.map((g) => `${g.nameJa}${f0(s.godBest[g.id])}/${f0(s.godPooled[g.id])}`).join(' ')
          const bestVals = Object.values(s.godBest)
          const spread = Math.max(...bestVals) - Math.min(...bestVals)
          const enemies = ENEMIES.map((e) => `${e.name.slice(0, 2)}${f0(s.enemyPooled[e.id])}`).join(' ')
          rows.push(
            `    Ⅶ`.replace('Ⅶ', ['', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ'][stake]) +
              ` overall ${f0(s.overall)}% | god(best/pooled) ${gods} | spread(best) ${f0(spread)}pt | enemy ${enemies} | R${f2(s.round)} dmg${f0(s.damageTaken)} score${f0(s.score)} | bonus ${f2(s.bonus)} burst ${f2(s.burst)} atk${f0(s.attackShare)}%`,
          )
        }
      }
      // Phase 5-A 指標は aware 方策（条件を狙う人）で、Ⅲ・Ⅴ・Ⅶ
      const aw = [3, 5, 7].map((st) => {
        const s = measureStake(st, 'aware')
        return `${['', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ'][st]} win${f0(s.overall)} bonus${f2(s.bonus)} div${f2(s.divergences)} burst${f2(s.burst)}`
      })
      lines.push(`[${name}] ${JSON.stringify(knobs)}\n  curve Ⅰ→Ⅶ: ${curve.join(' / ')}\n${rows.join('\n')}\n  aware: ${aw.join(' | ')}`)
    }
    apply({})
    console.log('\n' + lines.join('\n\n'))
    expect(true).toBe(true)
  })
})

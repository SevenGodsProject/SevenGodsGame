import { describe, expect, it } from 'vitest'
import { GODS, GOD_IDS } from '../../src/core/data/gods.js'
import { ENEMIES } from '../../src/core/data/enemies.js'
import { getCardDef } from '../../src/core/data/cards/index.js'
import { getRecommendedDeck } from '../../src/core/data/deckBuilder.js'
import { RULES } from '../../src/core/data/rules.js'
import { applyAction } from '../../src/core/engine/reducer.js'
import { previewBonusTrigger } from '../../src/core/engine/cardBonus.js'
import type { CardDef, CardDefId, CardInstance, EnemyId, GameState, GodId } from '../../src/core/types/index.js'

/**
 * Phase 5-F：Phase 5 開始前（46a450f）と現在を **同じハーネス・同じ seed** で比べる。
 * このファイルは両方のコミットでそのまま動くよう、Phase 5 で増えた API を使わない
 * （予告合計は intent から自前で出す。`chargedThreshold` は無ければ 4）。
 *   P5F_RUN=1 npx vitest run scripts/phase5f-rc/phase5Compare.test.ts --reporter=verbose
 *   P5F_SEEDS=6  P5F_STAKES="1,2,3,4,5,6,7"  P5F_LENSES="fixed,intent,cardaware"
 *
 * 方策は Phase 5-C の監査と同じ：
 *   fixed      … STAKE-01（blind・3戦略・神ごとに最良）。託宣は defensive=加護、balanced=危険なら加護、他は天啓
 *   intent     … balanced・aware（今立つ条件を見る）。託宣は 4通りを最後まで打ち切って選ぶ（rollout）
 *   cardaware  … intent ＋ 1手先読み（先に出すと他の札の条件が立つ分）＋得意技
 *
 * 敗北の分類（rollout 系のみ）：
 *   死んだラウンドの開始時点から「託宣4通り × balanced/defensive」を打ち直し、
 *   どれかで生き残れたなら avoidable（判断で避けられた）、どれでも死ぬなら unavoidable。
 *   unavoidable のうち「手札のブロックを全部足しても予告に届かない」ものを no-answer と数える。
 */

const RUN = process.env.P5F_RUN === '1'

type Strategy = 'balanced' | 'aggressive' | 'defensive'
type Policy = 'blind' | 'aware' | 'lookahead'
type Lens = 'fixed' | 'intent' | 'cardaware'

const CHARGED = ((RULES as unknown as { cardBonus: { chargedThreshold?: number } }).cardBonus.chargedThreshold ?? 4)
const BIG = RULES.cardBonus.enemyBigThreshold

function incomingOf(state: GameState): number {
  const intent = state.enemy.intent
  if (!intent) return 0
  if (intent.kind === 'attack' || intent.kind === 'special') return intent.amount
  if (intent.kind === 'multiAttack') return intent.hits.reduce((s, h) => s + h, 0)
  return 0
}
const lowHp = (state: GameState) => state.player.hp <= Math.floor(state.player.maxHp * RULES.cardBonus.lowHpRatio)
const isLethal = (state: GameState) => incomingOf(state) - state.player.block >= state.player.hp
function isDangerous(state: GameState): boolean {
  const projected = Math.max(0, incomingOf(state) - state.player.block)
  return state.player.hp - projected < state.player.maxHp * 0.35
}

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

function fixedDivination(state: GameState, strategy: Strategy): number {
  if (strategy === 'defensive' || (strategy === 'balanced' && isDangerous(state))) return 0
  return 2
}
function bonusValue(state: GameState, def: CardDef): number {
  if (!def.bonus || !previewBonusTrigger(state, def)) return 0
  return damageOf(def, true) + blockOf(def, true) * 0.8 + healOf(def, true) * 0.8 + utilityOf(def, true)
}
function passiveValue(state: GameState, def: CardDef): number {
  const base = damageOf(def)
  if (base <= 0) return 0
  const gp = (RULES as unknown as { godPassive?: { fukuei: { bonusRatio: number }; shouren: { hpRatio: number; bonusRatio: number } } }).godPassive
  if (!gp) return 0
  if (state.godId === GOD_IDS.fukuei && lowHp(state)) return base * gp.fukuei.bonusRatio
  if (state.godId === GOD_IDS.shouren && state.player.hp >= Math.ceil(state.player.maxHp * gp.shouren.hpRatio)) return base * gp.shouren.bonusRatio
  return 0
}
function enableValue(state: GameState, c: CardInstance, policy: Policy): number {
  if (policy !== 'lookahead') return 0
  const apAfter = state.ap.current - costOf(c)
  const others = state.hand.filter((d) => d.uid !== c.uid && costOf(d) <= apAfter && getCardDef(d.defId).bonus)
  if (others.length === 0) return 0
  let after: GameState
  try {
    after = applyAction(state, { type: 'PLAY_CARD', uid: c.uid }).state
  } catch {
    return 0
  }
  if (after.status !== 'playing') return 0
  let best = 0
  for (const d of others) {
    if (!after.hand.some((h) => h.uid === d.uid)) continue
    const def = getCardDef(d.defId)
    const gain = bonusValue(after, def) - bonusValue(state, def)
    if (gain > best) best = gain
  }
  return best * 0.8
}
function valueOf(state: GameState, c: CardInstance, policy: Policy): number {
  const def = getCardDef(c.defId)
  const base = damageOf(def) + blockOf(def) * 0.8 + healOf(def) * 0.8 + utilityOf(def)
  if (policy === 'blind') return base
  return base + bonusValue(state, def) + passiveValue(state, def) + enableValue(state, c, policy)
}
function pickCard(state: GameState, strategy: Strategy, policy: Policy): CardInstance | null {
  const affordable = state.hand.filter((c) => costOf(c) <= state.ap.current)
  if (affordable.length === 0) return null
  const bonusPart = (c: CardInstance, kind: 'b' | 'h') => {
    if (policy === 'blind') return 0
    const def = getCardDef(c.defId)
    if (!def.bonus || !previewBonusTrigger(state, def)) return 0
    return kind === 'b' ? blockOf(def, true) : healOf(def, true)
  }
  const blk = (c: CardInstance) => blockOf(getCardDef(c.defId)) + bonusPart(c, 'b')
  const heal = (c: CardInstance) => healOf(getCardDef(c.defId)) + bonusPart(c, 'h')
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
  if (policy === 'blind') {
    const dmgv = (c: CardInstance) => damageOf(getCardDef(c.defId))
    const util = (c: CardInstance) => utilityOf(getCardDef(c.defId))
    const d = affordable.filter((c) => dmgv(c) > 0).sort((a, c) => dmgv(c) / costOf(c) - dmgv(a) / costOf(a))[0]
    if (d) return d
    const u = affordable.filter((c) => util(c) > 0).sort((a, c) => util(c) / costOf(c) - util(a) / costOf(a))[0]
    if (u) return u
    return affordable.sort((a, c) => costOf(c) - costOf(a))[0]
  }
  return [...affordable].sort((a, c) => valueOf(state, c, policy) / costOf(c) - valueOf(state, a, policy) / costOf(a))[0]
}

// --- 対局 ----------------------------------------------------------------------------

type Play = { type: string; defId: CardDefId; exclusive: boolean; bonus: boolean; low: boolean; res: number; hasRes: boolean; hasBlock: boolean; isAttack: boolean; changed: boolean }
type Decision = { big: boolean; lethal: boolean; dangerous: boolean; pick: number }
type Death = { avoidable: boolean; noAnswer: boolean; oracleLeft: boolean; round: number }
type Game = {
  win: boolean
  round: number
  score: number
  hp: number
  enemyHp: number
  damageTaken: number
  burst: number
  bonus: number
  godBonus: number
  plays: Play[]
  rounds: Play[][]
  decisions: Decision[]
  death: Death | null
}

function valueOfGame(g: { win: boolean; hp: number; enemyHp: number; round: number }): number {
  return g.win ? 100000 + g.hp * 10 : g.round - g.enemyHp * 10
}
function start(seed: string, godId: GodId, deck: CardDefId[], enemyId: EnemyId, stake: number, choice?: 'race' | 'tempo'): GameState {
  return applyAction(null, {
    type: 'START_GAME',
    seed,
    godId,
    enemyId,
    deck,
    otomoGrowthPath: 'guardian',
    difficulty: 'normal',
    ...(stake > 0 ? { stake } : {}),
    ...(choice ? { stakeChoice: choice } : {}),
  } as Parameters<typeof applyAction>[1]).state
}

/** 1ラウンドだけ進める（託宣は forcedPick で固定）。敵ターンの後の盤面を返す */
type RoundStrategy = Strategy | 'maxblock'
/** 受け切り専用：ブロック→回復の順に、攻撃札を使わずに全部出す */
function pickDefensive(state: GameState): CardInstance | null {
  const affordable = state.hand.filter((c) => costOf(c) <= state.ap.current)
  const b = affordable.filter((c) => blockOf(getCardDef(c.defId)) > 0).sort((x, y) => blockOf(getCardDef(y.defId)) / costOf(y) - blockOf(getCardDef(x.defId)) / costOf(x))[0]
  if (b) return b
  const h = affordable.filter((c) => healOf(getCardDef(c.defId)) > 0).sort((x, y) => healOf(getCardDef(y.defId)) / costOf(y) - healOf(getCardDef(x.defId)) / costOf(x))[0]
  if (h) return h
  const d = affordable.filter((c) => getCardDef(c.defId).effects.some((e) => e.kind === 'debuff' && e.target === 'enemy'))[0]
  return d ?? null
}
function playRound(state0: GameState, strategy: RoundStrategy, policy: Policy, forcedPick: number): GameState {
  let state = state0
  let usedDiv = false
  let guard = 0
  // 加護は先に使う（ブロックの条件判定に効く）
  if (forcedPick === 0 && state.divination.remaining > 0 && !state.divination.usedThisRound) {
    usedDiv = true
    state = applyAction(state, { type: 'USE_DIVINATION', choiceIndex: 0 }).state
  }
  while (state.status === 'playing' && state.phase === 'playerTurn' && guard < 60) {
    guard++
    const card = strategy === 'maxblock' ? pickDefensive(state) : pickCard(state, strategy, policy)
    if (card) {
      state = applyAction(state, { type: 'PLAY_CARD', uid: card.uid }).state
      continue
    }
    if (!usedDiv && forcedPick >= 0 && state.divination.remaining > 0 && !state.divination.usedThisRound) {
      usedDiv = true
      state = applyAction(state, { type: 'USE_DIVINATION', choiceIndex: forcedPick }).state
      continue
    }
    state = applyAction(state, { type: 'END_ROUND' }).state
    break
  }
  return state
}

/** 手札のブロックを全部足しても予告に届かないか（加護を含む） */
function noAnswerInHand(state: GameState): boolean {
  const affordable = [...state.hand].sort((a, b) => blockOf(getCardDef(b.defId)) / costOf(b) - blockOf(getCardDef(a.defId)) / costOf(a))
  let ap = state.ap.current
  let block = state.player.block
  for (const c of affordable) {
    if (costOf(c) <= ap && blockOf(getCardDef(c.defId)) > 0) {
      ap -= costOf(c)
      block += blockOf(getCardDef(c.defId))
    }
  }
  if (state.divination.remaining > 0 && !state.divination.usedThisRound) {
    // 加護の量は版で違う。旧：ブロック2、新：予告の半分（最低2）。多い方＝現在の仕様で見積もる
    block += Math.max(2, Math.floor(incomingOf(state) * 0.5))
  }
  return incomingOf(state) - block >= state.player.hp
}

function play(state0: GameState, strategy: Strategy, policy: Policy, chooser: 'fixed' | 'rollout', classifyDeath: boolean): Game {
  let state = state0
  const g: Game = { win: false, round: 0, score: 0, hp: 0, enemyHp: 0, damageTaken: 0, burst: 0, bonus: 0, godBonus: 0, plays: [], rounds: [], decisions: [], death: null }
  let skippedThisRound = -1
  let seenRound = -1
  let cur: Play[] = []
  let roundStart: GameState = state0
  let guard = 0
  while (state.status === 'playing' && guard < 600) {
    guard++
    if (state.phase !== 'playerTurn') break
    if (state.round !== seenRound) {
      seenRound = state.round
      cur = []
      g.rounds.push(cur)
      roundStart = state
    }
    const card = pickCard(state, strategy, policy)
    if (card) {
      const def = getCardDef(card.defId)
      const p: Play = { type: def.type, defId: def.id, exclusive: !!def.godId, bonus: false, low: lowHp(state), res: state.resonance.value, hasRes: def.effects.some((e) => e.kind === 'resonance'), hasBlock: blockOf(def) > 0, isAttack: def.type === 'attack', changed: false }
      if (policy !== 'blind') {
        const other = pickCard(state, strategy, 'blind')
        p.changed = !!other && other.uid !== card.uid
      }
      const r = applyAction(state, { type: 'PLAY_CARD', uid: card.uid })
      for (const e of r.events) {
        if (e.t === 'BONUS_TRIGGERED') {
          g.bonus++
          if (e.defId === def.id && def.godId) {
            g.godBonus++
            p.bonus = true
          }
        }
        if (e.t === 'RESONANCE_BURST') g.burst++
      }
      g.plays.push(p)
      cur.push(p)
      state = r.state
      continue
    }
    const canDivine = state.divination.remaining > 0 && !state.divination.usedThisRound && skippedThisRound !== state.round
    if (canDivine) {
      let pick = fixedDivination(state, strategy)
      if (chooser === 'rollout') {
        let best = -Infinity
        for (const option of [2, 1, -1, 0]) {
          const branch = option === -1 ? applyAction(state, { type: 'END_ROUND' }).state : applyAction(state, { type: 'USE_DIVINATION', choiceIndex: option }).state
          const v = valueOfGame(play(branch, strategy, policy, 'fixed', false))
          if (v > best) {
            best = v
            pick = option
          }
        }
      }
      g.decisions.push({ big: incomingOf(state) >= BIG, lethal: isLethal(state), dangerous: isDangerous(state), pick })
      if (pick === -1) {
        skippedThisRound = state.round
        continue
      }
      state = applyAction(state, { type: 'USE_DIVINATION', choiceIndex: pick }).state
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
  g.hp = state.player.hp
  g.enemyHp = state.enemy.hp
  if (state.status === 'lost' && classifyDeath) {
    const options = roundStart.divination.remaining > 0 ? [0, 1, 2, -1] : [-1]
    let survived = false
    for (const s of ['maxblock', 'defensive', 'balanced'] as RoundStrategy[]) {
      for (const pick of options) {
        const after = playRound(roundStart, s, 'lookahead', pick)
        if (after.status !== 'lost') {
          survived = true
          break
        }
      }
      if (survived) break
    }
    g.death = { avoidable: survived, noAnswer: !survived && noAnswerInHand(roundStart), oracleLeft: roundStart.divination.remaining > 0, round: roundStart.round }
  }
  return g
}

// --- 集計 ----------------------------------------------------------------------------

const SEEDS = Number(process.env.P5F_SEEDS ?? 6)
const STRATEGIES: Strategy[] = ['aggressive', 'balanced', 'defensive']
const NUM = ['通常', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ']
const TYPES = ['attack', 'guard', 'support', 'resonance', 'hinder', 'oracle']
const f0 = (n: number) => n.toFixed(0)
const f2 = (n: number) => n.toFixed(2)
const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0)

type Agg = {
  games: number
  wins: number
  plays: number
  byType: Record<string, number>
  firstByType: Record<string, number>
  exclusive: number
  distinctSum: number
  bonus: number
  godBonus: number
  changed: number
  burst: number
  dmg: number
  score: number
  round: number
  div: number
  guard: number
  big: number
  bigGuard: number
  danger: number
  dangerGuard: number
  lethal: number
  lethalGuard: number
  lowAttackRounds: number
  chargedAttackRounds: number
  resFirstRounds: number
  blockFirstRounds: number
  lost: number
  avoidable: number
  noAnswer: number
  oracleLeft: number
}
const newAgg = (): Agg => ({ games: 0, wins: 0, plays: 0, byType: {}, firstByType: {}, exclusive: 0, distinctSum: 0, bonus: 0, godBonus: 0, changed: 0, burst: 0, dmg: 0, score: 0, round: 0, div: 0, guard: 0, big: 0, bigGuard: 0, danger: 0, dangerGuard: 0, lethal: 0, lethalGuard: 0, lowAttackRounds: 0, chargedAttackRounds: 0, resFirstRounds: 0, blockFirstRounds: 0, lost: 0, avoidable: 0, noAnswer: 0, oracleLeft: 0 })
function add(a: Agg, g: Game) {
  a.games++
  if (g.win) a.wins++
  a.plays += g.plays.length
  const distinct = new Set<string>()
  for (const p of g.plays) {
    a.byType[p.type] = (a.byType[p.type] ?? 0) + 1
    if (p.exclusive) a.exclusive++
    if (p.changed) a.changed++
    distinct.add(p.defId)
  }
  a.distinctSum += distinct.size
  for (const r of g.rounds) {
    if (r[0]) a.firstByType[r[0].type] = (a.firstByType[r[0].type] ?? 0) + 1
    if (r.some((p) => p.low && p.isAttack)) a.lowAttackRounds++
    if (r.some((p) => p.isAttack && p.res >= CHARGED)) a.chargedAttackRounds++
    const fa = r.findIndex((p) => p.isAttack)
    if (fa > 0 && r.slice(0, fa).some((p) => p.hasRes)) a.resFirstRounds++
    if (fa > 0 && r.slice(0, fa).some((p) => p.hasBlock)) a.blockFirstRounds++
  }
  a.bonus += g.bonus
  a.godBonus += g.godBonus
  a.burst += g.burst
  a.dmg += g.damageTaken
  a.score += g.score
  a.round += g.round
  for (const d of g.decisions) {
    a.div++
    const guard = d.pick === 0
    if (guard) a.guard++
    if (d.big) {
      a.big++
      if (guard) a.bigGuard++
    }
    if (d.dangerous) {
      a.danger++
      if (guard) a.dangerGuard++
    }
    if (d.lethal) {
      a.lethal++
      if (guard) a.lethalGuard++
    }
  }
  if (g.death) {
    a.lost++
    if (g.death.avoidable) a.avoidable++
    if (g.death.noAnswer) a.noAnswer++
    if (g.death.oracleLeft) a.oracleLeft++
  }
}
function fmt(a: Agg): string {
  const types = TYPES.map((t) => `${t.slice(0, 3)}${f0(pct(a.byType[t] ?? 0, a.plays))}`).join(' ')
  const first = TYPES.map((t) => `${t.slice(0, 3)}${f0(pct(a.firstByType[t] ?? 0, a.games * 7))}`).join(' ')
  return (
    `R${f2(a.round / a.games)} 被ダメ${f0(a.dmg / a.games)} score${f0(a.score / a.games)} 神の一撃${f2(a.burst / a.games)} bonus${f2(a.bonus / a.games)} 専用bonus${f2(a.godBonus / a.games)} 変更${f2(a.changed / a.games)} 種類${f2(a.distinctSum / a.games)} 専用${f0(pct(a.exclusive, a.plays))}%` +
    ` | 種別 ${types} | 初手 ${first}` +
    ` | 加護 全体${f0(pct(a.guard, a.div))}% 大技${f0(pct(a.bigGuard, a.big))}% 危険${f0(pct(a.dangerGuard, a.danger))}% 致死${f0(pct(a.lethalGuard, a.lethal))}%(n${a.lethal})` +
    ` | 低HP攻撃R${f2(a.lowAttackRounds / a.games)} 共鳴4攻撃R${f2(a.chargedAttackRounds / a.games)} 共鳴先置R${f2(a.resFirstRounds / a.games)} ブロック先置R${f2(a.blockFirstRounds / a.games)}` +
    ` | 敗北${a.lost} 回避可${f0(pct(a.avoidable, a.lost))}% 手札不足${f0(pct(a.noAnswer, a.lost))}% 神託残あり${f0(pct(a.oracleLeft, a.lost))}%`
  )
}

function runLens(stake: number, lens: Lens) {
  const gods: Record<string, Agg> = {}
  const all = newAgg()
  const godBest: Record<string, number> = {}
  const enemy: Record<string, { w: number; n: number }> = {}
  let W = 0
  let N = 0
  for (const god of GODS) {
    const deck = getRecommendedDeck(god.id)
    const agg = (gods[god.id] ??= newAgg())
    if (lens === 'fixed') {
      let best = 0
      for (const choice of stake === 7 ? [undefined, 'race', 'tempo'] as const : [undefined]) {
        for (const strategy of STRATEGIES) {
          let w = 0
          let n = 0
          for (const e of ENEMIES) {
            for (let i = 0; i < SEEDS; i++) {
              const s0 = start(`stake-${stake}-${god.id}-${e.id}-${strategy}-${choice ?? 'p'}-${i}`, god.id, deck, e.id, stake, choice)
              const r = play(s0, strategy, 'blind', 'fixed', strategy === 'balanced')
              n++
              if (r.win) w++
              if (!choice || choice === 'race') {
                N++
                if (r.win) W++
                const ea = (enemy[e.id] ??= { w: 0, n: 0 })
                ea.n++
                if (r.win) ea.w++
                if (strategy === 'balanced') {
                  add(agg, r)
                  add(all, r)
                }
              }
            }
          }
          const rate = (w / n) * 100
          if (rate > best) best = rate
        }
      }
      godBest[god.id] = best
    } else {
      const policy: Policy = lens === 'intent' ? 'aware' : 'lookahead'
      let w = 0
      let n = 0
      for (const e of ENEMIES) {
        for (let i = 0; i < SEEDS; i++) {
          const s0 = start(`lens-${stake}-${god.id}-${e.id}-${i}`, god.id, deck, e.id, stake, stake === 7 ? 'race' : undefined)
          const r = play(s0, 'balanced', policy, 'rollout', true)
          n++
          if (r.win) w++
          N++
          if (r.win) W++
          const ea = (enemy[e.id] ??= { w: 0, n: 0 })
          ea.n++
          if (r.win) ea.w++
          add(agg, r)
          add(all, r)
        }
      }
      godBest[god.id] = (w / n) * 100
    }
  }
  const gv = Object.values(godBest)
  const ev = Object.values(enemy).map((v) => (v.w / v.n) * 100)
  return { overall: (W / N) * 100, godBest, spread: Math.max(...gv) - Math.min(...gv), enemy, enemySpread: Math.max(...ev) - Math.min(...ev), gods, all }
}

describe.skipIf(!RUN)('Phase 5-F：Phase 5 前後の比較', () => {
  it('神階ごとに 3方策の勝率・行動・敗北の分類を出す', { timeout: 60 * 60 * 1000 }, () => {
    const stakes = process.env.P5F_STAKES ? process.env.P5F_STAKES.split(',').map(Number) : [1, 2, 3, 4, 5, 6, 7]
    const lenses = (process.env.P5F_LENSES ? process.env.P5F_LENSES.split(',') : ['fixed', 'intent', 'cardaware']) as Lens[]
    const lines: string[] = [`[P5F] seeds=${SEEDS} charged=${CHARGED}`]
    for (const st of stakes) {
      for (const lens of lenses) {
        const r = runLens(st, lens)
        const gods = GODS.map((g) => `${g.nameJa}${f0(r.godBest[g.id])}`).join(' ')
        const enemies = ENEMIES.map((e) => `${e.name.slice(0, 2)}${f0((r.enemy[e.id].w / r.enemy[e.id].n) * 100)}`).join(' ')
        lines.push(`  ${NUM[st]} ${lens.padEnd(9)}: 勝率${f0(r.overall)}% spread${f0(r.spread)} 敵spread${f0(r.enemySpread)} | ${gods} | ${enemies}`)
        lines.push(`      全神: ${fmt(r.all)}`)
        for (const g of GODS) lines.push(`      ${g.nameJa}: ${fmt(r.gods[g.id])}`)
      }
    }
    console.log('\n' + lines.join('\n'))
    expect(lines.length).toBeGreaterThan(1)
  })
})

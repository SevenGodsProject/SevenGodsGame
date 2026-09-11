import { describe, expect, it } from 'vitest'
import { GODS } from '../../src/core/data/gods.js'
import { ENEMIES } from '../../src/core/data/enemies.js'
import { getCardDef } from '../../src/core/data/cards/index.js'
import { getRecommendedDeck } from '../../src/core/data/deckBuilder.js'
import { RULES } from '../../src/core/data/rules.js'
import { resolveStakeRules } from '../../src/core/data/stakes.js'
import { applyAction } from '../../src/core/engine/reducer.js'
import { previewBonusTrigger } from '../../src/core/engine/cardBonus.js'
import { intentGuardRaw } from '../../src/core/engine/effects.js'
import { enemyActionTotal } from '../../src/core/engine/intent.js'
import type { StakeChoiceId } from '../../src/core/data/stakes.js'
import type { CardDef, CardDefId, CardInstance, EnemyId, GameAction, GameState, GodId } from '../../src/core/types/index.js'

/**
 * Phase 5-E：神階の「受け構造」の設計比較（本番コードは変えず、ハーネス側で候補を再現する）。
 *   P5E_RUN=1 npx vitest run scripts/phase5e-guard-structure/structureAudit.test.ts --reporter=verbose
 *   P5E_CONFIGS="BASE,A"  対象を絞る
 *   P5E_SEEDS=12          seed数（既定 6 ＝ Phase 5-D と同じ。BASE が 5-D の実測と一致することの確認に使う）
 *   P5E_STAKES="5,7"      神階を絞る
 *
 * ★候補の再現方法（`RULES` も `DIVINATION_CHOICES` も触らない）
 *   A（神階の神託 4→5）… START_GAME 直後に `divination.remaining` を 5 に差し替える
 *      （本番では `RULES.stakes.divinationCount` の1値。`createInitialState` はこの値を1度だけ読む）
 *   B（加護だけⅣ以降のブロック効率の対象外）… 加護を使った直後に、効率で削られた分
 *      （raw − round(raw×0.75)）をブロックへ足し戻す。本番では `applyEffect` の `blockOfIntent` が
 *      `effectiveBlock` を通さない形に相当する。ブロックは rng を使わないので決定論は崩れない
 *   C … A と B の両方
 *
 * ★2つのレンズ（Phase 5-D と同じ）
 *   1. STAKE-01（固定方策・blind・3戦略・神ごとに最良）… 本番ゲートと同じ集計。託宣は
 *      「defensive は常に加護、balanced は危険なら加護それ以外は天啓、aggressive は天啓」
 *   2. 予告を読む方策（balanced・aware・rollout）… 託宣の機会ごとに 加護/導き/天啓/温存 を
 *      最後まで打ち切って比べ、最良を選ぶ。同点は「加護以外」を優先（加護の選択率を過大にしない）
 *
 * ★神託の残数まわりの定義（Phase 5-D から直したもの）
 *   「大技が来た時点で神託残0」は**ラウンド開始時点**の残数で数える。5-D の harness は
 *   ラウンド終了時点で数えていたため、「そのラウンドで最後の1回を使った」場合も切れ扱いになっていた。
 *   両方を出して、5-D の値（57%）との違いも見えるようにする。
 */

const RUN = process.env.P5E_RUN === '1'

type Strategy = 'balanced' | 'aggressive' | 'defensive'
type Policy = 'blind' | 'aware'
type Config = { name: string; divCount: number | null; guardExempt: boolean }

const CONFIGS: Config[] = [
  { name: 'BASE', divCount: null, guardExempt: false },
  { name: 'A', divCount: 5, guardExempt: false },
  { name: 'B', divCount: null, guardExempt: true },
  { name: 'C', divCount: 5, guardExempt: true },
]

// --- balanceSim と同じ価値関数（STAKE-01 と一致させるための写し） ---------------------

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
const incomingOf = (state: GameState) => (state.enemy.intent ? enemyActionTotal(state.enemy.intent) : 0)
const isBig = (state: GameState) => incomingOf(state) >= RULES.cardBonus.enemyBigThreshold
const isLethal = (state: GameState) => incomingOf(state) - state.player.block >= state.player.hp

function isDangerous(state: GameState): boolean {
  const projected = Math.max(0, incomingOf(state) - state.player.block)
  return state.player.hp - projected < state.player.maxHp * 0.35
}
/** STAKE-01 と同じ託宣の選び方 */
function fixedDivination(state: GameState, strategy: Strategy): number {
  if (strategy === 'defensive' || (strategy === 'balanced' && isDangerous(state))) return 0
  return 2
}

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

// --- 候補の再現 ------------------------------------------------------------------------

/** 本番の reducer を通したうえで、候補B の差分（効率で削られた加護ぶん）を足し戻す */
function step(state: GameState, action: GameAction, cfg: Config): ReturnType<typeof applyAction> {
  const r = applyAction(state, action)
  if (cfg.guardExempt && action.type === 'USE_DIVINATION' && action.choiceIndex === 0 && r.state.status === 'playing') {
    const raw = intentGuardRaw(state, RULES.divination.guardRatio, RULES.divination.guardMin)
    const eff = Math.round(raw * resolveStakeRules(state.stake, state.stakeChoice).blockEfficiency)
    if (raw !== eff) {
      r.state = { ...r.state, player: { ...r.state.player, block: r.state.player.block + (raw - eff) } }
    }
  }
  return r
}

function start(cfg: Config, seed: string, godId: GodId, deck: CardDefId[], enemyId: EnemyId, stake: number, choice?: StakeChoiceId): GameState {
  const s = applyAction(null, {
    type: 'START_GAME',
    seed,
    godId,
    enemyId,
    deck,
    otomoGrowthPath: 'guardian',
    difficulty: 'normal',
    ...(stake > 0 ? { stake } : {}),
    ...(choice ? { stakeChoice: choice } : {}),
  }).state
  if (cfg.divCount !== null && stake > 0) return { ...s, divination: { ...s.divination, remaining: cfg.divCount } }
  return s
}

// --- 対局 ----------------------------------------------------------------------------

type Decision = { round: number; big: boolean; lethal: boolean; dangerous: boolean; pick: number; remainingBefore: number }
type Game = {
  win: boolean
  round: number
  score: number
  hp: number
  enemyHp: number
  damageTaken: number
  bonus: number
  burst: number
  divergences: number
  decisions: Decision[]
  /** 大技の予告があったラウンド数と、そのうちラウンド開始時点で神託が残っていなかった数 */
  bigRounds: number
  bigNoDivAtStart: number
  /** Phase 5-D harness と同じ、ラウンド終了時点で数えた値（比較用） */
  bigNoDivAtEnd: number
  /** 神託を使い切ったラウンド（使い切らなかったら null） */
  exhaustRound: number | null
  /** 終局時に残っていた神託 */
  leftover: number
}

/** rollout の評価値：勝ちを最優先、勝つなら残りHP、負けるなら敵の残りHPが少ないほど良い */
function valueOf(g: { win: boolean; hp: number; enemyHp: number; round: number }): number {
  return g.win ? 100000 + g.hp * 10 : g.round - g.enemyHp * 10
}

function play(cfg: Config, state0: GameState, strategy: Strategy, policy: Policy, chooser: 'fixed' | 'rollout'): Game {
  let state = state0
  const g: Game = {
    win: false, round: 0, score: 0, hp: 0, enemyHp: 0, damageTaken: 0, bonus: 0, burst: 0, divergences: 0,
    decisions: [], bigRounds: 0, bigNoDivAtStart: 0, bigNoDivAtEnd: 0, exhaustRound: null, leftover: 0,
  }
  let skippedThisRound = -1
  let seenRound = -1
  let guard = 0
  while (state.status === 'playing' && guard < 600) {
    guard++
    if (state.phase !== 'playerTurn') break
    if (state.round !== seenRound) {
      seenRound = state.round
      if (isBig(state)) {
        g.bigRounds++
        if (state.divination.remaining <= 0) g.bigNoDivAtStart++
      }
    }
    const card = pickCard(state, strategy, policy)
    if (card) {
      const other = pickCard(state, strategy, policy === 'aware' ? 'blind' : 'aware')
      if (other && other.uid !== card.uid) g.divergences++
      const r = step(state, { type: 'PLAY_CARD', uid: card.uid }, cfg)
      for (const e of r.events) {
        if (e.t === 'BONUS_TRIGGERED') g.bonus++
        if (e.t === 'RESONANCE_BURST') g.burst++
      }
      state = r.state
      continue
    }
    const canDivine = state.divination.remaining > 0 && !state.divination.usedThisRound && skippedThisRound !== state.round
    if (canDivine) {
      let pick = fixedDivination(state, strategy)
      if (chooser === 'rollout') {
        let best = -Infinity
        for (const option of [2, 1, -1, 0]) {
          const branch =
            option === -1
              ? step(state, { type: 'END_ROUND' }, cfg).state
              : step(state, { type: 'USE_DIVINATION', choiceIndex: option }, cfg).state
          const v = valueOf(play(cfg, branch, strategy, policy, 'fixed'))
          if (v > best) {
            best = v
            pick = option
          }
        }
      }
      g.decisions.push({ round: state.round, big: isBig(state), lethal: isLethal(state), dangerous: isDangerous(state), pick, remainingBefore: state.divination.remaining })
      if (pick === -1) {
        skippedThisRound = state.round
        continue
      }
      state = step(state, { type: 'USE_DIVINATION', choiceIndex: pick }, cfg).state
      if (state.divination.remaining === 0 && g.exhaustRound === null) g.exhaustRound = state.round
      continue
    }
    if (isBig(state) && state.divination.remaining <= 0) g.bigNoDivAtEnd++
    const hpBefore = state.player.hp
    const r = step(state, { type: 'END_ROUND' }, cfg)
    for (const e of r.events) if (e.t === 'RESONANCE_BURST') g.burst++
    state = r.state
    g.damageTaken += Math.max(0, hpBefore - state.player.hp)
  }
  g.win = state.status === 'won'
  g.round = state.round
  g.score = state.score.total
  g.hp = state.player.hp
  g.enemyHp = state.enemy.hp
  g.leftover = state.divination.remaining
  return g
}

// --- 集計 ----------------------------------------------------------------------------

const SEEDS = Number(process.env.P5E_SEEDS ?? 6)
const STRATEGIES: Strategy[] = ['aggressive', 'balanced', 'defensive']
const CHOICES: Array<StakeChoiceId | undefined> = [undefined, 'race', 'tempo']
const NUM = ['通常', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ']
const f0 = (n: number) => n.toFixed(0)
const f1 = (n: number) => n.toFixed(1)
const f2 = (n: number) => n.toFixed(2)
const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0)

type DivStats = {
  decisions: number
  big: number
  bigGuard: number
  small: number
  smallGuard: number
  lethal: number
  lethalGuard: number
  /** 大技のうち「危険」（受けた後のHPが35%未満）な予告と、そうでない予告 */
  bigDanger: number
  bigDangerGuard: number
  bigSafe: number
  bigSafeGuard: number
  picks: [number, number, number]
  skip: number
  /** 加護を使った回のうち予告が小さかった（大技でない）回 */
  guardOnSmall: number
  earlyGuard: number // R1-2 の加護
  lateGuard: number // R5+ の加護
  bigRounds: number
  bigNoDivStart: number
  bigNoDivEnd: number
  exhausted: number
  exhaustRoundSum: number
  leftoverSum: number
  games: number
}
const newDiv = (): DivStats => ({
  decisions: 0, big: 0, bigGuard: 0, small: 0, smallGuard: 0, lethal: 0, lethalGuard: 0, bigDanger: 0, bigDangerGuard: 0, bigSafe: 0, bigSafeGuard: 0, picks: [0, 0, 0], skip: 0,
  guardOnSmall: 0, earlyGuard: 0, lateGuard: 0, bigRounds: 0, bigNoDivStart: 0, bigNoDivEnd: 0, exhausted: 0, exhaustRoundSum: 0, leftoverSum: 0, games: 0,
})
function addDiv(d: DivStats, g: Game) {
  d.games++
  d.bigRounds += g.bigRounds
  d.bigNoDivStart += g.bigNoDivAtStart
  d.bigNoDivEnd += g.bigNoDivAtEnd
  d.leftoverSum += g.leftover
  if (g.exhaustRound !== null) {
    d.exhausted++
    d.exhaustRoundSum += g.exhaustRound
  }
  for (const x of g.decisions) {
    d.decisions++
    if (x.pick === -1) d.skip++
    else d.picks[x.pick]++
    const guard = x.pick === 0
    if (x.big) {
      d.big++
      if (guard) d.bigGuard++
      if (x.dangerous) {
        d.bigDanger++
        if (guard) d.bigDangerGuard++
      } else {
        d.bigSafe++
        if (guard) d.bigSafeGuard++
      }
    } else {
      d.small++
      if (guard) {
        d.smallGuard++
        d.guardOnSmall++
      }
    }
    if (x.lethal) {
      d.lethal++
      if (guard) d.lethalGuard++
    }
    if (guard && x.round <= 2) d.earlyGuard++
    if (guard && x.round >= 5) d.lateGuard++
  }
}
function fmtDiv(d: DivStats): string {
  const guardAll = d.picks[0]
  return (
    `加護 大技${f0(pct(d.bigGuard, d.big))}% 通常${f0(pct(d.smallGuard, d.small))}% 全体${f0(pct(guardAll, d.decisions))}% 致死${f0(pct(d.lethalGuard, d.lethal))}%(n${d.lethal}) 大技かつ危険${f0(pct(d.bigDangerGuard, d.bigDanger))}%(n${d.bigDanger}) 大技だが安全${f0(pct(d.bigSafeGuard, d.bigSafe))}%(n${d.bigSafe})` +
    ` | 配分 加護${f0(pct(d.picks[0], d.decisions))} 導き${f0(pct(d.picks[1], d.decisions))} 天啓${f0(pct(d.picks[2], d.decisions))} 温存${f0(pct(d.skip, d.decisions))}` +
    ` | 加護のうち小予告${f0(pct(d.guardOnSmall, guardAll))}% R1-2 ${f0(pct(d.earlyGuard, guardAll))}% R5+ ${f0(pct(d.lateGuard, guardAll))}%` +
    ` | 使い切り${f0(pct(d.exhausted, d.games))}%(平均R${d.exhausted ? f1(d.exhaustRoundSum / d.exhausted) : '-'}) 余り${f2(d.leftoverSum / d.games)}` +
    ` | 大技R 神託残0：開始時${f0(pct(d.bigNoDivStart, d.bigRounds))}% 終了時${f0(pct(d.bigNoDivEnd, d.bigRounds))}%`
  )
}

type Lens = {
  overall: number
  gods: Record<string, number>
  spread: number
  enemies: Record<string, number>
  round: number
  dmg: number
  score: number
  bonus: number
  burst: number
  div: number
  divStats: DivStats
}

/** STAKE-01 と同じ集計。託宣の統計は balanced（危険なら加護）だけから取る */
function stake01(cfg: Config, stake: number): Lens {
  let W = 0
  let N = 0
  const godBest: Record<string, number> = {}
  const enemy: Record<string, { w: number; n: number }> = {}
  const acc = { round: 0, dmg: 0, score: 0, bonus: 0, burst: 0, div: 0, games: 0 }
  const ds = newDiv()
  for (const god of GODS) {
    const deck = getRecommendedDeck(god.id)
    let best = 0
    for (const choice of stake === 7 ? CHOICES : [undefined]) {
      for (const strategy of STRATEGIES) {
        let w = 0
        let n = 0
        for (const e of ENEMIES) {
          for (let i = 0; i < SEEDS; i++) {
            const s0 = start(cfg, `stake-${stake}-${god.id}-${e.id}-${strategy}-${choice ?? 'p'}-${i}`, god.id, deck, e.id, stake, choice)
            const r = play(cfg, s0, strategy, 'blind', 'fixed')
            n++
            if (r.win) w++
            if (!choice || choice === 'race') {
              const ea = (enemy[e.id] ??= { w: 0, n: 0 })
              ea.n++
              if (r.win) ea.w++
              acc.round += r.round
              acc.dmg += r.damageTaken
              acc.score += r.score
              acc.bonus += r.bonus
              acc.burst += r.burst
              acc.div += r.divergences
              acc.games++
              if (strategy === 'balanced') addDiv(ds, r)
            }
          }
        }
        const rate = (w / n) * 100
        if (rate > best) best = rate
        if (!choice || choice === 'race') {
          W += w
          N += n
        }
      }
    }
    godBest[god.id] = best
  }
  const bestVals = Object.values(godBest)
  return {
    overall: (W / N) * 100,
    gods: godBest,
    spread: Math.max(...bestVals) - Math.min(...bestVals),
    enemies: Object.fromEntries(Object.entries(enemy).map(([k, v]) => [k, (v.w / v.n) * 100])),
    round: acc.round / acc.games,
    dmg: acc.dmg / acc.games,
    score: acc.score / acc.games,
    bonus: acc.bonus / acc.games,
    burst: acc.burst / acc.games,
    div: acc.div / acc.games,
    divStats: ds,
  }
}

/** 予告を読む方策（balanced・aware・rollout） */
function awareLens(cfg: Config, stake: number): Lens {
  let wins = 0
  let games = 0
  const godW: Record<string, { w: number; n: number }> = {}
  const enW: Record<string, { w: number; n: number }> = {}
  const acc = { round: 0, dmg: 0, score: 0, bonus: 0, burst: 0, div: 0 }
  const ds = newDiv()
  for (const god of GODS) {
    const deck = getRecommendedDeck(god.id)
    for (const e of ENEMIES) {
      for (let i = 0; i < SEEDS; i++) {
        const s0 = start(cfg, `lens-${stake}-${god.id}-${e.id}-${i}`, god.id, deck, e.id, stake, stake === 7 ? 'race' : undefined)
        const r = play(cfg, s0, 'balanced', 'aware', 'rollout')
        games++
        if (r.win) wins++
        const gw = (godW[god.id] ??= { w: 0, n: 0 })
        gw.n++
        if (r.win) gw.w++
        const ew = (enW[e.id] ??= { w: 0, n: 0 })
        ew.n++
        if (r.win) ew.w++
        acc.round += r.round
        acc.dmg += r.damageTaken
        acc.score += r.score
        acc.bonus += r.bonus
        acc.burst += r.burst
        acc.div += r.divergences
        addDiv(ds, r)
      }
    }
  }
  const gods = Object.fromEntries(Object.entries(godW).map(([k, v]) => [k, (v.w / v.n) * 100]))
  const vals = Object.values(gods)
  return {
    overall: (wins / games) * 100,
    gods,
    spread: Math.max(...vals) - Math.min(...vals),
    enemies: Object.fromEntries(Object.entries(enW).map(([k, v]) => [k, (v.w / v.n) * 100])),
    round: acc.round / games,
    dmg: acc.dmg / games,
    score: acc.score / games,
    bonus: acc.bonus / games,
    burst: acc.burst / games,
    div: acc.div / games,
    divStats: ds,
  }
}

function fmtLens(l: Lens): string {
  const gods = GODS.map((g) => `${g.nameJa}${f0(l.gods[g.id])}`).join(' ')
  const enemies = ENEMIES.map((e) => `${e.name.slice(0, 2)}${f0(l.enemies[e.id])}`).join(' ')
  return (
    `勝率${f0(l.overall)}% spread${f0(l.spread)} | ${gods} | ${enemies}\n` +
    `      R${f2(l.round)} 被ダメ${f0(l.dmg)} score${f0(l.score)} bonus${f2(l.bonus)} 選択差${f2(l.div)} 神の一撃${f2(l.burst)}\n` +
    `      ${fmtDiv(l.divStats)}`
  )
}

describe.skipIf(!RUN)('Phase 5-E 神階の受け構造の比較', () => {
  it('BASE / A / B / C を固定方策と予告を読む方策の両方で出す', { timeout: 60 * 60 * 1000 }, () => {
    const only = process.env.P5E_CONFIGS?.split(',').map((s) => s.trim())
    const targets = only ? CONFIGS.filter((c) => only.includes(c.name)) : CONFIGS
    const stakes = process.env.P5E_STAKES ? process.env.P5E_STAKES.split(',').map(Number) : [1, 2, 3, 4, 5, 6, 7]
    const out: string[] = []
    for (const cfg of targets) {
      const lines: string[] = [`[${cfg.name}] 神託${cfg.divCount ?? RULES.stakes.divinationCount}回（神階） 加護の効率例外=${cfg.guardExempt} seeds=${SEEDS}`]
      const curve: string[] = []
      const curveAware: string[] = []
      for (const st of stakes) {
        const fixed = stake01(cfg, st)
        const aware = awareLens(cfg, st)
        curve.push(f0(fixed.overall))
        curveAware.push(f0(aware.overall))
        lines.push(`  ${NUM[st]} 固定方策(STAKE-01): ${fmtLens(fixed)}`)
        lines.push(`  ${NUM[st]} 予告を読む方策:      ${fmtLens(aware)}`)
      }
      lines.splice(1, 0, `  STAKE-01 ${stakes.map((s) => NUM[s]).join('/')}: ${curve.join(' / ')}   予告を読む: ${curveAware.join(' / ')}`)
      out.push(lines.join('\n'))
      console.log('\n' + lines.join('\n'))
    }
    expect(out.length).toBe(targets.length)
  })
})

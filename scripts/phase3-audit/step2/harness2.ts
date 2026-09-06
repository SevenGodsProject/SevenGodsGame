/**
 * Phase 3 Step 2 用「ルール層」ハーネス。
 *
 * 本番エンジン（src/core）は一切変更せず、その外側で
 *   - 神Passive（afterPlay / afterEnemyTurn / roundStart / costMod）
 *   - カードの条件付き追加効果（when → Effect[]）
 *   - 既存Effectの数値差し替え（in-process のデータ差し替え、終了時に復元）
 *   - おすすめデッキ統一
 *   - 神階Ⅳ・Ⅴ modifier 是正（RULES.stakes の in-process 差し替え）
 * を差し込み、同じ探索AI／ヒューリスティックAIで比較する。
 *
 * ここでの「Passive」「CondEffect」のデータ構造は、そのまま本番の候補アーキテクチャ
 * （§6 Conditional Effect Architecture）の叩き台でもある。
 */
import { applyAction } from '../../../src/core/engine/reducer'
import { runEnemyTurn, finishRound } from '../../../src/core/engine/round'
import { applyEffects } from '../../../src/core/engine/effects'
import { getFinalScore } from '../../../src/core/engine/score'
import { createRng } from '../../../src/core/rng/seededRandom'
import { OTOMO_FORM_ORDER } from '../../../src/core/types/otomo'
import { RULES } from '../../../src/core/data/rules'
import { getGodDef } from '../../../src/core/data/gods'
import type { CardDefId, CardInstance, Effect, GameEvent, GameState, GodId, EnemyId, StakeChoiceId, Difficulty, GrowthPath } from '../../../src/core/types'
import {
  getCardDef, getRecommendedDeck, getCardPoolForGod, GOD_IDS, cardDamage, cardHeal, cardBlock,
  type Profile, type Strategy, incomingOf,
} from '../harness'
import { CARD_IDS } from '../../../src/core/data/cards'

// ---------------------------------------------------------------------------
// ルール定義の型
// ---------------------------------------------------------------------------
export type Cond =
  | 'blocked'        // このカードを使った後、ブロックが敵の予告以上
  | 'lowHp'          // 使う前のHPが最大の半分以下
  | 'fullHp'         // 使う前のHPが満タン
  | 'enemyDebuffed'  // 使う前に敵ATKが低下している
  | 'resonanceGE4'   // 使う前に共鳴ゲージ4以上
  | 'combo2'         // このラウンド2枚目以降
  | 'enemyCharging'  // 敵が溜め予告中
  | 'enemyBig'       // 敵の予告合計が10以上（必殺・連撃・大技）
  | 'otomoEvolved'   // OTOMOが精霊態でない

export type CondEffect = { when: Cond; effects: Effect[]; textJa: string }

export type Passive = {
  godId: GodId
  nameJa: string
  textJa: string
  /** 表示コスト差（才華）。負なら安くなる */
  costMod?: (state: GameState, card: CardInstance) => number
  /** カード使用後の追加効果 */
  afterPlay?: (ctx: { before: GameState; after: GameState; card: CardInstance; events: GameEvent[] }) => Effect[]
  /** 敵ターン終了直後（ラウンド終了処理の前）の追加効果 */
  afterEnemyTurn?: (state: GameState) => Effect[]
  /** 次ラウンド開始後の状態加工（恵比寿の神力持ち越し等） */
  roundStart?: (ended: GameState, started: GameState) => GameState
}

export type RuleSet = {
  name: string
  passives: Passive[]
  condEffects: Partial<Record<CardDefId, CondEffect[]>>
  /** 既存Effectの差し替え（データ変更のみ） */
  cardOverrides: Partial<Record<CardDefId, Effect[]>>
  deckMode: 'recommended' | 'unified' | 'median'
  stakeFix: 'none' | 'soften' | 'replace'
  /** 実装後の前後比較用：RULES.godIdentityのkill switchを切って「Phase 3導入前」を再現する */
  godIdentityOff?: boolean
  notes?: string
}

export const EMPTY_RULES: RuleSet = { name: 'C0-baseline', passives: [], condEffects: {}, cardOverrides: {}, deckMode: 'recommended', stakeFix: 'none' }

// ---------------------------------------------------------------------------
// in-process データ差し替え（復元付き）
// ---------------------------------------------------------------------------
type Restore = () => void
let active: RuleSet = EMPTY_RULES
let restoreFns: Restore[] = []

export function activate(rules: RuleSet): void {
  deactivate()
  active = rules
  for (const [id, effects] of Object.entries(rules.cardOverrides)) {
    const def = getCardDef(id as CardDefId) as { effects: Effect[] }
    const orig = def.effects
    def.effects = effects!
    restoreFns.push(() => { def.effects = orig })
  }
  if (rules.godIdentityOff) {
    const gi = RULES.godIdentity as unknown as { passivesEnabled: boolean; cardBonusEnabled: boolean }
    const origGi = { p: gi.passivesEnabled, c: gi.cardBonusEnabled }
    gi.passivesEnabled = false
    gi.cardBonusEnabled = false
    restoreFns.push(() => { gi.passivesEnabled = origGi.p; gi.cardBonusEnabled = origGi.c })
  }
  const st = RULES.stakes as unknown as { blockEfficiency: number; healEfficiency: number; lateRoundAtkMul: number }
  const orig = { b: st.blockEfficiency, h: st.healEfficiency, l: st.lateRoundAtkMul }
  if (rules.stakeFix === 'soften') { st.blockEfficiency = 0.85; st.healEfficiency = 0.75 }
  if (rules.stakeFix === 'replace') { st.blockEfficiency = 1; st.healEfficiency = 1; st.lateRoundAtkMul = 1.3 }
  restoreFns.push(() => { st.blockEfficiency = orig.b; st.healEfficiency = orig.h; st.lateRoundAtkMul = orig.l })
}
export function deactivate(): void {
  for (const f of restoreFns.reverse()) f()
  restoreFns = []
  active = EMPTY_RULES
}
export function currentRules(): RuleSet { return active }

// ---------------------------------------------------------------------------
// デッキ
// ---------------------------------------------------------------------------
/** 統一テンプレート：専用4種×2枚＋共通12枚（全神同一）。3AP火力2・2AP火力2・1AP火力1・神託3・共鳴2・防御1・妨害1 */
export const UNIFIED_COMMONS: CardDefId[] = [
  CARD_IDS.allOutStrike, CARD_IDS.warCry, CARD_IDS.heavyBlow, CARD_IDS.flurry, CARD_IDS.quickStrike,
  CARD_IDS.oracle, CARD_IDS.minorOracle, CARD_IDS.prophecy,
  CARD_IDS.resonate, CARD_IDS.kaguraDance,
  CARD_IDS.guard, CARD_IDS.curse,
]
/** 中央値テンプレート：3AP火力を1枚に抑え、現行おすすめデッキの平均的な火力総量（約85）に合わせる */
export const MEDIAN_COMMONS: CardDefId[] = [
  CARD_IDS.allOutStrike, CARD_IDS.heavyBlow, CARD_IDS.flurry, CARD_IDS.quickStrike, CARD_IDS.strike,
  CARD_IDS.oracle, CARD_IDS.minorOracle,
  CARD_IDS.resonate, CARD_IDS.kaguraDance,
  CARD_IDS.guard, CARD_IDS.bastion, CARD_IDS.intimidate,
]
export function getDeckFor(godId: GodId, mode: RuleSet['deckMode']): CardDefId[] {
  if (mode === 'recommended') return getRecommendedDeck(godId)
  const excl = getCardPoolForGod(godId).filter((c) => c.godId === godId).map((c) => c.id)
  return [...excl, ...excl, ...(mode === 'unified' ? UNIFIED_COMMONS : MEDIAN_COMMONS)]
}

// ---------------------------------------------------------------------------
// 条件評価
// ---------------------------------------------------------------------------
function evalCond(when: Cond, before: GameState, after: GameState): boolean {
  switch (when) {
    case 'blocked': return after.player.block >= incomingOf(before) && incomingOf(before) > 0
    case 'lowHp': return before.player.hp <= before.player.maxHp / 2
    case 'fullHp': return before.player.hp >= before.player.maxHp
    case 'enemyDebuffed': return before.enemy.buffs.some((b) => b.stat === 'atk' && b.amount < 0)
    case 'resonanceGE4': return before.resonance.value >= 4
    case 'combo2': return before.cardsPlayedThisRound >= 1
    case 'enemyCharging': return before.enemy.intent?.kind === 'charge'
    case 'enemyBig': return incomingOf(before) >= 10
    case 'otomoEvolved': return after.otomo.form !== 'spirit'
  }
}

function withEffects(state: GameState, effects: Effect[]): { state: GameState; events: GameEvent[] } {
  if (effects.length === 0 || state.status !== 'playing') return { state, events: [] }
  const rng = createRng(state.seed, state.rngCursor)
  const r = applyEffects(state, effects, rng)
  return { state: { ...r.state, rngCursor: state.rngCursor + rng.callCount() }, events: r.events }
}

// ---------------------------------------------------------------------------
// step：ルール層を通した1操作
// ---------------------------------------------------------------------------
export type Action = { type: 'PLAY_CARD'; uid: CardInstance['uid'] } | { type: 'USE_DIVINATION'; choiceIndex: number } | { type: 'END_ROUND' }

export function effectiveCost(state: GameState, card: CardInstance): number {
  let cost = getCardDef(card.defId).cost + (card.costModifier ?? 0)
  for (const p of active.passives) if (p.godId === state.godId && p.costMod) cost += p.costMod(state, card)
  return Math.max(0, cost)
}

export type StepResult = { state: GameState; events: GameEvent[]; unusedBlock?: number; healRequested?: number }

export function step(state: GameState, action: Action): StepResult {
  const passives = active.passives.filter((p) => p.godId === state.godId)
  if (action.type === 'PLAY_CARD') {
    const card = state.hand.find((c) => c.uid === action.uid)!
    const baseCost = getCardDef(card.defId).cost + (card.costModifier ?? 0)
    const eff = effectiveCost(state, card)
    let pre = state
    if (eff < baseCost) pre = { ...state, ap: { ...state.ap, current: state.ap.current + (baseCost - eff) } }
    const r = applyAction(pre, action)
    let next = r.state
    const events = [...r.events]
    const healRequested = cardHeal(card.defId)
    // 条件付き追加効果
    for (const ce of active.condEffects[card.defId] ?? []) {
      if (next.status !== 'playing') break
      if (evalCond(ce.when, state, next)) {
        const w = withEffects(next, ce.effects)
        next = w.state; events.push(...w.events)
      }
    }
    // Passive afterPlay
    for (const p of passives) {
      if (!p.afterPlay || next.status !== 'playing') continue
      const extra = p.afterPlay({ before: state, after: next, card, events: r.events })
      const w = withEffects(next, extra)
      next = w.state; events.push(...w.events)
    }
    return { state: next, events, healRequested }
  }
  if (action.type === 'USE_DIVINATION') {
    const r = applyAction(state, action)
    return { state: r.state, events: r.events }
  }
  // END_ROUND
  if (state.status !== 'playing' || state.phase !== 'playerTurn') throw new Error('今はラウンドを終えられません')
  // ルール層のafterEnemyTurn passiveが無い場合（＝本番engineをそのまま測るPRODモード含む）は
  // engineの `endRound`（applyAction）へ丸ごと委譲する。Phase 3実装後は蒼毘の反撃が
  // engine側の endRound に入っているため、ここで runEnemyTurn/finishRound を直接呼ぶと
  // 本番の挙動を取りこぼす（＝ハーネスが本番と別物になる）。
  if (!passives.some((p) => p.afterEnemyTurn) && !passives.some((p) => p.roundStart)) {
    const r = applyAction(state, { type: 'END_ROUND' })
    return { state: r.state, events: r.events }
  }
  const enemy = runEnemyTurn(state)
  let next = enemy.state
  const events = [...enemy.events]
  const unusedBlock = next.player.block
  for (const p of passives) {
    if (!p.afterEnemyTurn || next.status !== 'playing') continue
    const w = withEffects(next, p.afterEnemyTurn(next))
    next = w.state; events.push(...w.events)
  }
  const rng = createRng(state.seed, next.rngCursor)
  const fin = finishRound(next, rng)
  next = { ...fin.state, rngCursor: next.rngCursor + rng.callCount() }
  events.push(...fin.events)
  if (next.status === 'playing') for (const p of passives) if (p.roundStart) next = p.roundStart(state, next)
  return { state: next, events, unusedBlock }
}

// ---------------------------------------------------------------------------
// 計測
// ---------------------------------------------------------------------------
export type Metrics2 = {
  status: 'won' | 'lost' | 'finished'; round: number; finalScore: number; rawScore: number; playerHp: number
  cardsPlayed: Record<string, number>; cardsSeen: Record<string, number>; cardsPlayedTotal: number
  dmgCard: number; dmgBurst: number; dmgDiv: number; dmgPassive: number
  blockGained: number; blockAbsorbed: number; unusedBlock: number
  healed: number; healRequested: number
  drawExtra: number; apGained: number; apSpent: number
  debuffApplied: number; debuffEffective: number; enemyRawDamage: number
  bursts: number; burstRounds: number[]; otomoFinalForm: number
  divinationUses: { round: number; choice: number }[]
  resonanceGained: number
  condTriggers: number
}

export type RunOpts = {
  seed: string; godId: GodId; enemyId: EnemyId; deck: CardDefId[]; stake?: number; stakeChoice?: StakeChoiceId
  difficulty?: Difficulty; growthPath?: GrowthPath
}
export type Agent2 = (state: GameState) => Exclude<Action, { type: 'END_ROUND' }> | null

function absorb(m: Metrics2, events: GameEvent[], source: 'card' | 'div' | 'round', round: number, cardBaseDamage = 0) {
  let afterBurst = false
  let cardDmgSeen = 0
  for (const ev of events) {
    switch (ev.t) {
      case 'RESONANCE_BURST': afterBurst = true; m.bursts++; m.burstRounds.push(round); break
      case 'DAMAGE_DEALT':
        if (ev.target === 'enemy') {
          if (afterBurst) m.dmgBurst += ev.amount
          else if (source === 'div') m.dmgDiv += ev.amount
          else if (source === 'round') m.dmgPassive += ev.amount
          else {
            // カード本体のダメージ量を超えた分は条件/Passive由来として計上
            if (cardDmgSeen < cardBaseDamage) { const take = Math.min(ev.amount, cardBaseDamage - cardDmgSeen); m.dmgCard += take; cardDmgSeen += take; m.dmgPassive += ev.amount - take }
            else m.dmgPassive += ev.amount
          }
        } else m.blockAbsorbed += ev.blocked
        break
      case 'BLOCK_GAINED': m.blockGained += ev.amount; break
      case 'HEALED': m.healed += ev.amount; break
      case 'CARD_DRAWN': if (source !== 'round') m.drawExtra++; break
      case 'RESONANCE_GAINED': m.resonanceGained += ev.amount; break
      case 'BUFF_APPLIED': if (ev.target === 'enemy' && ev.amount < 0) m.debuffApplied += -ev.amount * ev.rounds; break
      default: break
    }
  }
}

export function runGame2(opts: RunOpts, agent: Agent2): Metrics2 {
  const m: Metrics2 = {
    status: 'finished', round: 0, finalScore: 0, rawScore: 0, playerHp: 0, cardsPlayed: {}, cardsSeen: {}, cardsPlayedTotal: 0,
    dmgCard: 0, dmgBurst: 0, dmgDiv: 0, dmgPassive: 0, blockGained: 0, blockAbsorbed: 0, unusedBlock: 0, healed: 0, healRequested: 0,
    drawExtra: 0, apGained: 0, apSpent: 0, debuffApplied: 0, debuffEffective: 0, enemyRawDamage: 0, bursts: 0, burstRounds: [],
    otomoFinalForm: 0, divinationUses: [], resonanceGained: 0, condTriggers: 0,
  }
  let { state, events } = applyAction(null, {
    type: 'START_GAME', seed: opts.seed, godId: opts.godId, enemyId: opts.enemyId, deck: opts.deck,
    difficulty: opts.difficulty ?? 'normal', otomoGrowthPath: opts.growthPath ?? 'guardian',
    ...(opts.stake ? { stake: opts.stake, ...(opts.stakeChoice ? { stakeChoice: opts.stakeChoice } : {}) } : {}),
  })
  absorb(m, events, 'round', 1)
  for (const c of state.hand) m.cardsSeen[c.defId] = (m.cardsSeen[c.defId] ?? 0) + 1
  let guard = 0
  while (state.status === 'playing' && state.phase === 'playerTurn' && guard++ < 600) {
    const act = agent(state)
    const handBefore = new Set(state.hand.map((c) => c.uid))
    const apBefore = state.ap.current
    if (act && act.type === 'PLAY_CARD') {
      const card = state.hand.find((c) => c.uid === act.uid)!
      const cost = effectiveCost(state, card)
      const r = step(state, act)
      m.cardsPlayed[card.defId] = (m.cardsPlayed[card.defId] ?? 0) + 1
      m.cardsPlayedTotal++
      m.apSpent += cost
      m.apGained += r.state.ap.current - apBefore + cost
      m.healRequested += r.healRequested ?? 0
      absorb(m, r.events, 'card', state.round, cardDamage(card.defId))
      for (const c of r.state.hand) if (!handBefore.has(c.uid)) m.cardsSeen[c.defId] = (m.cardsSeen[c.defId] ?? 0) + 1
      state = r.state
      continue
    }
    if (act && act.type === 'USE_DIVINATION') {
      const r = step(state, act)
      m.divinationUses.push({ round: state.round, choice: act.choiceIndex })
      m.apGained += r.state.ap.current - apBefore
      absorb(m, r.events, 'div', state.round)
      for (const c of r.state.hand) if (!handBefore.has(c.uid)) m.cardsSeen[c.defId] = (m.cardsSeen[c.defId] ?? 0) + 1
      state = r.state
      continue
    }
    const pending = incomingOf(state)
    const r = step(state, { type: 'END_ROUND' })
    for (const ev of r.events) if (ev.t === 'ENEMY_ACTED') { m.enemyRawDamage += pending; m.debuffEffective += Math.max(0, pending - ev.amount) }
    m.unusedBlock += r.unusedBlock ?? 0
    absorb(m, r.events, 'round', state.round)
    for (const c of r.state.hand) if (!handBefore.has(c.uid)) m.cardsSeen[c.defId] = (m.cardsSeen[c.defId] ?? 0) + 1
    state = r.state
  }
  m.status = state.status as Metrics2['status']
  m.round = state.round
  m.rawScore = state.score.total
  m.finalScore = getFinalScore(state.score, state.stake)
  m.playerHp = state.player.hp
  m.otomoFinalForm = OTOMO_FORM_ORDER.indexOf(state.otomo.form)
  return m
}

// ---------------------------------------------------------------------------
// AI（ルール層対応版）
// ---------------------------------------------------------------------------
function evaluate(after: GameState, before: GameState, p: Profile): number {
  if (after.status === 'won') return 100000 + (RULES.totalRounds - before.round) * p.wWinTempo + after.player.hp * p.wPlayerHp
  if (after.status === 'lost') return -100000 + (before.enemy.hp - after.enemy.hp) * p.wEnemyHp * 0.1
  let v = 0
  v += (before.enemy.maxHp - after.enemy.hp) * p.wEnemyHp
  v += after.player.hp * p.wPlayerHp
  v += after.resonance.value * p.wResonance
  v += OTOMO_FORM_ORDER.indexOf(after.otomo.form) * p.wOtomoForm
  v += after.hand.length * p.wHand
  v += after.enemy.buffs.filter((b) => b.stat === 'atk' && b.amount < 0).reduce((s, b) => s + -b.amount * b.remainingRounds, 0) * p.wDebuff
  v += after.player.buffs.filter((b) => b.stat === 'atk' && b.amount > 0).reduce((s, b) => s + b.amount * b.remainingRounds, 0) * p.wBuff
  v += after.ap.current * 0.5 // 持ち越し神力（恵比寿passive）にわずかな価値
  if (after.status === 'finished') v -= 50000
  return v
}

function isCommutative(defId: CardDefId): boolean {
  if (active.condEffects[defId]?.length) return false
  // Phase 3実装後：本番データ側の bonus も順序依存（blocked等は積んだ量で成立が変わる）
  if (getCardDef(defId).bonus) return false
  return getCardDef(defId).effects.every((e) => e.kind === 'damage' || e.kind === 'block' || e.kind === 'heal' || e.kind === 'debuff')
}

type Step = Exclude<Action, { type: 'END_ROUND' }>
export function planRound2(state: GameState, p: Profile, budget = 400): Step[] {
  let best: { score: number; steps: Step[] } = { score: -Infinity, steps: [] }
  let leaves = 0
  // passiveがある神は順序依存が増えるため可換省略を弱める（本番実装済みのGodDef.passiveも見る）
  const hasPassive =
    active.passives.some((x) => x.godId === state.godId) || !!getGodDef(state.godId).passive
  const dfs = (s: GameState, steps: Step[], lastComm: string | null) => {
    if (leaves >= budget) return
    const end = s.status === 'playing' ? step(s, { type: 'END_ROUND' }).state : s
    const score = evaluate(end, state, p)
    leaves++
    if (score > best.score) best = { score, steps: [...steps] }
    if (s.status !== 'playing') return
    const affordable = s.hand.filter((c) => effectiveCost(s, c) <= s.ap.current)
    affordable.sort((a, b) => cardDamage(b.defId) / Math.max(1, effectiveCost(s, b)) - cardDamage(a.defId) / Math.max(1, effectiveCost(s, a)))
    for (const c of affordable) {
      if (leaves >= budget) return
      const comm = !hasPassive && isCommutative(c.defId)
      if (comm && lastComm !== null && c.uid <= lastComm) continue
      const r = step(s, { type: 'PLAY_CARD', uid: c.uid })
      steps.push({ type: 'PLAY_CARD', uid: c.uid })
      dfs(r.state, steps, comm ? c.uid : lastComm)
      steps.pop()
    }
    if (s.divination.remaining > 0 && !s.divination.usedThisRound) {
      for (const choice of [0, 1, 2]) {
        if (leaves >= budget) return
        const r = step(s, { type: 'USE_DIVINATION', choiceIndex: choice })
        steps.push({ type: 'USE_DIVINATION', choiceIndex: choice })
        dfs(r.state, steps, lastComm)
        steps.pop()
      }
    }
  }
  dfs(state, [], null)
  return best.steps
}

export function searchAgent2(p: Profile, budget = 400): Agent2 {
  let plan: Step[] = []
  let planRoundNo = -1
  return (state) => {
    if (state.round !== planRoundNo) { plan = planRound2(state, p, budget); planRoundNo = state.round }
    const next = plan.shift()
    if (!next) return null
    if (next.type === 'PLAY_CARD' && !state.hand.some((c) => c.uid === next.uid && effectiveCost(state, c) <= state.ap.current)) {
      plan = planRound2(state, p, budget)
      return plan.shift() ?? null
    }
    return next
  }
}

/** 既存3戦略ヒューリスティック（effectiveCost対応・Step 1と同ロジック） */
export function heuristicAgent2(strategy: Strategy): Agent2 {
  const util = (c: CardInstance) => getCardDef(c.defId).effects.reduce((s, e) => s + (e.kind === 'draw' || e.kind === 'gainAp' ? e.amount * 4 : e.kind === 'resonance' ? e.amount * 2 : (e.kind === 'buff' && e.target === 'self') || (e.kind === 'debuff' && e.target === 'enemy') ? e.amount * e.rounds : 0), 0)
  return (state) => {
    const affordable = state.hand.filter((c) => effectiveCost(state, c) <= state.ap.current)
    const dangerous = state.player.hp - Math.max(0, incomingOf(state) - state.player.block) < state.player.maxHp * 0.35
    if (affordable.length) {
      const guarded = state.player.block >= incomingOf(state)
      if (strategy === 'defensive' || (strategy === 'balanced' && dangerous)) {
        if (!guarded) { const b = affordable.filter((c) => cardBlock(c.defId) > 0).sort((x, y) => cardBlock(y.defId) - cardBlock(x.defId))[0]; if (b) return { type: 'PLAY_CARD', uid: b.uid } }
        const h = affordable.filter((c) => cardHeal(c.defId) > 0).sort((x, y) => cardHeal(y.defId) - cardHeal(x.defId))[0]
        if (h && state.player.hp < state.player.maxHp * 0.6) return { type: 'PLAY_CARD', uid: h.uid }
      }
      const d = affordable.filter((c) => cardDamage(c.defId) > 0).sort((x, y) => cardDamage(y.defId) / Math.max(1, effectiveCost(state, y)) - cardDamage(x.defId) / Math.max(1, effectiveCost(state, x)))[0]
      if (d) return { type: 'PLAY_CARD', uid: d.uid }
      const u = affordable.filter((c) => util(c) > 0).sort((x, y) => util(y) / Math.max(1, effectiveCost(state, y)) - util(x) / Math.max(1, effectiveCost(state, x)))[0]
      if (u) return { type: 'PLAY_CARD', uid: u.uid }
      return { type: 'PLAY_CARD', uid: affordable.sort((x, y) => effectiveCost(state, y) - effectiveCost(state, x))[0].uid }
    }
    if (state.divination.remaining > 0 && !state.divination.usedThisRound) return { type: 'USE_DIVINATION', choiceIndex: strategy === 'defensive' || (strategy === 'balanced' && dangerous) ? 0 : 2 }
    return null
  }
}

export { GOD_IDS }

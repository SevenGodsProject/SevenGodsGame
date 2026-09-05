/**
 * Phase 3 Step 1 監査用 共通ハーネス（本番コード非依存の分析専用。src/ は import のみ）。
 *
 * - runGame: 実エンジン applyAction で1試合を回し、イベントから指標を抽出する
 * - heuristic strategies: 既存 balanceSim.test.ts と同じ3戦略AI（互換性のため移植）
 * - search AI: 1ラウンド内の全手順を探索し、敵ターンまで先読みして評価する
 *   「プロファイル（価値関数）」型AI。プロファイル＝プレイスタイル。
 */
import fs from 'node:fs'
import path from 'node:path'
import { GODS, GOD_IDS } from '../../src/core/data/gods'
import { ENEMIES, ENEMY_IDS } from '../../src/core/data/enemies'
import { getCardDef, ALL_CARDS } from '../../src/core/data/cards'
import { getRecommendedDeck, getCardPoolForGod } from '../../src/core/data/deckBuilder'
import { applyAction } from '../../src/core/engine/reducer'
import { getFinalScore } from '../../src/core/engine/score'
import { RULES } from '../../src/core/data/rules'
import { OTOMO_FORM_ORDER } from '../../src/core/types/otomo'
import type {
  CardDefId,
  CardInstance,
  Difficulty,
  EnemyId,
  GameEvent,
  GameState,
  GodId,
  GrowthPath,
  StakeChoiceId,
  Effect,
} from '../../src/core/types'

export { GODS, GOD_IDS, ENEMIES, ENEMY_IDS, ALL_CARDS, getCardDef, getRecommendedDeck, getCardPoolForGod, RULES }

export const OUT_DIR = path.resolve(__dirname, 'out')
export function writeOut(name: string, content: string | object): void {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const body = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
  fs.writeFileSync(path.join(OUT_DIR, name), body, 'utf8')
}

export const GOD_ORDER: GodId[] = [
  GOD_IDS.ebisu, GOD_IDS.taiyo, GOD_IDS.sobi, GOD_IDS.saika, GOD_IDS.juraku, GOD_IDS.fukuei, GOD_IDS.shouren,
]
export const GOD_NAME: Record<string, string> = Object.fromEntries(GODS.map((g) => [g.id, g.nameJa]))
export const ENEMY_ORDER: EnemyId[] = ENEMIES.map((e) => e.id)
export const ENEMY_NAME: Record<string, string> = Object.fromEntries(ENEMIES.map((e) => [e.id, e.name]))

// ---------------------------------------------------------------------------
// カード効果の静的ヘルパー
// ---------------------------------------------------------------------------
export function effSum(effects: Effect[], pred: (e: Effect) => boolean, amt: (e: Effect) => number): number {
  return effects.filter(pred).reduce((s, e) => s + amt(e), 0)
}
const A = (e: Effect) => ('amount' in e ? e.amount : 0)
export const cardDamage = (id: CardDefId) => effSum(getCardDef(id).effects, (e) => e.kind === 'damage' && e.target === 'enemy', A)
export const cardSelfDamage = (id: CardDefId) => effSum(getCardDef(id).effects, (e) => e.kind === 'damage' && e.target === 'self', A)
export const cardBlock = (id: CardDefId) => effSum(getCardDef(id).effects, (e) => e.kind === 'block', A)
export const cardHeal = (id: CardDefId) => effSum(getCardDef(id).effects, (e) => e.kind === 'heal', A)
export const cardResonance = (id: CardDefId) => effSum(getCardDef(id).effects, (e) => e.kind === 'resonance', A)
export const cardDraw = (id: CardDefId) => effSum(getCardDef(id).effects, (e) => e.kind === 'draw', A)
export const cardGainAp = (id: CardDefId) => effSum(getCardDef(id).effects, (e) => e.kind === 'gainAp', A)
export const cardDebuff = (id: CardDefId) =>
  effSum(getCardDef(id).effects, (e) => e.kind === 'debuff' && e.target === 'enemy', (e) => (e.kind === 'debuff' ? e.amount * e.rounds : 0))
export const cardBuff = (id: CardDefId) =>
  effSum(getCardDef(id).effects, (e) => e.kind === 'buff' && e.target === 'self', (e) => (e.kind === 'buff' ? e.amount * e.rounds : 0))
export const cardCost = (c: CardInstance) => getCardDef(c.defId).cost + (c.costModifier ?? 0)

// ---------------------------------------------------------------------------
// 1試合の計測結果
// ---------------------------------------------------------------------------
export type GameMetrics = {
  status: 'won' | 'lost' | 'finished'
  round: number
  rawScore: number
  finalScore: number
  playerHp: number
  enemyHpRatio: number
  cardsPlayed: Record<string, number>
  /** 手札に来た回数（使用率＝played/seen の分母） */
  cardsSeen: Record<string, number>
  cardsPlayedTotal: number
  dmgCard: number
  dmgBurst: number
  dmgDivination: number
  dmgTotal: number
  selfDamage: number
  blockGained: number
  blockAbsorbed: number
  healed: number
  drawExtra: number
  apGained: number
  apGranted: number
  apSpent: number
  debuffApplied: number
  /** 敵予告値−実行値 の合計（デバフで実際に削った量） */
  debuffEffective: number
  enemyRawDamage: number
  bursts: number
  burstRounds: number[]
  otomoFinalForm: number
  otomoEvolveRounds: number[]
  divinationUses: { round: number; choice: number }[]
  resonanceGainedTotal: number
}

export type RunOptions = {
  seed: string
  godId: GodId
  enemyId: EnemyId
  deck: CardDefId[]
  stake?: number
  stakeChoice?: StakeChoiceId
  difficulty?: Difficulty
  growthPath?: GrowthPath
  bonusCopies?: Partial<Record<CardDefId, number>>
}

/** ラウンド内のプレイヤーの行動を決めるAI。null を返すとラウンド終了 */
export type Agent = (state: GameState) => { type: 'PLAY_CARD'; uid: CardInstance['uid'] } | { type: 'USE_DIVINATION'; choiceIndex: number } | null

export function newMetrics(): GameMetrics {
  return {
    status: 'finished', round: 0, rawScore: 0, finalScore: 0, playerHp: 0, enemyHpRatio: 1,
    cardsPlayed: {}, cardsSeen: {}, cardsPlayedTotal: 0,
    dmgCard: 0, dmgBurst: 0, dmgDivination: 0, dmgTotal: 0, selfDamage: 0,
    blockGained: 0, blockAbsorbed: 0, healed: 0, drawExtra: 0, apGained: 0, apGranted: 0, apSpent: 0,
    debuffApplied: 0, debuffEffective: 0, enemyRawDamage: 0,
    bursts: 0, burstRounds: [], otomoFinalForm: 0, otomoEvolveRounds: [], divinationUses: [], resonanceGainedTotal: 0,
  }
}

function absorbEvents(m: GameMetrics, events: GameEvent[], source: 'card' | 'div' | 'round', round: number) {
  let afterBurst = false
  for (const ev of events) {
    switch (ev.t) {
      case 'RESONANCE_BURST':
        afterBurst = true
        m.bursts++
        m.burstRounds.push(round)
        break
      case 'OTOMO_EVOLVED':
        m.otomoEvolveRounds.push(round)
        break
      case 'DAMAGE_DEALT':
        if (ev.target === 'enemy') {
          m.dmgTotal += ev.amount
          if (afterBurst) m.dmgBurst += ev.amount
          else if (source === 'div') m.dmgDivination += ev.amount
          else m.dmgCard += ev.amount
        } else {
          m.blockAbsorbed += ev.blocked
          if (source === 'round') { /* enemy hit */ } else m.selfDamage += ev.amount
        }
        break
      case 'BLOCK_GAINED':
        m.blockGained += ev.amount
        break
      case 'HEALED':
        m.healed += ev.amount
        break
      case 'CARD_DRAWN':
        if (source !== 'round') m.drawExtra++
        break
      case 'RESONANCE_GAINED':
        m.resonanceGainedTotal += ev.amount
        break
      case 'BUFF_APPLIED':
        if (ev.target === 'enemy' && ev.amount < 0) m.debuffApplied += -ev.amount * ev.rounds
        break
      case 'ENEMY_INTENT_SET':
        break
      case 'ENEMY_ACTED':
        break
      case 'ROUND_STARTED':
        m.apGranted += ev.apGranted
        break
      case 'DIVINATION_USED':
        break
      default:
        break
    }
  }
}

export function runGame(opts: RunOptions, agent: Agent): GameMetrics {
  const m = newMetrics()
  let { state, events } = applyAction(null, {
    type: 'START_GAME',
    seed: opts.seed,
    godId: opts.godId,
    enemyId: opts.enemyId,
    deck: opts.deck,
    difficulty: opts.difficulty ?? 'normal',
    otomoGrowthPath: opts.growthPath ?? 'guardian',
    ...(opts.bonusCopies ? { bonusCopies: opts.bonusCopies } : {}),
    ...(opts.stake ? { stake: opts.stake, ...(opts.stakeChoice ? { stakeChoice: opts.stakeChoice } : {}) } : {}),
  })
  absorbEvents(m, events, 'round', 1)
  for (const c of state.hand) m.cardsSeen[c.defId] = (m.cardsSeen[c.defId] ?? 0) + 1
  let pendingIntent = 0

  let guard = 0
  while (state.status === 'playing' && guard < 600) {
    guard++
    if (state.phase !== 'playerTurn') break
    const intent = state.enemy.intent
    pendingIntent = intent
      ? intent.kind === 'attack' || intent.kind === 'special'
        ? intent.amount
        : intent.kind === 'multiAttack'
          ? intent.hits.reduce((s, h) => s + h, 0)
          : 0
      : 0
    const act = agent(state)
    if (act && act.type === 'PLAY_CARD') {
      const card = state.hand.find((c) => c.uid === act.uid)!
      const cost = cardCost(card)
      const apBefore = state.ap.current
      const handBefore = new Set(state.hand.map((c) => c.uid))
      const r = applyAction(state, act)
      m.cardsPlayed[card.defId] = (m.cardsPlayed[card.defId] ?? 0) + 1
      m.cardsPlayedTotal++
      m.apSpent += cost
      m.apGained += r.state.ap.current - apBefore + cost
      for (const c of r.state.hand) if (!handBefore.has(c.uid)) m.cardsSeen[c.defId] = (m.cardsSeen[c.defId] ?? 0) + 1
      absorbEvents(m, r.events, 'card', state.round)
      state = r.state
      continue
    }
    if (act && act.type === 'USE_DIVINATION') {
      const apBefore = state.ap.current
      const handBefore = new Set(state.hand.map((c) => c.uid))
      const r = applyAction(state, act)
      m.divinationUses.push({ round: state.round, choice: act.choiceIndex })
      m.apGained += r.state.ap.current - apBefore
      for (const c of r.state.hand) if (!handBefore.has(c.uid)) m.cardsSeen[c.defId] = (m.cardsSeen[c.defId] ?? 0) + 1
      absorbEvents(m, r.events, 'div', state.round)
      state = r.state
      continue
    }
    // END_ROUND
    const round = state.round
    const handBefore = new Set(state.hand.map((c) => c.uid))
    const r = applyAction(state, { type: 'END_ROUND' })
    for (const ev of r.events) {
      if (ev.t === 'ENEMY_ACTED') {
        m.enemyRawDamage += pendingIntent
        m.debuffEffective += Math.max(0, pendingIntent - ev.amount)
      }
    }
    for (const c of r.state.hand) if (!handBefore.has(c.uid)) m.cardsSeen[c.defId] = (m.cardsSeen[c.defId] ?? 0) + 1
    absorbEvents(m, r.events, 'round', round)
    state = r.state
  }

  m.status = state.status as GameMetrics['status']
  m.round = state.round
  m.rawScore = state.score.total
  m.finalScore = getFinalScore(state.score, state.stake)
  m.playerHp = state.player.hp
  m.enemyHpRatio = state.enemy.hp / state.enemy.maxHp
  m.otomoFinalForm = OTOMO_FORM_ORDER.indexOf(state.otomo.form)
  return m
}

// ---------------------------------------------------------------------------
// 既存 balanceSim.test.ts 互換のヒューリスティック3戦略（移植・同ロジック）
// ---------------------------------------------------------------------------
export type Strategy = 'balanced' | 'aggressive' | 'defensive'

function utilityOf(c: CardInstance): number {
  return getCardDef(c.defId).effects.reduce((sum, e) => {
    switch (e.kind) {
      case 'draw': return sum + e.amount * 4
      case 'gainAp': return sum + e.amount * 4
      case 'resonance': return sum + e.amount * 2
      case 'buff': return sum + (e.target === 'self' ? e.amount * e.rounds : 0)
      case 'debuff': return sum + (e.target === 'enemy' ? e.amount * e.rounds : 0)
      default: return sum
    }
  }, 0)
}
export function incomingOf(state: GameState): number {
  const i = state.enemy.intent
  if (!i) return 0
  if (i.kind === 'attack' || i.kind === 'special') return i.amount
  if (i.kind === 'multiAttack') return i.hits.reduce((s, h) => s + h, 0)
  return 0
}
function isDangerous(state: GameState): boolean {
  const loss = Math.max(0, incomingOf(state) - state.player.block)
  return state.player.hp - loss < state.player.maxHp * 0.35
}
export function heuristicAgent(strategy: Strategy): Agent {
  return (state) => {
    const affordable = state.hand.filter((c) => cardCost(c) <= state.ap.current)
    if (affordable.length > 0) {
      const dangerous = isDangerous(state)
      const alreadyGuarded = state.player.block >= incomingOf(state)
      if (strategy === 'defensive' || (strategy === 'balanced' && dangerous)) {
        if (!alreadyGuarded) {
          const b = affordable.filter((c) => cardBlock(c.defId) > 0).sort((x, y) => cardBlock(y.defId) - cardBlock(x.defId))[0]
          if (b) return { type: 'PLAY_CARD', uid: b.uid }
        }
        const h = affordable.filter((c) => cardHeal(c.defId) > 0).sort((x, y) => cardHeal(y.defId) - cardHeal(x.defId))[0]
        if (h && state.player.hp < state.player.maxHp * 0.6) return { type: 'PLAY_CARD', uid: h.uid }
      }
      const d = affordable
        .filter((c) => cardDamage(c.defId) > 0)
        .sort((x, y) => cardDamage(y.defId) / cardCost(y) - cardDamage(x.defId) / cardCost(x))[0]
      if (d) return { type: 'PLAY_CARD', uid: d.uid }
      const u = affordable.filter((c) => utilityOf(c) > 0).sort((x, y) => utilityOf(y) / cardCost(y) - utilityOf(x) / cardCost(x))[0]
      if (u) return { type: 'PLAY_CARD', uid: u.uid }
      const any = affordable.sort((x, y) => cardCost(y) - cardCost(x))[0]
      return { type: 'PLAY_CARD', uid: any.uid }
    }
    if (state.divination.remaining > 0 && !state.divination.usedThisRound) {
      const choice = strategy === 'defensive' || (strategy === 'balanced' && isDangerous(state)) ? 0 : 2
      return { type: 'USE_DIVINATION', choiceIndex: choice }
    }
    return null
  }
}

// ---------------------------------------------------------------------------
// 探索AI：1ラウンド内の手順を全探索（予算付き）→ 敵ターンまで先読み → 価値関数で評価
// ---------------------------------------------------------------------------
export type Profile = {
  name: string
  /** 敵HP減少 1あたり */
  wEnemyHp: number
  /** 自HP 1あたり（敵ターン後） */
  wPlayerHp: number
  /** 敵ターン後に残る共鳴ゲージ 1あたり */
  wResonance: number
  /** OTOMO形態 1段あたり */
  wOtomoForm: number
  /** 次ラウンド開始時の手札1枚あたり */
  wHand: number
  /** 敵に残っている（次R以降有効な）デバフ量 1あたり */
  wDebuff: number
  /** 自分に残っている atk バフ量 1あたり */
  wBuff: number
  /** 勝利ボーナス（早期撃破ほど加点：残ラウンド×この値） */
  wWinTempo: number
  /** 託宣1回を温存する価値 */
  wDivinationLeft: number
}

export const PROFILES: Record<string, Profile> = {
  // 速攻：敵HPを削ることが最優先。自HPは死なない範囲で軽視
  rush: { name: 'rush', wEnemyHp: 3.0, wPlayerHp: 0.6, wResonance: 0.3, wOtomoForm: 1, wHand: 0.5, wDebuff: 0.2, wBuff: 0.5, wWinTempo: 40, wDivinationLeft: 0 },
  // 均衡：両方見る
  balanced: { name: 'balanced', wEnemyHp: 1.5, wPlayerHp: 1.5, wResonance: 0.6, wOtomoForm: 2, wHand: 0.8, wDebuff: 0.5, wBuff: 0.5, wWinTempo: 25, wDivinationLeft: 0 },
  // 要塞：自HP維持を最優先し、余力で削る
  fortress: { name: 'fortress', wEnemyHp: 0.8, wPlayerHp: 3.0, wResonance: 0.5, wOtomoForm: 2, wHand: 0.8, wDebuff: 1.0, wBuff: 0.2, wWinTempo: 10, wDivinationLeft: 0 },
  // 共鳴：ゲージとOTOMO成長を重視（BURST志向）
  resonance: { name: 'resonance', wEnemyHp: 1.2, wPlayerHp: 1.2, wResonance: 3.0, wOtomoForm: 12, wHand: 0.8, wDebuff: 0.3, wBuff: 0.3, wWinTempo: 20, wDivinationLeft: 0 },
  // 手数/エンジン：手札とAP資源を増やして後半に爆発
  engine: { name: 'engine', wEnemyHp: 1.2, wPlayerHp: 1.2, wResonance: 0.6, wOtomoForm: 2, wHand: 4.0, wDebuff: 0.3, wBuff: 1.5, wWinTempo: 20, wDivinationLeft: 0 },
  // 制圧：敵のATKを削る（デバフ）ことを重視
  control: { name: 'control', wEnemyHp: 1.2, wPlayerHp: 1.8, wResonance: 0.5, wOtomoForm: 2, wHand: 0.8, wDebuff: 3.0, wBuff: 0.2, wWinTempo: 15, wDivinationLeft: 0 },
}

function evaluate(after: GameState, before: GameState, p: Profile): number {
  if (after.status === 'won') {
    const remaining = RULES.totalRounds - before.round
    return 100000 + remaining * p.wWinTempo + after.player.hp * p.wPlayerHp
  }
  if (after.status === 'lost') return -100000 + (before.enemy.hp - after.enemy.hp) * p.wEnemyHp * 0.1
  let v = 0
  v += (before.enemy.maxHp - after.enemy.hp) * p.wEnemyHp
  v += after.player.hp * p.wPlayerHp
  v += after.resonance.value * p.wResonance
  v += OTOMO_FORM_ORDER.indexOf(after.otomo.form) * p.wOtomoForm
  v += after.hand.length * p.wHand
  v += after.enemy.buffs.filter((b) => b.stat === 'atk' && b.amount < 0).reduce((s, b) => s + -b.amount * b.remainingRounds, 0) * p.wDebuff
  v += after.player.buffs.filter((b) => b.stat === 'atk' && b.amount > 0).reduce((s, b) => s + b.amount * b.remainingRounds, 0) * p.wBuff
  v += after.divination.remaining * p.wDivinationLeft
  // 未撃破終了はほぼ敗北扱いだが、敵残HPで差を付ける
  if (after.status === 'finished') v -= 50000
  return v
}

type Step = { type: 'PLAY_CARD'; uid: CardInstance['uid'] } | { type: 'USE_DIVINATION'; choiceIndex: number }

function isCommutative(defId: CardDefId): boolean {
  // 順序に依存しない効果だけを持つカード：damage / block / heal / debuff / 自傷
  return getCardDef(defId).effects.every((e) => e.kind === 'damage' || e.kind === 'block' || e.kind === 'heal' || e.kind === 'debuff')
}

/**
 * 探索AI。1ラウンドの手順（カード列＋託宣）を予算内で探索し、END_ROUND 後の状態を評価する。
 * 返すのは「このラウンドの最良手順」全体。runGame との接続は searchAgent で行う。
 */
export function planRound(state: GameState, p: Profile, budget = 1500): Step[] {
  let best: { score: number; steps: Step[] } = { score: -Infinity, steps: [] }
  let leaves = 0

  const dfs = (s: GameState, steps: Step[], lastCommUid: string | null) => {
    if (leaves >= budget) return
    // 終端評価（ここでラウンドを終える）。既に決着していれば END_ROUND は呼べないので直接評価
    const end = s.status === 'playing' ? applyAction(s, { type: 'END_ROUND' }).state : s
    const score = evaluate(end, state, p)
    leaves++
    if (score > best.score) best = { score, steps: [...steps] }
    if (s.status !== 'playing') return

    const affordable = s.hand.filter((c) => cardCost(c) <= s.ap.current)
    // 枝の順序：ダメージ効率の高いものから（予算切れ時の質を担保）
    affordable.sort((a, b) => cardDamage(b.defId) / Math.max(1, cardCost(b)) - cardDamage(a.defId) / Math.max(1, cardCost(a)))
    for (const c of affordable) {
      if (leaves >= budget) return
      const comm = isCommutative(c.defId)
      if (comm && lastCommUid !== null && c.uid <= lastCommUid) continue // 可換カードは uid 昇順に固定
      const r = applyAction(s, { type: 'PLAY_CARD', uid: c.uid })
      steps.push({ type: 'PLAY_CARD', uid: c.uid })
      dfs(r.state, steps, comm ? c.uid : lastCommUid)
      steps.pop()
    }
    if (s.divination.remaining > 0 && !s.divination.usedThisRound) {
      for (const choice of [0, 1, 2]) {
        if (leaves >= budget) return
        const r = applyAction(s, { type: 'USE_DIVINATION', choiceIndex: choice })
        steps.push({ type: 'USE_DIVINATION', choiceIndex: choice })
        dfs(r.state, steps, lastCommUid)
        steps.pop()
      }
    }
  }
  dfs(state, [], null)
  return best.steps
}

/** planRound を runGame の Agent に接続する（ラウンドごとに計画→順に実行） */
export function searchAgent(p: Profile, budget = 1500): Agent {
  let plan: Step[] = []
  let planRound_ = -1
  let planKey = ''
  return (state) => {
    const key = `${state.round}:${state.cardsPlayedThisRound}:${state.divination.usedThisRound}:${state.hand.length}`
    if (state.round !== planRound_ || plan.length === 0 || planKey === '') {
      if (state.round !== planRound_) {
        plan = planRound(state, p, budget)
        planRound_ = state.round
        planKey = key
      }
    }
    const next = plan.shift()
    if (!next) return null
    // 安全確認（計画時と一致しない場合は再計画）
    if (next.type === 'PLAY_CARD' && !state.hand.some((c) => c.uid === next.uid && cardCost(c) <= state.ap.current)) {
      plan = planRound(state, p, budget)
      const n2 = plan.shift()
      return n2 ?? null
    }
    return next
  }
}

// ---------------------------------------------------------------------------
// 集計ユーティリティ
// ---------------------------------------------------------------------------
export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
export const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`
export const r1 = (x: number) => Math.round(x * 10) / 10
export const r2 = (x: number) => Math.round(x * 100) / 100

export type Agg = {
  n: number
  win: number
  lost: number
  finished: number
  score: number[]
  winScore: number[]
  winRound: number[]
  bursts: number[]
  firstBurstRound: number[]
  dmgCard: number[]
  dmgBurst: number[]
  dmgDiv: number[]
  block: number[]
  blockAbsorbed: number[]
  heal: number[]
  draw: number[]
  apGained: number[]
  debuffApplied: number[]
  debuffEff: number[]
  enemyRaw: number[]
  otomoForm: number[]
  divUses: number[]
  divRounds: number[]
  cardsPlayed: number[]
  playedBy: Record<string, number>
  seenBy: Record<string, number>
}
export function newAgg(): Agg {
  return {
    n: 0, win: 0, lost: 0, finished: 0, score: [], winScore: [], winRound: [], bursts: [], firstBurstRound: [],
    dmgCard: [], dmgBurst: [], dmgDiv: [], block: [], blockAbsorbed: [], heal: [], draw: [], apGained: [],
    debuffApplied: [], debuffEff: [], enemyRaw: [], otomoForm: [], divUses: [], divRounds: [], cardsPlayed: [],
    playedBy: {}, seenBy: {},
  }
}
export function addAgg(a: Agg, m: GameMetrics): void {
  a.n++
  if (m.status === 'won') { a.win++; a.winScore.push(m.finalScore); a.winRound.push(m.round) }
  else if (m.status === 'lost') a.lost++
  else a.finished++
  a.score.push(m.finalScore)
  a.bursts.push(m.bursts)
  if (m.burstRounds.length) a.firstBurstRound.push(m.burstRounds[0])
  a.dmgCard.push(m.dmgCard); a.dmgBurst.push(m.dmgBurst); a.dmgDiv.push(m.dmgDivination)
  a.block.push(m.blockGained); a.blockAbsorbed.push(m.blockAbsorbed); a.heal.push(m.healed)
  a.draw.push(m.drawExtra); a.apGained.push(m.apGained)
  a.debuffApplied.push(m.debuffApplied); a.debuffEff.push(m.debuffEffective); a.enemyRaw.push(m.enemyRawDamage)
  a.otomoForm.push(m.otomoFinalForm)
  a.divUses.push(m.divinationUses.length)
  for (const d of m.divinationUses) a.divRounds.push(d.round)
  a.cardsPlayed.push(m.cardsPlayedTotal)
  for (const [k, v] of Object.entries(m.cardsPlayed)) a.playedBy[k] = (a.playedBy[k] ?? 0) + v
  for (const [k, v] of Object.entries(m.cardsSeen)) a.seenBy[k] = (a.seenBy[k] ?? 0) + v
}
export function summarizeAgg(a: Agg) {
  return {
    n: a.n,
    winRate: r1((a.win / a.n) * 100),
    lostRate: r1((a.lost / a.n) * 100),
    finishedRate: r1((a.finished / a.n) * 100),
    avgScore: Math.round(avg(a.score)),
    avgWinScore: Math.round(avg(a.winScore)),
    avgWinRound: r2(avg(a.winRound)),
    burstsPerGame: r2(avg(a.bursts)),
    burstReach: r1((a.firstBurstRound.length / a.n) * 100),
    avgFirstBurstRound: r2(avg(a.firstBurstRound)),
    dmgCard: r1(avg(a.dmgCard)),
    dmgBurst: r1(avg(a.dmgBurst)),
    dmgDiv: r1(avg(a.dmgDiv)),
    block: r1(avg(a.block)),
    blockAbsorbed: r1(avg(a.blockAbsorbed)),
    heal: r1(avg(a.heal)),
    drawExtra: r2(avg(a.draw)),
    apGained: r2(avg(a.apGained)),
    debuffApplied: r1(avg(a.debuffApplied)),
    debuffEff: r1(avg(a.debuffEff)),
    enemyRaw: r1(avg(a.enemyRaw)),
    otomoForm: r2(avg(a.otomoForm)),
    divUses: r2(avg(a.divUses)),
    avgDivRound: r2(avg(a.divRounds)),
    cardsPlayed: r2(avg(a.cardsPlayed)),
  }
}
export type AggSummary = ReturnType<typeof summarizeAgg>

export function mdTable(headers: string[], rows: (string | number)[][]): string {
  const line = (cells: (string | number)[]) => `| ${cells.join(' | ')} |`
  return [line(headers), line(headers.map(() => '---')), ...rows.map(line)].join('\n')
}

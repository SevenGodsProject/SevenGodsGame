/**
 * Phase 4.0 Daily Ranking Competitive Gate — 共通ハーネス（分析専用。src/ は import のみ）
 *
 * ★production parity の作り方★
 * 本ハーネスは Daily の開始条件を自前で組み立てない。**本番UIが呼ぶのと同じ
 * `resolveDailyStart(dateKey)`（src/hooks/startDaily.ts）をそのまま import** し、
 * その戻り値（mode / dailyKey / enemyId / seed / difficulty / modifier）を
 * `START_GAME` へ渡す。したがって「Daily条件の再現」は模倣ではなく同一実行であり、
 * 敵の週次巡回・共有seed・神域強化倍率がズレることは構造的に起こらない。
 * この不変条件は `parity.audit.ts` が機械的に検証する。
 *
 * 通常モードの神階0の結果を Daily の代用にはしない（CEO指示 Step 2）。
 *
 * `npm test` の対象外（拡張子 `.audit.ts`・専用config）。本番コードは変更しない。
 */
import fs from 'node:fs'
import path from 'node:path'
import { applyAction } from '../../src/core/engine/reducer'
import { getFinalScore } from '../../src/core/engine/score'
import { createRng } from '../../src/core/rng/seededRandom'
import { dailyBossFor } from '../../src/core/data/dailyBoss'
import { resolveDailyStart } from '../../src/hooks/startDaily'
import { getCardDef } from '../../src/core/data/cards'
import { getCardPoolForGod, getRecommendedDeck, validateDeck } from '../../src/core/data/deckBuilder'
import { RULES } from '../../src/core/data/rules'
import { GODS, GOD_IDS } from '../../src/core/data/gods'
import { ENEMIES } from '../../src/core/data/enemies'
import type {
  CardDefId,
  CardInstance,
  EnemyId,
  GameState,
  GodId,
  GrowthPath,
} from '../../src/core/types'

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
export const ENEMY_NAME: Record<string, string> = Object.fromEntries(ENEMIES.map((e) => [e.id, e.name]))
export const GROWTH_PATHS: GrowthPath[] = ['guardian', 'power']

// ---------------------------------------------------------------------------
// 日付キーの生成（実在するJST日付のみ。dailyBossFor がそのまま使える形）
// ---------------------------------------------------------------------------
const DAY_MS = 24 * 60 * 60 * 1000
const pad2 = (n: number) => String(n).padStart(2, '0')

/** `from` から days 日ぶんの連続した日付キー。週次巡回により7日ごとに7敵が1巡する */
export function dateKeysFrom(from: string, days: number): string[] {
  const [y, m, d] = from.split('-').map(Number)
  const t0 = Date.UTC(y, m - 1, d)
  return Array.from({ length: days }, (_, i) => {
    const dt = new Date(t0 + i * DAY_MS)
    return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`
  })
}

/** 敵ごとに「その敵が出る実在の日付キー」を集める（＝敵ごとの実Dailyシード群） */
export function dateKeysByEnemy(dateKeys: string[]): Map<EnemyId, string[]> {
  const out = new Map<EnemyId, string[]>()
  for (const k of dateKeys) {
    const e = dailyBossFor(k).enemyId
    const arr = out.get(e) ?? []
    arr.push(k)
    out.set(e, arr)
  }
  return out
}

// ---------------------------------------------------------------------------
// 1試合
// ---------------------------------------------------------------------------
export type DailyRunOptions = {
  dateKey: string
  godId: GodId
  deck: CardDefId[]
  growthPath: GrowthPath
  /** Step 8 の paired 比較専用。既定（＝公平版Daily）は未指定＝ボーナス無し */
  bonusCopies?: Partial<Record<CardDefId, number>>
}

export type DailyMetrics = {
  status: 'won' | 'lost' | 'finished'
  round: number
  finalScore: number
  playerHp: number
  playerMaxHp: number
  enemyHpRatio: number
  bursts: number
  actions: number
  /** スコア内訳（素点）。tie break 候補・原因分析用 */
  breakdown: { damage: number; combo: number; victory: number; tempo: number; survival: number; total: number }
}

export type Agent = (
  state: GameState,
) => { type: 'PLAY_CARD'; uid: CardInstance['uid'] } | { type: 'USE_DIVINATION'; choiceIndex: number } | null

export const cardCost = (c: CardInstance) => getCardDef(c.defId).cost + (c.costModifier ?? 0)

/** Daily 1試合。開始条件は resolveDailyStart（本番と同一関数）が決める */
export function runDailyGame(opts: DailyRunOptions, agent: Agent): DailyMetrics {
  const daily = resolveDailyStart(opts.dateKey)
  let { state, events } = applyAction(null, {
    type: 'START_GAME',
    seed: daily.seed,
    godId: opts.godId,
    enemyId: daily.enemyId,
    deck: opts.deck,
    difficulty: daily.difficulty,
    otomoGrowthPath: opts.growthPath,
    mode: daily.mode,
    dailyKey: daily.dailyKey,
    modifier: daily.modifier,
    ...(opts.bonusCopies ? { bonusCopies: opts.bonusCopies } : {}),
  })

  let bursts = events.filter((e) => e.t === 'RESONANCE_BURST').length
  let actions = 0
  let guard = 0

  while (state.status === 'playing' && guard < 600) {
    guard++
    if (state.phase !== 'playerTurn') break
    const act = agent(state)
    const r = applyAction(state, act ?? { type: 'END_ROUND' })
    bursts += r.events.filter((e) => e.t === 'RESONANCE_BURST').length
    actions++
    state = r.state
  }

  return {
    status: state.status as DailyMetrics['status'],
    round: state.round,
    finalScore: getFinalScore(state.score, state.stake),
    playerHp: state.player.hp,
    playerMaxHp: state.player.maxHp,
    enemyHpRatio: state.enemy.hp / state.enemy.maxHp,
    bursts,
    actions,
    breakdown: {
      damage: state.score.damage,
      combo: state.score.combo,
      victory: state.score.victory,
      tempo: state.score.tempo,
      survival: state.score.survival,
      total: state.score.total,
    },
  }
}

// ---------------------------------------------------------------------------
// エージェント
//   heuristic 3種は既存 balanceSim.test.ts / phase3-audit と同一ロジック（移植）
//   search は1ラウンド全探索（予算付き）＋敵ターン先読み
// ---------------------------------------------------------------------------
const A = (e: { amount?: number }) => ('amount' in e ? (e.amount ?? 0) : 0)
const sumEff = (id: CardDefId, pred: (e: { kind: string; target?: string }) => boolean) =>
  getCardDef(id).effects.filter(pred as never).reduce((s, e) => s + A(e as never), 0)
export const cardDamage = (id: CardDefId) => sumEff(id, (e) => e.kind === 'damage' && e.target === 'enemy')
export const cardBlock = (id: CardDefId) => sumEff(id, (e) => e.kind === 'block')
export const cardHeal = (id: CardDefId) => sumEff(id, (e) => e.kind === 'heal')

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

export type Strategy = 'balanced' | 'aggressive' | 'defensive'

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

/**
 * 探索AIの価値関数。スコアを直接最大化する `score` プロファイルを追加している点が
 * phase3-audit との違い：ランキングでは「勝つか」ではなく「何点取るか」が目的関数のため、
 * 上位帯プレイヤーのモデルとしてスコア志向が必要になる。
 */
export type Profile = {
  name: string
  wEnemyHp: number
  wPlayerHp: number
  wResonance: number
  wOtomoForm: number
  wHand: number
  wDebuff: number
  wBuff: number
  wWinTempo: number
  /** 素点スコアそのものへの重み（ランキング志向AI用） */
  wScore: number
}

export const PROFILES: Record<string, Profile> = {
  balanced: { name: 'balanced', wEnemyHp: 1.5, wPlayerHp: 1.5, wResonance: 0.6, wOtomoForm: 2, wHand: 0.8, wDebuff: 0.5, wBuff: 0.5, wWinTempo: 25, wScore: 0 },
  rush:     { name: 'rush',     wEnemyHp: 3.0, wPlayerHp: 0.6, wResonance: 0.3, wOtomoForm: 1, wHand: 0.5, wDebuff: 0.2, wBuff: 0.5, wWinTempo: 40, wScore: 0 },
  fortress: { name: 'fortress', wEnemyHp: 0.8, wPlayerHp: 3.0, wResonance: 0.5, wOtomoForm: 2, wHand: 0.8, wDebuff: 1.0, wBuff: 0.2, wWinTempo: 10, wScore: 0 },
  /** ランキング志向：Battle Score の素点を直接最大化する */
  score:    { name: 'score',    wEnemyHp: 0.4, wPlayerHp: 0.5, wResonance: 0.4, wOtomoForm: 2, wHand: 0.6, wDebuff: 0.2, wBuff: 0.3, wWinTempo: 15, wScore: 3.0 },
}

function evaluate(after: GameState, before: GameState, p: Profile): number {
  const scoreTerm = after.score.total * p.wScore
  if (after.status === 'won') {
    const remaining = RULES.totalRounds - before.round
    return 100000 + remaining * p.wWinTempo + after.player.hp * p.wPlayerHp + scoreTerm
  }
  if (after.status === 'lost') return -100000 + (before.enemy.hp - after.enemy.hp) * p.wEnemyHp * 0.1 + scoreTerm
  let v = scoreTerm
  v += (before.enemy.maxHp - after.enemy.hp) * p.wEnemyHp
  v += after.player.hp * p.wPlayerHp
  v += after.resonance.value * p.wResonance
  v += ['spirit', 'incarnate', 'doji'].indexOf(after.otomo.form) * p.wOtomoForm
  v += after.hand.length * p.wHand
  v += after.enemy.buffs.filter((b) => b.stat === 'atk' && b.amount < 0).reduce((s, b) => s + -b.amount * b.remainingRounds, 0) * p.wDebuff
  v += after.player.buffs.filter((b) => b.stat === 'atk' && b.amount > 0).reduce((s, b) => s + b.amount * b.remainingRounds, 0) * p.wBuff
  if (after.status === 'finished') v -= 50000
  return v
}

type Step = { type: 'PLAY_CARD'; uid: CardInstance['uid'] } | { type: 'USE_DIVINATION'; choiceIndex: number }

function isCommutative(defId: CardDefId): boolean {
  return getCardDef(defId).effects.every(
    (e) => e.kind === 'damage' || e.kind === 'block' || e.kind === 'heal' || e.kind === 'debuff',
  )
}

export function planRound(state: GameState, p: Profile, budget = 1200): Step[] {
  let best: { score: number; steps: Step[] } = { score: -Infinity, steps: [] }
  let leaves = 0

  const dfs = (s: GameState, steps: Step[], lastCommUid: string | null) => {
    if (leaves >= budget) return
    const end = s.status === 'playing' ? applyAction(s, { type: 'END_ROUND' }).state : s
    const score = evaluate(end, state, p)
    leaves++
    if (score > best.score) best = { score, steps: [...steps] }
    if (s.status !== 'playing') return

    const affordable = s.hand.filter((c) => cardCost(c) <= s.ap.current)
    affordable.sort(
      (a, b) => cardDamage(b.defId) / Math.max(1, cardCost(b)) - cardDamage(a.defId) / Math.max(1, cardCost(a)),
    )
    for (const c of affordable) {
      if (leaves >= budget) return
      const comm = isCommutative(c.defId)
      if (comm && lastCommUid !== null && c.uid <= lastCommUid) continue
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

export function searchAgent(p: Profile, budget = 1200): Agent {
  let plan: Step[] = []
  let plannedRound = -1
  return (state) => {
    if (state.round !== plannedRound) {
      plan = planRound(state, p, budget)
      plannedRound = state.round
    }
    const next = plan.shift()
    if (!next) return null
    if (next.type === 'PLAY_CARD' && !state.hand.some((c) => c.uid === next.uid && cardCost(c) <= state.ap.current)) {
      plan = planRound(state, p, budget)
      return plan.shift() ?? null
    }
    return next
  }
}

// ---------------------------------------------------------------------------
// デッキ
// ---------------------------------------------------------------------------
export type DeckKind = 'recommended' | `variant${number}`

/**
 * legal なランダムデッキ（プレイヤーの編成の多様性モデル）。
 * `Math.random()` は使わず createRng で決定論的に生成する（不変ルール2の流儀）。
 * bonusCopies は使わないため 1種2枚が上限＝公平版Daily と同じ編成ルール。
 */
export function sampleDeck(godId: GodId, variantSeed: string): CardDefId[] {
  const rng = createRng(`deck-${godId}-${variantSeed}`)
  const pool = getCardPoolForGod(godId).map((c) => c.id)
  const max = RULES.deckBuilding.maxCopiesPerCard
  const slots: CardDefId[] = pool.flatMap((id) => Array(max).fill(id) as CardDefId[])
  for (let attempt = 0; attempt < 40; attempt++) {
    const deck = rng.shuffle(slots).slice(0, RULES.deck.size)
    if (validateDeck(deck, godId).valid) return deck
  }
  return getRecommendedDeck(godId)
}

const deckCache = new Map<string, CardDefId[]>()
export function deckFor(godId: GodId, kind: DeckKind): CardDefId[] {
  const key = `${godId}:${kind}`
  const hit = deckCache.get(key)
  if (hit) return hit
  const deck = kind === 'recommended' ? getRecommendedDeck(godId) : sampleDeck(godId, kind)
  deckCache.set(key, deck)
  return deck
}

// ---------------------------------------------------------------------------
// 統計ユーティリティ
// ---------------------------------------------------------------------------
export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
export const r1 = (x: number) => Math.round(x * 10) / 10
export const r2 = (x: number) => Math.round(x * 100) / 100

export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}
export const median = (xs: number[]) => quantile([...xs].sort((a, b) => a - b), 0.5)

/** 二項比率の Wilson 95% 信頼区間（勝率のゲート判定に使う） */
export function wilson95(successes: number, n: number): { lo: number; hi: number } {
  if (n === 0) return { lo: 0, hi: 0 }
  const z = 1.959964
  const p = successes / n
  const d = 1 + (z * z) / n
  const c = p + (z * z) / (2 * n)
  const s = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))
  return { lo: Math.max(0, (c - s) / d), hi: Math.min(1, (c + s) / d) }
}

/** spread = (max - min) / max。神間 best score のばらつき（G1） */
export function spreadPct(values: number[]): number {
  if (values.length === 0) return 0
  const mx = Math.max(...values)
  const mn = Math.min(...values)
  return mx === 0 ? 0 : ((mx - mn) / mx) * 100
}

export function mdTable(headers: string[], rows: (string | number)[][]): string {
  const line = (cells: (string | number)[]) => `| ${cells.join(' | ')} |`
  return [line(headers), line(headers.map(() => '---')), ...rows.map(line)].join('\n')
}

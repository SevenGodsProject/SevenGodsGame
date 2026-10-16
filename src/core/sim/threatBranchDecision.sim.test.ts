/// <reference types="node" />
import { mkdirSync, writeFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import type { CardInstance, CardUid, Difficulty, EnemyId, GameAction, GameState, GodId } from '../types'

/**
 * Threat Branch Pilot v1 — 追加検証（2026-10-17 CEO 指示・`docs/LANE1_THREAT_BRANCH_PILOT_V1.md` §10）。
 * Planner ツール・既定ではスキップ。既存 `engine/threatBranch.sim.test.ts` と同じ seed 体系（`threat-branch-{i}`）・
 * 同じ方策（greedy／raceAware／reader）・同じ R3 到達手順（greedy で R3 開始まで）を踏襲する。乱数は seed のみ。
 *
 *   SIM_THREAT_BRANCH=1 npx vitest run src/core/sim/threatBranchDecision.sim.test.ts --reporter=verbose
 *   （SIM_SEEDS=10 で seed 数を減らせる。既定 40）
 *
 * 項目（CEO 指示 5 件のうち sim で答えられる 4 件。項目 4＝UI 文言監査は文書側）：
 *   1. R3 の最善が「攻める（then／撃破）」か「守る（else 前提）」か：R3 開始局面ごとに R3 の全手順（カード順列×託宣×終了）を
 *      実エンジンで総当りし、以降は reader 方策で決着まで進めた価値（素点。非勝利は −1000）で比較。攻め側最善 − 守り側最善 ＝ Δ。
 *      |Δ| ≤ ε（ε＝5／10／20 素点）を「迷う」、Δ の符号で「片方が常に正しい」、then 到達不能／既に then を別枠で数える
 *   2. 同一局面で手札だけを他 seed の R3 手札に差し替えたとき、最善（攻め／守り）が入れ替わる率
 *   3. 読む（R4 分岐を知って探索）vs 読まない（R4 を既存鬼将＝必殺 26 固定と見なして探索）：R3 の行動差分率と結果差
 *   5. hard の then 率偏りの分解（必要ダメージ↑ vs 与ダメージ↓）と、しきい値 0.5／0.55／0.6 の実走（`vi.doMock` で
 *      `RULES.enemyTactic.defaultHpRatio` だけを差し替えた engine を読み直す。ランタイムは変更しない）
 * 結果は docs/evidence/lane1-threat-branch/decision-sim.json と DECISION_SIM_SUMMARY.md（表は JSON から生成）へ書く。
 *
 * 限界（文書 §10 にも記す）：探索は決定論の将来（ドローを含む）を見通せるため「完全情報の最善手」であり、人の読みの上限値。
 * 方策は normal でほぼ全勝するため勝率差は出にくく、差はスコア（撃破 R・残 HP・連携）に現れる。sim は CEO 実プレイの代替ではない。
 */
const RUN = !!process.env.SIM_THREAT_BRANCH
const SEEDS = Math.max(1, Number(process.env.SIM_SEEDS ?? 40) || 40)
const OUT_DIR = 'docs/evidence/lane1-threat-branch'
const DIFFICULTIES: Difficulty[] = ['normal', 'hard']
const RATIOS = [0.5, 0.55, 0.6]
const EPS = { tight: 5, main: 10, loose: 20 } as const
type EpsKey = keyof typeof EPS
const LOSS_PENALTY = 1000
const ALT_HANDS = 2
const seedName = (i: number) => `threat-branch-${i}`
const GOD_FILTER = (process.env.SIM_GODS ?? '').split(',').filter(Boolean)
const godsOf = <T extends { id: string }>(gods: readonly T[]) => (GOD_FILTER.length ? gods.filter((g) => GOD_FILTER.includes(g.id)) : [...gods])

/** engine 一式を（必要なら `RULES.enemyTactic.defaultHpRatio` だけ差し替えて）読み直す。ratio null＝本番値そのまま */
async function loadEngine(ratio: number | null) {
  vi.resetModules()
  vi.doUnmock('../data/rules')
  if (ratio !== null) {
    vi.doMock('../data/rules', async (importOriginal) => {
      const mod = await importOriginal<typeof import('../data/rules')>()
      const patched = { ...mod.RULES, enemyTactic: { defaultHpRatio: ratio } }
      return { RULES: patched as unknown as typeof mod.RULES }
    })
  }
  const [reducer, gods, enemies, cards, deckBuilder, divination, rules, intent] = await Promise.all([
    import('../engine/reducer'),
    import('../data/gods'),
    import('../data/enemies'),
    import('../data/cards'),
    import('../data/deckBuilder'),
    import('../data/divination'),
    import('../data/rules'),
    import('../engine/intent'),
  ])
  return {
    applyAction: reducer.applyAction,
    GODS: gods.GODS,
    ENEMY_IDS: enemies.ENEMY_IDS,
    PILOT_ENEMY_IDS: enemies.PILOT_ENEMY_IDS,
    getEnemyDef: enemies.getEnemyDef,
    getCardDef: cards.getCardDef,
    getRecommendedDeck: deckBuilder.getRecommendedDeck,
    DIVINATION_CHOICES: divination.DIVINATION_CHOICES,
    RULES: rules.RULES,
    enemyActionTotal: intent.enemyActionTotal,
  }
}
type Engine = Awaited<ReturnType<typeof loadEngine>>

type Policy = 'greedy' | 'raceAware' | 'reader'
const POLICIES: Policy[] = ['greedy', 'raceAware', 'reader']
type Branch = 'then' | 'else' | null
type Outcome = {
  status: string
  round: number
  hpRatioAtR4: number | null
  branch: Branch
  score: number
  playerHpEnd: number
  oracleRounds: number[]
  enemyHpAtRound: Record<number, number>
}
type Trace = { hpRatioAtR4: number | null; branch: Branch; oracleRounds: number[]; enemyHpAtRound: Record<number, number> }
const freshTrace = (): Trace => ({ hpRatioAtR4: null, branch: null, oracleRounds: [], enemyHpAtRound: {} })

type LeafKind = 'then' | 'else' | 'kill'
type Leaf = { actions: GameAction[]; labels: string[]; end: GameState; kind: LeafKind; cards: number; attackCards: number; hinder: boolean; guard: boolean; oracle: number | null }
type ScoredLeaf = Leaf & { value: number; out: Outcome }
type LeafFeat = { kind: LeafKind; value: number; labels: string[]; cards: number; attackCards: number; hinder: boolean; guard: boolean; oracle: number | null; status: string; round: number; playerHpEnd: number; enemyHpAtR4: number | null }
type Category = 'alreadyThen' | 'thenInfeasible' | 'attackDominant' | 'guardDominant' | 'contested'
type Side = 'attack' | 'guard' | 'tie'
type Analysis = {
  need: number
  potential: number
  leaves: number
  thenReachable: number
  delta: number | null
  category: Record<EpsKey, Category>
  optimal: Side
  bestAttack: LeafFeat | null
  bestGuard: LeafFeat | null
  overall: LeafFeat
}

const pct = (v: number | null | undefined) => (v === null || v === undefined || Number.isNaN(v)) ? '—' : `${(v * 100).toFixed(1)}%`
const r3 = (v: number) => +v.toFixed(3)
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

function makeSim(E: Engine) {
  const ONI_TACTIC = E.PILOT_ENEMY_IDS.oniTactic
  const BASELINE = E.ENEMY_IDS.oni
  const KAGO = 0
  const TENKEI = 2
  const costOf = (c: CardInstance) => E.getCardDef(c.defId).cost + (c.costModifier ?? 0)
  const damageOf = (c: CardInstance) => E.getCardDef(c.defId).effects.reduce((s, e) => s + (e.kind === 'damage' && e.target === 'enemy' ? e.amount : 0), 0)
  const blockOf = (c: CardInstance) => E.getCardDef(c.defId).effects.reduce((s, e) => s + (e.kind === 'block' ? e.amount : 0), 0)
  const isHinder = (c: CardInstance) => E.getCardDef(c.defId).effects.some((e) => e.kind === 'debuff' && e.target === 'enemy' && e.stat === 'atk')
  const hinderValue = (c: CardInstance) => E.getCardDef(c.defId).effects.reduce((s, e) => s + (e.kind === 'debuff' && e.target === 'enemy' && e.stat === 'atk' ? e.amount * e.rounds : 0), 0)
  const incomingOf = (s: GameState) => (s.enemy.intent ? E.enemyActionTotal(s.enemy.intent) : 0)
  const dangerous = (s: GameState) => s.player.hp - Math.max(0, incomingOf(s) - s.player.block) < s.player.maxHp * 0.35
  const intentIsSpecial = (s: GameState) => s.enemy.intent?.kind === 'special' || (s.enemy.intent?.kind === 'multiAttack' && !!s.enemy.intent.special)
  const tenkeiDamage = E.DIVINATION_CHOICES[TENKEI].effects.reduce((s, e) => s + (e.kind === 'damage' ? e.amount : 0), 0)
  const canOracle = (s: GameState) => s.divination.remaining > 0 && !s.divination.usedThisRound
  const hasTacticAtR4 = (enemyId: EnemyId) => E.getEnemyDef(enemyId).actions[3]?.kind === 'tactic'
  const thresholdOf = (s: GameState) => Math.floor(s.enemy.maxHp * E.RULES.enemyTactic.defaultHpRatio)
  const affordable = (s: GameState) => s.hand.filter((c) => costOf(c) <= s.ap.current)
  const bestAttackCard = (cards: CardInstance[]) => cards.filter((c) => damageOf(c) > 0).sort((a, b) => damageOf(b) - damageOf(a))[0] ?? null
  const bestGuardCard = (cards: CardInstance[]) => cards.filter((c) => blockOf(c) > 0).sort((a, b) => blockOf(b) - blockOf(a))[0] ?? null
  const bestHinderCard = (cards: CardInstance[]) => cards.filter(isHinder).sort((a, b) => hinderValue(b) - hinderValue(a))[0] ?? null

  /** greedy／reader のカード選択：攻撃優先・危険時のみ守る（既存 sim と同一） */
  function pickCardGreedy(s: GameState): CardInstance | null {
    const cards = affordable(s)
    if (cards.length === 0) return null
    if (dangerous(s) && s.player.block < incomingOf(s)) {
      const guard = bestGuardCard(cards)
      if (guard) return guard
    }
    return bestAttackCard(cards) ?? cards.sort((a, b) => costOf(a) - costOf(b))[0]
  }

  /** raceAware の R3：しきい値を越せるなら攻撃札を全部、越せないなら妨害札を先に（既存 sim と同一） */
  function pickCardRaceR3(s: GameState): CardInstance | null {
    const cards = affordable(s)
    if (cards.length === 0) return null
    const need = s.enemy.hp - thresholdOf(s)
    if (need <= 0) return bestAttackCard(cards) ?? bestHinderCard(cards) ?? cards[0]
    const potential = cards.filter((c) => damageOf(c) > 0).reduce((sum, c) => sum + damageOf(c), 0) + (canOracle(s) ? tenkeiDamage : 0)
    if (potential >= need) return bestAttackCard(cards) ?? cards[0]
    return bestHinderCard(cards) ?? bestAttackCard(cards) ?? cards[0]
  }

  function chooseOracle(s: GameState, policy: Policy, enemyId: EnemyId): number | null {
    if (!canOracle(s)) return null
    const roundsLeft = E.RULES.totalRounds - s.round + 1
    if (policy === 'greedy') {
      if (s.divination.remaining >= roundsLeft || dangerous(s)) return dangerous(s) ? KAGO : TENKEI
      return null
    }
    if (policy === 'raceAware' && hasTacticAtR4(enemyId) && s.round === 3) {
      const need = s.enemy.hp - thresholdOf(s)
      if (need > 0 && need <= tenkeiDamage) return TENKEI
      if (need <= 0) return null
    }
    if (intentIsSpecial(s)) return KAGO
    if (dangerous(s)) return KAGO
    if (s.divination.remaining >= roundsLeft) return TENKEI
    return null
  }

  function startState(seed: string, godId: GodId, enemyId: EnemyId, difficulty: Difficulty): GameState {
    return E.applyAction(null, { type: 'START_GAME', seed, godId, enemyId, deck: E.getRecommendedDeck(godId), difficulty }).state
  }

  function observe(s: GameState, trace: Trace): void {
    if (s.status === 'playing' && trace.enemyHpAtRound[s.round] === undefined) trace.enemyHpAtRound[s.round] = s.enemy.hp
    if (s.round === 4 && trace.hpRatioAtR4 === null && s.status === 'playing') {
      trace.hpRatioAtR4 = s.enemy.hp / s.enemy.maxHp
      if (hasTacticAtR4(s.enemy.defId)) trace.branch = intentIsSpecial(s) ? 'else' : 'then'
    }
  }

  const outcomeOf = (s: GameState, trace: Trace): Outcome => ({
    status: s.status,
    round: s.round,
    hpRatioAtR4: trace.hpRatioAtR4,
    branch: trace.branch,
    score: s.score.total,
    playerHpEnd: s.player.hp,
    oracleRounds: trace.oracleRounds,
    enemyHpAtRound: trace.enemyHpAtRound,
  })

  /** 指定方策で決着まで進める（`from` の盤面から） */
  function playOut(from: GameState, policy: Policy, trace: Trace): Outcome {
    let s = from
    let guard = 0
    const enemyId = from.enemy.defId
    while (s.status === 'playing' && guard++ < 500) {
      observe(s, trace)
      const raceR3 = policy === 'raceAware' && hasTacticAtR4(enemyId) && s.round === 3
      const card = raceR3 ? pickCardRaceR3(s) : pickCardGreedy(s)
      if (card) {
        s = E.applyAction(s, { type: 'PLAY_CARD', uid: card.uid }).state
        continue
      }
      const choice = chooseOracle(s, policy, enemyId)
      if (choice !== null) {
        trace.oracleRounds.push(s.round)
        s = E.applyAction(s, { type: 'USE_DIVINATION', choiceIndex: choice }).state
        continue
      }
      s = E.applyAction(s, { type: 'END_ROUND' }).state
    }
    observe(s, trace)
    return outcomeOf(s, trace)
  }

  const playOne = (seed: string, godId: GodId, enemyId: EnemyId, difficulty: Difficulty, policy: Policy) => playOut(startState(seed, godId, enemyId, difficulty), policy, freshTrace())

  /** greedy で R3 開始（カード使用前）まで進める。R3 に到達できなければ null（既存 sim と同一） */
  function toR3Greedy(seed: string, godId: GodId, enemyId: EnemyId, difficulty: Difficulty): GameState | null {
    let s = startState(seed, godId, enemyId, difficulty)
    let guard = 0
    while (s.status === 'playing' && s.round < 3 && guard++ < 200) {
      const card = pickCardGreedy(s)
      if (card) {
        s = E.applyAction(s, { type: 'PLAY_CARD', uid: card.uid }).state
        continue
      }
      const choice = chooseOracle(s, 'greedy', enemyId)
      if (choice !== null) {
        s = E.applyAction(s, { type: 'USE_DIVINATION', choiceIndex: choice }).state
        continue
      }
      s = E.applyAction(s, { type: 'END_ROUND' }).state
    }
    return s.status === 'playing' && s.round === 3 ? s : null
  }

  /** 盤面の同値判定キー（engine の将来を決める要素だけ。同じキーなら同じ将来） */
  // 捨札は順序を無視する（順序は山札切れの再シャッフル時にしか効かない。山札 20・7R の通常ドロー 17 枚なので、
  // 追加ドローが 3 枚を超えた局面以外は厳密に同じ将来）。手札・山札の順序は engine の挙動を変えるので保つ
  const stateKey = (s: GameState) =>
    JSON.stringify([
      s.round, s.phase, s.status, s.ap.current, s.player.hp, s.player.block, s.player.buffs, s.enemy.hp, s.enemy.buffs, s.enemy.intent,
      s.resonance.value, s.divination.remaining, s.divination.usedThisRound, s.hand.map((c) => c.uid), s.deck.map((c) => c.uid),
      [...s.discard.map((c) => c.uid)].sort(), s.exhausted.map((c) => c.uid), s.otomo, s.score.total, s.cardsPlayedThisRound, s.rngCursor, s.mastery,
    ])

  const leafKind = (end: GameState): LeafKind => (end.status === 'won' ? 'kill' : intentIsSpecial(end) ? 'else' : 'then')

  /** R3 の全手順（カードの順列 × 託宣 3 択 × ラウンド終了）を実エンジンで総当り。到達盤面が同じ手順は 1 つに畳む */
  function enumerateR3(start: GameState): Leaf[] {
    const leaves = new Map<string, Leaf>()
    const seen = new Set<string>()
    type Meta = { cards: number; attackCards: number; hinder: boolean; guard: boolean; oracle: number | null }
    const addLeaf = (end: GameState, actions: GameAction[], labels: string[], m: Meta) => {
      const k = stateKey(end)
      if (!leaves.has(k)) leaves.set(k, { actions, labels, end, kind: leafKind(end), ...m })
    }
    const walk = (s: GameState, actions: GameAction[], labels: string[], m: Meta): void => {
      const k = stateKey(s)
      if (seen.has(k)) return
      seen.add(k)
      addLeaf(E.applyAction(s, { type: 'END_ROUND' }).state, [...actions, { type: 'END_ROUND' }], labels, m)
      const tried = new Set<string>()
      for (const c of affordable(s)) {
        const sig = `${c.defId}|${c.costModifier ?? 0}`
        if (tried.has(sig)) continue
        tried.add(sig)
        const n = E.applyAction(s, { type: 'PLAY_CARD', uid: c.uid }).state
        const a: GameAction[] = [...actions, { type: 'PLAY_CARD', uid: c.uid }]
        const l = [...labels, E.getCardDef(c.defId).name]
        const nm: Meta = { cards: m.cards + 1, attackCards: m.attackCards + (damageOf(c) > 0 ? 1 : 0), hinder: m.hinder || isHinder(c), guard: m.guard || blockOf(c) > 0, oracle: m.oracle }
        if (n.status !== 'playing') addLeaf(n, a, l, nm)
        else walk(n, a, l, nm)
      }
      if (canOracle(s)) {
        // 託宣は「最初（カードを出す前）」か「最後（ラウンド終了の直前）」だけを探索する。
        // R3 の予告は溜め（予告 0）なので加護は常に最低保証 2・`blocked` 条件は不成立。導きは先に使うほうが支配的（引いた札を使える）。
        // 天啓は位置で結果が変わり得る（撃破の時機）ため両端を見る。中間位置は上の 2 つで表せる手順の並べ替えに過ぎない。
        for (let i = 0; i < E.DIVINATION_CHOICES.length; i++) {
          const n = E.applyAction(s, { type: 'USE_DIVINATION', choiceIndex: i }).state
          const a: GameAction[] = [...actions, { type: 'USE_DIVINATION', choiceIndex: i }]
          const l = [...labels, `託宣:${E.DIVINATION_CHOICES[i].name}`]
          const nm: Meta = { ...m, oracle: i }
          if (n.status !== 'playing') {
            addLeaf(n, a, l, nm)
            continue
          }
          if (m.cards === 0) walk(n, a, l, nm)
          else addLeaf(E.applyAction(n, { type: 'END_ROUND' }).state, [...a, { type: 'END_ROUND' }], l, nm)
        }
      }
    }
    walk(start, [], [], { cards: 0, attackCards: 0, hinder: false, guard: false, oracle: null })
    return [...leaves.values()]
  }

  /** 葉の価値：以降を reader 方策で決着まで進めた素点（非勝利は −1000） */
  function scoreLeaf(leaf: Leaf): ScoredLeaf {
    const trace = freshTrace()
    const out = leaf.end.status === 'playing' ? playOut(leaf.end, 'reader', trace) : outcomeOf(leaf.end, trace)
    return { ...leaf, out, value: out.score + (out.status === 'won' ? 0 : -LOSS_PENALTY) }
  }
  const byValue = (a: ScoredLeaf, b: ScoredLeaf) => b.value - a.value || a.labels.length - b.labels.length || a.labels.join('>').localeCompare(b.labels.join('>'))
  const best = (leaves: ScoredLeaf[]) => [...leaves].sort(byValue)[0]
  const feat = (l: ScoredLeaf): LeafFeat => ({
    kind: l.kind, value: l.value, labels: l.labels, cards: l.cards, attackCards: l.attackCards, hinder: l.hinder, guard: l.guard, oracle: l.oracle,
    status: l.out.status, round: l.out.round, playerHpEnd: l.out.playerHpEnd, enemyHpAtR4: l.end.status === 'playing' ? l.end.enemy.hp : null,
  })

  /** 項目 1：R3 開始局面の「攻める／守る」判定 */
  function analyzeR3(start: GameState): Analysis {
    const need = start.enemy.hp - thresholdOf(start)
    const leaves = enumerateR3(start).map(scoreLeaf)
    const attackSide = leaves.filter((l) => l.kind !== 'else')
    const guardSide = leaves.filter((l) => l.kind === 'else')
    let minHp = Number.POSITIVE_INFINITY
    for (const l of leaves) if (l.end.enemy.hp < minHp) minHp = l.end.enemy.hp
    const potential = start.enemy.hp - minHp
    const overall = feat(best(leaves))
    const base = { need, potential, leaves: leaves.length, thenReachable: attackSide.length, overall }
    const fixed = (c: Category): Record<EpsKey, Category> => ({ tight: c, main: c, loose: c })
    if (need <= 0) return { ...base, delta: null, category: fixed('alreadyThen'), optimal: 'attack', bestAttack: overall, bestGuard: null }
    if (attackSide.length === 0) return { ...base, delta: null, category: fixed('thenInfeasible'), optimal: 'guard', bestAttack: null, bestGuard: overall }
    const bA = best(attackSide)
    const bG = best(guardSide)
    const delta = bA.value - bG.value
    const cat = (eps: number): Category => (Math.abs(delta) <= eps ? 'contested' : delta > 0 ? 'attackDominant' : 'guardDominant')
    return {
      ...base,
      delta,
      category: { tight: cat(EPS.tight), main: cat(EPS.main), loose: cat(EPS.loose) },
      optimal: delta > 0 ? 'attack' : delta < 0 ? 'guard' : 'tie',
      bestAttack: feat(bA),
      bestGuard: feat(bG),
    }
  }

  /** 項目 3：R3 で探索する方策。world＝評価に使う敵（実敵＝読む／鬼将 enemy_02＝R4 は必殺 26 固定と信じる） */
  function searchR3(start: GameState, believedEnemy: EnemyId): { chosen: ScoredLeaf; realEnd: GameState; out: Outcome; realValue: number } {
    const belief = believedEnemy === start.enemy.defId ? start : { ...start, enemy: { ...start.enemy, defId: believedEnemy } }
    const chosen = best(enumerateR3(belief).map(scoreLeaf))
    let s = start
    for (const a of chosen.actions) s = E.applyAction(s, a).state
    const trace = freshTrace()
    const out = s.status === 'playing' ? playOut(s, 'reader', trace) : outcomeOf(s, trace)
    return { chosen, realEnd: s, out, realValue: out.score + (out.status === 'won' ? 0 : -LOSS_PENALTY) }
  }

  function summarize(outs: Outcome[]) {
    const n = outs.length
    const won = outs.filter((o) => o.status === 'won').length
    const reachedR4 = outs.filter((o) => o.hpRatioAtR4 !== null)
    const thenCount = outs.filter((o) => o.branch === 'then').length
    const hasBranch = outs.some((o) => o.branch !== null)
    return {
      n,
      winRate: r3(won / n),
      status: outs.reduce<Record<string, number>>((acc, o) => ((acc[o.status] = (acc[o.status] ?? 0) + 1), acc), {}),
      reachedR4: reachedR4.length,
      thenRate: reachedR4.length && hasBranch ? r3(thenCount / reachedR4.length) : null,
      hpRatioAtR4Mean: reachedR4.length ? r3(mean(reachedR4.map((o) => o.hpRatioAtR4 as number))) : null,
      meanScore: +mean(outs.map((o) => o.score)).toFixed(1),
      meanPlayerHpEnd: +mean(outs.map((o) => o.playerHpEnd)).toFixed(2),
      meanRound: +mean(outs.map((o) => o.round)).toFixed(2),
      oracleAtR4Rate: r3(outs.filter((o) => o.oracleRounds.includes(4)).length / n),
    }
  }

  return {
    ONI_TACTIC, BASELINE, thresholdOf, stateKey, startState, playOne, playOut, toR3Greedy, analyzeR3, searchR3, summarize, outcomeOf,
    enumerateR3, scoreLeaf, best,
  }
}
type Sim = ReturnType<typeof makeSim>
type Summary = ReturnType<Sim['summarize']>

/** 項目 1 の集計（R3 局面の判定結果 → 率・分布・神別）。しきい値 sweep でも同じ集計を使う */
function aggregateAnalyses(entries: { god: string; a: Analysis }[]) {
  const as = entries.map((e) => e.a)
  const zero = (): Record<Category, number> => ({ alreadyThen: 0, thenInfeasible: 0, attackDominant: 0, guardDominant: 0, contested: 0 })
  const count = (eps: EpsKey) => as.reduce<Record<Category, number>>((acc, a) => ((acc[a.category[eps]] += 1), acc), zero())
  const decidable = as.filter((a) => a.delta !== null)
  const perGod: Record<string, Record<string, number | null>> = {}
  for (const god of [...new Set(entries.map((e) => e.god))]) {
    const ga = entries.filter((e) => e.god === god).map((e) => e.a)
    const gd = ga.filter((a) => a.delta !== null)
    perGod[god] = {
      n: ga.length,
      alreadyThen: ga.filter((a) => a.category.main === 'alreadyThen').length,
      thenInfeasible: ga.filter((a) => a.category.main === 'thenInfeasible').length,
      attackDominant: ga.filter((a) => a.category.main === 'attackDominant').length,
      guardDominant: ga.filter((a) => a.category.main === 'guardDominant').length,
      contested: ga.filter((a) => a.category.main === 'contested').length,
      contestedRateOfDecidable: gd.length ? r3(gd.filter((a) => a.category.main === 'contested').length / gd.length) : null,
      optimalAttackRateOfDecidable: gd.length ? r3(gd.filter((a) => a.optimal === 'attack').length / gd.length) : null,
      meanNeed: +mean(ga.map((a) => a.need)).toFixed(1),
      meanPotential: +mean(ga.map((a) => a.potential)).toFixed(1),
    }
  }
  const deltas = decidable.map((a) => a.delta as number)
  const bucket = (d: number) => (d <= -20 ? '<=-20' : d <= -10 ? '(-20,-10]' : d < -5 ? '(-10,-5)' : d <= 5 ? '[-5,5]' : d < 10 ? '(5,10)' : d < 20 ? '[10,20)' : '>=20')
  const deltaHist = deltas.reduce<Record<string, number>>((acc, d) => ((acc[bucket(d)] = (acc[bucket(d)] ?? 0) + 1), acc), {})
  const needBucket = (n: number) => (n <= 0 ? '<=0' : n <= 10 ? '1-10' : n <= 20 ? '11-20' : n <= 30 ? '21-30' : n <= 40 ? '31-40' : '>40')
  const byNeed: Record<string, { n: number; optimalAttack: number; contested: number; thenInfeasible: number }> = {}
  for (const a of as) {
    const b = (byNeed[needBucket(a.need)] ??= { n: 0, optimalAttack: 0, contested: 0, thenInfeasible: 0 })
    b.n++
    if (a.optimal === 'attack') b.optimalAttack++
    if (a.category.main === 'contested') b.contested++
    if (a.category.main === 'thenInfeasible') b.thenInfeasible++
  }
  const contestedMain = as.filter((a) => a.category.main === 'contested')
  const feats = (sel: Analysis[]) => ({
    n: sel.length,
    bestGuardUsesHinder: r3(sel.filter((a) => a.bestGuard?.hinder).length / Math.max(1, sel.length)),
    bestGuardUsesGuardCard: r3(sel.filter((a) => a.bestGuard?.guard).length / Math.max(1, sel.length)),
    bestGuardUsesOracleR3: r3(sel.filter((a) => a.bestGuard && a.bestGuard.oracle !== null).length / Math.max(1, sel.length)),
    bestGuardPlaysZeroCards: r3(sel.filter((a) => a.bestGuard?.cards === 0).length / Math.max(1, sel.length)),
    bestAttackUsesOracleR3: r3(sel.filter((a) => a.bestAttack && a.bestAttack.oracle !== null).length / Math.max(1, sel.length)),
    bestAttackKillsInR3: r3(sel.filter((a) => a.bestAttack?.kind === 'kill').length / Math.max(1, sel.length)),
    meanCardsBestAttack: +mean(sel.filter((a) => a.bestAttack).map((a) => (a.bestAttack as LeafFeat).cards)).toFixed(2),
    meanCardsBestGuard: +mean(sel.filter((a) => a.bestGuard).map((a) => (a.bestGuard as LeafFeat).cards)).toFixed(2),
    meanAttackCardsBestAttack: +mean(sel.filter((a) => a.bestAttack).map((a) => (a.bestAttack as LeafFeat).attackCards)).toFixed(2),
    meanAttackCardsBestGuard: +mean(sel.filter((a) => a.bestGuard).map((a) => (a.bestGuard as LeafFeat).attackCards)).toFixed(2),
    // R3 託宣の内訳（加護／導き／天啓）：各側の最善手に占める割合
    oracleChoiceBestAttack: [0, 1, 2].map((i) => r3(sel.filter((a) => a.bestAttack?.oracle === i).length / Math.max(1, sel.length))),
    oracleChoiceBestGuard: [0, 1, 2].map((i) => r3(sel.filter((a) => a.bestGuard?.oracle === i).length / Math.max(1, sel.length))),
  })
  const n = Math.max(1, as.length)
  return {
    n: as.length,
    counts: { tight: count('tight'), main: count('main'), loose: count('loose') },
    rates: {
      contestedOfAll: { tight: r3(count('tight').contested / n), main: r3(count('main').contested / n), loose: r3(count('loose').contested / n) },
      contestedOfDecidable: {
        tight: decidable.length ? r3(count('tight').contested / decidable.length) : null,
        main: decidable.length ? r3(count('main').contested / decidable.length) : null,
        loose: decidable.length ? r3(count('loose').contested / decidable.length) : null,
      },
      answerFixedOfAll: { main: r3((as.length - count('main').contested) / n) },
      alreadyThenOfAll: r3(count('main').alreadyThen / n),
      thenInfeasibleOfAll: r3(count('main').thenInfeasible / n),
      decidableOfAll: r3(decidable.length / n),
      optimalAttackOfDecidable: decidable.length ? r3(decidable.filter((a) => a.optimal === 'attack').length / decidable.length) : null,
      optimalGuardOfDecidable: decidable.length ? r3(decidable.filter((a) => a.optimal === 'guard').length / decidable.length) : null,
      tieOfDecidable: decidable.length ? r3(decidable.filter((a) => a.optimal === 'tie').length / decidable.length) : null,
      overallOptimalThenOrKill: r3(as.filter((a) => a.overall.kind !== 'else').length / n),
    },
    delta: { mean: +mean(deltas).toFixed(1), meanAbs: +mean(deltas.map(Math.abs)).toFixed(1), hist: deltaHist },
    meanLeavesPerState: +mean(as.map((a) => a.leaves)).toFixed(1),
    meanNeed: +mean(as.map((a) => a.need)).toFixed(1),
    meanPotential: +mean(as.map((a) => a.potential)).toFixed(1),
    byNeed,
    features: { contested: feats(contestedMain), decidable: feats(decidable) },
    perGod,
  }
}
type Item1Diff = ReturnType<typeof aggregateAnalyses>

const results: Record<string, unknown> = {}
const timings: Record<string, number> = {}
const timed = async <T>(name: string, fn: () => Promise<T> | T): Promise<T> => {
  const t0 = Date.now()
  const v = await fn()
  timings[name] = Math.round((Date.now() - t0) / 100) / 10
  return v
}

describe.skipIf(!RUN)('Threat Branch Pilot v1 — 追加検証（R3 攻守の迷い・手札依存・読む価値・hard 偏り）', () => {
  it('項目 1〜3：R3 全手順の総当り（7 神 × seed × normal／hard・enemy_09）', async () => {
    const E = await loadEngine(null)
    const S = makeSim(E)
    const seeds = Array.from({ length: SEEDS }, (_, i) => seedName(i))

    // R3 開始局面（greedy で到達）を集める
    type R3Case = { god: string; seed: string; difficulty: Difficulty; state: GameState }
    const cases: R3Case[] = []
    for (const difficulty of DIFFICULTIES) for (const god of godsOf(E.GODS)) for (const seed of seeds) {
      const st = S.toR3Greedy(seed, god.id, S.ONI_TACTIC, difficulty)
      if (st) cases.push({ god: god.id, seed, difficulty, state: st })
    }

    // 項目 1
    const analyses = new Map<R3Case, Analysis>()
    await timed('item1', () => {
      for (const c of cases) analyses.set(c, S.analyzeR3(c.state))
    })
    // 決定論：同じ局面をもう一度解いても同じ答え
    const again = S.analyzeR3(cases[0].state)
    expect(JSON.stringify(again)).toBe(JSON.stringify(analyses.get(cases[0])))

    const item1: Record<string, unknown> = {}
    for (const difficulty of DIFFICULTIES) {
      const cs = cases.filter((c) => c.difficulty === difficulty)
      item1[difficulty] = aggregateAnalyses(cs.map((c) => ({ god: c.god, a: analyses.get(c) as Analysis })))
    }
    results.item1 = item1

    // 項目 2：手札差し替え
    const item2: Record<string, unknown> = {}
    await timed('item2', () => {
      for (const difficulty of DIFFICULTIES) {
        let pairs = 0
        let flips = 0
        let catChanges = 0
        let feasibilityChanges = 0
        let decidablePairs = 0
        let decidableFlips = 0
        const perGod: Record<string, { pairs: number; flips: number }> = {}
        const sameNeedDiff: { pairs: number; flips: number } = { pairs: 0, flips: 0 }
        for (const god of E.GODS) {
          const cs = cases.filter((c) => c.difficulty === difficulty && c.god === god.id)
          const pg = { pairs: 0, flips: 0 }
          for (let i = 0; i < cs.length; i++) {
            const a0 = analyses.get(cs[i]) as Analysis
            if (a0.category.main === 'alreadyThen') continue
            for (let k = 1; k <= ALT_HANDS && k < cs.length; k++) {
              const j = (i + k) % cs.length
              const altHand = cs[j].state.hand.map((c, idx) => ({ ...c, uid: `alt${k}-${idx}` as CardUid }))
              const alt: GameState = { ...cs[i].state, hand: altHand }
              const a1 = S.analyzeR3(alt)
              pairs++
              pg.pairs++
              const side = (a: Analysis): Side => (a.optimal === 'tie' ? 'guard' : a.optimal)
              const flipped = side(a0) !== side(a1)
              if (flipped) {
                flips++
                pg.flips++
              }
              if (a0.category.main !== a1.category.main) catChanges++
              if ((a0.thenReachable > 0) !== (a1.thenReachable > 0)) feasibilityChanges++
              if (a0.delta !== null && a1.delta !== null) {
                decidablePairs++
                if (flipped) decidableFlips++
              }
              sameNeedDiff.pairs++
              if (flipped) sameNeedDiff.flips++
            }
          }
          perGod[god.id] = pg
        }
        item2[difficulty] = {
          pairs,
          flipRate: r3(flips / Math.max(1, pairs)),
          categoryChangeRate: r3(catChanges / Math.max(1, pairs)),
          thenFeasibilityChangeRate: r3(feasibilityChanges / Math.max(1, pairs)),
          decidablePairs,
          flipRateAmongBothDecidable: decidablePairs ? r3(decidableFlips / decidablePairs) : null,
          perGod,
          note: '同一 seed・同一 R3 局面（敵 HP・自 HP・共鳴・託宣残・山札）で手札だけを同神の別 seed の R3 手札に差し替え（ALT_HANDS=' + ALT_HANDS + '）。flip＝最善の側（攻め／守り）が入れ替わった',
        }
      }
    })
    results.item2 = item2

    // 項目 3：読む vs 読まない
    const item3: Record<string, unknown> = {}
    await timed('item3', () => {
      for (const difficulty of DIFFICULTIES) {
        const cs = cases.filter((c) => c.difficulty === difficulty)
        const reader: Outcome[] = []
        const nonReader: Outcome[] = []
        const greedy: Outcome[] = []
        const race: Outcome[] = []
        let actionDiff = 0
        let valueLoss = 0
        let valueGain = 0
        let lossSum = 0
        let branchDiff = 0
        let nrReachedThen = 0
        let rdReachedThen = 0
        const perGod: Record<string, { n: number; actionDiff: number; valueLoss: number; readerScore: number; nonReaderScore: number }> = {}
        for (const c of cs) {
          const rd = S.searchR3(c.state, S.ONI_TACTIC)
          const nr = S.searchR3(c.state, S.BASELINE)
          reader.push(rd.out)
          nonReader.push(nr.out)
          greedy.push(S.playOut(c.state, 'greedy', freshTrace()))
          race.push(S.playOut(c.state, 'raceAware', freshTrace()))
          const diff = S.stateKey(rd.realEnd) !== S.stateKey(nr.realEnd)
          if (diff) actionDiff++
          if (nr.realValue < rd.realValue) {
            valueLoss++
            lossSum += rd.realValue - nr.realValue
          }
          if (nr.realValue > rd.realValue) valueGain++
          if (rd.out.branch !== nr.out.branch) branchDiff++
          if (rd.out.branch === 'then' || rd.out.status === 'won' && rd.out.round <= 3) rdReachedThen++
          if (nr.out.branch === 'then' || nr.out.status === 'won' && nr.out.round <= 3) nrReachedThen++
          const pg = (perGod[c.god] ??= { n: 0, actionDiff: 0, valueLoss: 0, readerScore: 0, nonReaderScore: 0 })
          pg.n++
          if (diff) pg.actionDiff++
          if (nr.realValue < rd.realValue) pg.valueLoss++
          pg.readerScore += rd.out.score
          pg.nonReaderScore += nr.out.score
        }
        for (const pg of Object.values(perGod)) {
          pg.readerScore = +(pg.readerScore / pg.n).toFixed(1)
          pg.nonReaderScore = +(pg.nonReaderScore / pg.n).toFixed(1)
        }
        item3[difficulty] = {
          n: cs.length,
          r3ActionDiffRate: r3(actionDiff / cs.length),
          r3BranchDiffRate: r3(branchDiff / cs.length),
          nonReaderStrictlyWorseRate: r3(valueLoss / cs.length),
          nonReaderStrictlyBetterRate: r3(valueGain / cs.length),
          meanLossWhenWorse: valueLoss ? +(lossSum / valueLoss).toFixed(1) : 0,
          readerThenOrKillRate: r3(rdReachedThen / cs.length),
          nonReaderThenOrKillRate: r3(nrReachedThen / cs.length),
          outcomes: {
            readerSearch: S.summarize(reader),
            nonReaderSearch: S.summarize(nonReader),
            greedyHeuristic: S.summarize(greedy),
            raceAwareHeuristic: S.summarize(race),
          },
          perGod,
          note: 'reader＝R3 の全手順を実敵（enemy_09）で評価して最善を選ぶ／nonReader＝同じ探索を「R4 は鬼将と同じ必殺 26 固定」と信じて（enemy_02 の世界で）選び、その手を実敵で実行。R4 以降は両者とも予告を見て同じ reader 方策。探索は決定論の将来（ドロー含む）を見通すため人の上限値',
        }
      }
    })
    results.item3 = item3
    results.cases = { total: cases.length, byDifficulty: Object.fromEntries(DIFFICULTIES.map((d) => [d, cases.filter((c) => c.difficulty === d).length])) }
    console.log('ITEM1 ' + JSON.stringify(Object.fromEntries(DIFFICULTIES.map((d) => [d, (item1[d] as { rates: unknown }).rates]))))
    console.log('ITEM2 ' + JSON.stringify(Object.fromEntries(DIFFICULTIES.map((d) => [d, (item2[d] as { flipRate: number }).flipRate]))))
    console.log('ITEM3 ' + JSON.stringify(Object.fromEntries(DIFFICULTIES.map((d) => [d, { diff: (item3[d] as { r3ActionDiffRate: number }).r3ActionDiffRate }]))))
    expect(cases.length).toBeGreaterThan(0)
  }, 3_600_000)

  it('項目 5：hard の偏りの分解と、しきい値 0.5／0.55／0.6 の実走（RULES を test 内で差し替え・ランタイム不変）', async () => {
    const seeds = Array.from({ length: SEEDS }, (_, i) => seedName(i))

    // 5-1 分解（本番値 0.5）：同 seed で normal／hard の「必要ダメージ」と「R4 開始までの与ダメージ」を比べる
    const E0 = await loadEngine(null)
    const S0 = makeSim(E0)
    const decomposition = await timed('item5-decomp', () => {
      const rows: Record<string, unknown> = {}
      for (const policy of ['greedy', 'reader'] as Policy[]) {
        const dealt: Record<Difficulty, number[]> = { easy: [], normal: [], hard: [] }
        const need: Record<Difficulty, number> = { easy: 0, normal: 0, hard: 0 }
        const perRound: Record<Difficulty, number[][]> = { easy: [], normal: [], hard: [] }
        for (const difficulty of DIFFICULTIES) {
          const probe = S0.startState(seedName(0), E0.GODS[0].id, S0.ONI_TACTIC, difficulty)
          need[difficulty] = probe.enemy.maxHp - S0.thresholdOf(probe)
          for (const god of godsOf(E0.GODS)) for (const seed of seeds) {
            const o = S0.playOne(seed, god.id, S0.ONI_TACTIC, difficulty, policy)
            const maxHp = probe.enemy.maxHp
            const hp4 = o.enemyHpAtRound[4]
            dealt[difficulty].push(hp4 === undefined ? maxHp : maxHp - hp4)
            perRound[difficulty].push([1, 2, 3].map((r) => (o.enemyHpAtRound[r] ?? 0) - (o.enemyHpAtRound[r + 1] ?? 0)))
          }
        }
        const n = dealt.normal.length
        const rate = (xs: number[], nd: number) => r3(xs.filter((x) => x >= nd).length / xs.length)
        rows[policy] = {
          n,
          need: { normal: need.normal, hard: need.hard, diff: need.hard - need.normal },
          dealtByR4Mean: { normal: +mean(dealt.normal).toFixed(1), hard: +mean(dealt.hard).toFixed(1), diff: +(mean(dealt.hard) - mean(dealt.normal)).toFixed(1) },
          dealtPerRoundMean: {
            normal: [0, 1, 2].map((i) => +mean(perRound.normal.map((p) => p[i])).toFixed(1)),
            hard: [0, 1, 2].map((i) => +mean(perRound.hard.map((p) => p[i])).toFixed(1)),
          },
          thenRate: { normal: rate(dealt.normal, need.normal), hard: rate(dealt.hard, need.hard) },
          counterfactual: {
            hpMultiplierOnly: rate(dealt.normal, need.hard),
            atkPressureOnly: rate(dealt.hard, need.normal),
            note: 'hpMultiplierOnly＝normal の与ダメージ分布に hard の必要量（54）を当てた then 率／atkPressureOnly＝hard の与ダメージ分布に normal の必要量（47）を当てた then 率',
          },
        }
      }
      return rows
    })

    // 5-2 しきい値の実走：ratio ごとに engine を読み直して 7 神 × seed × 難易度 × 方策
    const sweep: Record<string, unknown> = {}
    await timed('item5-sweep', async () => {
      for (const ratio of RATIOS) {
        const E = await loadEngine(ratio)
        const S = makeSim(E)
        const def = E.getEnemyDef(S.ONI_TACTIC)
        const tactic = def.actions[3]
        expect(tactic.kind).toBe('tactic')
        if (tactic.kind === 'tactic') expect(tactic.cond.ratio).toBe(ratio)
        const cells: Record<string, Summary> = {}
        const perGodThen: Record<string, Record<string, number | null>> = {}
        for (const difficulty of DIFFICULTIES) for (const policy of POLICIES) {
          const outs: Outcome[] = []
          for (const god of godsOf(E.GODS)) {
            const godOuts = seeds.map((seed) => S.playOne(seed, god.id, S.ONI_TACTIC, difficulty, policy))
            outs.push(...godOuts)
            ;(perGodThen[`${difficulty}:${policy}`] ??= {})[god.id] = S.summarize(godOuts).thenRate
          }
          cells[`${difficulty}:${policy}`] = S.summarize(outs)
        }
        // ratio を変えたときの R3 判定（項目 1 と同じ総当り）。本番値 0.5 は項目 1 と同一なので省く
        const search: Record<string, Item1Diff> = {}
        if (ratio !== E0.RULES.enemyTactic.defaultHpRatio) {
          for (const difficulty of DIFFICULTIES) {
            const entries: { god: string; a: Analysis }[] = []
            for (const god of godsOf(E.GODS)) for (const seed of seeds) {
              const st = S.toR3Greedy(seed, god.id, S.ONI_TACTIC, difficulty)
              if (st) entries.push({ god: god.id, a: S.analyzeR3(st) })
            }
            search[difficulty] = aggregateAnalyses(entries)
          }
        }
        const probeN = S.startState(seedName(0), E.GODS[0].id, S.ONI_TACTIC, 'normal')
        const probeH = S.startState(seedName(0), E.GODS[0].id, S.ONI_TACTIC, 'hard')
        sweep[String(ratio)] = {
          threshold: { normal: S.thresholdOf(probeN), hard: S.thresholdOf(probeH) },
          need: { normal: probeN.enemy.maxHp - S.thresholdOf(probeN), hard: probeH.enemy.maxHp - S.thresholdOf(probeH) },
          cells,
          perGodThen,
          search,
        }
      }
    })
    // 比較基準：鬼将 enemy_02（しきい値の影響を受けない）
    const E1 = await loadEngine(null)
    const S1 = makeSim(E1)
    const baseline: Record<string, Summary> = {}
    for (const difficulty of DIFFICULTIES) for (const policy of POLICIES) {
      const outs: Outcome[] = []
      for (const god of godsOf(E1.GODS)) outs.push(...seeds.map((seed) => S1.playOne(seed, god.id, S1.BASELINE, difficulty, policy)))
      baseline[`${difficulty}:${policy}`] = S1.summarize(outs)
    }
    results.item5 = { decomposition, sweep, baselineEnemy02: baseline, ratios: RATIOS }
    console.log('ITEM5 ' + JSON.stringify(Object.fromEntries(RATIOS.map((r) => [r, Object.fromEntries(DIFFICULTIES.map((d) => [d, (sweep[String(r)] as { cells: Record<string, Summary> }).cells[`${d}:greedy`].thenRate]))]))))
  }, 3_600_000)

  it('結果を docs/evidence/lane1-threat-branch/decision-sim.json と DECISION_SIM_SUMMARY.md へ書く', async () => {
    const E = await loadEngine(null)
    const def = E.getEnemyDef(E.PILOT_ENEMY_IDS.oniTactic)
    const out = {
      at: new Date().toISOString(),
      seeds: SEEDS,
      gods: E.GODS.length,
      ratio: E.RULES.enemyTactic.defaultHpRatio,
      enemy09: { id: def.id, name: def.name, maxHp: def.maxHp },
      eps: EPS,
      lossPenalty: LOSS_PENALTY,
      altHands: ALT_HANDS,
      timingsSec: timings,
      ...results,
    }
    mkdirSync(OUT_DIR, { recursive: true })
    writeFileSync(`${OUT_DIR}/decision-sim.json`, JSON.stringify(out, null, 2))
    writeFileSync(`${OUT_DIR}/DECISION_SIM_SUMMARY.md`, renderSummary(out as unknown as SummaryInput))
    expect(results.item1).toBeDefined()
    expect(results.item5).toBeDefined()
  }, 600_000)
})

type Item2Diff = { pairs: number; flipRate: number; categoryChangeRate: number; thenFeasibilityChangeRate: number; decidablePairs: number; flipRateAmongBothDecidable: number | null; perGod: Record<string, { pairs: number; flips: number }> }
type Item3Diff = {
  n: number
  r3ActionDiffRate: number
  r3BranchDiffRate: number
  nonReaderStrictlyWorseRate: number
  nonReaderStrictlyBetterRate: number
  meanLossWhenWorse: number
  readerThenOrKillRate: number
  nonReaderThenOrKillRate: number
  outcomes: Record<string, Summary>
  perGod: Record<string, { n: number; actionDiff: number; valueLoss: number; readerScore: number; nonReaderScore: number }>
}
type SummaryInput = {
  at: string
  seeds: number
  ratio: number
  eps: typeof EPS
  enemy09: { name: string; maxHp: number }
  timingsSec: Record<string, number>
  item1: Record<Difficulty, Item1Diff>
  item2: Record<Difficulty, Item2Diff>
  item3: Record<Difficulty, Item3Diff>
  item5: {
    decomposition: Record<string, { n: number; need: { normal: number; hard: number; diff: number }; dealtByR4Mean: { normal: number; hard: number; diff: number }; dealtPerRoundMean: { normal: number[]; hard: number[] }; thenRate: { normal: number; hard: number }; counterfactual: { hpMultiplierOnly: number; atkPressureOnly: number } }>
    sweep: Record<string, { threshold: Record<string, number>; need: Record<string, number>; cells: Record<string, Summary>; perGodThen: Record<string, Record<string, number | null>>; search: Record<string, Item1Diff> }>
    baselineEnemy02: Record<string, Summary>
    ratios: number[]
  }
}

/** DECISION_SIM_SUMMARY.md を decision-sim.json と同じデータから生成する（手書きの表を置かない） */
function renderSummary(o: SummaryInput): string {
  const L: string[] = []
  L.push('# Threat Branch Pilot v1 — 追加検証 sim 結果（R3 攻守の迷い・手札依存・読む価値・hard 偏り）')
  L.push('')
  L.push(`生成：${o.at}（\`SIM_THREAT_BRANCH=1 npx vitest run src/core/sim/threatBranchDecision.sim.test.ts\`。この表は \`decision-sim.json\` から生成）`)
  L.push('')
  L.push(`- 敵：${o.enemy09.name}（enemy_09・maxHp ${o.enemy09.maxHp}・本番しきい値 ${o.ratio}）。7 神 × seed ${o.seeds} × normal／hard。R3 開始局面は greedy で到達。乱数は seed のみ`)
  L.push(`- 価値＝以降を reader 方策で決着まで進めた素点（表示スコアは ×1.3）。非勝利は −1000。ε（迷う）＝ ${o.eps.tight}／${o.eps.main}／${o.eps.loose} 素点`)
  L.push(`- 所要秒：${JSON.stringify(o.timingsSec)}`)
  L.push('')
  L.push('## 項目 1：R3 の最善は「攻める（then／撃破）」か「守る（else 前提）」か')
  L.push('')
  L.push('| 難易度 | 局面 n | 既に then | then 到達不能 | 攻め優位 | 守り優位 | 迷う（ε10） | 迷う／判断可 | 迷う（ε5） | 迷う（ε20） | 答え固定（ε10） | 判断可で攻め最善 | 平均 need | 平均 potential | 平均葉数 |')
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
  for (const d of DIFFICULTIES) {
    const x = o.item1[d]
    const c = x.counts.main
    L.push(`| ${d} | ${x.n} | ${c.alreadyThen} | ${c.thenInfeasible} | ${c.attackDominant} | ${c.guardDominant} | ${c.contested}（${pct(x.rates.contestedOfAll.main)}） | ${pct(x.rates.contestedOfDecidable.main)} | ${pct(x.rates.contestedOfAll.tight)} | ${pct(x.rates.contestedOfAll.loose)} | ${pct(x.rates.answerFixedOfAll.main)} | ${pct(x.rates.optimalAttackOfDecidable)} | ${x.meanNeed} | ${x.meanPotential} | ${x.meanLeavesPerState} |`)
  }
  L.push('')
  L.push('Δ＝攻め側最善 − 守り側最善（素点）の分布（判断可局面）：')
  L.push('')
  L.push('| 難易度 | ≤−20 | (−20,−10] | (−10,−5) | [−5,5] | (5,10) | [10,20) | ≥20 | 平均Δ | 平均|Δ| |')
  L.push('|---|---|---|---|---|---|---|---|---|---|')
  for (const d of DIFFICULTIES) {
    const h = o.item1[d].delta.hist
    L.push(`| ${d} | ${h['<=-20'] ?? 0} | ${h['(-20,-10]'] ?? 0} | ${h['(-10,-5)'] ?? 0} | ${h['[-5,5]'] ?? 0} | ${h['(5,10)'] ?? 0} | ${h['[10,20)'] ?? 0} | ${h['>=20'] ?? 0} | ${o.item1[d].delta.mean} | ${o.item1[d].delta.meanAbs} |`)
  }
  L.push('')
  L.push('need（R3 開始時の敵 HP − しきい値）別：')
  L.push('')
  L.push('| 難易度 | need | n | 攻め最善 | 迷う（ε10） | then 到達不能 |')
  L.push('|---|---|---|---|---|---|')
  for (const d of DIFFICULTIES) for (const k of ['<=0', '1-10', '11-20', '21-30', '31-40', '>40']) {
    const b = o.item1[d].byNeed[k]
    if (b) L.push(`| ${d} | ${k} | ${b.n} | ${b.optimalAttack}（${pct(b.optimalAttack / b.n)}） | ${b.contested}（${pct(b.contested / b.n)}） | ${b.thenInfeasible} |`)
  }
  L.push('')
  L.push('神別（ε10）：')
  L.push('')
  L.push('| 難易度 | 神 | n | 既に then | 到達不能 | 攻め優位 | 守り優位 | 迷う | 迷う／判断可 | 判断可で攻め最善 | 平均 need | 平均 potential |')
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|')
  for (const d of DIFFICULTIES) for (const [god, g] of Object.entries(o.item1[d].perGod)) {
    L.push(`| ${d} | ${god} | ${g.n} | ${g.alreadyThen} | ${g.thenInfeasible} | ${g.attackDominant} | ${g.guardDominant} | ${g.contested} | ${pct(g.contestedRateOfDecidable)} | ${pct(g.optimalAttackRateOfDecidable)} | ${g.meanNeed} | ${g.meanPotential} |`)
  }
  L.push('')
  L.push('最善手の中身（判断可局面／迷う局面）：')
  L.push('')
  L.push('| 難易度 | 集合 | n | 守り最善が妨害札 | 守り最善が防御札 | 守り最善が R3 託宣 | 守り最善が 0 枚 | 攻め最善が R3 託宣 | 攻め最善が R3 撃破 | 攻め最善 枚数 | 守り最善 枚数 | 攻め最善 攻撃札 | 守り最善 攻撃札 | 攻め最善 託宣 加護/導き/天啓 | 守り最善 託宣 加護/導き/天啓 |')
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
  for (const d of DIFFICULTIES) for (const set of ['decidable', 'contested'] as const) {
    const f = o.item1[d].features[set]
    L.push(`| ${d} | ${set} | ${f.n} | ${pct(f.bestGuardUsesHinder)} | ${pct(f.bestGuardUsesGuardCard)} | ${pct(f.bestGuardUsesOracleR3)} | ${pct(f.bestGuardPlaysZeroCards)} | ${pct(f.bestAttackUsesOracleR3)} | ${pct(f.bestAttackKillsInR3)} | ${f.meanCardsBestAttack} | ${f.meanCardsBestGuard} | ${f.meanAttackCardsBestAttack} | ${f.meanAttackCardsBestGuard} | ${(f.oracleChoiceBestAttack as unknown as number[]).map(pct).join('/')} | ${(f.oracleChoiceBestGuard as unknown as number[]).map(pct).join('/')} |`)
  }
  L.push('')
  L.push('## 項目 2：手札だけを差し替えたとき最善（攻め／守り）が入れ替わる率')
  L.push('')
  L.push('| 難易度 | ペア n | 入れ替わり率 | カテゴリ変化率 | then 到達可否の変化率 | 両方判断可ペア | その中の入れ替わり率 |')
  L.push('|---|---|---|---|---|---|---|')
  for (const d of DIFFICULTIES) {
    const x = o.item2[d]
    L.push(`| ${d} | ${x.pairs} | ${pct(x.flipRate)} | ${pct(x.categoryChangeRate)} | ${pct(x.thenFeasibilityChangeRate)} | ${x.decidablePairs} | ${pct(x.flipRateAmongBothDecidable)} |`)
  }
  L.push('')
  L.push('神別（入れ替わり／ペア）：' + DIFFICULTIES.map((d) => `${d}：` + Object.entries(o.item2[d].perGod).map(([g, v]) => `${g} ${v.flips}/${v.pairs}`).join('・')).join('／'))
  L.push('')
  L.push('## 項目 3：読む（R4 分岐を知って探索）vs 読まない（R4＝鬼将の必殺 26 固定と信じて探索）')
  L.push('')
  L.push('| 難易度 | n | R3 行動差分率 | R4 分岐差分率 | 読まないが損 | 読まないが得 | 損の平均（素点） | reader then/撃破 | nonReader then/撃破 |')
  L.push('|---|---|---|---|---|---|---|---|---|')
  for (const d of DIFFICULTIES) {
    const x = o.item3[d]
    L.push(`| ${d} | ${x.n} | ${pct(x.r3ActionDiffRate)} | ${pct(x.r3BranchDiffRate)} | ${pct(x.nonReaderStrictlyWorseRate)} | ${pct(x.nonReaderStrictlyBetterRate)} | ${x.meanLossWhenWorse} | ${pct(x.readerThenOrKillRate)} | ${pct(x.nonReaderThenOrKillRate)} |`)
  }
  L.push('')
  L.push('| 難易度 | 方策 | 勝率 | 平均スコア（素点） | 平均残 HP | 平均決着R | then 率 | R4 で託宣 |')
  L.push('|---|---|---|---|---|---|---|---|')
  for (const d of DIFFICULTIES) for (const [p, s] of Object.entries(o.item3[d].outcomes)) {
    L.push(`| ${d} | ${p} | ${pct(s.winRate)} | ${s.meanScore} | ${s.meanPlayerHpEnd} | ${s.meanRound} | ${pct(s.thenRate)} | ${pct(s.oracleAtR4Rate)} |`)
  }
  L.push('')
  L.push('神別（reader − nonReader 平均スコア・行動差分）：')
  L.push('')
  L.push('| 難易度 | 神 | n | 行動差分 | 読まないが損 | reader | nonReader | 差 |')
  L.push('|---|---|---|---|---|---|---|---|')
  for (const d of DIFFICULTIES) for (const [g, v] of Object.entries(o.item3[d].perGod)) {
    L.push(`| ${d} | ${g} | ${v.n} | ${v.actionDiff} | ${v.valueLoss} | ${v.readerScore} | ${v.nonReaderScore} | ${+(v.readerScore - v.nonReaderScore).toFixed(1)} |`)
  }
  L.push('')
  L.push('## 項目 5：hard の then 率偏りの分解と、しきい値の実走')
  L.push('')
  L.push('### 5-1 分解（本番 0.5・同 seed 対）')
  L.push('')
  L.push('| 方策 | n | 必要ダメ normal | 必要ダメ hard | 与ダメ@R4 normal | 与ダメ@R4 hard | 与ダメ R1/R2/R3 normal | 同 hard | then normal | then hard | HP 倍率だけ | ATK 圧だけ |')
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|')
  for (const [p, x] of Object.entries(o.item5.decomposition)) {
    L.push(`| ${p} | ${x.n} | ${x.need.normal} | ${x.need.hard} | ${x.dealtByR4Mean.normal} | ${x.dealtByR4Mean.hard} | ${x.dealtPerRoundMean.normal.join('/')} | ${x.dealtPerRoundMean.hard.join('/')} | ${pct(x.thenRate.normal)} | ${pct(x.thenRate.hard)} | ${pct(x.counterfactual.hpMultiplierOnly)} | ${pct(x.counterfactual.atkPressureOnly)} |`)
  }
  L.push('')
  L.push('### 5-2 しきい値 0.5／0.55／0.6（enemy_09・全神 pooled）')
  L.push('')
  L.push('| ratio | 難易度 | then の HP 上限／必要ダメ | 方策 | 勝率 | 平均スコア | 平均残 HP | then 率 | HP比@R4 | R4 で託宣 | 鬼将 02 勝率（同方策） |')
  L.push('|---|---|---|---|---|---|---|---|---|---|---|')
  for (const r of o.item5.ratios) {
    const sw = o.item5.sweep[String(r)]
    for (const d of DIFFICULTIES) for (const p of POLICIES) {
      const s = sw.cells[`${d}:${p}`]
      const b = o.item5.baselineEnemy02[`${d}:${p}`]
      L.push(`| ${r} | ${d} | ≤${sw.threshold[d]}／${sw.need[d]} | ${p} | ${pct(s.winRate)} | ${s.meanScore} | ${s.meanPlayerHpEnd} | ${pct(s.thenRate)} | ${s.hpRatioAtR4Mean ?? '—'} | ${pct(s.oracleAtR4Rate)} | ${pct(b.winRate)} |`)
    }
  }
  L.push('')
  L.push('神別 then 率（greedy）：')
  L.push('')
  const gods = Object.keys(o.item5.sweep[String(o.item5.ratios[0])].perGodThen['normal:greedy'] ?? {})
  L.push('| ratio | 難易度 | ' + gods.join(' | ') + ' |')
  L.push('|---|---|' + gods.map(() => '---').join('|') + '|')
  for (const r of o.item5.ratios) for (const d of DIFFICULTIES) {
    const row = o.item5.sweep[String(r)].perGodThen[`${d}:greedy`]
    L.push(`| ${r} | ${d} | ` + gods.map((g) => pct(row[g])).join(' | ') + ' |')
  }
  L.push('')
  L.push('### 5-3 しきい値別の R3 判定（項目 1 と同じ総当り。0.5 は項目 1 の値）')
  L.push('')
  L.push('| ratio | 難易度 | need | 局面 n | 既に then | then 到達不能 | 攻め優位 | 守り優位 | 迷う（ε10） | 迷う／判断可 | 判断可で攻め最善 | 答え固定 |')
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|')
  for (const r of o.item5.ratios) for (const d of DIFFICULTIES) {
    const sw = o.item5.sweep[String(r)]
    const x = r === o.ratio ? o.item1[d] : sw.search[d]
    if (!x) continue
    const c = x.counts.main
    L.push(`| ${r} | ${d} | ${sw.need[d]} | ${x.n} | ${c.alreadyThen} | ${c.thenInfeasible} | ${c.attackDominant} | ${c.guardDominant} | ${c.contested}（${pct(x.rates.contestedOfAll.main)}） | ${pct(x.rates.contestedOfDecidable.main)} | ${pct(x.rates.optimalAttackOfDecidable)} | ${pct(x.rates.answerFixedOfAll.main)} |`)
  }
  L.push('')
  return L.join('\n')
}

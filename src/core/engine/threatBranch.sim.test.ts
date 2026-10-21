/// <reference types="node" />
import { mkdirSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GODS } from '../data/gods'
import { ENEMY_IDS, PILOT_ENEMY_IDS, getEnemyDef } from '../data/enemies'
import { getCardDef } from '../data/cards'
import { getRecommendedDeck } from '../data/deckBuilder'
import { DIVINATION_CHOICES } from '../data/divination'
import { RULES } from '../data/rules'
import type { CardInstance, Difficulty, EnemyId, GameState, GodId } from '../types'
import { applyAction } from './reducer'
import { enemyActionTotal } from './intent'

/**
 * Threat Branch Pilot v1：軍略（R4 分岐）の決定論シミュレーション（Planner ツール・既定ではスキップ）。
 * 決定274 忠次 Pilot の `shogunateTactic.sim.test.ts` を基に、方策 reader・難易度 hard・G3／G4 を足した。
 *
 *   SIM_THREAT_BRANCH=1 npx vitest run src/core/engine/threatBranch.sim.test.ts --reporter=verbose
 *
 * 走査：7 神 × seed 40 × 難易度 {normal, hard} × 方策 {greedy, raceAware, reader} × 敵 {enemy_02 鬼将（比較基準）, enemy_09 鬼将・軍略}
 *   greedy    ：攻撃優先・危険時のみ守る。託宣は余るか危険なときだけ（読まない）
 *   reader    ：カードは greedy と同じ。託宣は予告を読む＝必殺の予告が出たラウンドに加護、余りは天啓（既存基準＝HDD 監査の reader）
 *   raceAware ：reader ＋ R3 に「しきい値越え」を狙う（攻撃札を全部・足りなければ天啓。届かないなら妨害札を先に置く）。R4 必殺なら加護
 * Gate：
 *   G1 then 率（normal・全神・greedy）が 35〜65%（全員 then／全員 else なら分岐が無い）
 *   G2 raceAware の勝率 ≥ greedy かつ平均スコア > greedy（enemy_09・normal）＝読みの報酬が攻撃側に乗る
 *   G3 enemy_09 の reader 勝率が enemy_02 の reader 勝率 ±3pt 以内（normal）＝難しくしすぎない
 *   G4 enemy_09 で「R3 のカード選択（最大ダメージ札 vs 妨害＝守り札）」が結果（then／else・勝敗）を変えた seed の割合
 * 候補しきい値 0.45／0.50／0.55 の then 率を R4 開始時 HP 比の分布から同時に出す。
 * 結果は docs/evidence/lane1-threat-branch/sim.json と SIMULATION_SUMMARY.md（表は同じデータから生成）へ書く。
 * 乱数は seed のみ（Math.random 不使用）。
 */
const RUN = !!process.env.SIM_THREAT_BRANCH
const SEEDS = 40
const ONI_TACTIC = PILOT_ENEMY_IDS.oniTactic
const BASELINE = ENEMY_IDS.oni
const ENEMIES_UNDER_TEST: EnemyId[] = [BASELINE, ONI_TACTIC]
const DIFFICULTIES: Difficulty[] = ['normal', 'hard']
const CANDIDATE_RATIOS = [0.45, 0.5, 0.55]
const OUT_DIR = 'docs/evidence/lane1-threat-branch'

type Policy = 'greedy' | 'raceAware' | 'reader'
const POLICIES: Policy[] = ['greedy', 'raceAware', 'reader']
type Outcome = {
  status: string
  round: number
  hpRatioAtR4: number | null
  branch: 'then' | 'else' | null
  score: number
  playerHpEnd: number
  oracleRounds: number[]
}

const costOf = (c: CardInstance) => getCardDef(c.defId).cost + (c.costModifier ?? 0)
const damageOf = (c: CardInstance) => getCardDef(c.defId).effects.reduce((s, e) => s + (e.kind === 'damage' && e.target === 'enemy' ? e.amount : 0), 0)
const blockOf = (c: CardInstance) => getCardDef(c.defId).effects.reduce((s, e) => s + (e.kind === 'block' ? e.amount : 0), 0)
const isHinder = (c: CardInstance) => getCardDef(c.defId).effects.some((e) => e.kind === 'debuff' && e.target === 'enemy' && e.stat === 'atk')
const hinderValue = (c: CardInstance) => getCardDef(c.defId).effects.reduce((s, e) => s + (e.kind === 'debuff' && e.target === 'enemy' && e.stat === 'atk' ? e.amount * e.rounds : 0), 0)
const incomingOf = (s: GameState) => (s.enemy.intent ? enemyActionTotal(s.enemy.intent) : 0)
const dangerous = (s: GameState) => s.player.hp - Math.max(0, incomingOf(s) - s.player.block) < s.player.maxHp * 0.35
const intentIsSpecial = (s: GameState) => s.enemy.intent?.kind === 'special' || (s.enemy.intent?.kind === 'multiAttack' && !!s.enemy.intent.special)
const KAGO = 0 // DIVINATION_CHOICES の並び：加護・導き・天啓
const TENKEI = 2
const tenkeiDamage = DIVINATION_CHOICES[TENKEI].effects.reduce((s, e) => s + (e.kind === 'damage' ? e.amount : 0), 0)
const canOracle = (s: GameState) => s.divination.remaining > 0 && !s.divination.usedThisRound
const hasTacticAtR4 = (enemyId: EnemyId) => getEnemyDef(enemyId).actions[3]?.kind === 'tactic'
// v1.1：しきい値は難易度別（RULES.enemyTactic.hpRatioByDifficulty。normal は defaultHpRatio と同値）
const thresholdOf = (s: GameState) => Math.floor(s.enemy.maxHp * (RULES.enemyTactic.hpRatioByDifficulty[s.difficulty] ?? RULES.enemyTactic.defaultHpRatio))

const affordable = (s: GameState) => s.hand.filter((c) => costOf(c) <= s.ap.current)
const bestAttack = (cards: CardInstance[]) => cards.filter((c) => damageOf(c) > 0).sort((a, b) => damageOf(b) - damageOf(a))[0] ?? null
const bestGuard = (cards: CardInstance[]) => cards.filter((c) => blockOf(c) > 0).sort((a, b) => blockOf(b) - blockOf(a))[0] ?? null
const bestHinder = (cards: CardInstance[]) => cards.filter(isHinder).sort((a, b) => hinderValue(b) - hinderValue(a))[0] ?? null

/** greedy／reader のカード選択：攻撃優先・危険時のみ守る */
function pickCardGreedy(s: GameState): CardInstance | null {
  const cards = affordable(s)
  if (cards.length === 0) return null
  if (dangerous(s) && s.player.block < incomingOf(s)) {
    const guard = bestGuard(cards)
    if (guard) return guard
  }
  return bestAttack(cards) ?? cards.sort((a, b) => costOf(a) - costOf(b))[0]
}

/** raceAware の R3（tactic 敵のみ）：しきい値を越せるなら攻撃札を全部、越せないなら妨害札を先に */
function pickCardRaceR3(s: GameState): CardInstance | null {
  const cards = affordable(s)
  if (cards.length === 0) return null
  const need = s.enemy.hp - thresholdOf(s)
  if (need <= 0) return bestAttack(cards) ?? bestHinder(cards) ?? cards[0]
  const potential = cards.filter((c) => damageOf(c) > 0).reduce((sum, c) => sum + damageOf(c), 0) + (canOracle(s) ? tenkeiDamage : 0)
  if (potential >= need) return bestAttack(cards) ?? cards[0]
  return bestHinder(cards) ?? bestAttack(cards) ?? cards[0]
}

function chooseOracle(s: GameState, policy: Policy, enemyId: EnemyId): number | null {
  if (!canOracle(s)) return null
  const roundsLeft = RULES.totalRounds - s.round + 1
  if (policy === 'greedy') {
    if (s.divination.remaining >= roundsLeft || dangerous(s)) return dangerous(s) ? KAGO : TENKEI
    return null
  }
  // reader／raceAware：必殺の予告には加護。危険なら加護。余るなら天啓
  if (policy === 'raceAware' && hasTacticAtR4(enemyId) && s.round === 3) {
    const need = s.enemy.hp - thresholdOf(s)
    if (need > 0 && need <= tenkeiDamage) return TENKEI
    if (need <= 0) return null // 越えた。R4 の加護へ温存
  }
  if (intentIsSpecial(s)) return KAGO
  if (dangerous(s)) return KAGO
  if (s.divination.remaining >= roundsLeft) return TENKEI
  return null
}

function startState(seed: string, godId: GodId, enemyId: EnemyId, difficulty: Difficulty): GameState {
  return applyAction(null, { type: 'START_GAME', seed, godId, enemyId, deck: getRecommendedDeck(godId), difficulty }).state
}

type Trace = { hpRatioAtR4: number | null; branch: Outcome['branch']; oracleRounds: number[] }

function observeR4(s: GameState, enemyId: EnemyId, trace: Trace): void {
  if (s.round === 4 && trace.hpRatioAtR4 === null) {
    trace.hpRatioAtR4 = s.enemy.hp / s.enemy.maxHp
    if (hasTacticAtR4(enemyId)) trace.branch = intentIsSpecial(s) ? 'else' : 'then'
  }
}

/** 指定方策で決着まで進める（`from` が与えられればその盤面から） */
function playOut(from: GameState, enemyId: EnemyId, policy: Policy, trace: Trace): Outcome {
  let s = from
  let guard = 0
  while (s.status === 'playing' && guard++ < 500) {
    observeR4(s, enemyId, trace)
    const raceR3 = policy === 'raceAware' && hasTacticAtR4(enemyId) && s.round === 3
    const card = raceR3 ? pickCardRaceR3(s) : pickCardGreedy(s)
    if (card) {
      s = applyAction(s, { type: 'PLAY_CARD', uid: card.uid }).state
      continue
    }
    const choice = chooseOracle(s, policy, enemyId)
    if (choice !== null) {
      trace.oracleRounds.push(s.round)
      s = applyAction(s, { type: 'USE_DIVINATION', choiceIndex: choice }).state
      continue
    }
    s = applyAction(s, { type: 'END_ROUND' }).state
  }
  observeR4(s, enemyId, trace)
  return { status: s.status, round: s.round, hpRatioAtR4: trace.hpRatioAtR4, branch: trace.branch, score: s.score.total, playerHpEnd: s.player.hp, oracleRounds: trace.oracleRounds }
}

function playOne(seed: string, godId: GodId, enemyId: EnemyId, difficulty: Difficulty, policy: Policy): Outcome {
  return playOut(startState(seed, godId, enemyId, difficulty), enemyId, policy, { hpRatioAtR4: null, branch: null, oracleRounds: [] })
}

/** greedy で R3 開始（カード使用前）まで進める。R3 に到達できなければ null */
function toR3Greedy(seed: string, godId: GodId, enemyId: EnemyId, difficulty: Difficulty): GameState | null {
  let s = startState(seed, godId, enemyId, difficulty)
  let guard = 0
  while (s.status === 'playing' && s.round < 3 && guard++ < 200) {
    const card = pickCardGreedy(s)
    if (card) {
      s = applyAction(s, { type: 'PLAY_CARD', uid: card.uid }).state
      continue
    }
    const choice = chooseOracle(s, 'greedy', enemyId)
    if (choice !== null) {
      s = applyAction(s, { type: 'USE_DIVINATION', choiceIndex: choice }).state
      continue
    }
    s = applyAction(s, { type: 'END_ROUND' }).state
  }
  return s.status === 'playing' && s.round === 3 ? s : null
}

/** G4：R3 だけ手を変える（A＝攻撃札を全部／B＝妨害札を先に置いて残りで攻撃）。R3 の託宣は使わない。R4 以降は greedy */
function forkR3(r3: GameState, enemyId: EnemyId, variant: 'attack' | 'hinderFirst'): Outcome {
  let s = r3
  let guard = 0
  while (s.status === 'playing' && s.round === 3 && guard++ < 50) {
    const cards = affordable(s)
    const card = variant === 'attack' ? bestAttack(cards) : (bestHinder(cards) ?? bestAttack(cards))
    if (!card) break
    s = applyAction(s, { type: 'PLAY_CARD', uid: card.uid }).state
  }
  if (s.status === 'playing' && s.round === 3) s = applyAction(s, { type: 'END_ROUND' }).state
  return playOut(s, enemyId, 'greedy', { hpRatioAtR4: null, branch: null, oracleRounds: [] })
}

type Summary = ReturnType<typeof summarize>
function summarize(outs: Outcome[]) {
  const n = outs.length
  const won = outs.filter((o) => o.status === 'won').length
  const reachedR4 = outs.filter((o) => o.hpRatioAtR4 !== null)
  const thenCount = outs.filter((o) => o.branch === 'then').length
  const ratios = reachedR4.map((o) => o.hpRatioAtR4 as number)
  const candidate = Object.fromEntries(CANDIDATE_RATIOS.map((r) => [String(r), reachedR4.length ? +(ratios.filter((x) => x <= r).length / reachedR4.length).toFixed(3) : null]))
  const oracleR4 = outs.filter((o) => o.oracleRounds.includes(4)).length
  return {
    n,
    winRate: +(won / n).toFixed(3),
    status: outs.reduce<Record<string, number>>((acc, o) => ((acc[o.status] = (acc[o.status] ?? 0) + 1), acc), {}),
    reachedR4: reachedR4.length,
    thenRate: reachedR4.length && outs.some((o) => o.branch !== null) ? +(thenCount / reachedR4.length).toFixed(3) : null,
    hpRatioAtR4Mean: ratios.length ? +(ratios.reduce((a, b) => a + b, 0) / ratios.length).toFixed(3) : null,
    thenRateByCandidateRatio: candidate,
    meanScore: +(outs.reduce((a, o) => a + o.score, 0) / n).toFixed(1),
    meanRound: +(outs.reduce((a, o) => a + o.round, 0) / n).toFixed(2),
    oracleAtR4Rate: +(oracleR4 / n).toFixed(3),
  }
}

const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${(v * 100).toFixed(1)}%`)
const key = (enemyId: EnemyId, difficulty: Difficulty, policy: Policy) => `${enemyId}:${difficulty}:${policy}`

describe.skipIf(!RUN)('Threat Branch Pilot v1 — 軍略 分岐 sim（鬼将・軍略 enemy_09 vs 鬼将 enemy_02）', () => {
  it('7 神 × 40 seed × normal／hard × greedy／raceAware／reader × 2 敵、G1〜G4', () => {
    const seeds = Array.from({ length: SEEDS }, (_, i) => `threat-branch-${i}`)
    const perGod: Record<string, Record<string, Summary>> = {}
    const all: Record<string, Outcome[]> = {}
    const push = (k: string, o: Outcome) => (all[k] ??= []).push(o)
    for (const god of GODS) {
      const row: Record<string, Summary> = {}
      for (const enemyId of ENEMIES_UNDER_TEST) for (const difficulty of DIFFICULTIES) for (const policy of POLICIES) {
        const k = key(enemyId, difficulty, policy)
        const outs = seeds.map((seed) => playOne(seed, god.id, enemyId, difficulty, policy))
        outs.forEach((o) => push(k, o))
        row[k] = summarize(outs)
      }
      perGod[god.id] = row
    }
    const total = Object.fromEntries(Object.entries(all).map(([k, v]) => [k, summarize(v)])) as Record<string, Summary>

    // G4：R3 の手（攻撃全振り vs 妨害先置き）が結果を変えた seed の割合（enemy_09・normal／hard）
    const g4: Record<string, unknown> = {}
    for (const difficulty of DIFFICULTIES) {
      let reached = 0
      let withChoice = 0
      let branchFlip = 0
      let statusFlip = 0
      let eitherFlip = 0
      let scoreDiff = 0
      const perGodFlip: Record<string, { withChoice: number; eitherFlip: number }> = {}
      for (const god of GODS) {
        const pg = { withChoice: 0, eitherFlip: 0 }
        for (const seed of seeds) {
          const r3 = toR3Greedy(seed, god.id, ONI_TACTIC, difficulty)
          if (!r3) continue
          reached++
          const cards = affordable(r3)
          if (!bestHinder(cards) || !bestAttack(cards)) continue
          withChoice++
          pg.withChoice++
          const a = forkR3(r3, ONI_TACTIC, 'attack')
          const b = forkR3(r3, ONI_TACTIC, 'hinderFirst')
          const bf = a.branch !== b.branch
          const sf = (a.status === 'won') !== (b.status === 'won')
          if (bf) branchFlip++
          if (sf) statusFlip++
          if (bf || sf) {
            eitherFlip++
            pg.eitherFlip++
          }
          if (a.score !== b.score) scoreDiff++
        }
        perGodFlip[god.id] = pg
      }
      g4[difficulty] = {
        games: SEEDS * GODS.length,
        reachedR3: reached,
        withChoice,
        withChoiceRate: +(withChoice / Math.max(1, reached)).toFixed(3),
        branchFlip,
        branchFlipRate: +(branchFlip / Math.max(1, withChoice)).toFixed(3),
        statusFlip,
        statusFlipRate: +(statusFlip / Math.max(1, withChoice)).toFixed(3),
        eitherFlip,
        eitherFlipRate: +(eitherFlip / Math.max(1, withChoice)).toFixed(3),
        scoreDiffRate: +(scoreDiff / Math.max(1, withChoice)).toFixed(3),
        perGod: perGodFlip,
      }
    }

    // 決定論：同じ seed をもう一度回しても同じ結果
    const again = seeds.map((seed) => playOne(seed, GODS[0].id, ONI_TACTIC, 'normal', 'raceAware'))
    expect(JSON.stringify(again)).toBe(JSON.stringify(seeds.map((seed) => playOne(seed, GODS[0].id, ONI_TACTIC, 'normal', 'raceAware'))))

    // Gate 判定
    const t9 = (d: Difficulty, p: Policy) => total[key(ONI_TACTIC, d, p)]
    const t2 = (d: Difficulty, p: Policy) => total[key(BASELINE, d, p)]
    const g1Value = t9('normal', 'greedy').thenRate ?? 0
    const g1 = g1Value >= 0.35 && g1Value <= 0.65
    const g2 = t9('normal', 'raceAware').winRate >= t9('normal', 'greedy').winRate && t9('normal', 'raceAware').meanScore > t9('normal', 'greedy').meanScore
    const g3Diff = t9('normal', 'reader').winRate - t2('normal', 'reader').winRate
    const g3 = Math.abs(g3Diff) <= 0.03
    const g4n = g4.normal as { eitherFlipRate: number; branchFlipRate: number; statusFlipRate: number; withChoiceRate: number }
    const gates = {
      G1: { pass: g1, value: g1Value, range: [0.35, 0.65], note: 'then 率（enemy_09・normal・greedy・全神 pooled）', byPolicy: Object.fromEntries(POLICIES.map((p) => [p, t9('normal', p).thenRate])) },
      G2: {
        pass: g2,
        raceAware: { winRate: t9('normal', 'raceAware').winRate, meanScore: t9('normal', 'raceAware').meanScore },
        greedy: { winRate: t9('normal', 'greedy').winRate, meanScore: t9('normal', 'greedy').meanScore },
        reader: { winRate: t9('normal', 'reader').winRate, meanScore: t9('normal', 'reader').meanScore },
      },
      G3: { pass: g3, enemy09Reader: t9('normal', 'reader').winRate, enemy02Reader: t2('normal', 'reader').winRate, diffPt: +(g3Diff * 100).toFixed(1), hard: { enemy09Reader: t9('hard', 'reader').winRate, enemy02Reader: t2('hard', 'reader').winRate } },
      G4: { informational: true, eitherFlipRate: g4n.eitherFlipRate, branchFlipRate: g4n.branchFlipRate, statusFlipRate: g4n.statusFlipRate, withChoiceRate: g4n.withChoiceRate },
    }

    const def = getEnemyDef(ONI_TACTIC)
    const out = {
      at: new Date().toISOString(),
      seeds: SEEDS,
      gods: GODS.length,
      ratio: RULES.enemyTactic.defaultHpRatio,
      enemy09: { id: ONI_TACTIC, name: def.name, maxHp: def.maxHp, threshold: Math.floor(def.maxHp * RULES.enemyTactic.defaultHpRatio) },
      baseline: { id: BASELINE, name: getEnemyDef(BASELINE).name },
      policies: POLICIES,
      difficulties: DIFFICULTIES,
      gates,
      total,
      g4,
      perGod,
    }
    mkdirSync(OUT_DIR, { recursive: true })
    writeFileSync(`${OUT_DIR}/sim.json`, JSON.stringify(out, null, 2))
    writeFileSync(`${OUT_DIR}/SIMULATION_SUMMARY.md`, renderSummary(out))
    console.log('SIM_GATES ' + JSON.stringify(gates))
    expect(total[key(ONI_TACTIC, 'normal', 'greedy')].n).toBe(SEEDS * GODS.length)
  })
})

/** SIMULATION_SUMMARY.md を sim.json と同じデータから生成する（手書きの表を置かない） */
function renderSummary(out: {
  at: string
  seeds: number
  ratio: number
  enemy09: { name: string; maxHp: number; threshold: number }
  baseline: { name: string }
  gates: Record<string, unknown>
  total: Record<string, Summary>
  g4: Record<string, unknown>
  perGod: Record<string, Record<string, Summary>>
}): string {
  const L: string[] = []
  L.push('# Threat Branch Pilot v1 — 決定論シミュレーション結果')
  L.push('')
  L.push(`生成：${out.at}（\`SIM_THREAT_BRANCH=1 npx vitest run src/core/engine/threatBranch.sim.test.ts\`。この表は \`sim.json\` から生成）`)
  L.push('')
  L.push(`- 敵：${out.enemy09.name}（enemy_09・maxHp ${out.enemy09.maxHp}・しきい値 ${out.ratio} → HP ${out.enemy09.threshold} 以下で then）／比較：${out.baseline.name}（enemy_02）`)
  L.push(`- 7 神 × seed ${out.seeds} × normal／hard × greedy／raceAware／reader。乱数は seed のみ`)
  L.push('')
  L.push('## Gate')
  L.push('')
  L.push('```json')
  L.push(JSON.stringify(out.gates, null, 2))
  L.push('```')
  L.push('')
  L.push('## 全神 pooled（n = 280）')
  L.push('')
  L.push('| 敵 | 難易度 | 方策 | 勝率 | 平均スコア | 平均決着R | R4到達 | then率 | HP比@R4 平均 | then@0.45 | then@0.50 | then@0.55 | R4で託宣 |')
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
  for (const enemyId of ENEMIES_UNDER_TEST) for (const difficulty of DIFFICULTIES) for (const policy of POLICIES) {
    const s = out.total[key(enemyId, difficulty, policy)]
    const c = s.thenRateByCandidateRatio
    L.push(`| ${enemyId} | ${difficulty} | ${policy} | ${pct(s.winRate)} | ${s.meanScore} | ${s.meanRound} | ${s.reachedR4}/${s.n} | ${pct(s.thenRate)} | ${s.hpRatioAtR4Mean ?? '—'} | ${pct(c['0.45'])} | ${pct(c['0.5'])} | ${pct(c['0.55'])} | ${pct(s.oracleAtR4Rate)} |`)
  }
  L.push('')
  L.push('## 神別（normal）：勝率 / then 率')
  L.push('')
  L.push('| 神 | 02 greedy | 02 reader | 09 greedy | 09 raceAware | 09 reader | 09 then(greedy) | 09 then(raceAware) | 09 then(reader) |')
  L.push('|---|---|---|---|---|---|---|---|---|')
  for (const [god, row] of Object.entries(out.perGod)) {
    const g = (e: EnemyId, p: Policy) => row[key(e, 'normal', p)]
    L.push(`| ${god} | ${pct(g(BASELINE, 'greedy').winRate)} | ${pct(g(BASELINE, 'reader').winRate)} | ${pct(g(ONI_TACTIC, 'greedy').winRate)} | ${pct(g(ONI_TACTIC, 'raceAware').winRate)} | ${pct(g(ONI_TACTIC, 'reader').winRate)} | ${pct(g(ONI_TACTIC, 'greedy').thenRate)} | ${pct(g(ONI_TACTIC, 'raceAware').thenRate)} | ${pct(g(ONI_TACTIC, 'reader').thenRate)} |`)
  }
  L.push('')
  L.push('## 神別（hard）：勝率')
  L.push('')
  L.push('| 神 | 02 greedy | 02 reader | 09 greedy | 09 raceAware | 09 reader | 09 then(greedy) |')
  L.push('|---|---|---|---|---|---|---|')
  for (const [god, row] of Object.entries(out.perGod)) {
    const g = (e: EnemyId, p: Policy) => row[key(e, 'hard', p)]
    L.push(`| ${god} | ${pct(g(BASELINE, 'greedy').winRate)} | ${pct(g(BASELINE, 'reader').winRate)} | ${pct(g(ONI_TACTIC, 'greedy').winRate)} | ${pct(g(ONI_TACTIC, 'raceAware').winRate)} | ${pct(g(ONI_TACTIC, 'reader').winRate)} | ${pct(g(ONI_TACTIC, 'greedy').thenRate)} |`)
  }
  L.push('')
  L.push('## G4：R3 の手（攻撃全振り vs 妨害先置き）が結果を変えた割合（enemy_09・R3 以降は greedy・R3 の託宣なし）')
  L.push('')
  L.push('```json')
  L.push(JSON.stringify(out.g4, null, 2))
  L.push('```')
  L.push('')
  return L.join('\n')
}

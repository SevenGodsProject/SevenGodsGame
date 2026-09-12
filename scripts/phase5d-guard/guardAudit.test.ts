import { describe, expect, it } from 'vitest'
import { GODS } from '../../src/core/data/gods.js'
import { ENEMIES } from '../../src/core/data/enemies.js'
import { getCardDef } from '../../src/core/data/cards/index.js'
import { getRecommendedDeck } from '../../src/core/data/deckBuilder.js'
import { DIVINATION_CHOICES } from '../../src/core/data/divination.js'
import { RULES } from '../../src/core/data/rules.js'
import { applyAction } from '../../src/core/engine/reducer.js'
import { previewBonusTrigger } from '../../src/core/engine/cardBonus.js'
import { enemyActionTotal } from '../../src/core/engine/intent.js'
import type { StakeChoiceId } from '../../src/core/data/stakes.js'
import type { CardDef, CardDefId, CardInstance, Effect, EnemyId, GameState, GodId } from '../../src/core/types/index.js'

/**
 * Phase 5-D：神託「加護」の予告連動化（`blockOfIntent`）の ratio を決めるための計測。
 *   P5D_RUN=1 npx vitest run scripts/phase5d-guard/guardAudit.test.ts --reporter=verbose
 *   P5D_CONFIGS="base,r40" で対象を絞れる
 *
 * ★2つのレンズ
 *   1. **STAKE-01 レンズ**：`balanceSim.test.ts` の STAKE-01 と同じ方策と集計（3戦略・blind・
 *      託宣は「defensive か balanced で危険なら加護、それ以外は天啓」）。本番の難易度ゲートと
 *      直接比べられる。神別・敵別・ラウンド・被ダメ・スコア・BURST・bonus もここで取る。
 *   2. **託宣の選び方レンズ**：balanced・aware（条件を狙う）方策で、託宣を使う場面ごとに
 *      「加護／導き／天啓／使わずに温存」の4通りをそれぞれ**最後まで打ち切り**（rollout）、
 *      一番良い結果になった手を選ぶ。＝**先を読んで託宣を選ぶプレイヤー**の近似。
 *      このプレイヤーが「大技の予告ラウンド」と「そうでないラウンド」でどれだけ加護を選ぶかが、
 *      「危険だから使う」が成立しているか／「毎ラウンドとりあえず加護」になっていないかの判定材料。
 *
 * ★大技の定義
 * 予告合計（`enemyActionTotal`＝UIの予告表示と同じ値）が `RULES.cardBonus.enemyBigThreshold`
 * （内部10＝表示100）以上。カード条件 `enemyBig` と同じ線を使う。
 */

const RUN = process.env.P5D_RUN === '1'

type Strategy = 'balanced' | 'aggressive' | 'defensive'
type Policy = 'blind' | 'aware'

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

// --- 対局 ----------------------------------------------------------------------------

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
  /** 託宣レンズ用：託宣を使える場面ごとの記録 */
  decisions: Array<{ big: boolean; pick: number; lethal: boolean }>
  bigRounds: number
  bigRoundsNoDivination: number
}

function start(seed: string, godId: GodId, deck: CardDefId[], enemyId: EnemyId, stake: number, choice?: StakeChoiceId) {
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
  }).state
}

/** rollout の評価値：勝ちを最優先、勝つなら残りHP、負けるなら敵の残りHPが少ないほど良い */
function valueOf(g: { win: boolean; hp: number; enemyHp: number; round: number }): number {
  return g.win ? 100000 + g.hp * 10 : g.round - g.enemyHp * 10
}

/**
 * 1局を最後まで進める。
 * `chooser` が 'rollout' のとき、託宣を使える場面ごとに4通りを打ち切って最良を選ぶ
 * （打ち切りの中では固定の選び方を使う＝再帰しない）。
 */
function play(
  state0: GameState,
  strategy: Strategy,
  policy: Policy,
  chooser: 'fixed' | 'rollout',
): Game {
  let state = state0
  const g: Game = { win: false, round: 0, score: 0, hp: 0, enemyHp: 0, damageTaken: 0, bonus: 0, burst: 0, divergences: 0, decisions: [], bigRounds: 0, bigRoundsNoDivination: 0 }
  let skippedThisRound = -1
  let guard = 0
  while (state.status === 'playing' && guard < 600) {
    guard++
    if (state.phase !== 'playerTurn') break
    const card = pickCard(state, strategy, policy)
    if (card) {
      const other = pickCard(state, strategy, policy === 'aware' ? 'blind' : 'aware')
      if (other && other.uid !== card.uid) g.divergences++
      const r = applyAction(state, { type: 'PLAY_CARD', uid: card.uid })
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
        // 4通り（0加護・1導き・2天啓・-1使わない）を最後まで打ち切る。同点は「加護以外」を優先する
        // （加護の選択率を過大に見積もらないための保守的な寄せ方）
        let best = -Infinity
        for (const option of [2, 1, -1, 0]) {
          const branch =
            option === -1
              ? applyAction(state, { type: 'END_ROUND' }).state
              : applyAction(state, { type: 'USE_DIVINATION', choiceIndex: option }).state
          const out = play(branch, strategy, policy, 'fixed')
          const v = valueOf(out)
          if (v > best) {
            best = v
            pick = option
          }
        }
        g.decisions.push({ big: incomingOf(state) >= RULES.cardBonus.enemyBigThreshold, pick, lethal: incomingOf(state) - state.player.block >= state.player.hp })
      }
      if (pick === -1) {
        skippedThisRound = state.round
        continue
      }
      state = applyAction(state, { type: 'USE_DIVINATION', choiceIndex: pick }).state
      continue
    }
    if (incomingOf(state) >= RULES.cardBonus.enemyBigThreshold) {
      g.bigRounds++
      if (state.divination.remaining <= 0) g.bigRoundsNoDivination++
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
  return g
}

// --- 設定（加護の中身を実行時に差し替える） ------------------------------------------

const guardChoice = DIVINATION_CHOICES[0] as { effects: Effect[] }
const ORIGINAL_EFFECTS = guardChoice.effects
/** Phase 5-B（旧加護）：HP+3・ブロック+2 */
const OLD_GUARD: Effect[] = [
  { kind: 'heal', amount: 3 },
  { kind: 'block', amount: 2 },
]
const newGuard = (ratio: number): Effect[] => [{ kind: 'blockOfIntent', ratio, min: RULES.divination.guardMin }]

const CONFIGS: Array<[string, Effect[]]> = [
  ['base', OLD_GUARD],
  ['r35', newGuard(0.35)],
  ['r40', newGuard(0.4)],
  ['r45', newGuard(0.45)],
  ['r50', newGuard(0.5)],
  // 診断用：神階Ⅳ以降のブロック効率0.75を打ち消した等価（0.5/0.75）。採用候補ではない
  ['r67diag', newGuard(0.667)],
]

const SEEDS = 6
const STRATEGIES: Strategy[] = ['aggressive', 'balanced', 'defensive']
const CHOICES: Array<StakeChoiceId | undefined> = [undefined, 'race', 'tempo']
const NUM = ['通常', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ']
const f0 = (n: number) => n.toFixed(0)
const f2 = (n: number) => n.toFixed(2)

/** STAKE-01 と同じ集計 */
function stake01(stake: number) {
  let W = 0
  let N = 0
  const godBest: Record<string, number> = {}
  const enemy: Record<string, { w: number; n: number }> = {}
  const acc = { round: 0, dmg: 0, score: 0, bonus: 0, burst: 0, games: 0 }
  for (const god of GODS) {
    const deck = getRecommendedDeck(god.id)
    let best = 0
    for (const choice of stake === 7 ? CHOICES : [undefined]) {
      for (const strategy of STRATEGIES) {
        let w = 0
        let n = 0
        for (const e of ENEMIES) {
          for (let i = 0; i < SEEDS; i++) {
            const s0 = start(`stake-${stake}-${god.id}-${e.id}-${strategy}-${choice ?? 'p'}-${i}`, god.id, deck, e.id, stake, choice)
            const r = play(s0, strategy, 'blind', 'fixed')
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
              acc.games++
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
    godBest,
    spread: Math.max(...bestVals) - Math.min(...bestVals),
    enemy: Object.fromEntries(Object.entries(enemy).map(([k, v]) => [k, (v.w / v.n) * 100])),
    round: acc.round / acc.games,
    dmg: acc.dmg / acc.games,
    score: acc.score / acc.games,
    bonus: acc.bonus / acc.games,
    burst: acc.burst / acc.games,
  }
}

/** 託宣の選び方レンズ（balanced・aware・rollout）と、Phase 5-A 指標（aware の bonus・選択差・BURST） */
function divinationLens(stake: number) {
  let big = 0
  let bigGuard = 0
  let small = 0
  let smallGuard = 0
  let skip = 0
  let decisions = 0
  let wins = 0
  let games = 0
  const pickCount = [0, 0, 0]
  const aw = { bonus: 0, div: 0, burst: 0 }
  const godW: Record<string, { w: number; n: number }> = {}
  const enW: Record<string, { w: number; n: number }> = {}
  let bigRounds = 0
  let bigNoDiv = 0
  let lethal = 0
  let lethalGuard = 0
  for (const god of GODS) {
    const deck = getRecommendedDeck(god.id)
    for (const e of ENEMIES) {
      for (let i = 0; i < SEEDS; i++) {
        const s0 = start(`lens-${stake}-${god.id}-${e.id}-${i}`, god.id, deck, e.id, stake, stake === 7 ? 'race' : undefined)
        const r = play(s0, 'balanced', 'aware', 'rollout')
        games++
        if (r.win) wins++
        const gw = (godW[god.id] ??= { w: 0, n: 0 })
        gw.n++
        if (r.win) gw.w++
        const ew = (enW[e.id] ??= { w: 0, n: 0 })
        ew.n++
        if (r.win) ew.w++
        bigRounds += r.bigRounds
        bigNoDiv += r.bigRoundsNoDivination
        aw.bonus += r.bonus
        aw.div += r.divergences
        aw.burst += r.burst
        for (const d of r.decisions) {
          decisions++
          if (d.lethal) {
            lethal++
            if (d.pick === 0) lethalGuard++
          }
          if (d.pick === -1) skip++
          else pickCount[d.pick]++
          if (d.big) {
            big++
            if (d.pick === 0) bigGuard++
          } else {
            small++
            if (d.pick === 0) smallGuard++
          }
        }
      }
    }
  }
  return {
    win: (wins / games) * 100,
    guardBig: big ? (bigGuard / big) * 100 : 0,
    guardSmall: small ? (smallGuard / small) * 100 : 0,
    guardAll: decisions ? (pickCount[0] / decisions) * 100 : 0,
    mix: `加護${f0((pickCount[0] / decisions) * 100)}% 導き${f0((pickCount[1] / decisions) * 100)}% 天啓${f0((pickCount[2] / decisions) * 100)}% 温存${f0((skip / decisions) * 100)}%`,
    bigShare: decisions ? (big / decisions) * 100 : 0,
    bonus: aw.bonus / games,
    div: aw.div / games,
    burst: aw.burst / games,
    gods: GODS.map((g) => g.nameJa + f0((godW[g.id].w / godW[g.id].n) * 100)).join(' '),
    enemies: ENEMIES.map((e) => e.name.slice(0, 2) + f0((enW[e.id].w / enW[e.id].n) * 100)).join(' '),
    noDivShare: bigRounds ? (bigNoDiv / bigRounds) * 100 : 0,
    guardLethal: lethal ? (lethalGuard / lethal) * 100 : 0,
    lethalN: lethal,
  }
}

describe.skipIf(!RUN)('Phase 5-D 加護の ratio 比較', () => {
  it('候補ごとに STAKE-01・Ⅶ詳細・託宣の選び方を出す', { timeout: 30 * 60 * 1000 }, () => {
    const only = process.env.P5D_CONFIGS?.split(',').map((s) => s.trim())
    const targets = only ? CONFIGS.filter(([n]) => only.includes(n)) : CONFIGS
    const lines: string[] = []
    for (const [name, effects] of targets) {
      guardChoice.effects = effects
      const curve: string[] = []
      let s7: ReturnType<typeof stake01> | null = null
      for (let st = 1; st <= 7; st++) {
        const s = stake01(st)
        curve.push(f0(s.overall))
        if (st === 7) s7 = s
      }
      const gods = GODS.map((g) => `${g.nameJa}${f0(s7!.godBest[g.id])}`).join(' ')
      const enemies = ENEMIES.map((e) => `${e.name.slice(0, 2)}${f0(s7!.enemy[e.id])}`).join(' ')
      const lens = [0, 3, 5, 7].map((st) => {
        const d = divinationLens(st)
        const extra = st === 7 ? `
      Ⅶ rollout god ${d.gods} | enemy ${d.enemies} | 大技Rで託宣切れ ${f0(d.noDivShare)}% | 致死予告Rの加護 ${f0(d.guardLethal)}%（n=${d.lethalN}）` : ''
        return `    ${NUM[st]}: 勝率${f0(d.win)}% | 加護 大技${f0(d.guardBig)}% 通常${f0(d.guardSmall)}% 全体${f0(d.guardAll)}% (${d.mix}, 大技R比率${f0(d.bigShare)}%) | aware bonus${f2(d.bonus)} 選択差${f2(d.div)} BURST${f2(d.burst)}${extra}`
      })
      lines.push(
        `[${name}]\n  STAKE-01 Ⅰ→Ⅶ: ${curve.join(' / ')}\n` +
          `  Ⅶ god(best) ${gods} | spread ${f0(s7!.spread)}pt\n` +
          `  Ⅶ enemy ${enemies}\n` +
          `  Ⅶ R${f2(s7!.round)} 被ダメ${f0(s7!.dmg)} score${f0(s7!.score)} bonus${f2(s7!.bonus)} BURST${f2(s7!.burst)}\n` +
          `  託宣レンズ（balanced・aware・rollout）:\n${lens.join('\n')}`,
      )
    }
    guardChoice.effects = ORIGINAL_EFFECTS
    console.log('\n' + lines.join('\n\n'))
    expect(true).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { GODS, GOD_IDS } from '../../src/core/data/gods.js'
import { ENEMIES } from '../../src/core/data/enemies.js'
import { getCardDef } from '../../src/core/data/cards/index.js'
import { FUKUEI_CARD_IDS } from '../../src/core/data/cards/fukuei.js'
import { TAIYO_CARD_IDS } from '../../src/core/data/cards/taiyo.js'
import { SOBI_CARD_IDS } from '../../src/core/data/cards/sobi.js'
import { getRecommendedDeck } from '../../src/core/data/deckBuilder.js'
import { RULES } from '../../src/core/data/rules.js'
import { applyAction } from '../../src/core/engine/reducer.js'
import { previewBonusTrigger } from '../../src/core/engine/cardBonus.js'
import { enemyActionTotal } from '../../src/core/engine/intent.js'
import type { StakeChoiceId } from '../../src/core/data/stakes.js'
import type { CardBonus, CardDef, CardDefId, CardInstance, EnemyId, GameState, GodId } from '../../src/core/types/index.js'

/**
 * Phase 5-C：神専用カードの条件付き追加効果（bonus）の設計比較（実行時に `CardDef.bonus` を差し替えて
 * 候補を再現する。終了時に必ず元へ戻す）。
 *
 * ★Phase 5-C 実装後（決定159）の読み方
 *   本番のカードデータには 大耀「姉御の号令」「豪快な一撃」・蒼毘「反撃の刃」の bonus が入っている。
 *   BASE と各候補は、まずその3枚の bonus を外して **Phase 5-E の状態** に戻してから候補を足す。
 *   PROD は本番のデータそのまま。PILOT（5-E＋3枚）と PROD が完全一致することが、実装＝設計の確認になる。
 *   P5C_RUN=1 npx vitest run scripts/phase5c-god-cards/godCardsAudit.test.ts --reporter=verbose
 *   P5C_CONFIGS="BASE,F1"   対象を絞る
 *   P5C_SEEDS=6            seed数
 *   P5C_STAKES="3,5,7"     神階
 *
 * ★3つの方策
 *   fixed      … STAKE-01（blind・3戦略・神ごとに最良）。本番ゲートと同じ集計
 *   intent     … balanced・aware（今立つ条件を見る）・託宣は rollout（Phase 5-D/E のレンズ）
 *   cardaware  … intent に「1手先読み」を足す：このカードを先に出すと、手札の別のカードの
 *                条件が立つなら、その分も価値に足す（＝順番を組み替えるプレイヤーの近似）。
 *                得意技（福永の低HP・笑蓮の高HP）も価値に入れる
 *
 * ★神の「行動指紋」
 *   福永：HPが半分以下で始まったラウンドで攻撃した回数／回復せず低HPを維持した回数
 *   大耀：共鳴を先に積んでから攻撃した（共鳴4以上で攻撃札を出した）ラウンド数
 *   蒼毘：ブロックを得てから攻撃札を出したラウンド数
 *   全神：使ったカードの種別内訳、専用カードの使用率、専用 bonus の成立数、
 *         専用 bonus の有無で選ぶカードが変わった回数（同じ盤面で bonus を隠して選び直す）
 */

const RUN = process.env.P5C_RUN === '1'

type Strategy = 'balanced' | 'aggressive' | 'defensive'
type Policy = 'blind' | 'aware' | 'lookahead'
type Mod = { card: CardDefId; bonus: CardBonus }
/** production=true なら本番のカードデータのまま（Phase 5-C 実装後）。false なら 5-C の3枚の bonus を外した Phase 5-E から始める */
type Config = { name: string; mods: Mod[]; production?: boolean }

// --- 候補 ------------------------------------------------------------------------

const dmg = (n: number) => ({ kind: 'damage' as const, target: 'enemy' as const, amount: n })
const F1: Mod = { card: FUKUEI_CARD_IDS.fortuneStrike, bonus: { when: 'lowHp', effects: [{ kind: 'gainAp', amount: 1 }], textJa: 'HPが半分以下なら、神力+1。' } }
const F2: Mod = { card: FUKUEI_CARD_IDS.goddessOfLuck, bonus: { when: 'lowHp', effects: [{ kind: 'draw', amount: 1 }], textJa: 'HPが半分以下なら、カードを1枚引く。' } }
const F3: Mod = { card: FUKUEI_CARD_IDS.unbreakableStep, bonus: { when: 'lowHp', effects: [{ kind: 'resonance', amount: 1 }], textJa: 'HPが半分以下なら、共鳴ゲージ+1。' } }
const T1: Mod = { card: TAIYO_CARD_IDS.boldStrike, bonus: { when: 'charged', effects: [dmg(6)], textJa: '共鳴が4以上なら、敵に60ダメージ。' } }
const T2: Mod = { card: TAIYO_CARD_IDS.boldStrike, bonus: { when: 'charged', effects: [{ kind: 'resonance', amount: 2 }], textJa: '共鳴が4以上なら、共鳴ゲージ+2。' } }
const T3: Mod = { card: TAIYO_CARD_IDS.singleMinded, bonus: { when: 'combo', effects: [{ kind: 'resonance', amount: 1 }], textJa: 'このラウンド2枚目以降なら、共鳴ゲージ+1。' } }
const T4: Mod = { card: TAIYO_CARD_IDS.sisterlyCommand, bonus: { when: 'charged', effects: [{ kind: 'draw', amount: 1 }], textJa: '共鳴が4以上なら、カードを1枚引く。' } }
const S1: Mod = { card: SOBI_CARD_IDS.counterBlade, bonus: { when: 'blocked', effects: [dmg(6)], textJa: 'ブロックが敵の予告以上なら、敵に60ダメージ。' } }
const F4: Mod = { card: FUKUEI_CARD_IDS.adventurersInstinct, bonus: { when: 'lowHp', effects: [{ kind: 'resonance', amount: 2 }], textJa: 'HPが半分以下なら、共鳴ゲージ+2。' } }
const F5: Mod = { card: FUKUEI_CARD_IDS.fortuneStrike, bonus: { when: 'lowHp', effects: [{ kind: 'resonance', amount: 1 }], textJa: 'HPが半分以下なら、共鳴ゲージ+1。' } }
const T6: Mod = { card: TAIYO_CARD_IDS.sisterlyCommand, bonus: { when: 'charged', effects: [{ kind: 'buff', target: 'self', stat: 'atk', amount: 3, rounds: 1 }], textJa: '共鳴が4以上なら、さらに攻撃力+30（1ラウンド）。' } }
const T7: Mod = { card: TAIYO_CARD_IDS.boldStrike, bonus: { when: 'charged', effects: [dmg(4)], textJa: '共鳴が4以上なら、敵に40ダメージ。' } }
const T8: Mod = { card: TAIYO_CARD_IDS.singleMinded, bonus: { when: 'charged', effects: [dmg(4)], textJa: '共鳴が4以上なら、敵に40ダメージ。' } }
const S2: Mod = { card: SOBI_CARD_IDS.oathOfShield, bonus: { when: 'blocked', effects: [{ kind: 'resonance', amount: 1 }], textJa: 'ブロックが敵の予告以上なら、共鳴ゲージ+1。' } }

const CONFIGS: Config[] = [
  { name: 'BASE', mods: [] },
  { name: 'F1', mods: [F1] },
  { name: 'F2', mods: [F2] },
  { name: 'F12', mods: [F1, F2] },
  { name: 'F13', mods: [F1, F3] },
  { name: 'T1', mods: [T1] },
  { name: 'T2', mods: [T2] },
  { name: 'T23', mods: [T2, T3] },
  { name: 'T24', mods: [T2, T4] },
  { name: 'S1', mods: [S1] },
  { name: 'S12', mods: [S1, S2] },
  { name: 'F4', mods: [F4] },
  { name: 'F5', mods: [F5] },
  { name: 'F14', mods: [F1, F4] },
  { name: 'T6', mods: [T6] },
  { name: 'T7', mods: [T7] },
  { name: 'T8', mods: [T8] },
  { name: 'T67', mods: [T6, T7] },
  { name: 'T68', mods: [T6, T8] },
  // Phase 5-C 実装後の比較：本番そのまま、と3枚を1枚ずつ
  { name: 'PROD', mods: [], production: true },
  { name: 'CMD', mods: [T6] },
  { name: 'BOLD', mods: [T7] },
  { name: 'BLADE', mods: [S1] },
]
const COMBOS: Record<string, string[]> = { ALL: ['F12', 'T23', 'S1'], PA: ['F1', 'T1', 'S1'], PB: ['F4', 'T7', 'S1'], PC: ['F14', 'T67', 'S1'], PILOT: ['T67', 'S1'] }

const originals = new Map<CardDefId, CardBonus | undefined>()
/** Phase 5-C で本番に入った3枚 */
const PHASE5C_CARDS: CardDefId[] = [TAIYO_CARD_IDS.sisterlyCommand, TAIYO_CARD_IDS.boldStrike, SOBI_CARD_IDS.counterBlade]
function applyConfig(cfg: Config) {
  restoreAll()
  if (!cfg.production) {
    for (const id of PHASE5C_CARDS) {
      const def = getCardDef(id) as { bonus?: CardBonus }
      if (!originals.has(id)) originals.set(id, def.bonus)
      delete def.bonus
    }
  }
  for (const m of cfg.mods) {
    const def = getCardDef(m.card) as { bonus?: CardBonus }
    if (!originals.has(m.card)) originals.set(m.card, def.bonus)
    def.bonus = m.bonus
  }
}
function restoreAll() {
  for (const [id, b] of originals) {
    const def = getCardDef(id) as { bonus?: CardBonus }
    if (b) def.bonus = b
    else delete def.bonus
  }
}

// --- 価値関数（balanceSim の写し＋aware / lookahead） --------------------------------

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
const lowHp = (state: GameState) => state.player.hp <= Math.floor(state.player.maxHp * RULES.cardBonus.lowHpRatio)

function isDangerous(state: GameState): boolean {
  const projected = Math.max(0, incomingOf(state) - state.player.block)
  return state.player.hp - projected < state.player.maxHp * 0.35
}
function fixedDivination(state: GameState, strategy: Strategy): number {
  if (strategy === 'defensive' || (strategy === 'balanced' && isDangerous(state))) return 0
  return 2
}

/** 今立つ bonus の価値（maskGod なら専用カードの bonus を無いものとして扱う） */
function bonusValue(state: GameState, def: CardDef, maskGod: boolean): number {
  if (!def.bonus) return 0
  if (maskGod && def.godId) return 0
  if (!previewBonusTrigger(state, def)) return 0
  return damageOf(def, true) + blockOf(def, true) * 0.8 + healOf(def, true) * 0.8 + utilityOf(def, true)
}
/** 得意技の分（aware 以上）。福永：低HPで攻撃+50%、笑蓮：高HPで攻撃+50% */
function passiveValue(state: GameState, def: CardDef): number {
  const base = damageOf(def)
  if (base <= 0) return 0
  if (state.godId === GOD_IDS.fukuei && lowHp(state)) return base * RULES.godPassive.fukuei.bonusRatio
  if (state.godId === GOD_IDS.shouren && state.player.hp >= Math.ceil(state.player.maxHp * RULES.godPassive.shouren.hpRatio)) return base * RULES.godPassive.shouren.bonusRatio
  return 0
}
/** 1手先読み：このカードを先に出すと、他の手札の条件が新たに立つ分（最大1枚） */
function enableValue(state: GameState, c: CardInstance, policy: Policy, maskGod: boolean): number {
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
    const gain = bonusValue(after, def, maskGod) - bonusValue(state, def, maskGod)
    if (gain > best) best = gain
  }
  return best * 0.8
}
function valueOf(state: GameState, c: CardInstance, policy: Policy, maskGod: boolean): number {
  const def = getCardDef(c.defId)
  const base = damageOf(def) + blockOf(def) * 0.8 + healOf(def) * 0.8 + utilityOf(def)
  if (policy === 'blind') return base
  return base + bonusValue(state, def, maskGod) + passiveValue(state, def) + enableValue(state, c, policy, maskGod)
}

/** balanceSim の balanced/aggressive/defensive と同じ骨格（blind のとき STAKE-01 と一致） */
function pickCard(state: GameState, strategy: Strategy, policy: Policy, maskGod = false): CardInstance | null {
  const affordable = state.hand.filter((c) => costOf(c) <= state.ap.current)
  if (affordable.length === 0) return null
  const bonusPart = (c: CardInstance, kind: 'd' | 'b' | 'h' | 'u') => {
    if (policy === 'blind') return 0
    const def = getCardDef(c.defId)
    if (!def.bonus || (maskGod && def.godId) || !previewBonusTrigger(state, def)) return 0
    return kind === 'd' ? damageOf(def, true) : kind === 'b' ? blockOf(def, true) : kind === 'h' ? healOf(def, true) : utilityOf(def, true)
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
  // aware / lookahead：価値/コストで並べる（bonus・得意技・先読みを含む）
  const dmgv = (c: CardInstance) => damageOf(getCardDef(c.defId)) + bonusPart(c, 'd') + passiveValue(state, getCardDef(c.defId))
  const attackers = affordable.filter((c) => dmgv(c) > 0)
  const withValue = (list: CardInstance[]) => list.sort((a, c) => valueOf(state, c, policy, maskGod) / costOf(c) - valueOf(state, a, policy, maskGod) / costOf(a))
  if (attackers.length > 0) {
    // 攻撃札があるときも、先に置くと条件が立つ札（共鳴・防御）があれば価値で競わせる
    const top = withValue([...affordable])[0]
    return top
  }
  return withValue([...affordable])[0]
}

// --- 対局 ----------------------------------------------------------------------------

type Play = { type: string; defId: CardDefId; exclusive: boolean; bonus: boolean; low: boolean; res: number; block: number; hasRes: boolean; hasBlock: boolean; hasHeal: boolean; isAttack: boolean; changed: boolean }
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
  rounds: Array<{ lowStart: boolean; lowEnd: boolean; plays: Play[]; healAffordable: boolean }>
  guardUse: number
  divDecisions: number
}

function valueOfGame(g: { win: boolean; hp: number; enemyHp: number; round: number }): number {
  return g.win ? 100000 + g.hp * 10 : g.round - g.enemyHp * 10
}

function start(seed: string, godId: GodId, deck: CardDefId[], enemyId: EnemyId, stake: number, choice?: StakeChoiceId): GameState {
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

function play(state0: GameState, strategy: Strategy, policy: Policy, chooser: 'fixed' | 'rollout', recordChanges: boolean): Game {
  let state = state0
  const g: Game = { win: false, round: 0, score: 0, hp: 0, enemyHp: 0, damageTaken: 0, burst: 0, bonus: 0, godBonus: 0, plays: [], rounds: [], guardUse: 0, divDecisions: 0 }
  let skippedThisRound = -1
  let seenRound = -1
  let cur: Game['rounds'][number] | null = null
  let guard = 0
  while (state.status === 'playing' && guard < 600) {
    guard++
    if (state.phase !== 'playerTurn') break
    if (state.round !== seenRound) {
      seenRound = state.round
      cur = { lowStart: lowHp(state), lowEnd: false, plays: [], healAffordable: false }
      g.rounds.push(cur)
    }
    const card = pickCard(state, strategy, policy)
    if (card) {
      const def = getCardDef(card.defId)
      const changed = recordChanges ? pickCard(state, strategy, policy, true)?.uid !== card.uid : false
      if (cur && state.hand.some((c) => healOf(getCardDef(c.defId)) > 0 && costOf(c) <= state.ap.current)) cur.healAffordable = true
      const p: Play = {
        type: def.type, defId: def.id, exclusive: !!def.godId, bonus: false, low: lowHp(state), res: state.resonance.value, block: state.player.block,
        hasRes: def.effects.some((e) => e.kind === 'resonance'), hasBlock: blockOf(def) > 0, hasHeal: healOf(def) > 0, isAttack: def.type === 'attack', changed,
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
      cur?.plays.push(p)
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
      g.divDecisions++
      if (pick === 0) g.guardUse++
      if (pick === -1) {
        skippedThisRound = state.round
        continue
      }
      state = applyAction(state, { type: 'USE_DIVINATION', choiceIndex: pick }).state
      continue
    }
    if (cur) cur.lowEnd = lowHp(state)
    const hpBefore = state.player.hp
    const r = applyAction(state, { type: 'END_ROUND' })
    for (const e of r.events) if (e.t === 'RESONANCE_BURST') g.burst++
    state = r.state
    g.damageTaken += Math.max(0, hpBefore - state.player.hp)
  }
  if (cur && !cur.lowEnd) cur.lowEnd = lowHp(state)
  g.win = state.status === 'won'
  g.round = state.round
  g.score = state.score.total
  g.hp = state.player.hp
  g.enemyHp = state.enemy.hp
  return g
}

// --- 集計 ----------------------------------------------------------------------------

const SEEDS = Number(process.env.P5C_SEEDS ?? 6)
const STRATEGIES: Strategy[] = ['aggressive', 'balanced', 'defensive']
const CHOICES: Array<StakeChoiceId | undefined> = [undefined, 'race', 'tempo']
const NUM = ['通常', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ']
const TYPES = ['attack', 'guard', 'support', 'resonance', 'hinder', 'oracle']
const f0 = (n: number) => n.toFixed(0)
const f2 = (n: number) => n.toFixed(2)
const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0)

type GodAgg = {
  games: number
  wins: number
  plays: number
  byType: Record<string, number>
  exclusivePlays: number
  godBonus: number
  bonus: number
  changed: number
  burst: number
  dmg: number
  score: number
  round: number
  // 指紋
  lowStartRounds: number
  lowAttackRounds: number
  lowHoldRounds: number
  lowHoldWithHeal: number
  resFirstRounds: number
  chargedAttackRounds: number
  blockFirstRounds: number
  blockedExclusiveAttack: number
  roundsTotal: number
  guardUse: number
  divDecisions: number
}
const newAgg = (): GodAgg => ({
  games: 0, wins: 0, plays: 0, byType: {}, exclusivePlays: 0, godBonus: 0, bonus: 0, changed: 0, burst: 0, dmg: 0, score: 0, round: 0,
  lowStartRounds: 0, lowAttackRounds: 0, lowHoldRounds: 0, lowHoldWithHeal: 0, resFirstRounds: 0, chargedAttackRounds: 0, blockFirstRounds: 0, blockedExclusiveAttack: 0, roundsTotal: 0, guardUse: 0, divDecisions: 0,
})
function addGame(a: GodAgg, g: Game) {
  a.games++
  if (g.win) a.wins++
  a.plays += g.plays.length
  for (const p of g.plays) {
    a.byType[p.type] = (a.byType[p.type] ?? 0) + 1
    if (p.exclusive) a.exclusivePlays++
    if (p.changed) a.changed++
  }
  a.godBonus += g.godBonus
  a.bonus += g.bonus
  a.burst += g.burst
  a.dmg += g.damageTaken
  a.score += g.score
  a.round += g.round
  a.guardUse += g.guardUse
  a.divDecisions += g.divDecisions
  for (const r of g.rounds) {
    a.roundsTotal++
    if (r.lowStart) {
      a.lowStartRounds++
      if (r.plays.some((p) => p.isAttack)) a.lowAttackRounds++
      if (r.lowEnd && !r.plays.some((p) => p.hasHeal)) {
        a.lowHoldRounds++
        if (r.healAffordable) a.lowHoldWithHeal++
      }
    }
    const firstAttack = r.plays.findIndex((p) => p.isAttack)
    if (firstAttack > 0 && r.plays.slice(0, firstAttack).some((p) => p.hasRes)) a.resFirstRounds++
    if (r.plays.some((p) => p.isAttack && p.res >= RULES.cardBonus.chargedThreshold)) a.chargedAttackRounds++
    if (firstAttack > 0 && r.plays.slice(0, firstAttack).some((p) => p.hasBlock)) a.blockFirstRounds++
    if (r.plays.some((p) => p.isAttack && p.exclusive && p.bonus)) a.blockedExclusiveAttack++
  }
}
function fmtGod(a: GodAgg): string {
  const types = TYPES.map((t) => `${t.slice(0, 3)}${f0(pct(a.byType[t] ?? 0, a.plays))}`).join(' ')
  return (
    `勝率${f0(pct(a.wins, a.games))} | 種別 ${types} | 専用${f0(pct(a.exclusivePlays, a.plays))}% 専用bonus${f2(a.godBonus / a.games)}/戦 bonus${f2(a.bonus / a.games)} 変更${f2(a.changed / a.games)}/戦` +
    ` | 神の一撃${f2(a.burst / a.games)} 被ダメ${f0(a.dmg / a.games)} score${f0(a.score / a.games)} R${f2(a.round / a.games)}` +
    ` | 低HP開始R${f2(a.lowStartRounds / a.games)} 低HP攻撃R${f2(a.lowAttackRounds / a.games)} 低HP維持R${f2(a.lowHoldRounds / a.games)}(回復可${f2(a.lowHoldWithHeal / a.games)})` +
    ` | 共鳴先置き→攻撃R${f2(a.resFirstRounds / a.games)} 共鳴4以上で攻撃R${f2(a.chargedAttackRounds / a.games)} | ブロック先置き→攻撃R${f2(a.blockFirstRounds / a.games)} 専用攻撃bonusR${f2(a.blockedExclusiveAttack / a.games)}` +
    ` | 加護${f0(pct(a.guardUse, a.divDecisions))}%`
  )
}

type LensResult = { overall: number; gods: Record<string, GodAgg>; godBest: Record<string, number>; enemies: Record<string, number>; spread: number }

function runLens(stake: number, lens: 'fixed' | 'intent' | 'cardaware'): LensResult {
  const gods: Record<string, GodAgg> = {}
  const enemy: Record<string, { w: number; n: number }> = {}
  let W = 0
  let N = 0
  const godBest: Record<string, number> = {}
  for (const god of GODS) {
    const deck = getRecommendedDeck(god.id)
    const agg = (gods[god.id] ??= newAgg())
    let best = 0
    if (lens === 'fixed') {
      for (const choice of stake === 7 ? CHOICES : [undefined]) {
        for (const strategy of STRATEGIES) {
          let w = 0
          let n = 0
          for (const e of ENEMIES) {
            for (let i = 0; i < SEEDS; i++) {
              const s0 = start(`stake-${stake}-${god.id}-${e.id}-${strategy}-${choice ?? 'p'}-${i}`, god.id, deck, e.id, stake, choice)
              const r = play(s0, strategy, 'blind', 'fixed', false)
              n++
              if (r.win) w++
              if (!choice || choice === 'race') {
                const ea = (enemy[e.id] ??= { w: 0, n: 0 })
                ea.n++
                if (r.win) ea.w++
                if (strategy === 'balanced') addGame(agg, r)
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
          const ea = (enemy[e.id] ??= { w: 0, n: 0 })
          ea.n++
          if (r.win) ea.w++
          addGame(agg, r)
        }
      }
      godBest[god.id] = (w / n) * 100
      W += w
      N += n
    }
  }
  const vals = Object.values(godBest)
  return {
    overall: lens === 'fixed' ? fixedOverall : (W / N) * 100,
    gods,
    godBest,
    enemies: Object.fromEntries(Object.entries(enemy).map(([k, v]) => [k, (v.w / v.n) * 100])),
    spread: Math.max(...vals) - Math.min(...vals),
  }
}
// fixed の overall は STAKE-01 と同じ「全戦略・全神の平均」。上のループで W を二重に足さないよう別計算
let fixedOverall = 0
function runFixedOverall(stake: number): number {
  let W = 0
  let N = 0
  for (const god of GODS) {
    const deck = getRecommendedDeck(god.id)
    for (const choice of stake === 7 ? [undefined, 'race' as StakeChoiceId] : [undefined]) {
      for (const strategy of STRATEGIES) {
        for (const e of ENEMIES) {
          for (let i = 0; i < SEEDS; i++) {
            const s0 = start(`stake-${stake}-${god.id}-${e.id}-${strategy}-${choice ?? 'p'}-${i}`, god.id, deck, e.id, stake, choice)
            const r = play(s0, strategy, 'blind', 'fixed', false)
            N++
            if (r.win) W++
          }
        }
      }
    }
  }
  return (W / N) * 100
}

function fmtLens(l: LensResult): string {
  const gods = GODS.map((g) => `${g.nameJa}${f0(l.godBest[g.id])}`).join(' ')
  const enemies = ENEMIES.map((e) => `${e.name.slice(0, 2)}${f0(l.enemies[e.id])}`).join(' ')
  return `勝率${f0(l.overall)}% spread${f0(l.spread)} | ${gods} | ${enemies}`
}

describe.skipIf(!RUN)('Phase 5-C 神専用カードの条件 比較', () => {
  it('候補ごとに 3方策 × 神階 の勝率・種別・行動指紋を出す', { timeout: 60 * 60 * 1000 }, () => {
    const only = process.env.P5C_CONFIGS?.split(',').map((s) => s.trim())
    const stakes = process.env.P5C_STAKES ? process.env.P5C_STAKES.split(',').map(Number) : [3, 5, 7]
    const allConfigs: Config[] = [...CONFIGS, ...Object.entries(COMBOS).map(([name, parts]) => ({ name, mods: parts.flatMap((p) => CONFIGS.find((c) => c.name === p)!.mods) }))]
    const targets = only ? allConfigs.filter((c) => only.includes(c.name)) : allConfigs
    const focus = [GOD_IDS.fukuei, GOD_IDS.taiyo, GOD_IDS.sobi]
    const out: string[] = []
    try {
      for (const cfg of targets) {
        applyConfig(cfg)
        const lines: string[] = [`[${cfg.name}] ${cfg.mods.map((m) => `${getCardDef(m.card).name}:${m.bonus.textJa}`).join(' / ') || '（Phase 5-E のまま）'} seeds=${SEEDS}`]
        for (const st of stakes) {
          fixedOverall = runFixedOverall(st)
          for (const lens of ['fixed', 'intent', 'cardaware'] as const) {
            const r = runLens(st, lens)
            lines.push(`  ${NUM[st]} ${lens.padEnd(9)}: ${fmtLens(r)}`)
            const shown = lens === 'fixed' ? focus : [...focus, GOD_IDS.juraku, GOD_IDS.shouren]
            for (const gid of shown) {
              const g = GODS.find((x) => x.id === gid)!
              lines.push(`      ${g.nameJa}: ${fmtGod(r.gods[gid])}`)
            }
          }
        }
        out.push(lines.join('\n'))
        console.log('\n' + lines.join('\n'))
      }
    } finally {
      restoreAll()
    }
    expect(out.length).toBe(targets.length)
  })
})

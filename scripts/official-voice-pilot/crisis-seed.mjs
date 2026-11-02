// Official Voice Crisis Pilot v1（Gate G-B）：大耀 × 蒼海の龍神（?enemy=ryujin）で「自分の HP が最大の 50% 以下に
// 初めて落ちるバッチ」が R3〜R4 に決定論的に起きる固定 seed を、engine の純関数だけで探す（node 単体・数秒・runtime 変更 0）。
//   node --import ./scripts/official-voice-pilot/ts-loader.mjs scripts/official-voice-pilot/crisis-seed.mjs [outJson] [--scan N] [--seed S]
// 方策は acceptance.mjs の browser 操作と同じ「使える札を左から使う → 無くなったらラウンドを終える」（託宣は使わない）。
// デッキ・難易度・OTOMO 成長は UI の既定（getRecommendedDeck('taiyo')・ふつう・guardian・報酬ボーナス無し）。
// 時刻は planBatch（combatTimeline.ts・visualType 'heavy'）と VOICE_LAYER.afterImpactMs.crisis から導く。
// crisisVoice.ts の純関数（planCrisisVoice／crisisThresholdHp）は bgm.ts 経由で DOM に触るため node では読めないことがあり、
// その場合は同じ式を本ファイル内で再現する（式は crisisVoice.test.ts で担保済み）。
import { writeFileSync } from 'node:fs'
import { applyAction } from '../../src/core/engine/index.ts'
import { getRecommendedDeck } from '../../src/core/data/deckBuilder.ts'
import { ENEMY_IDS } from '../../src/core/data/enemies.ts'
import { GOD_IDS } from '../../src/core/data/gods.ts'
import { getCardDef } from '../../src/core/data/cards/index.ts'
import { RULES } from '../../src/core/data/rules.ts'
import { planBatch } from '../../src/components/battle/combatTimeline.ts'
import { VOICE_LAYER } from '../../src/components/battle/feelTier.ts'

const args = process.argv.slice(2)
const out = args.find((a) => !a.startsWith('--') && (args.indexOf(a) === 0 || !args[args.indexOf(a) - 1].startsWith('--')))
const scanN = Number(args[args.indexOf('--scan') + 1] || 0) || 120
const onlySeed = args.includes('--seed') ? args[args.indexOf('--seed') + 1] : null

let planCrisisVoice
let crisisThresholdHp
let crisisSource = 'crisisVoice.ts'
try {
  const m = await import('../../src/components/battle/crisisVoice.ts')
  planCrisisVoice = m.planCrisisVoice
  crisisThresholdHp = m.crisisThresholdHp
} catch {
  crisisSource = 'inline (same formula as crisisVoice.ts)'
  crisisThresholdHp = (maxHp) => Math.floor(maxHp * RULES.cardBonus.lowHpRatio)
  planCrisisVoice = (input) => {
    if (input.fired) return null
    if (input.plan.outcome !== null) return null
    const threshold = crisisThresholdHp(input.maxHp)
    if (input.hp > threshold) return null
    if (input.prevHp <= threshold) return null
    let lastSelfAt = 0
    for (const st of input.plan.steps) if (st.target === 'self' && st.amount > 0) lastSelfAt = Math.max(lastSelfAt, st.atMs)
    return lastSelfAt + VOICE_LAYER.afterImpactMs.crisis
  }
}

const GOD = GOD_IDS.taiyo
const ENEMY = ENEMY_IDS.ryujin
const DECK = getRecommendedDeck(GOD)
const VISUAL = 'heavy'

function affordable(state) {
  return state.hand.find((c) => getCardDef(c.defId).cost + (c.costModifier ?? 0) <= state.ap.current) ?? null
}

/** 1 戦を素朴方策で回し、バッチごとの HP とピンチ判定を返す */
function simulate(seed) {
  let r = applyAction(null, { type: 'START_GAME', seed, godId: GOD, enemyId: ENEMY, deck: DECK, difficulty: 'normal', otomoGrowthPath: 'guardian' })
  let state = r.state
  const maxHp = state.player.maxHp
  const threshold = crisisThresholdHp(maxHp)
  const batches = []
  let fired = false
  let crisis = null
  const rounds = []
  const step = (action, kind) => {
    const prevHp = state.player.hp
    const prevRound = state.round
    const res = applyAction(state, action)
    state = res.state
    const plan = planBatch(res.events, { enemyVisualType: VISUAL, reduced: false })
    const selfDamage = plan.steps.filter((s) => s.target === 'self' && s.amount > 0)
    const lastSelfAt = selfDamage.reduce((a, s) => Math.max(a, s.atMs), 0)
    const atMs = planCrisisVoice({ prevHp, hp: state.player.hp, maxHp, plan, fired })
    const acted = res.events.find((e) => e.t === 'ENEMY_ACTED')
    const b = {
      round: prevRound,
      kind,
      card: action.type === 'PLAY_CARD' ? getCardDef(state.discard.find((c) => c.uid === action.uid)?.defId ?? '')?.name ?? action.uid : null,
      enemyAct: acted ? { kind: acted.kind, label: acted.label ?? null } : null,
      prevHp,
      hp: state.player.hp,
      block: state.player.block,
      selfDamage: selfDamage.map((s) => ({ amount: s.amount, atMs: s.atMs, role: s.role })),
      lastSelfAt: selfDamage.length ? lastSelfAt : null,
      outcome: plan.outcome,
      status: state.status,
      crisisAtMs: atMs,
    }
    batches.push(b)
    if (atMs !== null) {
      fired = true
      crisis = { ...b, index: batches.length - 1 }
    }
  }
  while (state.status === 'playing') {
    const round = state.round
    const plays = []
    while (state.status === 'playing' && state.phase === 'playerTurn') {
      const card = affordable(state)
      if (!card) break
      plays.push(getCardDef(card.defId).name)
      step({ type: 'PLAY_CARD', uid: card.uid }, 'card')
    }
    if (state.status !== 'playing') break
    step({ type: 'END_ROUND' }, 'endRound')
    rounds.push({ round, plays, hpAfter: state.player.hp, enemyHpAfter: state.enemy.hp })
    if (round >= 7 && state.round === round) break
  }
  // ピンチ後に「さらに HP が落ちる決着でないバッチ」があるか（1 戦 1 回の確認に使える）
  let laterDrop = null
  if (crisis) {
    for (let i = crisis.index + 1; i < batches.length; i++) {
      const b = batches[i]
      if (b.hp < b.prevHp && b.outcome === null) {
        laterDrop = { round: b.round, kind: b.kind, prevHp: b.prevHp, hp: b.hp }
        break
      }
    }
  }
  return {
    seed,
    maxHp,
    threshold,
    enemyMaxHp: r.state.enemy.maxHp,
    finalStatus: state.status,
    finalRound: state.round,
    finalHp: state.player.hp,
    finalEnemyHp: state.enemy.hp,
    rounds,
    crisis: crisis
      ? { round: crisis.round, kind: crisis.kind, enemyAct: crisis.enemyAct, prevHp: crisis.prevHp, hp: crisis.hp, lastSelfAt: crisis.lastSelfAt, crisisAtMs: crisis.crisisAtMs, selfDamage: crisis.selfDamage }
      : null,
    laterDrop,
    batches,
  }
}

const seeds = onlySeed ? [onlySeed] : Array.from({ length: scanN }, (_, i) => `crisis-${String(i + 1).padStart(3, '0')}`)
const sims = seeds.map(simulate)
// 候補：R3〜R4 のラウンド終了（敵の攻撃）でピンチ・決着バッチでない・その後にもう 1 回 HP が落ちる（決着でない）
const candidates = sims.filter((s) => s.crisis && s.crisis.kind === 'endRound' && s.crisis.round >= 3 && s.crisis.round <= 4 && s.laterDrop)
const special = candidates.filter((s) => s.crisis.enemyAct?.kind === 'special')
const normal = candidates.filter((s) => s.crisis.enemyAct?.kind !== 'special')
const brief = (s) => ({ seed: s.seed, maxHp: s.maxHp, threshold: s.threshold, crisis: s.crisis, laterDrop: s.laterDrop, finalStatus: s.finalStatus, finalRound: s.finalRound, rounds: s.rounds })
const stats = {
  scanned: sims.length,
  withCrisis: sims.filter((s) => s.crisis).length,
  crisisRoundHistogram: Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((r) => [r, sims.filter((s) => s.crisis?.round === r).length])),
  candidatesR3R4EndRoundWithLaterDrop: candidates.length,
  r4Special: special.length,
  r3Normal: normal.length,
}
const result = {
  date: new Date().toISOString(),
  god: GOD,
  enemy: ENEMY,
  deck: DECK,
  difficulty: 'normal',
  policy: 'leftmost affordable card until none, then END_ROUND (no divination)',
  crisisSource,
  afterImpactMs: VOICE_LAYER.afterImpactMs.crisis,
  stats,
  recommended: (special[0] ?? normal[0] ?? null) && brief(special[0] ?? normal[0]),
  candidatesR4Special: special.slice(0, 5).map(brief),
  candidatesR3: normal.slice(0, 5).map(brief),
  all: onlySeed ? sims : undefined,
}
if (out) writeFileSync(out, JSON.stringify(result, null, 2))
console.log(JSON.stringify({ ...result, deck: undefined, all: undefined }, null, 2))

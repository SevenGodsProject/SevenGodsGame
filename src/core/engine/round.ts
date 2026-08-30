import type { EnemyActionDef, GameEvent, GameState } from '../types'
import { RULES } from '../data/rules'
import { GOD_IDS } from '../data/gods'
import { getEnemyDef } from '../data/enemies'
import { performDraw } from './deck'
import { applyDamage } from './effects'
import { sumBuff, tickBuffs } from './buffs'
import type { Rng } from '../rng/seededRandom'
import { resolveStakeRules, specialMultiplierFor } from '../data/stakes'

type StepResult = { state: GameState; events: GameEvent[] }

/** action合計値（charge=0）。intent表示・危険度tier・イベントamountの共通値 */
export function enemyActionTotal(action: EnemyActionDef): number {
  if (action.kind === 'attack' || action.kind === 'special') return action.amount
  if (action.kind === 'multiAttack') return action.hits.reduce((sum, h) => sum + h, 0)
  return 0
}

/** special/multiAttackの技名、chargeの予告文（VFXカットイン・ログ用） */
export function enemyActionLabel(action: EnemyActionDef): string | undefined {
  if (action.kind === 'charge') return action.label
  if (action.kind === 'special') return action.name
  if (action.kind === 'multiAttack') return action.name
  return undefined
}

function intentEvent(action: EnemyActionDef): GameEvent {
  return {
    t: 'ENEMY_INTENT_SET',
    kind: action.kind,
    amount: enemyActionTotal(action),
    label: enemyActionLabel(action),
  }
}

function actionForRound(actions: EnemyActionDef[], round: number): EnemyActionDef {
  return actions[round - 1] ?? actions[actions.length - 1]
}

/**
 * 決定39：難易度の敵攻撃力倍率を反映する（'charge'はダメージを持たないため対象外）。
 * multiAttackは「合計をroundしてから各hitへ配分」する（合計保存丸め）。
 * per-hit丸めは各hitが+1ずつ上振れし、hardで内部+1〜2ダメージとなって
 * 才華/大耀のhard勝率を10pt級で崩すことをPROTOTYPE-01 simulationで確認済み。
 * 配分はhit比例のfloor＋残りを先頭から+1（決定論・Math.random不使用）。
 */
function scaleEnemyAction(action: EnemyActionDef, multiplier: number): EnemyActionDef {
  if (action.kind === 'attack' || action.kind === 'special') {
    return { ...action, amount: Math.round(action.amount * multiplier) }
  }
  if (action.kind === 'multiAttack') {
    const total = enemyActionTotal(action)
    if (total <= 0) return action
    const target = Math.round(total * multiplier)
    const hits = action.hits.map((h) => Math.floor((h * target) / total))
    let rest = target - hits.reduce((sum, h) => sum + h, 0)
    for (let i = 0; rest > 0; i = (i + 1) % hits.length) {
      hits[i] += 1
      rest -= 1
    }
    return { ...action, hits }
  }
  return action
}

/** そのラウンドの敵の行動を、難易度補正込みで決める（予告表示・実行の両方がこれを使う） */
function nextEnemyAction(state: GameState): EnemyActionDef {
  const enemyDef = getEnemyDef(state.enemy.defId)
  const raw = actionForRound(enemyDef.actions, state.round)
  // DAILY-01：神域強化の攻撃倍率は難易度倍率に乗算し、合計保存丸めを1回だけ行う。
  // 通常モード（modifier無し）は×1で従来と完全に同じ値。
  // 決定126：神階の累積ルール。難易度倍率×Daily修正子×神階ATK×後半激化×必殺・連撃倍率を
  // 1つの倍率にまとめてから合計保存丸め（決定118のengine恒久ルール(b)）で適用する。
  const stakeRules = resolveStakeRules(state.stake, state.stakeChoice)
  const lateMul = stakeRules.lateRoundFrom !== null && state.round >= stakeRules.lateRoundFrom ? stakeRules.lateRoundAtkMul : 1
  const specialMul = raw.kind === 'special' || raw.kind === 'multiAttack' ? specialMultiplierFor(stakeRules, state.enemy.defId) : 1
  const multiplier =
    RULES.difficulty[state.difficulty].enemyAtkMultiplier *
    (state.modifier?.enemyAtkMul ?? 1) *
    stakeRules.enemyAtkMul *
    lateMul *
    specialMul
  return scaleEnemyAction(raw, multiplier)
}

/**
 * ラウンド開始処理（決定6・4）。
 * 神力を補充し、ブロックをリセットし、カードを引き、
 * このラウンドの敵の行動を予告します。
 *
 * drawCountを省略すると通常ドロー枚数（決定12）。
 * ラウンド1の初期手札（決定11）はcreateInitialStateから明示的に渡します。
 */
export function startRound(
  state: GameState,
  rng: Rng,
  drawCount: number = RULES.deck.drawPerRound,
): StepResult {
  const events: GameEvent[] = []
  // 決定126：神階Ⅶ「静寂の試練」＝ラウンド1の神力−1（0未満にはしない）
  const stakeRules = resolveStakeRules(state.stake, state.stakeChoice)
  const apAmount = Math.max(0, RULES.ap.perRound[state.round - 1] - (state.round === 1 ? stakeRules.round1ApMinus : 0))
  const intent = nextEnemyAction(state)

  let next: GameState = {
    ...state,
    phase: 'roundStart',
    ap: { current: apAmount, max: apAmount },
    cardsPlayedThisRound: 0,
    totalApGranted: state.totalApGranted + apAmount,
    player: { ...state.player, block: 0 },
    enemy: { ...state.enemy, block: 0, intent },
    divination: { ...state.divination, usedThisRound: false },
    // Mastery（決定110）：「1ラウンド最大実効ダメージ」のラウンド内集計をリセット。
    // bestRoundDamage（試合内最大）は維持する。
    mastery: { ...state.mastery, roundDamage: 0 },
  }
  events.push({ t: 'ROUND_STARTED', round: state.round, apGranted: apAmount })
  events.push(intentEvent(intent))

  next = { ...next, phase: 'draw' }
  const draw = performDraw(next, drawCount, rng)
  next = draw.state
  events.push(...draw.events)

  next = { ...next, phase: 'playerTurn' }

  return { state: next, events }
}

/**
 * 敵のターン（決定4）。予告済みの行動をそのまま実行します。
 */
export function runEnemyTurn(state: GameState): StepResult {
  const events: GameEvent[] = []
  const action = state.enemy.intent ?? nextEnemyAction(state)

  let next: GameState = { ...state, phase: 'enemyTurn' }

  if (action.kind !== 'charge') {
    // ENEMY-IDENTITY-PROTOTYPE-02：attack/special/multiAttackを共通の
    // 「hitの列」として処理する。単発は要素1の列（従来と完全同値）。
    const rawHits = action.kind === 'multiAttack' ? action.hits : [action.amount]
    const rawTotal = enemyActionTotal(action)
    const atkBuff = sumBuff(next.enemy.buffs, 'atk')

    // debuff（負のatkBuff）は「action合計へ1回だけ」適用し、先頭hitから順に消費する。
    // per-hit適用（各hitへ全額）は寿楽の-5が連撃4×3を全hit消滅させ、
    // Mastery S率51%のfarming破綻を生むことをPROTOTYPE-01で確認済み（CEO決定3）。
    // 正のatkBuff（敵強化）は先頭hitへ加算する。単発では従来のamount+atkBuffと同値。
    const actualHits = [...rawHits]
    if (atkBuff < 0) {
      let pool = -atkBuff
      for (let i = 0; i < actualHits.length && pool > 0; i++) {
        const cut = Math.min(actualHits[i], pool)
        actualHits[i] -= cut
        pool -= cut
      }
    } else if (atkBuff > 0) {
      actualHits[0] += atkBuff
    }
    const actualTotal = actualHits.reduce((sum, h) => sum + h, 0)
    events.push({ t: 'ENEMY_ACTED', kind: action.kind, amount: actualTotal, label: enemyActionLabel(action) })

    // 寿楽Mastery「無力化」J-G集計（決定113＋MODEL-B採用。寿楽使用時のみ）。
    // 1 enemy action = 1 sample（multiAttackでもhitごとに数えない。CEO決定4）。
    // raw＝action合計（難易度倍率済み）、actual＝debuff適用後の合計。
    // specialも通常sampleとして含める。charge行動は分岐外のため除外。
    // enemy ID/HPによる補正は行わない。
    if (next.godId === GOD_IDS.juraku && rawTotal > 0) {
      const rate = Math.max(0, Math.min(1, (rawTotal - actualTotal) / rawTotal))
      const t = RULES.mastery.juraku
      // S行動ゲート：raw>=10（内部値。表示×10で「100以上」）の強攻撃を半分以下へ
      const strong = rawTotal >= t.strongHitRaw && actualTotal <= rawTotal * 0.5
      next = {
        ...next,
        mastery: {
          ...next.mastery,
          attackCount: next.mastery.attackCount + 1,
          reductionRateSum: next.mastery.reductionRateSum + rate,
          strongNeutralized: next.mastery.strongNeutralized || strong,
        },
      }
    }

    // 蒼毘Mastery「鉄壁」S4集計（STEP-SCORE2-G3＋MODEL-B採用。蒼毘使用時のみ）。
    // 1 enemy action = 1 票。multiAttackは「全hitを完全吸収してHP実害0」のときのみ
    // fullyBlocked（hitごとに票を数えない。CEO決定4）。specialも票に含める。
    // debuffでactualTotal=0になったactionは分母にも入れない（寿楽の領分と分離）。
    // 判定はapplyDamageと同じ逐次block pool消費に基づく。
    if (next.godId === GOD_IDS.sobi && actualTotal > 0) {
      const wouldBlock = Math.min(next.player.block, actualTotal)
      const fully = actualTotal - wouldBlock === 0
      next = {
        ...next,
        mastery: {
          ...next.mastery,
          guardAttackCount: next.mastery.guardAttackCount + 1,
          fullyBlockedCount: next.mastery.fullyBlockedCount + (fully ? 1 : 0),
        },
      }
    }

    // ダメージはhitごとに順に適用する（blockは同一poolから逐次消費）。
    // DAMAGE_DEALTイベントもhitごとに出るため、連撃のVFX/ログは多段表示になる。
    for (const hit of actualHits) {
      if (hit <= 0) continue
      const result = applyDamage(next, 'self', hit)
      next = result.state
      events.push(...result.events)
      if (next.status !== 'playing') break
    }
  } else {
    events.push({ t: 'ENEMY_ACTED', kind: 'charge', amount: 0, label: action.label })
  }

  next = {
    ...next,
    enemy: { ...next.enemy, intent: null, buffs: tickBuffs(next.enemy.buffs) },
    player: { ...next.player, buffs: tickBuffs(next.player.buffs) },
  }

  return { state: next, events }
}

/**
 * ラウンド終了処理。
 * BASE-D（決定109）：未使用APペナルティは廃止した（実測寄与が極小で、
 * スコア上の意味が薄かったため）。unusedApはROUND_ENDEDイベントの情報としてのみ残す。
 * 決着していなければ次のラウンドへ、7ラウンド終えていれば「未撃破」で終了します（決定3）。
 */
export function finishRound(state: GameState, rng: Rng): StepResult {
  const events: GameEvent[] = []
  const unusedAp = state.status === 'playing' ? state.ap.current : 0
  events.push({ t: 'ROUND_ENDED', round: state.round, unusedAp })

  let next: GameState = state

  if (next.status !== 'playing') {
    return { state: next, events }
  }

  if (next.round >= RULES.totalRounds) {
    next = { ...next, status: 'finished', phase: 'gameOver' }
    return { state: next, events }
  }

  next = { ...next, round: next.round + 1 }
  const nextRound = startRound(next, rng)
  next = nextRound.state
  events.push(...nextRound.events)

  return { state: next, events }
}

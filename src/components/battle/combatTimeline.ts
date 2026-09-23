import type { GameEvent, GameStatus } from '../../core/types'
import { damageFeelTier, type FeelTier } from './feelTier'
import {
  BONUS_GAP_MS,
  BONUS_HIT_STOP_MS,
  BURST_HIT_STOP_MS,
  BURST_IMPACT_MS,
  CARD_HIT_GAP_MS,
  CARD_IMPACT_MS,
  DEFEAT_BEAT_OFFSET_MS,
  DEFEAT_COLLAPSE_MS,
  DEFEAT_COLLAPSE_REDUCED_MS,
  DEFEAT_FLASH_AFTER_MS,
  ENEMY_LUNGE_PEAK_MS,
  FINAL_HIT_STOP_MS,
  HIT_STOP_MS,
  HP_GHOST_DRAIN_MS,
  HP_GHOST_HOLD_MS,
  HP_LAG_MS,
  MULTI_CUTIN_LEAD_MS,
  PASSIVE_AFTER_ENEMY_MS,
  SPECIAL_IMPACT_MS,
  VICTORY_BEAT_MS,
  VICTORY_BEAT_REDUCED_MS,
  multiHitOffsetMs,
} from './enemyVfxTiming'

/**
 * Phase 6-A Combat Juice（決定162）：1回のアクション（カード・託宣・ラウンド終了）で起きた
 * GameEvent 列から、「いつ・どこに・どの強さで着弾を見せるか」を決める純関数。
 *
 * - engine の結果（HP・ダメージ・勝敗）は commit の時点で確定済み。ここは見せ方の時刻だけを返す
 * - 数字（useFloatingNumbers）・音（useBattleSound）・敵リアクション（EnemyPanel）・
 *   表示HP（visualHp.ts）・撃破演出（BattleScreen）はすべてこの計画を共有する（時刻の真実は1か所）
 * - 演出段階（FeelTier）は演出強度であり、ダメージ計算には一切関与しない
 */

export type ImpactRole =
  | 'card' // カード本体（託宣の天啓も同じ扱い）
  | 'bonus' // 条件⚡の追加効果
  | 'passive' // 神の得意技による追加ダメージ（カード後／ラウンド終了時の反撃）
  | 'burst' // 神の一撃（共鳴7）
  | 'selfCost' // 自分のカード効果による自傷（捨身・豪快な一撃）
  | 'enemy' // 敵の攻撃（通常・連撃・必殺）

export type ImpactStep = {
  target: 'enemy' | 'self'
  /** HP へ通ったダメージ（ブロック後。内部値） */
  amount: number
  /** ブロックで吸収された量 */
  blocked: number
  /** commit を 0ms とした着弾時刻 */
  atMs: number
  /** 対象要素だけに掛ける hit stop */
  stopMs: number
  tier: FeelTier
  role: ImpactRole
  /** 決着の一撃（敵なら撃破、自分なら敗北） */
  final: boolean
}

export type ReactionPlan = { atMs: number; stopMs: number; tier: FeelTier; final: boolean; burst: boolean; minor: boolean }

export type BatchPlan = {
  steps: ImpactStep[]
  /** 敵立ち絵のリアクション（最大2つ：本体＋神の一撃 or ⚡） */
  enemyReactions: ReactionPlan[]
  /** 自分側の被弾の着弾（通常攻撃は突進の最前。連撃・必殺は既存の CSS タイムライン） */
  selfImpactMs: number | null
  /** このバッチで決着したか */
  outcome: Exclude<GameStatus, 'playing'> | null
  burst: boolean
  /** 結果トースト等「数値の結果」を見せてよい時刻（神の一撃では着弾まで隠す） */
  revealMs: number
  /** 最後の着弾（撃破・敗北演出の起点） */
  finalStep: ImpactStep | null
  lastImpactMs: number | null
}

export type PlanContext = {
  /** 敵の visualType（fast／heavy は突進の速さが違う） */
  enemyVisualType?: string
  /** prefers-reduced-motion：hit stop を 0 にする（情報は失わない） */
  reduced?: boolean
}

function enemyLungePeak(visualType: string | undefined): number {
  if (visualType === 'fast') return ENEMY_LUNGE_PEAK_MS.fast
  if (visualType === 'heavy') return ENEMY_LUNGE_PEAK_MS.heavy
  return ENEMY_LUNGE_PEAK_MS.normal
}

export function planBatch(events: readonly GameEvent[], ctx: PlanContext = {}): BatchPlan {
  const ended = events.find((e): e is Extract<GameEvent, { t: 'GAME_ENDED' }> => e.t === 'GAME_ENDED')
  const outcome = ended ? (ended.status as BatchPlan['outcome']) : null
  const acted = events.find((e): e is Extract<GameEvent, { t: 'ENEMY_ACTED' }> => e.t === 'ENEMY_ACTED' && e.kind !== 'charge')
  const isMulti = acted?.kind === 'multiAttack'
  const isSpecial = acted?.kind === 'special' || (isMulti && !!acted?.label)
  const enemyImpact = enemyLungePeak(ctx.enemyVisualType)

  const steps: ImpactStep[] = []
  let enemyTurn = false
  let afterBurst = false
  let inBonus = false
  let inPassive = false
  let cardHits = 0
  let bonusHits = 0
  let passiveHits = 0
  let burstHits = 0
  let selfHits = 0
  let lastBodyAt = CARD_IMPACT_MS
  let lastSelfAt: number | null = null

  for (const e of events) {
    if (e.t === 'ENEMY_ACTED') enemyTurn = true
    else if (e.t === 'RESONANCE_BURST') afterBurst = true
    else if (e.t === 'BONUS_TRIGGERED') inBonus = true
    else if (e.t === 'PASSIVE_TRIGGERED') inPassive = true
    if (e.t !== 'DAMAGE_DEALT') continue

    if (e.target === 'enemy') {
      let role: ImpactRole
      let atMs: number
      if (afterBurst) {
        role = 'burst'
        atMs = BURST_IMPACT_MS + burstHits * CARD_HIT_GAP_MS
        burstHits += 1
      } else if (enemyTurn) {
        // ラウンド終了時の反撃（蒼毘）：敵の着弾を受け切ったあとに返す
        role = 'passive'
        atMs = (lastSelfAt ?? enemyImpact) + PASSIVE_AFTER_ENEMY_MS + passiveHits * CARD_HIT_GAP_MS
        passiveHits += 1
      } else if (inPassive) {
        role = 'passive'
        atMs = lastBodyAt + BONUS_GAP_MS * (bonusHits > 0 ? 2 : 1) + passiveHits * CARD_HIT_GAP_MS
        passiveHits += 1
      } else if (inBonus) {
        role = 'bonus'
        atMs = lastBodyAt + BONUS_GAP_MS + bonusHits * CARD_HIT_GAP_MS
        bonusHits += 1
      } else {
        role = 'card'
        atMs = CARD_IMPACT_MS + cardHits * CARD_HIT_GAP_MS
        lastBodyAt = atMs
        cardHits += 1
      }
      const tier = damageFeelTier(e.amount + e.blocked, { burst: role === 'burst' })
      steps.push({ target: 'enemy', amount: e.amount, blocked: e.blocked, atMs, stopMs: 0, tier, role, final: false })
    } else {
      let atMs: number
      let role: ImpactRole
      if (enemyTurn && acted) {
        role = 'enemy'
        if (isMulti) atMs = (isSpecial ? MULTI_CUTIN_LEAD_MS : 0) + multiHitOffsetMs(selfHits)
        else if (isSpecial) atMs = SPECIAL_IMPACT_MS
        else atMs = enemyImpact
        selfHits += 1
        lastSelfAt = atMs
      } else {
        role = 'selfCost'
        atMs = CARD_IMPACT_MS
      }
      const tier = damageFeelTier(e.amount, { special: role === 'enemy' && isSpecial })
      steps.push({ target: 'self', amount: e.amount, blocked: e.blocked, atMs, stopMs: 0, tier, role, final: false })
    }
  }

  // 決着の一撃：撃破なら「最後に HP へ通った敵への着弾」、敗北なら「最後の自分への着弾」
  let finalStep: ImpactStep | null = null
  if (outcome === 'won' || outcome === 'lost') {
    const target = outcome === 'won' ? 'enemy' : 'self'
    for (let i = steps.length - 1; i >= 0; i--) {
      if (steps[i].target === target && steps[i].amount > 0) {
        finalStep = steps[i]
        break
      }
    }
    if (finalStep) {
      finalStep.final = true
      // 最後の一撃は、カードの強さに関わらず必ず L4（演出強度のみ）
      if (outcome === 'won') finalStep.tier = 4
    }
  }

  for (const s of steps) s.stopMs = ctx.reduced ? 0 : hitStopFor(s)

  const enemySteps = steps.filter((s) => s.target === 'enemy')
  const enemyReactions: ReactionPlan[] = []
  const body = enemySteps.filter((s) => s.role === 'card' || s.role === 'passive')
  const firstMain = body[0] ?? null
  if (firstMain) {
    // 本体の反応：本体中の最大段階（撃破の一撃を含むなら L4）
    const tier = Math.max(...body.map((s) => s.tier)) as FeelTier
    const final = body.some((s) => s.final)
    enemyReactions.push({ atMs: firstMain.atMs, stopMs: Math.max(...body.map((s) => s.stopMs)), tier, final, burst: false, minor: false })
  }
  const burstStep = enemySteps.find((s) => s.role === 'burst')
  const bonusStep = enemySteps.find((s) => s.role === 'bonus')
  if (burstStep) {
    const all = enemySteps.filter((s) => s.role === 'burst')
    enemyReactions.push({ atMs: burstStep.atMs, stopMs: Math.max(...all.map((s) => s.stopMs)), tier: 4, final: all.some((s) => s.final), burst: true, minor: false })
  } else if (bonusStep) {
    const all = enemySteps.filter((s) => s.role === 'bonus')
    enemyReactions.push({ atMs: bonusStep.atMs, stopMs: Math.max(...all.map((s) => s.stopMs)), tier: bonusStep.final ? 4 : 1, final: all.some((s) => s.final), burst: false, minor: !bonusStep.final })
  }

  const selfSteps = steps.filter((s) => s.target === 'self' && s.role === 'enemy')
  const burst = events.some((e) => e.t === 'RESONANCE_BURST')
  const impacts = steps.map((s) => s.atMs)
  return {
    steps,
    enemyReactions,
    selfImpactMs: selfSteps.length > 0 ? selfSteps[0].atMs : null,
    outcome,
    burst,
    revealMs: burst ? BURST_IMPACT_MS : impacts.length > 0 ? Math.min(...impacts) : 0,
    finalStep,
    lastImpactMs: impacts.length > 0 ? Math.max(...impacts) : null,
  }
}

function hitStopFor(s: ImpactStep): number {
  if (s.final) return FINAL_HIT_STOP_MS
  if (s.role === 'burst') return BURST_HIT_STOP_MS
  if (s.target === 'self') return s.tier >= 3 ? 40 : 0
  // 決定224：⚡は通常ヒットより上（L3 45 < 50 < L4 60）。reduced-motion では呼び出し側で 0
  if (s.role === 'bonus') return BONUS_HIT_STOP_MS
  return HIT_STOP_MS[s.tier]
}

/** 表示HPが動き出す時刻（着弾 → hit stop → HP_LAG_MS） */
export function visualHpStartMs(step: Pick<ImpactStep, 'atMs' | 'stopMs'>): number {
  return step.atMs + step.stopMs + HP_LAG_MS
}

/** 表示HP（ゴースト込み）が止まる時刻 */
export function visualHpEndMs(step: Pick<ImpactStep, 'atMs' | 'stopMs'>): number {
  return visualHpStartMs(step) + HP_GHOST_HOLD_MS + HP_GHOST_DRAIN_MS
}

export type VictoryTimeline = {
  /** 最後の一撃の着弾 */
  finalImpactMs: number
  /** 敵フラッシュ＋崩壊の開始／終了 */
  collapseStartMs: number
  collapseEndMs: number
  /** 「撃破」表示の開始／終了（＝報酬を出してよい時刻） */
  beatStartMs: number
  rewardMs: number
}

/**
 * 撃破演出の時刻表（commit=0）。報酬は必ず敵の崩壊と「撃破」表示のあとに出す。
 * finalStep が無い（撃破がダメージ以外で起きた）場合でも、0ms 起点で同じ順序を保つ。
 */
export function planVictory(finalStep: Pick<ImpactStep, 'atMs' | 'stopMs'> | null, reduced = false): VictoryTimeline {
  const finalImpactMs = finalStep?.atMs ?? 0
  const stop = reduced ? 0 : finalStep?.stopMs ?? FINAL_HIT_STOP_MS
  const collapseStartMs = finalImpactMs + stop + (reduced ? 120 : DEFEAT_FLASH_AFTER_MS)
  const collapseMs = reduced ? DEFEAT_COLLAPSE_REDUCED_MS : DEFEAT_COLLAPSE_MS
  const beatStartMs = collapseStartMs + (reduced ? Math.round(collapseMs * 0.8) : DEFEAT_BEAT_OFFSET_MS)
  return {
    finalImpactMs,
    collapseStartMs,
    collapseEndMs: collapseStartMs + collapseMs,
    beatStartMs,
    rewardMs: beatStartMs + (reduced ? VICTORY_BEAT_REDUCED_MS : VICTORY_BEAT_MS),
  }
}

/** 敗北・未撃破：最後の着弾と表示HPの変化を見せてから結果画面を出す時刻 */
export function planResultGate(plan: Pick<BatchPlan, 'finalStep' | 'lastImpactMs' | 'steps'>): number {
  const anchor = plan.finalStep ?? plan.steps.reduce<ImpactStep | null>((a, s) => (a === null || s.atMs > a.atMs ? s : a), null)
  if (!anchor) return 0
  return visualHpEndMs(anchor) + 120
}

/** そのバッチで対象が受ける表示HPの変化（visualHp.ts へ渡す） */
export function hpStepsFor(plan: Pick<BatchPlan, 'steps'>, target: 'enemy' | 'self'): { amount: number; atMs: number }[] {
  return plan.steps.filter((s) => s.target === target && s.amount > 0).map((s) => ({ amount: s.amount, atMs: visualHpStartMs(s) }))
}

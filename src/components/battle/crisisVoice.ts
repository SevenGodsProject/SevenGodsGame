import { useEffect, useRef } from 'react'
import { RULES } from '../../core/data/rules'
import type { GameEvent, GameState } from '../../core/types'
import { planBatch, type BatchPlan } from './combatTimeline'
import { duckBgm } from './bgm'
import { VOICE_LAYER } from './feelTier'
import { prefersReducedMotion } from './reducedMotion'
import { hasOfficialVoice, playVoice } from './sound'

/**
 * Official Voice Crisis Pilot v1（docs/OFFICIAL_VOICE_CRISIS_PILOT_V1.md）：神の「ピンチ」の声。
 *
 * - トリガ：自分の HP が「最大の `RULES.cardBonus.lowHpRatio`（0.5）以下」に**初めて**落ちたバッチ
 *   （閾値は条件⚡「HP が最大の 50% 以下」と同じ定義・新しい数値は作らない）
 * - 時刻：そのバッチの最後の自分への着弾 ＋ `VOICE_LAYER.afterImpactMs.crisis`（300ms＝決定257 の duck 復帰開始点）
 * - 1 戦 1 回（回復して再び落ちても鳴らない）。決着（敗北・終局・撃破）のバッチでは鳴らさない
 * - 表示専用：`src/core`・入力ロック・時刻表・GameState には触れない。音の予約を足すだけ
 */

/** 「ピンチ」の閾値 HP（これ以下で成立）。条件⚡ lowHp と同じ計算 */
export function crisisThresholdHp(maxHp: number): number {
  return Math.floor(maxHp * RULES.cardBonus.lowHpRatio)
}

export type CrisisVoiceInput = {
  /** バッチ前の HP */
  prevHp: number
  /** バッチ後の HP（engine の確定値） */
  hp: number
  maxHp: number
  plan: Pick<BatchPlan, 'steps' | 'outcome'>
  /** この戦闘で既に鳴らしたか */
  fired: boolean
}

/**
 * 純関数：このバッチで「ピンチ」の声を鳴らすなら commit からの時刻（ms）、鳴らさないなら null。
 * 自分への着弾が無いのに HP が下がったバッチ（想定外）は commit ＋ afterImpactMs に置く。
 */
export function planCrisisVoice(input: CrisisVoiceInput): number | null {
  if (input.fired) return null
  if (input.plan.outcome !== null) return null
  const threshold = crisisThresholdHp(input.maxHp)
  if (input.hp > threshold) return null
  if (input.prevHp <= threshold) return null
  let lastSelfAt = 0
  for (const st of input.plan.steps) if (st.target === 'self' && st.amount > 0) lastSelfAt = Math.max(lastSelfAt, st.atMs)
  return lastSelfAt + VOICE_LAYER.afterImpactMs.crisis
}

/**
 * イベントログを見て「ピンチ」の声を予約するフック（useBattleSound と同じ形）。
 * 新しい対局（seed が変わる）・ログの巻き戻しでは記憶を捨てる。画面を離れるときは予約を解除する
 * （鳴っている声の停止は BattleScreen の unmount `stopVoice()` が担う）。
 */
export function useCrisisVoice(log: GameEvent[], state: GameState | null, enemyVisualType?: string): void {
  const seenRef = useRef(log.length)
  const seedRef = useRef(state?.seed ?? null)
  const hpRef = useRef<number | null>(state?.player.hp ?? null)
  const firedRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const clearTimer = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
  }

  useEffect(() => {
    if (!state) return
    if (state.seed !== seedRef.current || log.length < seenRef.current) {
      seedRef.current = state.seed
      seenRef.current = log.length
      hpRef.current = state.player.hp
      firedRef.current = false
      clearTimer()
      return
    }
    const fresh = log.slice(seenRef.current)
    seenRef.current = log.length
    const prevHp = hpRef.current ?? state.player.hp
    hpRef.current = state.player.hp
    if (fresh.length === 0) return
    const plan = planBatch(fresh, { enemyVisualType, reduced: prefersReducedMotion() })
    const atMs = planCrisisVoice({ prevHp, hp: state.player.hp, maxHp: state.player.maxHp, plan, fired: firedRef.current })
    if (atMs === null) return
    firedRef.current = true
    const godId = state.godId
    if (!hasOfficialVoice(godId, 'crisis')) return
    clearTimer()
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      playVoice(godId, 'crisis', { onStart: (ms) => duckBgm(ms + VOICE_LAYER.duckTailMs) })
    }, atMs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log, state])

  useEffect(() => () => clearTimer(), [])
}

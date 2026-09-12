import { useEffect, useRef, useState } from 'react'
import type { GameEvent, GameState } from '../../core/types'
import { getEnemyDef } from '../../core/data/enemies'
import { enemyActionTotal } from '../../core/engine/intent'
import { planBatch } from './combatTimeline'
import { prefersReducedMotion } from './reducedMotion'
import { CALLOUT_MS, latestIntentAmount, latestRound, planCallout, type Callout, type CalloutDecision } from './decisionFeedback'

/**
 * Phase 6-C（決定166）：ログの新着バッチごとに callout を 1 件だけ決め、着弾のあとに
 * 約 0.7 秒だけ見せるフック（表示専用。engine・GameState には触れない）。
 *
 * - 判定は decisionFeedback.ts の純関数（テスト対象）。ここはタイマーと重複抑制だけ
 * - 同一ラウンドで同じ条件⚡は 1 回だけ（`dedupeKey`）。ラウンドが変わればリセット
 * - 次のバッチが来たら前の callout は置き換える（キューにしない＝操作を待たせない）
 * - 統計（出した数・抑制した数）は QA・テストが読めるように返す
 */

export type CalloutStats = {
  shown: number
  /** priority で負けた候補（同一バッチで複数成立） */
  losers: number
  /** 同一ラウンドの重複として抑制した数 */
  duplicates: number
  /** 神の一撃・決着のバッチで見送った数 */
  bigMoment: number
  byId: Record<string, number>
}

export type DecisionCallout = {
  callout: Callout | null
  /** 増えるたびに再生（同じ id が連続しても再マウントさせる） */
  calloutKey: number
  stats: CalloutStats
}

const EMPTY_STATS: CalloutStats = { shown: 0, losers: 0, duplicates: 0, bigMoment: 0, byId: {} }

export function useDecisionCallout(log: GameEvent[], state: GameState | null): DecisionCallout {
  const [active, setActive] = useState<{ callout: Callout; key: number } | null>(null)
  const [stats, setStats] = useState<CalloutStats>(EMPTY_STATS)
  const seenRef = useRef(0)
  const seedRef = useRef<string | null>(state?.seed ?? null)
  // 「続きから」再開でも今のラウンドの予告を知っているように、初期値は GameState から取る
  const intentRef = useRef<number | null>(state?.enemy.intent ? enemyActionTotal(state.enemy.intent) : null)
  const roundRef = useRef(state?.round ?? 1)
  const shownThisRoundRef = useRef<Set<string>>(new Set())
  const keyRef = useRef(0)
  const timersRef = useRef<number[]>([])

  const clearTimers = () => {
    for (const id of timersRef.current) window.clearTimeout(id)
    timersRef.current = []
  }

  useEffect(() => {
    if (!state) return
    // 新しい対局・ログの巻き戻し（再開）：状態を捨てて現在の盤面へ合わせる
    if (state.seed !== seedRef.current || log.length < seenRef.current) {
      seedRef.current = state.seed
      seenRef.current = log.length
      clearTimers()
      setActive(null)
      setStats(EMPTY_STATS)
      intentRef.current = state.enemy.intent ? enemyActionTotal(state.enemy.intent) : null
      roundRef.current = state.round
      shownThisRoundRef.current = new Set()
      return
    }
    const fresh = log.slice(seenRef.current)
    seenRef.current = log.length
    if (fresh.length === 0) return

    const plan = planBatch(fresh, { enemyVisualType: getEnemyDef(state.enemy.defId).visualType, reduced: prefersReducedMotion() })
    const decision: CalloutDecision = planCallout(fresh, { plan, intentAmount: intentRef.current, godId: state.godId }, shownThisRoundRef.current)

    // バッチを処理し終えてから「次の予告」「ラウンド」を更新する（敵ターンのバッチは
    // 古い予告で実行 → 次の予告、の順に並んでいる）
    intentRef.current = latestIntentAmount(fresh, intentRef.current)
    const nextRound = latestRound(fresh, roundRef.current)
    if (nextRound !== roundRef.current) {
      roundRef.current = nextRound
      shownThisRoundRef.current = new Set()
    }

    setStats((prev) => ({
      ...prev,
      losers: prev.losers + decision.losers,
      duplicates: prev.duplicates + (decision.reason === 'duplicate' ? 1 : 0),
      bigMoment: prev.bigMoment + (decision.reason === 'big-moment' || decision.reason === 'outcome' ? 1 : 0),
    }))
    const callout = decision.callout
    if (!callout) return
    if (callout.dedupeKey) shownThisRoundRef.current.add(callout.dedupeKey)

    clearTimers()
    const key = ++keyRef.current
    timersRef.current.push(
      window.setTimeout(() => {
        setActive({ callout, key })
        setStats((prev) => ({ ...prev, shown: prev.shown + 1, byId: { ...prev.byId, [callout.id]: (prev.byId[callout.id] ?? 0) + 1 } }))
      }, Math.max(0, callout.atMs)),
    )
    timersRef.current.push(
      window.setTimeout(() => {
        setActive((cur) => (cur && cur.key === key ? null : cur))
      }, Math.max(0, callout.atMs) + CALLOUT_MS),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log, state])

  useEffect(() => () => clearTimers(), [])

  return { callout: active?.callout ?? null, calloutKey: active?.key ?? 0, stats }
}

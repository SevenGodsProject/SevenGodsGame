import { useEffect, useRef, useState, type RefObject } from 'react'
import type { GameEvent, GameState } from '../../core/types'
import { getEnemyDef } from '../../core/data/enemies'
import { hpStepsFor, planBatch, planResultGate, planVictory, type BatchPlan, type VictoryTimeline } from './combatTimeline'
import { createVisualHpTracker, type TimerApi, type VisualHpTracker } from './visualHp'
import { sfx } from './sound'
import { playJingle } from './bgm'
import { prefersReducedMotion } from './reducedMotion'

/**
 * Phase 6-A Combat Juice（決定162）：戦闘の「見せ方」の司令塔（表示専用）。
 *
 * - 新しいイベント（＝1アクション）ごとに着弾計画（combatTimeline.planBatch）を作る
 * - 表示HP（敵・自分）を着弾に合わせて追従させる（engine の HP は触らない）
 * - 撃破：最後の一撃 → 敵の崩壊 → 「撃破」 → 報酬、の順序をタイマーで保証する
 * - 敗北・未撃破：最後の着弾と表示HPの変化を見せてから結果画面
 * - 大きな一撃（L4・神の一撃・最後の一撃）だけ、戦闘エリアを短く揺らす（WAAPI、reduced-motion では無し）
 *
 * すべて setTimeout 起点で animationend に依存しない。背景タブで遅れても必ず先へ進み、
 * 各段階に安全弁（上限時刻）を持つ。
 */

export type VictoryPhase = 'none' | 'finishing' | 'collapse' | 'beat' | 'done'

export type CombatPresentation = {
  plan: BatchPlan | null
  /** 計画が変わるたびに増える（リアクション・slash の再生キー） */
  planKey: number
  enemyHpShown: number
  playerHpShown: number
  victoryPhase: VictoryPhase
  victory: VictoryTimeline | null
  /** 敗北・未撃破の結果画面を出してよいか（勝利は victoryPhase==='done'） */
  resultReady: boolean
  reduced: boolean
}

/** 報酬・結果が永遠に出ない状態を作らないための上限（計画時刻＋この値で強制的に進める） */
export const PRESENTATION_SAFETY_MS = 1500

const browserTimers: TimerApi = {
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
  clearTimeout: (id) => window.clearTimeout(id as number),
}

export function useCombatPresentation(log: GameEvent[], state: GameState | null, arenaRef: RefObject<HTMLElement | null>): CombatPresentation {
  const reduced = prefersReducedMotion()
  const [plan, setPlan] = useState<BatchPlan | null>(null)
  const [planKey, setPlanKey] = useState(0)
  const [enemyHpShown, setEnemyHpShown] = useState(state?.enemy.hp ?? 0)
  const [playerHpShown, setPlayerHpShown] = useState(state?.player.hp ?? 0)
  const [victoryPhase, setVictoryPhase] = useState<VictoryPhase>(state?.status === 'won' ? 'done' : 'none')
  const [victory, setVictory] = useState<VictoryTimeline | null>(null)
  const [resultReady, setResultReady] = useState(!!state && state.status !== 'playing')

  const maxRef = useRef({ enemy: state?.enemy.maxHp ?? 0, player: state?.player.maxHp ?? 0 })
  useEffect(() => {
    if (state) maxRef.current = { enemy: state.enemy.maxHp, player: state.player.maxHp }
  })

  const trackersRef = useRef<{ enemy: VisualHpTracker; player: VisualHpTracker } | null>(null)
  if (trackersRef.current === null) {
    trackersRef.current = {
      enemy: createVisualHpTracker(browserTimers, () => maxRef.current.enemy, setEnemyHpShown),
      player: createVisualHpTracker(browserTimers, () => maxRef.current.player, setPlayerHpShown),
    }
    if (state) {
      trackersRef.current.enemy.update(state.enemy.hp)
      trackersRef.current.player.update(state.player.hp)
    }
  }

  const seenRef = useRef(log.length)
  const seedRef = useRef(state?.seed ?? null)
  const sequenceTimers = useRef<number[]>([])
  const clearSequence = () => {
    for (const id of sequenceTimers.current) window.clearTimeout(id)
    sequenceTimers.current = []
  }
  const later = (fn: () => void, ms: number) => {
    sequenceTimers.current.push(window.setTimeout(fn, Math.max(0, ms)))
  }

  useEffect(() => {
    if (!state) return
    const trackers = trackersRef.current!
    // 新しい対局（seed が変わる）・ログの巻き戻し（再開）：保留を捨てて実HPへ合わせる
    if (state.seed !== seedRef.current || log.length < seenRef.current) {
      seedRef.current = state.seed
      seenRef.current = log.length
      clearSequence()
      trackers.enemy.reset(state.enemy.hp)
      trackers.player.reset(state.player.hp)
      setPlan(null)
      setVictory(null)
      setVictoryPhase(state.status === 'won' ? 'done' : 'none')
      setResultReady(state.status !== 'playing')
      return
    }
    const fresh = log.slice(seenRef.current)
    seenRef.current = log.length
    if (fresh.length === 0) {
      // イベントを伴わない HP 変化（再開直後など）は即時反映
      trackers.enemy.update(state.enemy.hp, null)
      trackers.player.update(state.player.hp, null)
      return
    }
    const next = planBatch(fresh, { enemyVisualType: getEnemyDef(state.enemy.defId).visualType, reduced })
    trackers.enemy.update(state.enemy.hp, hpStepsFor(next, 'enemy'))
    trackers.player.update(state.player.hp, hpStepsFor(next, 'self'))
    setPlan(next)
    setPlanKey((k) => k + 1)

    // 大きな一撃だけ戦闘エリアを短く揺らす（対象要素のみ・WAAPI。ページ全体は止めない）
    const big = next.enemyReactions.find((r) => r.tier >= 4 || r.burst || r.final)
    const arena = arenaRef.current
    if (big && arena && !reduced && typeof arena.animate === 'function') {
      const amp = big.final || big.burst ? 5 : 3
      arena.animate(
        [
          { transform: 'translate(0, 0)' },
          { transform: `translate(${-amp}px, ${amp * 0.6}px)` },
          { transform: `translate(${amp * 0.8}px, ${-amp * 0.5}px)` },
          { transform: `translate(${-amp * 0.4}px, ${amp * 0.3}px)` },
          { transform: 'translate(0, 0)' },
        ],
        { duration: big.final || big.burst ? 320 : 240, delay: big.atMs + big.stopMs, easing: 'ease-out' },
      )
    }

    if (next.outcome === 'won') {
      clearSequence()
      const tl = planVictory(next.finalStep, reduced)
      setVictory(tl)
      setVictoryPhase('finishing')
      later(() => setVictoryPhase((p) => (p === 'finishing' ? 'collapse' : p)), tl.collapseStartMs)
      later(() => {
        setVictoryPhase((p) => (p === 'finishing' || p === 'collapse' ? 'beat' : p))
        sfx.victory()
        playJingle('victory')
      }, tl.beatStartMs)
      later(() => setVictoryPhase('done'), tl.rewardMs)
      // 安全弁：何があっても報酬へ進む
      later(() => setVictoryPhase('done'), tl.rewardMs + PRESENTATION_SAFETY_MS)
    } else if (next.outcome === 'lost' || next.outcome === 'finished') {
      clearSequence()
      setResultReady(false)
      const at = planResultGate(next)
      later(() => {
        setResultReady(true)
        sfx.defeat()
        playJingle('defeat')
      }, at)
      later(() => setResultReady(true), at + PRESENTATION_SAFETY_MS)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log, state])

  useEffect(
    () => () => {
      clearSequence()
      trackersRef.current?.enemy.dispose()
      trackersRef.current?.player.dispose()
    },
    [],
  )

  return { plan, planKey, enemyHpShown, playerHpShown, victoryPhase, victory, resultReady, reduced }
}

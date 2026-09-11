import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { GameEvent, GodId } from '../../core/types'
import { getGodDef } from '../../core/data/gods'
import { formatScaled } from '../displayScale'
import { type FeelTier } from './feelTier'
import { BURST_IMPACT_MS } from './enemyVfxTiming'
import { planBatch, type ImpactStep } from './combatTimeline'
import { prefersReducedMotion } from './reducedMotion'

export type FloatingNumber = {
  id: number
  text: string
  kind: 'damage' | 'heal' | 'block' | 'draw' | 'ap'
  /** ENEMY-VFX-01：連撃/必殺のhitをテンポ付きで見せるためのCSS animation-delay（ms）。
   * 表示タイミングだけを遅らせる。combat計算・GameStateには一切関与しない */
  delayMs?: number
  /** ENEMY-VFX-01：連撃の最終hit・必殺の一撃を大きく見せる強調フラグ */
  emphasis?: boolean
  /** ENEMY-VFX-01：連撃hitが同座標に重ならないよう、hitごとにleftをずらす */
  leftPercent?: number
  /** 決定128：演出段階（数字サイズ）。damageのみ。省略＝L2 */
  tier?: FeelTier
  /** Phase 6-A：条件⚡の追加ダメージ（金色・⚡付き） */
  bonus?: boolean
  /** Phase 6-A：最大クラス（神の一撃・最後の一撃） */
  max?: boolean
}

const LIFETIME_MS = 900
/** Phase 6-A：最大クラスの数字は少し長く残す（CSS の float-up-max 1.3s と一致） */
const MAX_LIFETIME_MS = 1300

/**
 * イベントログを見て、HPバーの上に浮かべる「-8」「+5」のような数値の
 * 出現・消滅タイミングを作るフック。実際の見た目（アニメーション）はCSS側。
 *
 * 才華Visual Polish：共鳴効果のdraw/gainApは、core/engine側にフローティング用の
 * イベントが存在しない（CARD_DRAWNは全ドロー共通で発火が多すぎ、gainApは
 * そもそもイベントを発行しない設計）。core/engineには一切手を入れず、
 * RESONANCE_BURST発生時にgodId経由でgetGodDef(godId).resonanceEffects
 * （静的データ、GodOtomoPanel.tsxのP0-4と同じ参照パターン）を読み、
 * draw/gainApが含まれていればその場でフローティング数値を合成する
 * 表示専用の対応にした。共鳴の数値・処理・発動条件は無変更。
 */
export function useFloatingNumbers(
  log: GameEvent[],
  godId: GodId | undefined,
  enemyVisualType?: string,
): {
  enemyNumbers: FloatingNumber[]
  playerNumbers: FloatingNumber[]
} {
  const [enemyNumbers, setEnemyNumbers] = useState<FloatingNumber[]>([])
  const [playerNumbers, setPlayerNumbers] = useState<FloatingNumber[]>([])
  const seenCount = useRef(0)
  const nextId = useRef(0)

  useEffect(() => {
    if (log.length < seenCount.current) {
      seenCount.current = 0
      setEnemyNumbers([])
      setPlayerNumbers([])
    }

    const newEvents = log.slice(seenCount.current)
    seenCount.current = log.length
    if (newEvents.length === 0) return

    const spawn = (setter: Dispatch<SetStateAction<FloatingNumber[]>>, entry: FloatingNumber) => {
      setter((prev) => [...prev, entry])
      window.setTimeout(() => {
        setter((prev) => prev.filter((n) => n.id !== entry.id))
      }, (entry.max ? MAX_LIFETIME_MS : LIFETIME_MS) + (entry.delayMs ?? 0))
    }

    // Phase 6-A（決定162）：着弾の時刻・段階は着弾計画（combatTimeline）と共有する。
    // 数字は「着弾の瞬間」に出る（hit stop 中にポップし、その後に表示HPが動く）。
    const plan = planBatch(newEvents, { enemyVisualType, reduced: prefersReducedMotion() })
    const selfEnemyHits = plan.steps.filter((st) => st.target === 'self' && st.role === 'enemy')
    const isMulti = selfEnemyHits.length >= 2
    const isSpecialSingle = newEvents.some((e) => e.t === 'ENEMY_ACTED' && e.kind === 'special')
    const enemySteps = plan.steps.filter((st) => st.target === 'enemy')
    const cardSteps = enemySteps.filter((st) => st.role === 'card')

    // 敵の胸の位置で、同時期の数字が重ならないよう横にずらす
    const enemyLeft = (st: ImpactStep): number | undefined => {
      if (st.role === 'bonus') return 66
      if (st.role === 'passive') return 34
      if (st.role === 'card' && cardSteps.length >= 2) return 42 + (cardSteps.indexOf(st) % 2) * 16
      return undefined
    }
    // 連撃hitのleftを 38%→50%→62% と振って重なりを防ぐ（3hit想定、2hitは38/50）
    const multiLeft = (index: number) => 38 + Math.min(index, 2) * 12

    for (const st of plan.steps) {
      const isEnemy = st.target === 'enemy'
      const setter = isEnemy ? setEnemyNumbers : setPlayerNumbers
      const hitIndex = selfEnemyHits.indexOf(st)
      // 強調＝神の一撃・最後の一撃（敵側）／必殺の単発着弾・連撃の最終hit（自分側）
      const emphasis = isEnemy
        ? st.role === 'burst' || st.final
        : st.role === 'enemy' && ((isSpecialSingle && !isMulti) || (isMulti && hitIndex === selfEnemyHits.length - 1))
      const leftPercent = isEnemy ? enemyLeft(st) : st.role === 'enemy' && isMulti ? multiLeft(hitIndex) : undefined
      // D2b：damage/block/healは表示×10。draw/AP（下のRESONANCE_BURST分岐）は倍率対象外
      if (st.amount > 0) {
        spawn(setter, {
          id: nextId.current++,
          text: `${st.role === 'bonus' ? '⚡' : ''}-${formatScaled(st.amount)}`,
          kind: 'damage',
          delayMs: st.atMs,
          emphasis,
          leftPercent,
          tier: st.tier,
          bonus: st.role === 'bonus',
          max: isEnemy && (st.role === 'burst' || st.final),
        })
      }
      // 第二次完成フェーズP0-3：完全ブロック時（amount=0・blocked>0）は既存の「-N」表示が出ないため、
      // これが唯一の視覚フィードバックになる。表記は「軽減N」（残ブロック量バッジ🛡Nと区別する）。
      if (st.blocked > 0) {
        spawn(setter, { id: nextId.current++, text: `軽減${formatScaled(st.blocked)}`, kind: 'block', delayMs: st.atMs })
      }
    }

    // 回復・共鳴由来の draw／AP。神の一撃の後に起きたものは、神の一撃の着弾に揃える（VFX-03）
    let afterBurst = false
    for (const event of newEvents) {
      if (event.t === 'RESONANCE_BURST') afterBurst = true
      if (event.t === 'HEALED' && event.amount > 0) {
        spawn(setPlayerNumbers, {
          id: nextId.current++,
          text: `+${formatScaled(event.amount)}`,
          kind: 'heal',
          delayMs: afterBurst ? BURST_IMPACT_MS : undefined,
        })
      } else if (event.t === 'RESONANCE_BURST' && godId) {
        const resonanceEffects = getGodDef(godId).resonanceEffects
        for (const effect of resonanceEffects) {
          if (effect.kind === 'draw' && effect.amount > 0) {
            spawn(setPlayerNumbers, { id: nextId.current++, text: `カード+${effect.amount}`, kind: 'draw', delayMs: BURST_IMPACT_MS })
          } else if (effect.kind === 'gainAp' && effect.amount > 0) {
            spawn(setPlayerNumbers, { id: nextId.current++, text: `神力+${effect.amount}`, kind: 'ap', delayMs: BURST_IMPACT_MS })
          }
        }
      }
    }
  }, [log, godId, enemyVisualType])

  return { enemyNumbers, playerNumbers }
}

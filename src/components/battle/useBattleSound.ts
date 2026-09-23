import { useEffect, useRef } from 'react'
import type { GameEvent } from '../../core/types'
import { sfx } from './sound'
import { BURST_EVOLVE_MS } from './enemyVfxTiming'
import { planBatch } from './combatTimeline'
import { prefersReducedMotion } from './reducedMotion'

/**
 * イベントログを見て効果音を鳴らすフック。
 * ルール本体（core）は音を一切知らないので、useBattleFx と同じ形で
 * 「起きた出来事」から「どう聞かせるか」への変換をここに閉じ込める。
 *
 * Phase 6-A（決定162）：着弾の音は着弾計画（combatTimeline.planBatch）と同じ時刻で鳴らす
 * （数字・敵リアクション・表示HPと同期。新しい音源は追加していない）。
 * 勝利／敗北のスティングとジングルは、撃破演出・結果画面の時刻に合わせて
 * useCombatPresentation が鳴らす（ここでは GAME_ENDED を扱わない）。
 */
export function useBattleSound(log: GameEvent[], enemyVisualType?: string): void {
  const seenCount = useRef(0)

  useEffect(() => {
    if (log.length < seenCount.current) seenCount.current = 0

    const newEvents = log.slice(seenCount.current)
    seenCount.current = log.length
    if (newEvents.length === 0) return

    const plan = planBatch(newEvents, { enemyVisualType, reduced: prefersReducedMotion() })
    const selfEnemyHits = plan.steps.filter((s) => s.target === 'self' && s.role === 'enemy')
    const isMulti = selfEnemyHits.length >= 2
    const isSpecial = newEvents.some((e) => e.t === 'ENEMY_ACTED' && (e.kind === 'special' || (e.kind === 'multiAttack' && !!e.label)))

    // 着弾（与ダメージ・被ダメージ）
    for (const st of plan.steps) {
      if (st.amount <= 0) continue
      if (st.target === 'enemy' && st.role === 'bonus' && !st.final) {
        // 決定224：条件⚡の追加着弾は打撃音ではなく専用の音色（撃破の一撃は従来どおり L4）
        sfx.bonusPayoff(st.atMs)
      } else if (st.target === 'enemy') {
        // 決定128：与ダメージ量で L1〜L4（神の一撃・最後の一撃は L4）
        sfx.damageEnemy(st.tier, st.atMs)
      } else if (st.role === 'enemy' && isMulti) {
        sfx.enemyMultiHit(selfEnemyHits.indexOf(st), st.atMs)
      } else if (st.role === 'enemy' && isSpecial) {
        sfx.enemySpecialImpact(st.atMs)
      } else {
        sfx.damageSelf(st.tier >= 3, st.atMs)
      }
    }

    let afterBurst = false
    for (const event of newEvents) {
      switch (event.t) {
        case 'CARD_PLAYED':
          sfx.cardPlay()
          break
        case 'CARD_DRAWN':
          sfx.cardDrawn()
          break
        case 'HEALED':
          if (event.amount > 0) sfx.heal()
          break
        case 'BLOCK_GAINED':
          sfx.block()
          break
        case 'RESONANCE_GAINED':
          sfx.resonanceGain()
          break
        case 'RESONANCE_BURST':
          // 決定128：7/7 到達＝READY の上昇音。着弾音は上の着弾計画（L4）が担う
          sfx.burstReady()
          afterBurst = true
          break
        case 'OTOMO_EVOLVED':
          sfx.otomoEvolve(afterBurst ? BURST_EVOLVE_MS : 0)
          break
        case 'DIVINATION_USED':
          sfx.divination()
          break
        case 'ENEMY_ACTED':
          // ENEMY-IDENTITY-PROTOTYPE-02：連撃・必殺技も攻撃音を鳴らす（chargeのみ無音）
          if (event.kind === 'charge') sfx.enemyCharge() // 決定128：溜めは警告音、それ以外は敵ターン音
          else sfx.enemyTurn()
          break
        default:
          break
      }
    }
  }, [log, enemyVisualType])
}

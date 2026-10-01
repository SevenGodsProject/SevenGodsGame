import { useEffect, useRef } from 'react'
import type { GameEvent } from '../../core/types'
import { sfx } from './sound'
import { BURST_EVOLVE_MS, BURST_IMPACT_MS, MULTI_CUTIN_LEAD_MS, SPECIAL_IMPACT_MS } from './enemyVfxTiming'
import { planBatch } from './combatTimeline'
import { prefersReducedMotion } from './reducedMotion'
import { planSoundLayer } from './feelTier'
import { duckBgm, releaseBgmDuck } from './bgm'

/**
 * イベントログを見て効果音を鳴らすフック。
 * ルール本体（core）は音を一切知らないので、useBattleFx と同じ形で
 * 「起きた出来事」から「どう聞かせるか」への変換をここに閉じ込める。
 *
 * Phase 6-A（決定162）：着弾の音は着弾計画（combatTimeline.planBatch）と同じ時刻で鳴らす
 * （数字・敵リアクション・表示HPと同期。新しい音源は追加していない）。
 * 勝利／敗北のスティングとジングルは、撃破演出・結果画面の時刻に合わせて
 * useCombatPresentation が鳴らす（ここでは GAME_ENDED を扱わない）。
 *
 * Tap Feedback v1（Sound lane）：カードの押下音は useGameEngine.playCard がクリックの瞬間に
 * 鳴らす（sfx.cardTap）。commit 時の CARD_PLAYED では鳴らさない（二重の「カチッ」を無くす）。
 *
 * 決定257 Sound Layer v1：神の一撃・敵の必殺のバッチだけ、rise SE（burst_rise／enemy_rise）を
 * 既存の時刻表から導いた時刻に予約し、BGM を着弾＋300ms まで下げる（duck）。入力ロック・
 * 着弾時刻・GameState には一切触れない（音の予約を足すだけ）。
 */
export function useBattleSound(log: GameEvent[], enemyVisualType?: string): void {
  const seenCount = useRef(0)

  // 決定257：戦闘画面を離れる（Retry／もう一度／Home）ときに duck を残さない
  useEffect(() => () => releaseBgmDuck(), [])

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

    // 決定257：決め所の rise と BGM duck（時刻は planBatch／enemyVfxTiming から導くだけ）
    const ultimateAct = newEvents.find((e) => e.t === 'ENEMY_ACTED' && (e.kind === 'special' || (e.kind === 'multiAttack' && !!e.label)))
    const enemyImpacts = selfEnemyHits.map((s) => s.atMs)
    const enemyFirstImpactMs = ultimateAct?.t === 'ENEMY_ACTED' && ultimateAct.kind === 'multiAttack' ? MULTI_CUTIN_LEAD_MS : SPECIAL_IMPACT_MS
    const layer = planSoundLayer({
      burst: plan.burst,
      burstImpactMs: BURST_IMPACT_MS,
      enemyUltimate: isSpecial,
      enemyFirstImpactMs: enemyImpacts.length > 0 ? Math.min(...enemyImpacts) : enemyFirstImpactMs,
      enemyLastImpactMs: enemyImpacts.length > 0 ? Math.max(...enemyImpacts) : enemyFirstImpactMs,
    })
    if (layer.rise?.name === 'burst_rise') sfx.burstRise(layer.rise.delayMs)
    else if (layer.rise?.name === 'enemy_rise') sfx.enemyRise(layer.rise.delayMs)
    if (layer.duckHoldMs !== null) duckBgm(layer.duckHoldMs)

    let afterBurst = false
    for (const event of newEvents) {
      switch (event.t) {
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

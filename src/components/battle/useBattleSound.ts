import { useEffect, useRef } from 'react'
import type { GameEvent } from '../../core/types'
import { sfx } from './sound'
import { damageFeelTier } from './feelTier'
import { playJingle } from './bgm'
import {
  BURST_EVOLVE_MS,
  BURST_IMPACT_MS,
  MULTI_CUTIN_LEAD_MS,
  SPECIAL_IMPACT_MS,
  multiHitOffsetMs,
} from './enemyVfxTiming'

/**
 * イベントログを見て効果音を鳴らすフック。
 * ルール本体（core）は音を一切知らないので、useBattleFx と同じ形で
 * 「起きた出来事」から「どう聞かせるか」への変換をここに閉じ込める。
 */
export function useBattleSound(log: GameEvent[]): void {
  const seenCount = useRef(0)

  useEffect(() => {
    if (log.length < seenCount.current) seenCount.current = 0

    const newEvents = log.slice(seenCount.current)
    seenCount.current = log.length
    if (newEvents.length === 0) return

    // ENEMY-VFX-02：このバッチが敵の連撃/必殺なら、self被弾のSEを視覚timeline
    // （enemyVfxTiming.ts）と同じdelayで鳴らす（useFloatingNumbers.tsと同じ
    // イベント列判定。敵IDのswitchは持たない）。
    const enemyActed = newEvents.find(
      (e): e is Extract<GameEvent, { t: 'ENEMY_ACTED' }> => e.t === 'ENEMY_ACTED' && e.kind !== 'charge',
    )
    const seMulti = enemyActed?.kind === 'multiAttack'
    const seSpecial = enemyActed?.kind === 'special' || (seMulti && !!enemyActed?.label)
    const seLead = seSpecial ? (seMulti ? MULTI_CUTIN_LEAD_MS : SPECIAL_IMPACT_MS) : 0
    let seHitIndex = 0
    // VFX-03：RESONANCE_BURST以降の敵ダメージ（＝神の一撃）とOTOMO進化のSEは、
    // 視覚timeline（cut-in→banner→着弾→進化）と同じdelayで鳴らす。
    // カード自身の効果（RESONANCE_BURSTより前のDAMAGE_DEALT）は従来どおり即時。
    let afterBurst = false

    for (const event of newEvents) {
      switch (event.t) {
        case 'CARD_PLAYED':
          sfx.cardPlay()
          break
        case 'CARD_DRAWN':
          sfx.cardDrawn()
          break
        case 'DAMAGE_DEALT':
          if (event.amount > 0) {
            if (event.target === 'enemy') {
              // 決定128：与ダメージ量で L1〜L4（BURST は L4）。着弾タイミングは従来どおり
              sfx.damageEnemy(damageFeelTier(event.amount, { burst: afterBurst }), afterBurst ? BURST_IMPACT_MS : 0)
            } else if (seMulti) {
              sfx.enemyMultiHit(seHitIndex, seLead + multiHitOffsetMs(seHitIndex))
              seHitIndex += 1
            } else if (seSpecial) {
              sfx.enemySpecialImpact(seLead)
            } else {
              sfx.damageSelf(damageFeelTier(event.amount) >= 3)
            }
          }
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
          // 決定128：7/7 到達＝READY の上昇音。着弾音は後続の DAMAGE_DEALT（L4）が担う
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
        case 'GAME_ENDED':
          if (event.status === 'won') {
            sfx.victory()
            playJingle('victory')
          } else {
            sfx.defeat()
            playJingle('defeat')
          }
          break
        default:
          break
      }
    }
  }, [log])
}

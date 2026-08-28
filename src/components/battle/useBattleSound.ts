import { useEffect, useRef } from 'react'
import type { GameEvent } from '../../core/types'
import { sfx } from './sound'
import { playJingle } from './bgm'

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
            if (event.target === 'enemy') sfx.damageEnemy()
            else sfx.damageSelf()
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
          sfx.resonanceBurst()
          break
        case 'OTOMO_EVOLVED':
          sfx.otomoEvolve()
          break
        case 'DIVINATION_USED':
          sfx.divination()
          break
        case 'ENEMY_ACTED':
          // ENEMY-IDENTITY-PROTOTYPE-02：連撃・必殺技も攻撃音を鳴らす（chargeのみ無音）
          if (event.kind !== 'charge') sfx.enemyTurn()
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

import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { GameEvent } from '../../core/types'

export type FloatingNumber = { id: number; text: string; kind: 'damage' | 'heal' }

const LIFETIME_MS = 900

/**
 * イベントログを見て、HPバーの上に浮かべる「-8」「+5」のような数値の
 * 出現・消滅タイミングを作るフック。実際の見た目（アニメーション）はCSS側。
 */
export function useFloatingNumbers(log: GameEvent[]): {
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
      }, LIFETIME_MS)
    }

    for (const event of newEvents) {
      if (event.t === 'DAMAGE_DEALT' && event.amount > 0) {
        const entry: FloatingNumber = { id: nextId.current++, text: `-${event.amount}`, kind: 'damage' }
        spawn(event.target === 'enemy' ? setEnemyNumbers : setPlayerNumbers, entry)
      } else if (event.t === 'HEALED' && event.amount > 0) {
        spawn(setPlayerNumbers, { id: nextId.current++, text: `+${event.amount}`, kind: 'heal' })
      }
    }
  }, [log])

  return { enemyNumbers, playerNumbers }
}

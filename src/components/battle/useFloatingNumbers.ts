import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { GameEvent } from '../../core/types'

export type FloatingNumber = { id: number; text: string; kind: 'damage' | 'heal' | 'block' }

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
      if (event.t === 'DAMAGE_DEALT') {
        const setter = event.target === 'enemy' ? setEnemyNumbers : setPlayerNumbers
        if (event.amount > 0) {
          spawn(setter, { id: nextId.current++, text: `-${event.amount}`, kind: 'damage' })
        }
        // 第二次完成フェーズP0-3：DAMAGE_DEALT.blockedは既存のデータとして
        // 存在していたが、これまでどのフックも読んでいなかった（未消費）。
        // 完全ブロック時（amount=0・blocked>0）は既存の「-N」表示が出ないため、
        // これが唯一の視覚フィードバックになる。一部ブロック時は「-N」と並んで
        // 表示されるが、CSS側で表示位置をずらしており（.floating-number-block）、
        // 二重表示（同じ位置に重なる）にはならない。
        if (event.blocked > 0) {
          spawn(setter, { id: nextId.current++, text: `🛡${event.blocked}`, kind: 'block' })
        }
      } else if (event.t === 'HEALED' && event.amount > 0) {
        spawn(setPlayerNumbers, { id: nextId.current++, text: `+${event.amount}`, kind: 'heal' })
      }
    }
  }, [log])

  return { enemyNumbers, playerNumbers }
}

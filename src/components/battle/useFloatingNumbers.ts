import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { GameEvent, GodId } from '../../core/types'
import { getGodDef } from '../../core/data/gods'

export type FloatingNumber = {
  id: number
  text: string
  kind: 'damage' | 'heal' | 'block' | 'draw' | 'ap'
}

const LIFETIME_MS = 900

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
        // 表記は「軽減N」（アイコンなし）。「🛡N」だと既存の残ブロック量バッジ
        // （PlayerPanel/EnemyPanelの.badge-block、同じ🛡アイコン・同じ色）と
        // 見た目が完全に一致し、「残っている量」なのか「今回吸収した量」なのか
        // 一瞬で区別できなかった（Opusレビュー・CEO判断）。既存のバトルログ
        // （formatEvent.ts）が同じ意味を「（N軽減）」と表現している言葉をそのまま
        // 流用し、色（#7fb2ff）はバッジと共通のまま維持している。
        if (event.blocked > 0) {
          spawn(setter, { id: nextId.current++, text: `軽減${event.blocked}`, kind: 'block' })
        }
      } else if (event.t === 'HEALED' && event.amount > 0) {
        spawn(setPlayerNumbers, { id: nextId.current++, text: `+${event.amount}`, kind: 'heal' })
      } else if (event.t === 'RESONANCE_BURST' && godId) {
        const resonanceEffects = getGodDef(godId).resonanceEffects
        for (const effect of resonanceEffects) {
          if (effect.kind === 'draw' && effect.amount > 0) {
            spawn(setPlayerNumbers, {
              id: nextId.current++,
              text: `カード+${effect.amount}`,
              kind: 'draw',
            })
          } else if (effect.kind === 'gainAp' && effect.amount > 0) {
            spawn(setPlayerNumbers, {
              id: nextId.current++,
              text: `神力+${effect.amount}`,
              kind: 'ap',
            })
          }
        }
      }
    }
  }, [log, godId])

  return { enemyNumbers, playerNumbers }
}

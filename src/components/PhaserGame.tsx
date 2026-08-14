import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { gameConfig } from '../game/gameConfig'

/**
 * React と Phaser をつなぐ「橋渡し」コンポーネント。
 *
 * React は画面を何度も描き直しますが、Phaser のゲーム本体は
 * 一度だけ作って使い回す必要があります。そのため
 *   - useRef  … 再描画されても中身が消えない箱
 *   - useEffect … 画面に出た直後 / 消える直前に処理を挟む仕組み
 * を使って、生成と後片付けを厳密に 1 回ずつ行っています。
 */
export function PhaserGame() {
  // Phaser が描画をぶら下げる先の <div>
  const containerRef = useRef<HTMLDivElement>(null)
  // 生成済みのゲーム本体を覚えておく箱
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    // すでに作ってあるなら二重に作らない
    if (gameRef.current) return

    gameRef.current = new Phaser.Game({
      ...gameConfig,
      parent: containerRef.current!, // この div の中に canvas が差し込まれる
    })

    // このコンポーネントが画面から消えるときの後片付け。
    // これを書かないとゲームが裏で動き続けてメモリを食います。
    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, []) // [] = 最初の1回だけ実行

  return <div ref={containerRef} className="phaser-container" />
}

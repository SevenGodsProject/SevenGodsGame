import { useEffect } from 'react'
import { GODS } from '../core/data/gods'
import { safeEnemyName } from './enemyLookup'
import { FIRST_BATTLE_BRIEF_LINES, FIRST_BATTLE_PRESET } from './setup/firstBattle'
import './tutorial.css'

type FirstBattleBriefProps = {
  /** 「出陣する」：初陣を始める */
  onConfirm: () => void
  /** 「もどる」・Esc・背景クリック：ホームへ戻る（何も始めない） */
  onCancel: () => void
  /** 「詳しい遊び方」：既存の完全版（TutorialOverlay）を開く */
  onOpenTutorial: () => void
}

/**
 * Phase 7 Entrance E1（決定193・仕様 §7〜§8）：「初陣へ」を押したときだけ出る、3 行の短い説明。
 *
 * 起動時に自動で開いていた 699 字の「遊び方」の代わりに、最初の 1 戦に必要なことだけを伝える
 * （敵の予告／神力とカード／ラウンドを終えることと勝利条件）。ボタン 3 つはスクロールなしで見える。
 * 完全版は削除しておらず、ヘッダーの本のアイコンと、ここの「詳しい遊び方」から開ける。
 * この部品は表示だけで、storage には触れない（閉じたときの記録は呼び出し側が行う）。
 */
export function FirstBattleBrief({ onConfirm, onCancel, onOpenTutorial }: FirstBattleBriefProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const god = GODS.find((g) => g.id === FIRST_BATTLE_PRESET.godId)

  return (
    <div className="tutorial-overlay first-battle-brief-backdrop" onClick={onCancel} data-testid="first-battle-brief">
      <div
        className="tutorial-card first-battle-brief"
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-battle-brief-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="tutorial-title" id="first-battle-brief-title">
          初陣
        </h2>
        <p className="tutorial-genre">
          {god?.nameJa ?? ''}と共に、{safeEnemyName(FIRST_BATTLE_PRESET.enemyId)}へ挑む
        </p>
        <ol className="first-battle-brief-lines" data-testid="first-battle-brief-lines">
          {FIRST_BATTLE_BRIEF_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
        <div className="first-battle-brief-actions">
          <button type="button" className="home-cta-primary first-battle-brief-go" onClick={onConfirm} autoFocus>
            出陣する
          </button>
          <button type="button" className="home-cta-secondary" onClick={onCancel}>
            もどる
          </button>
        </div>
        <button type="button" className="first-battle-brief-more" onClick={onOpenTutorial}>
          詳しい遊び方
        </button>
      </div>
    </div>
  )
}

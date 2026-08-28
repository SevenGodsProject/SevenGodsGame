import { getEnemyDef } from '../../core/data/enemies'
import type { EnemyId } from '../../core/types'
import { formatScaled } from '../displayScale'

type BattleEnemyCutinProps = {
  /** カットインを表示する敵。artはEnemyDefから引く（敵IDのswitchは持たない） */
  enemyDefId: EnemyId
  /** 技名（ENEMY_ACTED.label由来。fx.enemySpecialName） */
  specialName: string
  /** 技の合計amount（内部値。表示は×10） */
  amount: number
  /** カットイン終了（enemyVfxTiming.ENEMY_CUTIN_TOTAL_MS実測）で呼ばれる。
   * 着弾演出（ビーム/シェイク解禁）へのハンドオフ用 */
  onComplete: () => void
}

/**
 * ENEMY-VFX-02：敵必殺技カットイン（cinematic strip版）。
 *
 * A3 Human Playtestで「小カード（幅340px）＋技名」は『HUDの一部』に見え
 * 「少し地味」と判定されたため（CUT-1）、画面横幅を使うcinematic strip（CUT-2）へ
 * 再設計した。骨格（onAnimationEndのCSS実測終了ハンドオフ・操作ブロック・
 * MiniResult抑制）は共鳴カットイン＝決定80パターンのまま。
 *
 * timeline（enemyVfxTiming.ts参照、CSSと一致）：
 * T+0 darken/desaturate → T+120 strip slide-in（portraitはKen Burns）→
 * T+400 技名peak → T+870 energy flash → T+1050 終了→即ビームへ。
 *
 * 表示専用：GameState・combat計算には一切関与しない（発動時点で結果確定済み）。
 */
export function BattleEnemyCutin({ enemyDefId, specialName, amount, onComplete }: BattleEnemyCutinProps) {
  const def = getEnemyDef(enemyDefId)

  const handleAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.animationName !== 'enemy-cutin-timer') return
    onComplete()
  }

  return (
    <div className="enemy-cutin" onAnimationEnd={handleAnimationEnd}>
      <div className="enemy-cutin-strip">
        <div className="enemy-cutin-portrait-frame">
          <img className="enemy-cutin-image" src={def.art} alt={def.name} />
        </div>
        <div className="enemy-cutin-caption">
          <div className="enemy-cutin-enemy-name">{def.name}</div>
          <div className="enemy-cutin-text">{specialName}</div>
          <div className="enemy-cutin-amount">🔥 {formatScaled(amount)}</div>
        </div>
      </div>
      <div className="enemy-cutin-flash" aria-hidden="true" />
    </div>
  )
}

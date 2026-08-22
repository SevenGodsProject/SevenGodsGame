import type { EnemyState, PlayerState } from '../../core/types'
import { formatEnemyIntent } from './cardStyle'

type BattleHudProps = {
  enemy: EnemyState
  player: PlayerState
  ap: { current: number; max: number }
  resonance: { value: number; max: number }
}

/**
 * Battle UX P0改善（監査＋HUD方式最終比較、CEO+相棒承認）：カード選択中でも
 * 判断材料（敵の予告・自分HP・AP・共鳴）を確認できるようにする、表示専用の
 * 縮小戦況バー。
 *
 * 配置は`.hand`の直前（`BattleScreen.tsx`）で、`position:sticky`により
 * 「EnemyPanel/PlayerPanelがまだ画面内にある間は本来位置（.handの直前）に
 * 留まり、スクロールでそれらが隠れるタイミングで初めて画面上部に張り付く」
 * という比較検証済みの挙動を実現する（案B。既存`.battle-topbar`の拡張＝案Aは
 * 常時二重表示になることが実測で確認できたため不採用）。
 *
 * 表示するのは`state.enemy`/`state.player`/`state.ap`/`state.resonance`の
 * 読み取りのみ。新しいGameState・保存データ・バトルロジックは一切持たない。
 * ラウンド・スコア・神/敵/OTOMO画像・託宣残数等は意図的に含めない
 * （比較検証でHUD高さが増えるほどカード領域を圧迫することが分かったため、
 * 「カードを選ぶ判断に必須の4項目＋敵HP」だけに絞っている）。
 */
export function BattleHud({ enemy, player, ap, resonance }: BattleHudProps) {
  // STEP3-A：EnemyPanelと同じtier表示（⚔/💥/🔥/⚡）に揃える。HUDの高さ・レイアウトは無変更。
  const intentText = formatEnemyIntent(enemy.intent)

  return (
    <div className="battle-hud">
      <div className="battle-hud-row">
        <span>
          敵 HP {enemy.hp}/{enemy.maxHp}
        </span>
        <span className="battle-hud-sep">｜</span>
        <span>{intentText}</span>
      </div>
      <div className="battle-hud-row">
        <span>
          自分 HP {player.hp}/{player.maxHp}
        </span>
        <span className="battle-hud-sep">｜</span>
        <span>
          神力 {ap.current}/{ap.max}
        </span>
        <span className="battle-hud-sep">｜</span>
        <span>
          共鳴 {resonance.value}/{resonance.max}
        </span>
      </div>
    </div>
  )
}

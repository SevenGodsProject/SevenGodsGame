import { useEffect, useRef, useState } from 'react'
import { getGodDef } from '../../core/data/gods'
import { getEnemyDef } from '../../core/data/enemies'
import { STAT_LABEL } from '../setup/godStyle'
import type { EnemyState, GodId, PlayerState } from '../../core/types'
import type { MiniResultData } from './useBattleFx'

type BattleMiniResultProps = {
  godId: GodId
  enemy: EnemyState
  player: PlayerState
  resonanceMax: number
  /** 変わるたびに新しい結果を表示し直す（useBattleFxのminiResultKey） */
  resultKey: number
  result: MiniResultData | null
}

/** STEP2-B：結果1件あたりの表示時間（テンポ優先、既存floating-numberの0.9秒より短く） */
const DISPLAY_MS = 700

/**
 * STEP2-B：「カードを選ぶため下へスクロールすると、上部の戦闘シーンが見えない」
 * 問題への対応。BattleHud（sticky、高さ58px固定・全幅で同一）の直下に、
 * カード使用結果（誰が誰を攻撃したか＋数値変化）を一時的に表示する。
 *
 * 新しいGameStateは一切持たない。表示するデータは全て`useBattleFx`が既存の
 * GameEvent（DAMAGE_DEALT/HEALED/BLOCK_GAINED/RESONANCE_GAINED/CARD_DRAWN/
 * BUFF_APPLIED/ENEMY_ACTED）から導出した`MiniResultData`と、`enemy`/`player`の
 * 現在値（BattleHudと同じprops）だけ。HP変化の「before」は現在値と今回の
 * 増減量から逆算しており、新しい保存領域は増やしていない。
 *
 * 連続カード使用（才華のTASK8）：`resultKey`が変わるたびにタイマーを
 * リセットして即座に新しい結果へ差し替える。キューは持たない＝手札は
 * 常に操作可能（この演出自体はカード操作をブロックしない、表示専用）。
 */
export function BattleMiniResult({ godId, enemy, player, resonanceMax, resultKey, result }: BattleMiniResultProps) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (resultKey === 0 || !result) return
    setVisible(true)
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setVisible(false), DISPLAY_MS)
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultKey])

  if (!result || !visible) return null

  const god = getGodDef(godId)
  const enemyDef = getEnemyDef(enemy.defId)
  const isPlayerAttack = result.direction === 'playerAttack'
  const isEnemyAttack = result.direction === 'enemyAttack'

  // TASK9：敵ターンは[敵]→⚔→[神]、プレイヤー攻撃は[神]→⚔→[敵]。
  // 攻撃を受けた側のアイコンにだけimpact/shakeを付ける。
  const sourceIcon = isEnemyAttack ? enemyDef.art : god.art.front
  const sourceAlt = isEnemyAttack ? enemyDef.name : god.nameJa
  const targetIcon = isEnemyAttack ? god.art.front : enemyDef.art
  const targetAlt = isEnemyAttack ? god.nameJa : enemyDef.name

  // HP変化の「before」は現在値(after)と今回の増減量から逆算する（新規state不要）
  const enemyHpBefore = Math.min(enemy.maxHp, enemy.hp + result.enemyDamage)
  const selfHpBefore = Math.min(
    player.maxHp,
    player.hp - result.heal + result.enemyAttackDamage + result.selfInflictedDamage,
  )

  return (
    <div
      key={resultKey}
      className={`battle-mini-result battle-mini-result-${result.direction}`}
    >
      {(isPlayerAttack || isEnemyAttack) && (
        <div className="battle-mini-result-stage">
          <img className="battle-mini-result-icon" src={sourceIcon} alt={sourceAlt} />
          <span className="battle-mini-result-arrow">⚔</span>
          <img className="battle-mini-result-icon battle-mini-result-icon-hit" src={targetIcon} alt={targetAlt} />
        </div>
      )}
      <div className="battle-mini-result-lines">
        {isPlayerAttack && result.enemyDamage > 0 && (
          <>
            <span className="battle-mini-result-main battle-mini-result-damage">-{result.enemyDamage} DAMAGE!</span>
            <span className="battle-mini-result-sub">
              敵 HP {enemyHpBefore}→{enemy.hp}
            </span>
          </>
        )}
        {isEnemyAttack && result.enemyAttackDamage > 0 && (
          <>
            <span className="battle-mini-result-main battle-mini-result-damage">-{result.enemyAttackDamage} DAMAGE!</span>
            <span className="battle-mini-result-sub">
              HP {selfHpBefore}→{player.hp}
            </span>
          </>
        )}
        {result.selfInflictedDamage > 0 && (
          <span className="battle-mini-result-sub battle-mini-result-damage">自分に{result.selfInflictedDamage}ダメージ</span>
        )}
        {result.block > 0 && (
          <span className="battle-mini-result-sub battle-mini-result-block">🛡 BLOCK +{result.block}</span>
        )}
        {result.heal > 0 && (
          <span className="battle-mini-result-sub battle-mini-result-heal">✨ HP +{result.heal}</span>
        )}
        {result.resonanceGain > 0 && (
          <span className="battle-mini-result-sub battle-mini-result-resonance">
            🔥 共鳴+{result.resonanceGain}
            {result.resonanceTotal !== null ? `（${result.resonanceTotal}/${resonanceMax}）` : ''}
          </span>
        )}
        {result.apGain > 0 && <span className="battle-mini-result-sub">神力+{result.apGain}</span>}
        {result.drawCount > 0 && <span className="battle-mini-result-sub">カード+{result.drawCount}</span>}
        {result.buffs.map((b, i) => (
          <span key={i} className="battle-mini-result-sub">
            {b.target === 'enemy' ? '敵' : '自分'}
            {STAT_LABEL[b.stat as keyof typeof STAT_LABEL] ?? b.stat}
            {b.amount > 0 ? '+' : ''}
            {b.amount}（{b.rounds}R）
          </span>
        ))}
      </div>
    </div>
  )
}

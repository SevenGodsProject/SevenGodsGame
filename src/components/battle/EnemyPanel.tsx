import type { EnemyState } from '../../core/types'
import { getEnemyDef } from '../../core/data/enemies'
import { STAT_LABEL } from '../setup/godStyle'
import { formatEnemyIntent, getIntentTierClass, type PowerTier } from './cardStyle'
import { HpBar } from './HpBar'
import { FloatingNumbers } from './FloatingNumbers'
import type { FloatingNumber } from './useFloatingNumbers'

type EnemyPanelProps = {
  enemy: EnemyState
  /** 現在のラウンド（決定40：掛け声の切り替えに使う） */
  round: number
  /** 変わるたびに被弾シェイクを再生する */
  hitKey: number
  /** 変わるたびに敵の攻撃モーションを再生する */
  attackKey: number
  /** STEP-UX5：直近の敵攻撃の危険度tier（fx.enemyAttackTier）。突進モーションの
   * 「重さ」を、visualType由来の速度（lungeSpeedSuffix）とは独立に掛け合わせる。 */
  attackTier: PowerTier
  floatingNumbers: FloatingNumber[]
}

/**
 * 敵のビジュアル。決定32でCEOが用意した専用イラスト（7種）に対応し、
 * 円形フレーム＋発光の演出はCSSのまま残している（決定28の発展）。
 * 攻撃時は`enemy-lunge`でプレイヤー側へ突進し、被弾時は`hit-shake`＋
 * `impact-flash`＋斬撃エフェクトで応じる。決定40：ラウンドごとに敵の掛け声を
 * 吹き出しで表示する（`Math.random`は使わず`round`から決定論的に選ぶ）。
 */
export function EnemyPanel({ enemy, round, hitKey, attackKey, attackTier, floatingNumbers }: EnemyPanelProps) {
  const def = getEnemyDef(enemy.defId)
  const line = def.battleCries[(round - 1) % def.battleCries.length]

  // STEP3-A：終盤glow（datenshi＝控えめ／onryo＝明確）はround>=5から、
  // 溜め中glow（karakuri/doukeshi）はintent.kind==='charge'の間だけ付与する。
  // どちらも表示専用のクラス出し分けで、GameState・敵AIには一切触れない。
  const isLateSurge = (def.visualType === 'lateSurgeMild' || def.visualType === 'lateSurgeStrong') && round >= 5
  const surgeClass = isLateSurge ? (def.visualType === 'lateSurgeStrong' ? ' enemy-avatar-surge-strong' : ' enemy-avatar-surge-mild') : ''
  const chargingClass = enemy.intent?.kind === 'charge' ? ' enemy-avatar-charging' : ''
  const lungeSpeedSuffix = def.visualType === 'fast' ? '-fast' : def.visualType === 'heavy' ? '-heavy' : ''
  // STEP-UX5：「動き方」（lungeSpeedSuffix、敵の個性＝visualType由来）と
  // 「攻撃の重さ」（attackTier、今回のIntent危険度由来）を別クラスとして
  // 両方付与する。battle.cssの複合セレクタ（.enemy-lunge{-fast,-heavy}.enemy-lunge-tier-*）
  // が両方を掛け合わせる。normal tierはトークン自体を付与しないため、visualType単体の
  // 見た目（STEP3-A以前からの既存演出）と完全に同一のまま。
  const lungeTierToken =
    attackTier === 'huge' ? ' enemy-lunge-tier-huge' : attackTier === 'strong' ? ' enemy-lunge-tier-strong' : ''

  return (
    <div className="panel enemy-panel">
      <div className="panel-title">{enemy.name}</div>
      <div className="enemy-type-row">
        <span className="enemy-type-badge">【{def.typeLabel}】</span>
        <span className="enemy-type-desc">{def.typeDescription}</span>
      </div>
      <div key={`line-${round}`} className="enemy-speech-bubble">
        {line}
      </div>
      <div
        key={`atk-${attackKey}`}
        className={`enemy-avatar-wrap${attackKey > 0 ? ` enemy-lunge${lungeSpeedSuffix}${lungeTierToken}` : ''}`}
      >
        <div className={`enemy-avatar${surgeClass}${chargingClass}`} style={{ backgroundImage: `url(${def.art})` }} />
      </div>
      <div
        key={`hit-${hitKey}`}
        className={hitKey > 0 ? 'hit-shake-flash' : undefined}
        style={{ position: 'relative' }}
      >
        <HpBar current={enemy.hp} max={enemy.maxHp} color="#e5484d" />
        {hitKey > 0 && <div className="slash-fx" />}
        <FloatingNumbers numbers={floatingNumbers} />
      </div>
      {enemy.block > 0 && <div className="badge badge-block">🛡 {enemy.block}</div>}
      <div className={`intent ${getIntentTierClass(enemy.intent)}`.trim()}>{formatEnemyIntent(enemy.intent)}</div>
      {enemy.buffs.length > 0 && (
        <div className="buff-list">
          {enemy.buffs.map((b, i) => (
            <span key={i} className="badge badge-buff">
              {STAT_LABEL[b.stat]} {b.amount > 0 ? '+' : ''}
              {b.amount}（{b.remainingRounds}）
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

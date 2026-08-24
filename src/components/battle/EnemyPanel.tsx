import type { EnemyState } from '../../core/types'
import { getEnemyDef } from '../../core/data/enemies'
import { STAT_LABEL } from '../setup/godStyle'
import { formatEnemyIntent, getIntentTierClass } from './cardStyle'
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
  floatingNumbers: FloatingNumber[]
}

/**
 * 敵のビジュアル。決定32でCEOが用意した専用イラスト（7種）に対応し、
 * 円形フレーム＋発光の演出はCSSのまま残している（決定28の発展）。
 * 攻撃時は`enemy-lunge`でプレイヤー側へ突進し、被弾時は`hit-shake`＋
 * `impact-flash`＋斬撃エフェクトで応じる。決定40：ラウンドごとに敵の掛け声を
 * 吹き出しで表示する（`Math.random`は使わず`round`から決定論的に選ぶ）。
 */
export function EnemyPanel({ enemy, round, hitKey, attackKey, floatingNumbers }: EnemyPanelProps) {
  const def = getEnemyDef(enemy.defId)
  const line = def.battleCries[(round - 1) % def.battleCries.length]

  // STEP3-A：終盤glow（datenshi＝控えめ／onryo＝明確）はround>=5から、
  // 溜め中glow（karakuri/doukeshi）はintent.kind==='charge'の間だけ付与する。
  // どちらも表示専用のクラス出し分けで、GameState・敵AIには一切触れない。
  const isLateSurge = (def.visualType === 'lateSurgeMild' || def.visualType === 'lateSurgeStrong') && round >= 5
  const surgeClass = isLateSurge ? (def.visualType === 'lateSurgeStrong' ? ' enemy-avatar-surge-strong' : ' enemy-avatar-surge-mild') : ''
  const chargingClass = enemy.intent?.kind === 'charge' ? ' enemy-avatar-charging' : ''
  const lungeSpeedSuffix = def.visualType === 'fast' ? '-fast' : def.visualType === 'heavy' ? '-heavy' : ''

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
        className={`enemy-avatar-wrap${attackKey > 0 ? ` enemy-lunge${lungeSpeedSuffix}` : ''}`}
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

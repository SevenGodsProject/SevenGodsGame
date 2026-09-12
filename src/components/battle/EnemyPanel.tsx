import type { CSSProperties, ReactNode } from 'react'
import type { EnemyState } from '../../core/types'
import { getEnemyDef } from '../../core/data/enemies'
import { STAT_LABEL } from '../setup/godStyle'
import { formatScaled } from '../displayScale'
import { formatEnemyIntent, getIntentTierClass, type PowerTier } from './cardStyle'
import { HpBar } from './HpBar'
import { FloatingNumbers } from './FloatingNumbers'
import type { FloatingNumber } from './useFloatingNumbers'
import type { BatchPlan, ReactionPlan } from './combatTimeline'
import { hpBand } from './visualHp'
import { DEFEAT_COLLAPSE_MS, DEFEAT_COLLAPSE_REDUCED_MS } from './enemyVfxTiming'

type EnemyPanelProps = {
  enemy: EnemyState
  /** 現在のラウンド（決定40：掛け声の切り替えに使う） */
  round: number
  /** 変わるたびに敵の攻撃モーションを再生する */
  attackKey: number
  /** STEP-UX5：直近の敵攻撃の危険度tier（fx.enemyAttackTier）。突進モーションの
   * 「重さ」を、visualType由来の速度（lungeSpeedSuffix）とは独立に掛け合わせる。 */
  attackTier: PowerTier
  /** ENEMY-VFX-02：直近の敵攻撃バッチのhit数。2以上なら連撃用の多段lungeへ */
  multiHitCount: number
  /** 直近の攻撃が必殺（カットイン付き）か。lungeをカットイン後へ遅らせる */
  specialHit: boolean
  floatingNumbers: FloatingNumber[]
  /** Phase 6-A：表示HP（着弾に合わせて追従する値。engine の HP ではない） */
  hpShown: number
  /** Phase 6-A：直近アクションの着弾計画（リアクションの時刻・段階） */
  plan: BatchPlan | null
  /** 計画が変わるたびに増える（リアクション・斬撃の再生キー） */
  planKey: number
  /** Phase 6-A：撃破演出（崩壊中／消えた後） */
  defeated: boolean
  reduced?: boolean
}

/** 敵立ち絵のリアクション1層。reaction が無いときは素通しの div（ツリー構造を変えない） */
function Reaction({ reaction, planKey, index, children }: { reaction: ReactionPlan | undefined; planKey: number; index: number; children: ReactNode }) {
  if (!reaction || planKey === 0) return <div className="enemy-reaction-idle">{children}</div>
  const cls = [
    'enemy-reaction',
    `react-l${reaction.tier}`,
    reaction.final ? 'react-final' : '',
    reaction.burst ? 'react-burst' : '',
    reaction.minor ? 'react-minor' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const style = { '--impact-delay': `${reaction.atMs}ms`, '--stop': `${reaction.stopMs}ms` } as CSSProperties
  return (
    <div key={`react-${planKey}-${index}`} className={cls} style={style} data-impact-at={reaction.atMs}>
      {children}
    </div>
  )
}

/**
 * 敵のビジュアル。決定32でCEOが用意した専用イラスト（7種）に対応し、
 * 円形フレーム＋発光の演出はCSSのまま残している（決定28の発展）。
 * 決定40：ラウンドごとに敵の掛け声を吹き出しで表示する（`Math.random`は使わず`round`から決定論的に選ぶ）。
 *
 * Phase 6-A Combat Juice（決定162）：
 * - 被弾は「敵の立ち絵」が受ける（旧：HPバーのラッパーが揺れていた）。着弾の瞬間に対象だけ
 *   hit stop（ノックバック姿勢で静止）→ 段階別シェイク＋閃光。時刻は着弾計画（combatTimeline）の
 *   inline CSS 変数（--impact-delay／--stop）で受け取り、animationend には依存しない
 * - ダメージ数字は立ち絵の胸の位置に出す（HPの数値と重ならない）
 * - HPバーは表示HP（visualHp）で、着弾を見せてから減る。50%／25% 以下で静かに傷の色が付く
 * - 撃破：最後の一撃のあと、立ち絵がフラッシュ→脱色→沈んで消える（報酬はその後）
 */
export function EnemyPanel({
  enemy,
  round,
  attackKey,
  attackTier,
  multiHitCount,
  specialHit,
  floatingNumbers,
  hpShown,
  plan,
  planKey,
  defeated,
  reduced = false,
}: EnemyPanelProps) {
  const def = getEnemyDef(enemy.defId)
  const line = def.battleCries[(round - 1) % def.battleCries.length]

  // STEP3-A：終盤glow（datenshi＝控えめ／onryo＝明確）はround>=5から、
  // 溜め中glow（karakuri/doukeshi）はintent.kind==='charge'の間だけ付与する。
  const isLateSurge = (def.visualType === 'lateSurgeMild' || def.visualType === 'lateSurgeStrong') && round >= 5
  const surgeClass = isLateSurge ? (def.visualType === 'lateSurgeStrong' ? ' enemy-avatar-surge-strong' : ' enemy-avatar-surge-mild') : ''
  // ENEMY-VFX-01：次ラウンドが必殺技（special／技名付きmultiAttack）へつながる
  // chargeのときだけ、通常の溜めglowに「必殺充填」強化クラスを重ねる（data-driven）
  const nextAction = def.actions[round] ?? def.actions[def.actions.length - 1]
  const nextIsSpecial =
    nextAction.kind === 'special' || (nextAction.kind === 'multiAttack' && !!nextAction.special)
  const chargingClass =
    enemy.intent?.kind === 'charge'
      ? nextIsSpecial
        ? ' enemy-avatar-charging enemy-avatar-charging-super'
        : ' enemy-avatar-charging'
      : ''
  const lungeSpeedSuffix = def.visualType === 'fast' ? '-fast' : def.visualType === 'heavy' ? '-heavy' : ''
  // STEP-UX5：「動き方」（visualType）と「攻撃の重さ」（attackTier）を別クラスで掛け合わせる
  const lungeTierToken =
    attackTier === 'huge' ? ' enemy-lunge-tier-huge' : attackTier === 'strong' ? ' enemy-lunge-tier-strong' : ''

  const reactions = plan?.enemyReactions ?? []
  const band = hpBand(hpShown, enemy.maxHp)
  const collapseStyle = { '--collapse': `${reduced ? DEFEAT_COLLAPSE_REDUCED_MS : DEFEAT_COLLAPSE_MS}ms` } as CSSProperties

  return (
    <div className={`panel enemy-panel enemy-band-${band}`}>
      {/* Phase 6-B（決定164）：名前・HP・予告・状態を立ち絵の「上」に1枚の名札としてまとめる。
          こうすると、どの画面高でも予告と HP が立ち絵と一緒に必ず見える（旧：立ち絵の下にあり、
          手札を触る位置までスクロールすると画面外になっていた）。 */}
      <div className="enemy-plate">
        <div className="enemy-plate-head">
          <span className="panel-title">{enemy.name}</span>
          <span className="enemy-type-badge">【{def.typeLabel}】</span>
          <span className="enemy-type-desc">{def.typeDescription}</span>
        </div>
        <HpBar current={hpShown} max={enemy.maxHp} color="#e5484d" className={band === 'high' ? undefined : `hp-bar-${band}`} />
        <div className="enemy-plate-status">
          <div className={`intent ${getIntentTierClass(enemy.intent)}`.trim()}>{formatEnemyIntent(enemy.intent)}</div>
          {enemy.block > 0 && <div className="badge badge-block">🛡 {formatScaled(enemy.block)}</div>}
          {enemy.buffs.length > 0 && (
            <div className="buff-list">
              {enemy.buffs.map((b, i) => (
                <span key={i} className="badge badge-buff">
                  {STAT_LABEL[b.stat]} {b.amount > 0 ? '+' : ''}
                  {formatScaled(b.amount)}（{b.remainingRounds}）
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div key={`line-${round}`} className="enemy-speech-bubble">
        {line}
      </div>
      <div className="enemy-stage">
        {band !== 'high' && !defeated && <div className={`enemy-wound enemy-wound-${band}`} aria-hidden="true" />}
        <div className={`enemy-collapse${defeated ? ' enemy-defeat' : ''}`} style={collapseStyle}>
          {/* ENEMY-VFX-02：連撃はhitごとの多段lunge（TEMPO-B）。必殺はカットイン終了後へdelayする */}
          <div
            key={`atk-${attackKey}`}
            className={`enemy-avatar-wrap${
              attackKey > 0
                ? multiHitCount >= 2
                  ? ` enemy-lunge-multi-${Math.min(multiHitCount, 3)}${specialHit ? ' enemy-lunge-delay-multilead' : ''}`
                  : ` enemy-lunge${lungeSpeedSuffix}${lungeTierToken}${specialHit ? ' enemy-lunge-delay-cutinend' : ''}`
                : ''
            }`}
          >
            <Reaction reaction={reactions[0]} planKey={planKey} index={0}>
              <Reaction reaction={reactions[1]} planKey={planKey} index={1}>
                <div className={`enemy-avatar${surgeClass}${chargingClass}`} style={{ backgroundImage: `url(${def.art})` }} />
              </Reaction>
            </Reaction>
          </div>
        </div>
        {defeated && <div className="impact-ring enemy-defeat-ring" aria-hidden="true" />}
        <div className="enemy-hit-layer" aria-hidden="true">
          {planKey > 0 &&
            reactions.map((r, i) => (
              <div
                key={`slash-${planKey}-${i}`}
                className={`slash-fx slash-l${r.tier} juice-delayed${r.minor ? ' slash-minor' : ''}`}
                style={{ '--impact-delay': `${r.atMs}ms` } as CSSProperties}
              />
            ))}
          <FloatingNumbers numbers={floatingNumbers} />
        </div>
      </div>
    </div>
  )
}

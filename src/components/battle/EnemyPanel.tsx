import type { EnemyState } from '../../core/types'
import { getEnemyDef } from '../../core/data/enemies'
import { STAT_LABEL } from '../setup/godStyle'
import { formatScaled } from '../displayScale'
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
  /** ENEMY-VFX-02：直近の敵攻撃バッチのhit数。2以上なら連撃用の多段lungeへ */
  multiHitCount: number
  /** 直近の攻撃が必殺（カットイン付き）か。lungeをカットイン後へ遅らせる */
  specialHit: boolean
  /** VFX-03：直近の被弾が共鳴BURST（神の一撃）か（fx.burstHit）。被弾シェイク・斬撃線を
   * 共鳴カットイン→burst-bannerの後ろ（BURST_IMPACT_MS）へ遅らせる */
  burstHit: boolean
  floatingNumbers: FloatingNumber[]
}

/**
 * 敵のビジュアル。決定32でCEOが用意した専用イラスト（7種）に対応し、
 * 円形フレーム＋発光の演出はCSSのまま残している（決定28の発展）。
 * 攻撃時は`enemy-lunge`でプレイヤー側へ突進し、被弾時は`hit-shake`＋
 * `impact-flash`＋斬撃エフェクトで応じる。決定40：ラウンドごとに敵の掛け声を
 * 吹き出しで表示する（`Math.random`は使わず`round`から決定論的に選ぶ）。
 */
export function EnemyPanel({ enemy, round, hitKey, attackKey, attackTier, multiHitCount, specialHit, burstHit, floatingNumbers }: EnemyPanelProps) {
  const def = getEnemyDef(enemy.defId)
  const line = def.battleCries[(round - 1) % def.battleCries.length]

  // STEP3-A：終盤glow（datenshi＝控えめ／onryo＝明確）はround>=5から、
  // 溜め中glow（karakuri/doukeshi）はintent.kind==='charge'の間だけ付与する。
  // どちらも表示専用のクラス出し分けで、GameState・敵AIには一切触れない。
  const isLateSurge = (def.visualType === 'lateSurgeMild' || def.visualType === 'lateSurgeStrong') && round >= 5
  const surgeClass = isLateSurge ? (def.visualType === 'lateSurgeStrong' ? ' enemy-avatar-surge-strong' : ' enemy-avatar-surge-mild') : ''
  // ENEMY-VFX-01：次ラウンドが必殺技（special／技名付きmultiAttack）へつながる
  // chargeのときだけ、通常の溜めglowに「必殺充填」強化クラスを重ねる。
  // 判定は敵定義テーブル（次roundのaction）を読むだけの表示専用・data-driven
  // （敵IDのswitchなし。難易度倍率はダメージ値のみでkindは不変のためdefで判定できる）。
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
      {/* ENEMY-VFX-02：連撃はhitごとの多段lunge（TEMPO-B。enemyVfxTiming.tsと一致する
          keyframesをbattle.cssに焼き込み）。必殺はカットイン終了後へdelayする
          （神滅甲=1050ms・双牙乱撃=1100ms。表示のみ、combatは確定済み）。 */}
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
        <div className={`enemy-avatar${surgeClass}${chargingClass}`} style={{ backgroundImage: `url(${def.art})` }} />
      </div>
      {/* VFX-03：共鳴BURSTの一撃は「共鳴カットイン→✨神の一撃！バナー→神の突進」の
          後ろ（hit-delay-burst＝BURST_IMPACT_MS）で被弾する。通常攻撃は従来どおり即時。
          slash-fxのanimationは::before側にあるため、CSSも::beforeへdelayを掛けている */}
      <div
        key={`hit-${hitKey}`}
        className={hitKey > 0 ? `hit-shake-flash${burstHit ? ' hit-delay-burst' : ''}` : undefined}
        style={{ position: 'relative' }}
      >
        <HpBar current={enemy.hp} max={enemy.maxHp} color="#e5484d" />
        {hitKey > 0 && <div className={`slash-fx${burstHit ? ' hit-delay-burst' : ''}`} />}
        <FloatingNumbers numbers={floatingNumbers} />
      </div>
      {enemy.block > 0 && <div className="badge badge-block">🛡 {formatScaled(enemy.block)}</div>}
      <div className={`intent ${getIntentTierClass(enemy.intent)}`.trim()}>{formatEnemyIntent(enemy.intent)}</div>
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
  )
}

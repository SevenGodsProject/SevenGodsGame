import type { CSSProperties, ReactNode } from 'react'
import type { Difficulty, EnemyState } from '../../core/types'
import { getEnemyDef, isShogunateEnemyId } from '../../core/data/enemies'
import { resolveEnemyTactic } from '../../core/engine/tactic'
import { tacticLine } from './tacticLine'
import { STAT_LABEL } from '../setup/godStyle'
import { formatScaled } from '../displayScale'
import { formatEnemyIntentText, getIntentGlyph, getIntentStanceClass, getIntentTierClass, type PowerTier } from './cardStyle'
import { GlyphIcon } from './cardIcon'
import { HpBar } from './HpBar'
import { FloatingNumbers } from './FloatingNumbers'
import type { FloatingNumber } from './useFloatingNumbers'
import type { BatchPlan, ReactionPlan } from './combatTimeline'
import { hpBand } from './visualHp'
import { DEFEAT_COLLAPSE_MS, DEFEAT_COLLAPSE_REDUCED_MS } from './enemyVfxTiming'
import { enemyBreakClass, enemyBreakVars, useEnemyBreak, useEnemyBreakSe } from './enemyBreak'
import './enemyBreak.css'

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
  /** 決定249 Reaction Language v1：WEAKEN（敵の攻撃力を下げる札）の「よろめき」の再生回数（表示専用） */
  staggerKey?: number
  /** 将軍家 Pilot v0.4：難易度（忠次 enemy_08 の予告グローを表示 HP で解決するときだけ読む。表示専用） */
  difficulty?: Difficulty
}

/** 敵立ち絵のリアクション1層。reaction が無いときは素通しの div（ツリー構造を変えない） */
function Reaction({ reaction, planKey, index, children, staggerKey = 0 }: { reaction: ReactionPlan | undefined; planKey: number; index: number; children: ReactNode; staggerKey?: number }) {
  // 決定249：よろめきは着弾の無いバッチで起きるので reaction は無い。この idle wrapper（立ち絵の外側）に
  // rl-stagger を載せ、key で再マウント＝再生する。内側 `.enemy-avatar` の filter（決定240 の構え）・
  // scale（決定247 の反転）には触れない。DOM の階層も変えない（同じ div にクラスを足すだけ）
  if (!reaction || planKey === 0) {
    return (
      <div key={`idle-${index}-${staggerKey}`} className={`enemy-reaction-idle${staggerKey > 0 && index === 0 ? ' rl-stagger' : ''}`}>
        {children}
      </div>
    )
  }
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
  staggerKey = 0,
  difficulty = 'normal',
}: EnemyPanelProps) {
  const def = getEnemyDef(enemy.defId)
  const line = def.battleCries[(round - 1) % def.battleCries.length]

  // STEP3-A：終盤glow（datenshi＝控えめ／onryo＝明確）はround>=5から、
  // 溜め中glow（karakuri/doukeshi）はintent.kind==='charge'の間だけ付与する。
  const isLateSurge = (def.visualType === 'lateSurgeMild' || def.visualType === 'lateSurgeStrong') && round >= 5
  const surgeClass = isLateSurge ? (def.visualType === 'lateSurgeStrong' ? ' enemy-avatar-surge-strong' : ' enemy-avatar-surge-mild') : ''
  // ENEMY-VFX-01：次ラウンドが必殺技（special／技名付きmultiAttack）へつながる
  // chargeのときだけ、通常の溜めglowに「必殺充填」強化クラスを重ねる（data-driven）
  const nextScript = def.actions[round] ?? def.actions[def.actions.length - 1]
  // 将軍家 Pilot v0.4（enemy_08 忠次だけ・`docs/SHOGUNATE_NEXT_PILOT_AUDIT_V1.md` §4-3）：次ラウンドが軍略（tactic）なら
  // **表示 HP**（hpShown）と難易度で解決した側を見る＝表示 HP が 50% を割った瞬間に「必殺充填」の赤い輪が外れ、
  // Enemy Break の崩れ（同じ hpShown の帯遷移）と同じフレームで「追い込めた」が 1 つの出来事になる。
  // engine は startRound で実 HP を使って改めて解決する（R4 開始時には hpShown === hp なので予告と実行は一致）。
  // enemy_09（Threat Branch Pilot）は従来どおり解決しない（未来情報の常時表示をしない＝決定263 の境界・Lane 1 の CEO QA 済み画面を変えない）
  const nextAction = isShogunateEnemyId(enemy.defId) ? resolveEnemyTactic(nextScript, hpShown, enemy.maxHp, difficulty) : nextScript
  const nextIsSpecial =
    nextAction.kind === 'special' || (nextAction.kind === 'multiAttack' && !!nextAction.special)
  const charging = enemy.intent?.kind === 'charge'
  // 将軍家 Pilot v0.6（enemy_08 忠次だけ・`docs/SHOGUNATE_V0_6_DESIGN_AUDIT.md` §1-3）：R3 の溜め中に「あと N で総攻めを止める」。
  // 上の赤い輪と同じ hpShown・同じ tacticBranch で決まる＝輪の消失と「✓ 総攻めを止めた」は同じ描画。enemy_09 には出さない
  const tLine = isShogunateEnemyId(enemy.defId) && !defeated ? tacticLine(enemy.intent, nextScript, hpShown, enemy.maxHp, difficulty) : null
  const chargingClass =
    charging
      ? nextIsSpecial
        ? ' enemy-avatar-charging enemy-avatar-charging-super'
        : ' enemy-avatar-charging'
      : ''
  // 決定240：予告の危険度（strong／huge／special）を立ち絵の「構え」クラスとして写す（表示のみ・
  // normal は空・charge は上の chargingClass が担う）。撃破中は付けない（崩壊と重ねない）
  const stance = defeated ? '' : getIntentStanceClass(enemy.intent)
  const stanceClass = stance ? ` ${stance}` : ''
  const intentGlyph = getIntentGlyph(enemy.intent)
  const lungeSpeedSuffix = def.visualType === 'fast' ? '-fast' : def.visualType === 'heavy' ? '-heavy' : ''
  // STEP-UX5：「動き方」（visualType）と「攻撃の重さ」（attackTier）を別クラスで掛け合わせる
  const lungeTierToken =
    attackTier === 'huge' ? ' enemy-lunge-tier-huge' : attackTier === 'strong' ? ' enemy-lunge-tier-strong' : ''

  const reactions = plan?.enemyReactions ?? []
  const band = hpBand(hpShown, enemy.maxHp)
  const collapseStyle = { '--collapse': `${reduced ? DEFEAT_COLLAPSE_REDUCED_MS : DEFEAT_COLLAPSE_MS}ms` } as CSSProperties
  // Combat Feel v2（Enemy Break v1）：表示 HP が 50%／25% の帯をまたいで下がった瞬間の一回性反応（表示専用）。
  // 撃破の一撃（表示 HP 0・outcome won）と崩壊中は再生しない（決定226 の崩壊と重ねない）
  // クラスは panel の根だけに付け、名札・舞台・体は enemyBreak.css が子孫セレクタで受ける（既存の markup は不変）
  const brk = useEnemyBreak(hpShown, enemy.maxHp, defeated || hpShown <= 0 || plan?.outcome === 'won')
  const breakVars = enemyBreakVars(brk.level) as CSSProperties
  // Enemy Break SE v1（v1.0.5）：崩しと同じ描画サイクルで 1 回だけ鳴らす（溜め予告中の half は鳴らさない）
  useEnemyBreakSe(brk, charging)

  return (
    <div className={`panel enemy-panel enemy-band-${band}${enemyBreakClass('cf2-break', brk.level)}`} data-enemy={enemy.defId} style={breakVars}>
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
          {/* 決定240：先頭の絵文字（⚔💥🔥⚡）は既存 SVG グリフに置換。文言（formatEnemyIntent）は不変 */}
          <div className={`intent ${getIntentTierClass(enemy.intent)}`.trim()}>
            {intentGlyph && <GlyphIcon glyph={intentGlyph} className="intent-glyph" />}
            {formatEnemyIntentText(enemy.intent)}
          </div>
          {tLine && (
            <div className="enemy-assault-line" data-testid="tactic-line" data-state={tLine.cleared ? 'cleared' : 'armed'}>
              {/* 文言は 1 つ。SP の狭い列では句の切れ目（「あと N で」／「総攻めを止める」）で折り返すよう 2 つの span に分ける */}
              {tLine.cleared ? (
                '✓ 総攻めを止めた'
              ) : (
                <span className="enemy-assault-line-text">
                  <span>{`あと${formatScaled(tLine.remaining)}で`}</span>
                  <span>総攻めを止める</span>
                </span>
              )}
            </div>
          )}
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
            <Reaction reaction={reactions[0]} planKey={planKey} index={0} staggerKey={defeated ? 0 : staggerKey}>
              <Reaction reaction={reactions[1]} planKey={planKey} index={1}>
                {/* 将軍家 Pilot v0.2：--enemy-art は enemy_08 の光レイヤー（battle.css 末尾・mask）が読む。他の敵は未使用の変数が付くだけ */}
                <div className={`enemy-avatar${surgeClass}${chargingClass}${stanceClass}`} style={{ backgroundImage: `url(${def.art})`, ['--enemy-art' as string]: `url(${def.art})` }} />
              </Reaction>
            </Reaction>
          </div>
        </div>
        {defeated && <div className="impact-ring enemy-defeat-ring" aria-hidden="true" />}
        <div className="enemy-hit-layer" aria-hidden="true">
          {planKey > 0 &&
            reactions.map((r, i) =>
              // 決定224：条件⚡（minor＝撃破ではない⚡）は金の斬撃線の代わりに金リング 1 つ（要素数は増やさない）
              r.minor ? (
                <div
                  key={`payoff-${planKey}-${i}`}
                  className="impact-ring impact-ring-payoff juice-delayed"
                  style={{ '--impact-delay': `${r.atMs}ms` } as CSSProperties}
                />
              ) : (
                <div
                  key={`slash-${planKey}-${i}`}
                  className={`slash-fx slash-l${r.tier} juice-delayed`}
                  style={{ '--impact-delay': `${r.atMs}ms` } as CSSProperties}
                />
              ),
            )}
          <FloatingNumbers numbers={floatingNumbers} />
        </div>
      </div>
    </div>
  )
}

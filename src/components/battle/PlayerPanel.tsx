import type { CSSProperties } from 'react'
import type { GodId, PlayerState } from '../../core/types'
import { getGodDef } from '../../core/data/gods'
import { STAT_LABEL } from '../setup/godStyle'
import { formatScaled } from '../displayScale'
import type { PowerTier } from './cardStyle'
import { HpBar } from './HpBar'
import { FloatingNumbers } from './FloatingNumbers'
import type { FloatingNumber } from './useFloatingNumbers'

type PlayerPanelProps = {
  godId: GodId
  player: PlayerState
  /** 変わるたびに被弾シェイクを再生する */
  hitKey: number
  /** 変わるたびに回復グローを再生する */
  healKey: number
  /** 変わるたびに神（プレイヤー側）の攻撃モーションを再生する */
  attackKey: number
  /** 蒼毘Visual Polish：変わるたびにbadge-blockのパルスを再生する */
  blockGainKey: number
  /** STEP-UX5：直近の敵攻撃の危険度tier（fx.enemyAttackTier）。被弾演出
   * （hit-shake-flash）の強さを、Intent予告と同じ物差しで表現する。 */
  enemyAttackTier: PowerTier
  /** ENEMY-VFX-01：直近の敵攻撃バッチのhit数（fx.multiHitCount）。2以上なら
   * 連撃用のクレッシェンドシェイク（hit-shake-multi-N）に切り替える */
  multiHitCount: number
  /** ENEMY-VFX-01：直近の被弾が必殺（カットイン付き）だったか。シェイク・斬撃線を
   * カットイン0.9sの後ろへ遅らせる（表示のみ。combat計算には関与しない） */
  specialHit: boolean
  /** VFX-03：直近の神攻撃が共鳴BURSTか（fx.burstHit）。攻撃モーション（god-lunge）を
   * 共鳴カットイン終了＝burst-banner出現（BURST_GOD_ATTACK_MS）まで遅らせる */
  burstHit: boolean
  floatingNumbers: FloatingNumber[]
  /** Phase 6-A：表示HP（着弾に合わせて追従する値。engine の HP ではない） */
  hpShown: number
  /** Phase 6-A：敵ダメージのカードを使った直後（cast 中）の「構え」＝anticipation */
  windUp?: boolean
  /** Phase 6-A：敵の通常攻撃の着弾時刻（敵の突進の最前）。連撃・必殺は既存の CSS タイムライン */
  selfImpactMs?: number | null
}

/**
 * プレイヤー側パネル。決定31で選択中の神の立ち絵をここに表示し、
 * EnemyPanel（敵アバター＋HP）と対になる「敵 vs プレイヤー」レイアウトにした。
 */
export function PlayerPanel({
  godId,
  player,
  hitKey,
  healKey,
  attackKey,
  blockGainKey,
  enemyAttackTier,
  multiHitCount,
  specialHit,
  burstHit,
  floatingNumbers,
  hpShown,
  windUp = false,
  selfImpactMs = null,
}: PlayerPanelProps) {
  const god = getGodDef(godId)
  // STEP-UX5：被弾シェイクの強さを、その攻撃のIntent危険度と同じtierで
  // 出し分ける。normalはトークンを付与せず既存のhit-shake-flashのまま
  // （見た目・体感とも変更前と完全に同一）。
  const hitTierToken =
    enemyAttackTier === 'huge' ? ' hit-tier-huge' : enemyAttackTier === 'strong' ? ' hit-tier-strong' : ''
  // ENEMY-VFX-02：連撃（2hit以上）はTEMPO-B（1・2・ドン！）のクレッシェンド
  // シェイク（keyframesに3つの山＋holdを焼き込み、タイミングの真実をCSSへ一元化。
  // enemyVfxTiming.tsのMULTI_HIT_OFFSETS_MSと一致）。単発は従来のまま。
  // 必殺の表示遅延はanimation-delayのみ（combat計算は既に確定済み）：
  //   神滅甲タイプ（special単発）＝ビーム着弾1260ms（hit-delay-beam）
  //   双牙乱撃タイプ（special連撃）＝カットイン後1100ms（hit-delay-multilead）
  const shakeClass =
    multiHitCount >= 2
      ? `hit-shake-multi-${Math.min(multiHitCount, 3)}`
      : `hit-shake-flash${hitTierToken}`
  const delayToken = specialHit ? (multiHitCount >= 2 ? ' hit-delay-multilead' : ' hit-delay-beam') : ''
  // Phase 6-A：敵の通常攻撃（単発・必殺でない）は、敵の突進の最前で着弾させる（旧：commit と同時）
  const normalDelayed = !specialHit && multiHitCount <= 1 && selfImpactMs != null && selfImpactMs > 0
  const impactStyle = normalDelayed ? ({ '--impact-delay': `${selfImpactMs}ms` } as CSSProperties) : undefined

  return (
    <div className="panel player-panel">
      {/* Phase 6-B（決定164）：神名・HP・主要状態を立ち絵の「上」に1枚の名札としてまとめる。
          EnemyPanel の .enemy-plate と対になる構造。台詞（god-tagline）は画面高が
          小さいときに CSS で省略できるよう、名札の中の独立要素にしておく。 */}
      <div className="player-plate">
        <div className="player-plate-head">
          <span className="panel-title">{god.nameJa}</span>
          <span className="god-tagline">「{god.tagline}」</span>
        </div>
        <div key={`heal-${healKey}`} className={healKey > 0 ? 'heal-pulse' : undefined}>
          <HpBar current={hpShown} max={player.maxHp} color="#4dbd74" />
        </div>
        <div className="player-plate-status">
          {player.block > 0 && (
            <div
              key={`block-${blockGainKey}`}
              className={`badge badge-block${blockGainKey > 0 ? ' badge-block-pulse' : ''}`}
            >
              🛡 {formatScaled(player.block)}
            </div>
          )}
          {player.buffs.length > 0 && (
            <div className="buff-list">
              {player.buffs.map((b, i) => (
                <span key={i} className="badge badge-buff">
                  {STAT_LABEL[b.stat]} {b.amount > 0 ? '+' : ''}
                  {formatScaled(b.amount)}（{b.remainingRounds}）
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* VFX-03：共鳴BURSTの一撃は「共鳴カットイン→✨神の一撃！バナー」の後ろで突進する。
          Phase 6-A：敵ダメージのカードを選んだ瞬間（cast 中）に一瞬引いて構え、commit で突く
          （god-strike の 26%＝CARD_IMPACT_MS で着弾）。神の一撃は溜め→突きの god-burst-strike
          （開始＝BURST_GOD_ATTACK_MS、着弾＝BURST_IMPACT_MS。battle.css と一致） */}
      <div className="player-stage">
        <div className={`player-windup${windUp ? ' is-winding' : ''}`}>
          <div
            key={`god-${attackKey}`}
            className={`player-avatar-wrap${attackKey > 0 ? (burstHit ? ' god-burst-strike' : ' god-strike') : ''}`}
          >
            {/* Phase 6-B：被弾の揺れ・閃光は立ち絵そのものに掛ける（旧：HPバーのラッパー） */}
            <div
              key={`hit-${hitKey}`}
              className={hitKey > 0 ? `${shakeClass}${delayToken}${normalDelayed ? ' juice-delayed' : ''}` : undefined}
              style={impactStyle}
            >
              <img className="player-avatar" src={god.art.front} alt={god.nameJa} />
            </div>
          </div>
        </div>
        {/* 斬撃・リング・ダメージ数字は立ち絵の上のレイヤーへ（HP の数値と重ならない） */}
        <div className="player-hit-layer" aria-hidden="true">
          {/* 単発被弾は従来の斬撃線。連撃はhitごとの専用slash。
              神滅甲タイプ（special単発＝砲撃）は斬撃技ではないため大リングで表現する */}
          {hitKey > 0 && multiHitCount <= 1 && !specialHit && (
            <div key={`slash-${hitKey}`} className={`slash-fx slash-fx-reverse${normalDelayed ? ' juice-delayed' : ''}`} style={impactStyle} />
          )}
          {hitKey > 0 && multiHitCount >= 2 && (
            <div key={`multi-${hitKey}`}>
              <div className={`multi-slash multi-slash-1${delayToken}`} />
              <div className={`multi-slash multi-slash-2${delayToken}`} />
              {multiHitCount >= 3 && <div className={`multi-slash multi-slash-3a${delayToken}`} />}
              {multiHitCount >= 3 && <div className={`multi-slash multi-slash-3b${delayToken}`} />}
            </div>
          )}
          {hitKey > 0 && specialHit && multiHitCount <= 1 && <div key={`ring-${hitKey}`} className="impact-ring impact-ring-beam hit-delay-beam" />}
          {hitKey > 0 && specialHit && multiHitCount >= 3 && <div key={`ring3-${hitKey}`} className="impact-ring impact-ring-hit3 hit-delay-multilead" />}
          <FloatingNumbers numbers={floatingNumbers} />
        </div>
      </div>
    </div>
  )
}

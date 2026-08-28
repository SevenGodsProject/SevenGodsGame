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
  floatingNumbers: FloatingNumber[]
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
  floatingNumbers,
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

  return (
    <div className="panel player-panel">
      <div className="panel-title">{god.nameJa}</div>
      <p className="god-tagline">「{god.tagline}」</p>
      <div
        key={`god-${attackKey}`}
        className={`player-avatar-wrap${attackKey > 0 ? ' god-lunge' : ''}`}
      >
        <img className="player-avatar" src={god.art.front} alt={god.nameJa} />
      </div>
      {/* 第二次完成フェーズF-1（緊急バグ修正）：以前はhit-shake-flash（被弾）と
          heal-pulse（回復）が`key={`${hitKey}-${healKey}`}`という単一のkeyを
          共有していた。hitKey/healKeyはともに単調増加で一度0より大きくなると
          恒久的にtrueのままのため、「一度でも被弾した後」に回復のみが発生して
          healKeyだけが変わってもkey文字列自体は変化し再マウントが起き、その際
          `hitKey > 0`の条件でhit-shake-flash（被弾シェイク＋赤い斬撃線slash-fx）が
          意図せず再生されてしまっていた（回復しただけなのに殴られたように見える
          誤表示）。被弾用と回復用でそれぞれ独立したkeyのラッパーに分離し、
          お互いの再マウントに影響しないようにする（EnemyPanel.tsxの
          `key={`hit-${hitKey}`}`と同じ命名パターンに統一）。 */}
      <div
        key={`hit-${hitKey}`}
        className={hitKey > 0 ? `${shakeClass}${delayToken}` : undefined}
        style={{ position: 'relative' }}
      >
        <div key={`heal-${healKey}`} className={healKey > 0 ? 'heal-pulse' : undefined}>
          <HpBar current={player.hp} max={player.maxHp} color="#4dbd74" />
        </div>
        {/* 単発被弾は従来の斬撃線。連撃はhitごとの専用slash（下）に置き換える */}
        {hitKey > 0 && multiHitCount <= 1 && <div className={`slash-fx slash-fx-reverse${delayToken}`} />}
        {/* ENEMY-VFX-02：連撃のhitごとのslash trail。HIT1=左下→右上／HIT2=右下→左上／
            HIT3=双牙クロス（X字2本・最大）。発生時刻はTEMPO-B（CSS側delayで一致） */}
        {hitKey > 0 && multiHitCount >= 2 && (
          <>
            <div className={`multi-slash multi-slash-1${delayToken}`} />
            <div className={`multi-slash multi-slash-2${delayToken}`} />
            {multiHitCount >= 3 && <div className={`multi-slash multi-slash-3a${delayToken}`} />}
            {multiHitCount >= 3 && <div className={`multi-slash multi-slash-3b${delayToken}`} />}
          </>
        )}
        {/* 神滅甲タイプ：ビーム着弾のimpact ring（1260ms遅延、CSS側と一致） */}
        {hitKey > 0 && specialHit && multiHitCount <= 1 && <div className="impact-ring hit-delay-beam" />}
        {/* 双牙乱撃タイプ：HIT3の大impact ring */}
        {hitKey > 0 && specialHit && multiHitCount >= 3 && <div className="impact-ring impact-ring-hit3 hit-delay-multilead" />}
        <FloatingNumbers numbers={floatingNumbers} />
      </div>
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
  )
}

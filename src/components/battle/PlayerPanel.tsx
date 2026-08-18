import type { GodId, PlayerState } from '../../core/types'
import { getGodDef } from '../../core/data/gods'
import { STAT_LABEL } from '../setup/godStyle'
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
  floatingNumbers: FloatingNumber[]
}

/**
 * プレイヤー側パネル。決定31で選択中の神の立ち絵をここに表示し、
 * EnemyPanel（敵アバター＋HP）と対になる「敵 vs プレイヤー」レイアウトにした。
 */
export function PlayerPanel({ godId, player, hitKey, healKey, attackKey, floatingNumbers }: PlayerPanelProps) {
  const god = getGodDef(godId)

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
      <div key={`hit-${hitKey}`} className={hitKey > 0 ? 'hit-shake-flash' : undefined} style={{ position: 'relative' }}>
        <div key={`heal-${healKey}`} className={healKey > 0 ? 'heal-pulse' : undefined}>
          <HpBar current={player.hp} max={player.maxHp} color="#4dbd74" />
        </div>
        {hitKey > 0 && <div className="slash-fx slash-fx-reverse" />}
        <FloatingNumbers numbers={floatingNumbers} />
      </div>
      {player.block > 0 && <div className="badge badge-block">🛡 {player.block}</div>}
      {player.buffs.length > 0 && (
        <div className="buff-list">
          {player.buffs.map((b, i) => (
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

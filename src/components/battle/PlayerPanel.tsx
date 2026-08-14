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
      <div
        key={`${hitKey}-${healKey}`}
        className={
          [hitKey > 0 ? 'hit-shake-flash' : '', healKey > 0 ? 'heal-pulse' : ''].join(' ').trim() || undefined
        }
        style={{ position: 'relative' }}
      >
        <HpBar current={player.hp} max={player.maxHp} color="#4dbd74" />
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

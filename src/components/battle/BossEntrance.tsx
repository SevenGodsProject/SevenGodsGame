import { useEffect } from 'react'
import type { EnemyId } from '../../core/types'
import { getEnemyDef } from '../../core/data/enemies'
import { stakeLabel } from '../../core/data/stakes'

/** 決定128：Boss登場演出の総時間（reduced-motion では短縮。CSS の animation と一致させる） */
export const BOSS_ENTRANCE_MS = 1500
export const BOSS_ENTRANCE_REDUCED_MS = 900

type BossEntranceProps = {
  enemyId: EnemyId
  /** 神階（0＝通常）。タグ表示のみ */
  stake?: number
  /** Daily（神域挑戦）。★5表示・タグ */
  daily?: boolean
  onDone: () => void
}

/**
 * 決定128（Game Feel Phase）：Boss Entrance。バトル開始時に「舞台・ボス・名前・脅威度・型」を
 * 約1.5秒で提示して消える固定オーバーレイ（LEVEL 4 演出）。
 * - 新規開始（`battleStartKey` 増分）のときだけ。「続きから」再開では出さない
 * - `pointer-events: none` で操作を奪わず、画面高も変えない（fixed）
 * - prefers-reduced-motion では拡大・スライドを省き、短い静止表示のみ
 * - 表示専用。engine・スコア・Auto Focus（敵パネルは動かない）に関与しない
 */
export function BossEntrance({ enemyId, stake = 0, daily = false, onDone }: BossEntranceProps) {
  const def = getEnemyDef(enemyId)
  const reduced = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  useEffect(() => {
    const t = window.setTimeout(onDone, reduced ? BOSS_ENTRANCE_REDUCED_MS : BOSS_ENTRANCE_MS)
    return () => window.clearTimeout(t)
  }, [onDone, reduced])
  const stars = daily ? 5 : def.rank
  return (
    <div className={`boss-entrance${reduced ? ' boss-entrance-reduced' : ''}`} aria-hidden="true" data-testid="boss-entrance">
      <div className="boss-entrance-bg" style={def.stage.bg ? { backgroundImage: `url('${def.stage.bg}')` } : undefined} />
      <div className="boss-entrance-body">
        <div className="boss-entrance-stage">{def.stage.nameJa}</div>
        <div className="boss-entrance-art" style={{ backgroundImage: `url(${def.art})` }} />
        <div className="boss-entrance-name">{def.name}</div>
        <div className="boss-entrance-meta">
          <span className="boss-entrance-threat" aria-label={`脅威度 ${stars} / 5`}>
            {'★'.repeat(stars)}
            <span className="boss-entrance-threat-empty">{'★'.repeat(Math.max(0, 5 - stars))}</span>
          </span>
          <span className="boss-entrance-type">【{def.typeLabel}】</span>
          {daily && <span className="boss-entrance-tag">DAILY 神域強化</span>}
          {stake > 0 && <span className="boss-entrance-tag">{stakeLabel(stake)}</span>}
        </div>
        <div className="boss-entrance-start">START</div>
      </div>
    </div>
  )
}

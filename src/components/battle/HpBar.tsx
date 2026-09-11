import { formatScaled } from '../displayScale'
import { HP_GHOST_DRAIN_MS, HP_GHOST_HOLD_MS, HP_MAIN_MS } from './enemyVfxTiming'

type HpBarProps = {
  /**
   * 表示するHP。Phase 6-A（決定162）以降は「表示HP」（visualHp.ts）を渡す。
   * engine の HP は着弾より先に確定しているが、バーと数値は着弾に合わせて追従させる
   */
  current: number
  max: number
  color: string
  /** 追加クラス（敵の「追い詰めた」段階など） */
  className?: string
}

/**
 * HPバー。Phase 6-A：主バーの後ろに「直前のHP」を短く残すゴーストを置く。
 * 表示HPが減ると主バーは HP_MAIN_MS で縮み、ゴーストは HP_GHOST_HOLD_MS 待ってから
 * HP_GHOST_DRAIN_MS で追いつく（CSS transition のみ。animationend に依存しない）。
 * 回復で増えるときはゴーストが主バーの下に隠れたまま追従するため、不自然な帯は出ない。
 */
export function HpBar({ current, max, color, className }: HpBarProps) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0
  const width = `${ratio * 100}%`
  return (
    <div className={`hp-bar${className ? ` ${className}` : ''}`}>
      <div
        className="hp-bar-ghost"
        aria-hidden="true"
        style={{ width, transitionDuration: `${HP_GHOST_DRAIN_MS}ms`, transitionDelay: `${HP_GHOST_HOLD_MS}ms` }}
      />
      <div className="hp-bar-fill" style={{ width, background: color, transitionDuration: `${HP_MAIN_MS}ms` }} />
      {/* D2b：表示スケール×10（内部値・ratioは無変更） */}
      <span className="hp-bar-label">
        {formatScaled(current)} / {formatScaled(max)}
      </span>
    </div>
  )
}

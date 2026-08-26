import { formatScaled } from '../displayScale'

type HpBarProps = {
  current: number
  max: number
  color: string
}

export function HpBar({ current, max, color }: HpBarProps) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0
  return (
    <div className="hp-bar">
      <div className="hp-bar-fill" style={{ width: `${ratio * 100}%`, background: color }} />
      {/* D2b：表示スケール×10（内部値・ratioは無変更） */}
      <span className="hp-bar-label">
        {formatScaled(current)} / {formatScaled(max)}
      </span>
    </div>
  )
}

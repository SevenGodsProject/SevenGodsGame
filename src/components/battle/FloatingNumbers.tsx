import type { FloatingNumber } from './useFloatingNumbers'

type FloatingNumbersProps = {
  numbers: FloatingNumber[]
}

export function FloatingNumbers({ numbers }: FloatingNumbersProps) {
  if (numbers.length === 0) return null

  return (
    <div className="floating-numbers">
      {numbers.map((n) => (
        <span
          key={n.id}
          className={`floating-number floating-number-${n.kind}${n.emphasis ? ' floating-number-emphasis' : ''}${n.kind === 'damage' && n.tier ? ` floating-number-l${n.tier}` : ''}`}
          style={{
            // ENEMY-VFX-01：連撃/必殺の表示遅延と、連撃hitの重なり回避。
            // animation-fill-mode:backwards（battle.css側）で遅延中は不可視のまま。
            animationDelay: n.delayMs ? `${n.delayMs}ms` : undefined,
            left: n.leftPercent != null ? `${n.leftPercent}%` : undefined,
          }}
        >
          {n.text}
        </span>
      ))}
    </div>
  )
}

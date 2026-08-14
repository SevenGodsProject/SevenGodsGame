import type { FloatingNumber } from './useFloatingNumbers'

type FloatingNumbersProps = {
  numbers: FloatingNumber[]
}

export function FloatingNumbers({ numbers }: FloatingNumbersProps) {
  if (numbers.length === 0) return null

  return (
    <div className="floating-numbers">
      {numbers.map((n) => (
        <span key={n.id} className={`floating-number floating-number-${n.kind}`}>
          {n.text}
        </span>
      ))}
    </div>
  )
}

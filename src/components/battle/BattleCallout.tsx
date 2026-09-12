import type { Callout } from './decisionFeedback'

type BattleCalloutProps = {
  callout: Callout | null
  /** 変わるたびに再生する（useDecisionCallout の calloutKey） */
  playKey: number
}

/**
 * Phase 6-C（決定166）：良い判断が成立した瞬間の短い評価（約0.7秒）。
 *
 * - アリーナの下段に重ねる overlay。`pointer-events: none` で操作を奪わず、
 *   ページの高さも増やさない（6-B の一画面性を壊さない）
 * - 主文は数字（最大 52px）より小さくし、着弾そのものより目立たせない
 * - 文言は decisionFeedback.ts（イベントとルール値の言い換えのみ）
 */
export function BattleCallout({ callout, playKey }: BattleCalloutProps) {
  if (!callout || playKey === 0) return null
  return (
    <div
      key={playKey}
      className={`battle-callout battle-callout-${callout.tone} battle-callout-p${callout.priority}`}
      data-testid="battle-callout"
      data-callout-id={callout.id}
      data-callout-priority={callout.priority}
    >
      <span className="battle-callout-label">{callout.label}</span>
      <span className="battle-callout-sub">{callout.sub}</span>
    </div>
  )
}

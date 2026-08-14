import { DIVINATION_CHOICES } from '../../core/data/divination'

type DivinationPanelProps = {
  remaining: number
  usedThisRound: boolean
  playable: boolean
  onChoose: (choiceIndex: number) => void
}

export function DivinationPanel({
  remaining,
  usedThisRound,
  playable,
  onChoose,
}: DivinationPanelProps) {
  const disabled = !playable || remaining <= 0 || usedThisRound

  return (
    <div className="divination-panel">
      <div className="divination-panel-title">
        🙏 託宣（残り{remaining}回・1ラウンド1回まで）
        {usedThisRound && remaining > 0 && <span> — このラウンドは使用済み</span>}
      </div>
      <div className="divination-choices">
        {DIVINATION_CHOICES.map((choice, i) => (
          <button
            key={choice.name}
            type="button"
            className="divination-choice"
            disabled={disabled}
            onClick={() => onChoose(i)}
          >
            <span className="divination-choice-name">{choice.name}</span>
            <span className="divination-choice-text">{choice.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

import { DIVINATION_CHOICES } from '../../core/data/divination'
import { GlyphIcon, type GlyphKey } from './cardIcon'

type DivinationPanelProps = {
  remaining: number
  usedThisRound: boolean
  playable: boolean
  onChoose: (choiceIndex: number) => void
}

/**
 * 決定94：神託3択を文字だけでなく既存GlyphIcon（決定30の資産、TutorialOverlayで実績あり）
 * でも瞬時に区別できるようにする。DIVINATION_CHOICESの並び順（加護・導き・天啓）に対応する
 * 固定配列。新規SVGは追加せず、既存のGlyphKeyから意味の近いものを選んだ：
 * 加護＝護り(shield)、導き＝効果文の主軸「カードを1枚引き」に対応(cards)、
 * 天啓＝神託(oracle)タイプの共通カードと同じ意匠(star)。
 */
const DIVINATION_GLYPHS: GlyphKey[] = ['shield', 'cards', 'star']

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
            <GlyphIcon glyph={DIVINATION_GLYPHS[i]} className="divination-choice-glyph" />
            <span className="divination-choice-body">
              <span className="divination-choice-name">{choice.name}</span>
              <span className="divination-choice-text">{choice.text}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

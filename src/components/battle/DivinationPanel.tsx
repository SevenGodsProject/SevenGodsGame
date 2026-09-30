import { DIVINATION_CHOICES } from '../../core/data/divination'
import { GlyphIcon, type GlyphKey } from './cardIcon'
import { ORACLE_ROLE_WORDS, splitOracleName } from './oraclePreview'
import './dockControls.css'

type DivinationPanelProps = {
  remaining: number
  usedThisRound: boolean
  playable: boolean
  onChoose: (choiceIndex: number) => void
  /**
   * 決定253（Oracle Readability v1）：選択肢ごとの「今使えば何が起きるか」の文（`oraclePreviewTexts`）。
   * 加護＝Phase 5-D の実数「今なら ブロック20」／導き＝「今なら『剛撃』が出せる」／天啓＝「今なら 撃破」or「40ダメージ」。
   * null の選択肢は行を出さない。
   */
  previews?: (string | null)[]
  /** 決定253：同じ内容の短い形（SP の 79px 枠用）。CSS で PC は長い形・SP は短い形だけを表示する */
  previewsShort?: (string | null)[]
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
  previews,
  previewsShort,
}: DivinationPanelProps) {
  const disabled = !playable || remaining <= 0 || usedThisRound

  return (
    <div className="divination-panel">
      <div className="divination-panel-title">
        <GlyphIcon glyph="eye" className="divination-panel-glyph" />託宣（残り{remaining}回・1ラウンド1回まで）
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
            // Phase 6-B：画面高が小さいとき効果文（.divination-choice-text）をCSSで
            // 畳むため、同じ文をtitleにも持たせて情報を失わないようにする
            title={choice.text}
          >
            <GlyphIcon glyph={DIVINATION_GLYPHS[i]} className="divination-choice-glyph" />
            <span className="divination-choice-body">
              {/* 決定253：名前を本体＋接尾辞に分け（SP では接尾辞を畳む）、役割語「守る／整える／攻める」を常時添える。
                  色だけに頼らず文字で役割を示す。データの name は不変 */}
              <span className="divination-choice-name">
                <span className="divination-choice-name-main">{splitOracleName(choice.name).main}</span>
                <span className="divination-choice-name-suffix">{splitOracleName(choice.name).suffix}</span>
                <span className="divination-choice-role">{ORACLE_ROLE_WORDS[i]}</span>
              </span>
              <span className="divination-choice-text">{choice.text}</span>
              {previews?.[i] != null && (
                // 押す前に「今なら何が起きるか」を見せる。予告・手札・敵 HP を見て、どれを使うかを決める材料。
                // 長い形（PC）と短い形（SP）を両方描き、CSS の media query で片方だけ表示する（箱は不変）
                <span className="divination-choice-preview">
                  <span className="divination-choice-preview-long">{previews[i]}</span>
                  <span className="divination-choice-preview-short">{previewsShort?.[i] ?? previews[i]}</span>
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

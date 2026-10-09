import { CREDITS_FOOTER_LINES, CREDITS_LEAD, CREDITS_SECTIONS, CREDITS_TITLE } from './creditsText'
import './setup.css'

type CreditsScreenProps = {
  onBack: () => void
}

/**
 * Legal／Credits（CM-02／03）：静的 1 画面。文言は `creditsText.ts` だけが持つ。
 * storage・fetch・ゲーム状態には触れない（表示のみ）。RecordScreen と同じ骨格（setup-screen／setup-title／
 * home-cta-secondary の戻るボタン）で、既存デザインを維持する。
 */
export function CreditsScreen({ onBack }: CreditsScreenProps) {
  return (
    <div className="setup-screen credits-screen" data-testid="credits-screen">
      <h1 className="setup-title">{CREDITS_TITLE}</h1>
      <p className="setup-subtitle credits-lead">{CREDITS_LEAD}</p>

      {CREDITS_SECTIONS.map((section) => (
        <section key={section.heading} className="credits-section" aria-label={section.heading}>
          <h2 className="credits-heading">{section.heading}</h2>
          {section.lines.map((line) => (
            <p key={line} className="credits-line">
              {line}
            </p>
          ))}
        </section>
      ))}

      <ul className="credits-footer" aria-label="クレジット">
        {CREDITS_FOOTER_LINES.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <button type="button" className="home-cta-secondary credits-back" onClick={onBack}>
        ‹ ホームへ戻る
      </button>
    </div>
  )
}

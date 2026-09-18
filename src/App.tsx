import { useState } from 'react'
import { GameFlow } from './components/GameFlow'
import { TutorialOverlay } from './components/TutorialOverlay'
import { FeedbackOverlay } from './components/feedback/FeedbackOverlay'
import { computeSnapshot, type FeedbackSnapshot } from './components/feedback/feedbackSnapshot'
import { markTutorialSeen } from './hooks/tutorialStorage'
import { setSoundMuted } from './components/battle/sound'
import { setBgmMuted } from './components/battle/bgm'
import { SpeakerIcon, BookIcon, FeedbackIcon } from './components/icons'
import './App.css'
// 決定200 Interaction Feel v1：押した瞬間の手応え（見た目だけ）。
// 既存 CSS のあとに載せるため、import はこのファイルの最後に置く
import './components/press.css'

/**
 * アプリ全体の土台。
 *
 * 戦闘画面はReact（DOM）で構築しています（手札・HPバー等はUIとしての
 * 情報密度が高くDOMと相性が良いため）。Phaserは将来のビジュアル演出
 * （共鳴発動時のエフェクト等）用に src/game/ へ温存しています。
 *
 * ミュート・チュートリアルの開閉状態は、以前は画面ごと（GodSelectScreen・
 * BattleScreen）に別々のボタン・stateとして存在していたが、CEOが共有した
 * 参考画像（他ゲームのタイトル画面）に倣い、ここ（トップバー）に一本化した。
 * 常時同じ場所に同じボタンがある方が、画面を跨いでも迷わない。
 */
function App() {
  const [muted, setMuted] = useState(false)
  // Phase 7 Entrance E1（決定193）：起動時に 699 字の「遊び方」を自動で開くのをやめた。
  // 最初の 3 秒は Home（神・Primary）を見せ、初めての人には「初陣へ」→ 3 行の短い説明で案内する。
  // 完全版は削除しておらず、ヘッダーの本のアイコンからいつでも開ける。
  const [showTutorial, setShowTutorial] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [snapshot, setSnapshot] = useState<FeedbackSnapshot>(() =>
    computeSnapshot({ setupScreen: 'home', godId: null, difficulty: 'normal', state: null }),
  )

  const toggleMuted = () => {
    setMuted((prev) => {
      setSoundMuted(!prev)
      setBgmMuted(!prev)
      return !prev
    })
  }

  const closeTutorial = () => {
    setShowTutorial(false)
    markTutorialSeen()
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">SEVEN GODS</span>
        <span className="app-header-spacer" />
        <button
          type="button"
          className="app-icon-button"
          onClick={toggleMuted}
          aria-label={muted ? 'ミュート解除' : 'ミュート'}
          aria-pressed={muted}
        >
          <SpeakerIcon muted={muted} className="app-icon-glyph" />
        </button>
        <button
          type="button"
          className="app-icon-button"
          onClick={() => setShowTutorial(true)}
          aria-label="遊び方を見る"
        >
          <BookIcon className="app-icon-glyph" />
        </button>
        <button
          type="button"
          className="app-icon-button"
          onClick={() => setShowFeedback(true)}
          aria-label="感想・不具合を送る"
        >
          <FeedbackIcon className="app-icon-glyph" />
        </button>
      </header>

      <main className="game-stage">
        <GameFlow onShowTutorial={() => setShowTutorial(true)} onSnapshotChange={setSnapshot} />
      </main>

      {showTutorial && <TutorialOverlay onClose={closeTutorial} />}
      {showFeedback && <FeedbackOverlay snapshot={snapshot} onClose={() => setShowFeedback(false)} />}
    </div>
  )
}

export default App

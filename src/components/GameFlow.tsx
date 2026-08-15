import { useEffect, useState } from 'react'
import type { CardDefId, Difficulty, GodId, GrowthPath } from '../core/types'
import { useGameEngine } from '../hooks/useGameEngine'
import { saveDeckPreference, loadDeckPreference } from '../hooks/deckPreferenceStorage'
import { clearBattleSave, loadBattleSave } from '../hooks/battleSaveStorage'
import { loadRewardBonuses } from '../hooks/rewardStorage'
import { getRecommendedDeck } from '../core/data/deckBuilder'
import { playTrack } from './battle/bgm'
import { computeSnapshot, type FeedbackSnapshot } from './feedback/feedbackSnapshot'
import { HomeScreen } from './setup/HomeScreen'
import { GodSelectScreen } from './setup/GodSelectScreen'
import { DeckBuilderScreen } from './setup/DeckBuilderScreen'
import { OtomoGrowthScreen } from './setup/OtomoGrowthScreen'
import { RecordScreen } from './setup/RecordScreen'
import { BattleScreen } from './battle/BattleScreen'

type SetupScreen = 'home' | 'godSelect' | 'deckBuild' | 'otomoGrowth' | 'record'

type GameFlowProps = {
  /** 「遊び方」ボタン（ホーム画面用）。トップバー分はAppが自前で持つ */
  onShowTutorial: () => void
  /** 実プレイ・フィードバック基盤：ヘッダーのフィードバックボタンに添える現在のプレイ状況 */
  onSnapshotChange: (snapshot: FeedbackSnapshot) => void
}

/**
 * Phase 5：神選択→デッキ構築→バトルの画面遷移を管理します。
 * 起動時は必ず`HomeScreen`から始まり、「神を選ぶ」で神選択へ、保存済みの
 * 進行中バトルがあれば「続きから」でそのまま再開できます（決定29の
 * `TitleScreen`の役割を`HomeScreen`に統合）。
 *
 * useGameEngineをここに引き上げることで、BattleScreenは「進行中のゲームを
 * 表示するだけ」のコンポーネントに専念でき、開始前の画面遷移ロジックと
 * 戦闘中の表示ロジックが混ざらずに済みます。
 */
export function GameFlow({ onShowTutorial, onSnapshotChange }: GameFlowProps) {
  const engine = useGameEngine()
  const [savedBattle] = useState(() => loadBattleSave())
  const [setupScreen, setSetupScreen] = useState<SetupScreen>('home')
  const [godId, setGodId] = useState<GodId | null>(null)
  const [deck, setDeck] = useState<CardDefId[] | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [otomoGrowthPath, setOtomoGrowthPath] = useState<GrowthPath>('guardian')

  // 実プレイ・フィードバック基盤：画面遷移やラウンド進行のたびに、ヘッダーの
  // フィードバックボタンが添える「今の状況」をAppへ伝える（showTutorialと
  // 同じ「Appのヘッダーに一本化する」方針、決定45参照）。
  useEffect(() => {
    onSnapshotChange(computeSnapshot({ setupScreen, godId, difficulty, state: engine.state }))
  }, [setupScreen, godId, difficulty, engine.state, onSnapshotChange])

  // BGM（決定51・52）：ホーム／神選択／デッキ構築では①、バトル中は②を
  // ループ再生する。依存を`engine.state`そのものではなく真偽値にしているのは、
  // バトル中はカード使用のたびにstateの参照が変わるため、そのままだと無駄に
  // `playTrack('battle')`が呼ばれ続けてしまうのを避けるため（`playTrack`自体は
  // 同じトラックの再呼び出しなら何もしない設計だが、意図を明確にする目的も兼ねる）
  const inBattle = engine.state !== null
  useEffect(() => {
    playTrack(inBattle ? 'battle' : 'home')
  }, [inBattle])

  const backToGodSelect = () => {
    engine.resetGame()
    setSetupScreen('godSelect')
    setGodId(null)
    setDeck(null)
  }

  const screen = (() => {
    if (!engine.state) {
      if (setupScreen === 'home') {
        return (
          <HomeScreen
            savedBattle={savedBattle}
            onShowTutorial={onShowTutorial}
            onShowOtomoGrowth={() => setSetupScreen('otomoGrowth')}
            onShowRecord={() => setSetupScreen('record')}
            onStartFresh={() => {
              clearBattleSave()
              setSetupScreen('godSelect')
            }}
            onResume={() => {
              if (!savedBattle) return
              setGodId(savedBattle.godId)
              setDeck(loadDeckPreference(savedBattle.godId) ?? getRecommendedDeck(savedBattle.godId))
              setDifficulty(savedBattle.difficulty)
              setOtomoGrowthPath(savedBattle.otomoGrowthPath)
              engine.resumeGame(savedBattle)
            }}
          />
        )
      }
      if (setupScreen === 'otomoGrowth') {
        return <OtomoGrowthScreen onBack={() => setSetupScreen('home')} />
      }
      if (setupScreen === 'record') {
        return <RecordScreen onBack={() => setSetupScreen('home')} />
      }
      if (setupScreen === 'deckBuild' && godId) {
        return (
          <DeckBuilderScreen
            godId={godId}
            otomoGrowthPath={otomoGrowthPath}
            onOtomoGrowthPathChange={setOtomoGrowthPath}
            onBack={() => setSetupScreen('godSelect')}
            onConfirm={(confirmedDeck) => {
              setDeck(confirmedDeck)
              saveDeckPreference(godId, confirmedDeck)
              engine.startGame(godId, confirmedDeck, difficulty, loadRewardBonuses(godId), otomoGrowthPath)
            }}
          />
        )
      }
      return (
        <GodSelectScreen
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
          onSelect={(selectedGodId) => {
            setGodId(selectedGodId)
            setSetupScreen('deckBuild')
          }}
        />
      )
    }

    return (
      <BattleScreen
        engine={engine}
        onRematch={() =>
          godId &&
          deck &&
          engine.startGame(godId, deck, difficulty, loadRewardBonuses(godId), otomoGrowthPath)
        }
        onReselect={backToGodSelect}
      />
    )
  })()

  return screen
}

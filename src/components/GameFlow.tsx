import { useEffect, useState } from 'react'
import type { CardDefId, Difficulty, EnemyId, GodId, GrowthPath, StakeChoiceId } from '../core/types'
import { useGameEngine } from '../hooks/useGameEngine'
import { saveDeckPreference, loadDeckPreference } from '../hooks/deckPreferenceStorage'
import { clearBattleSave, loadBattleSave } from '../hooks/battleSaveStorage'
import { loadRewardBonuses } from '../hooks/rewardStorage'
import { isExpiredDailySave, todayDailyKey } from '../hooks/dailyClock'
import { dailyAttemptsLeft } from '../hooks/dailyStorage'
import { getRecommendedDeck } from '../core/data/deckBuilder'
import { dailyBossFor } from '../core/data/dailyBoss'
import { playTrack } from './battle/bgm'
import { computeSnapshot, type FeedbackSnapshot } from './feedback/feedbackSnapshot'
import { HomeScreen } from './setup/HomeScreen'
import { GodSelectScreen } from './setup/GodSelectScreen'
import { EnemySelectScreen } from './setup/EnemySelectScreen'
import { DeckBuilderScreen } from './setup/DeckBuilderScreen'
import { OtomoGrowthScreen } from './setup/OtomoGrowthScreen'
import { RecordScreen } from './setup/RecordScreen'
import { DailyChallengeScreen } from './setup/DailyChallengeScreen'
import { BattleScreen } from './battle/BattleScreen'
import { ConfirmDialog } from './ConfirmDialog'
import './setup/daily.css'
import './polish.css'

// LANE-D：'enemySelect'を追加（HOME→GOD SELECT（＋難易度）→ENEMY SELECT→DECK→BATTLE）
// DAILY-01：'daily'を追加（HOME→DAILY→GOD SELECT（難易度なし）→DECK→BATTLE。敵選択は無い）
type SetupScreen = 'home' | 'godSelect' | 'enemySelect' | 'deckBuild' | 'otomoGrowth' | 'record' | 'daily'

type GameFlowProps = {
  /** 「遊び方」ボタン（ホーム画面用）。トップバー分はAppが自前で持つ */
  onShowTutorial: () => void
  /** 実プレイ・フィードバック基盤：ヘッダーのフィードバックボタンに添える現在のプレイ状況 */
  onSnapshotChange: (snapshot: FeedbackSnapshot) => void
}

/**
 * 保存済みバトルを読み、期限切れの神域挑戦（別の日のseed）なら破棄してnullを返す。
 * 通常モードのセーブは従来どおりそのまま返す。
 */
function loadResumableBattle() {
  const saved = loadBattleSave()
  if (saved && isExpiredDailySave(saved)) {
    clearBattleSave()
    return null
  }
  return saved
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
 *
 * DAILY-01：`dailyKey`がnullなら通常モード、日付キーが入っていれば神域挑戦の導線。
 * 通常モードの遷移・startGame呼び出しは一切変えていない（Dailyは別関数
 * `startDailyGame`で開始し、敵選択・難易度選択・URLバックドアを通らない）。
 */
export function GameFlow({ onShowTutorial, onSnapshotChange }: GameFlowProps) {
  const engine = useGameEngine()
  const [savedBattle, setSavedBattle] = useState(() => loadResumableBattle())
  const [setupScreen, setSetupScreen] = useState<SetupScreen>('home')
  const [godId, setGodId] = useState<GodId | null>(null)
  const [deck, setDeck] = useState<CardDefId[] | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  // 決定126：神階（0＝通常）。神階>0は「ふつう」基準に固定（useGameEngine側でも保証）
  const [stake, setStake] = useState(0)
  const [stakeChoice, setStakeChoice] = useState<StakeChoiceId | null>(null)
  const [otomoGrowthPath, setOtomoGrowthPath] = useState<GrowthPath>('guardian')
  // LANE-D：Enemy Selectでの選択。null＝「神に委ねる」（従来どおりのシード選出）
  const [selectedEnemyId, setSelectedEnemyId] = useState<EnemyId | null>(null)
  // DAILY-01：神域挑戦の日付キー。null＝通常モード
  const [dailyKey, setDailyKey] = useState<string | null>(null)
  // 8/31 P0-1：進行中セーブがある状態で「神を選ぶ」「挑戦開始」を押したときの確認。
  // 確認後に実行する処理を保持する（null＝ダイアログ非表示）。セーブが無ければ出さない
  const [pendingDiscard, setPendingDiscard] = useState<{ proceed: () => void } | null>(null)
  const guardDiscard = (proceed: () => void) => {
    if (savedBattle) setPendingDiscard({ proceed })
    else proceed()
  }

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

  // savedBattleは起動時に一度だけ読み込んだきりだと、その後`clearBattleSave`
  // （決着時／「神を選ぶ」選択時）や新規保存が起きても値が古いまま残ってしまう
  // （例：はじめから選び直したのに、ホームに戻ると実在しない「続きから」が
  // 表示される）。ホーム画面に戻るたびに読み直すことで、常に最新の保存状態を
  // 反映する（loadBattleSave自体のロジックは変更せず再利用するだけ）。
  useEffect(() => {
    if (setupScreen === 'home') {
      setSavedBattle(loadResumableBattle())
    }
  }, [setupScreen])

  const backToGodSelect = () => {
    engine.resetGame()
    setSetupScreen('godSelect')
    setGodId(null)
    setDeck(null)
    // LANE-D：選び直しでは敵の選択もリセットする（前回の敵が残ると
    // 「委ねたつもりが同じ敵と再戦」の混乱を招くため）
    setSelectedEnemyId(null)
    // DAILY-01：神域挑戦中の「選び直す」は、残り回数があれば同じ日の挑戦を続ける
    // （dailyKeyは保持）。残り0ならDaily画面へ戻して「今日は終了」を見せる
    if (dailyKey && dailyAttemptsLeft(dailyKey) <= 0) {
      setSetupScreen('daily')
    }
  }

  const goHome = () => {
    setDailyKey(null)
    setSetupScreen('home')
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
            onShowDaily={() => setSetupScreen('daily')}
            onStartFresh={() =>
              guardDiscard(() => {
                clearBattleSave()
                setDailyKey(null)
                setSetupScreen('godSelect')
              })
            }
            onResume={() => {
              if (!savedBattle) return
              setGodId(savedBattle.godId)
              setDeck(loadDeckPreference(savedBattle.godId) ?? getRecommendedDeck(savedBattle.godId))
              setDifficulty(savedBattle.difficulty)
              setOtomoGrowthPath(savedBattle.otomoGrowthPath)
              // DAILY-01：神域挑戦の再開はその日付キーの導線に戻す（決着後の「もう一度」判定に使う）
              setDailyKey(savedBattle.mode === 'daily' ? (savedBattle.dailyKey ?? null) : null)
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
      // DAILY-01：神域挑戦の入口。「挑戦開始」で今日の日付キーを確定し、神選択へ
      if (setupScreen === 'daily') {
        return (
          <DailyChallengeScreen
            dateKey={todayDailyKey()}
            onStart={() =>
              guardDiscard(() => {
                clearBattleSave()
                setDailyKey(todayDailyKey())
                setSelectedEnemyId(null)
                setDifficulty('normal')
                setGodId(null)
                setDeck(null)
                setSetupScreen('godSelect')
              })
            }
            onBack={goHome}
          />
        )
      }
      // LANE-D：神＋難易度の確定後、デッキ構築の前に挑む敵を選ぶ（通常モードのみ）
      if (setupScreen === 'enemySelect' && godId) {
        return (
          <EnemySelectScreen
            onSelect={(enemyId) => {
              setSelectedEnemyId(enemyId)
              setSetupScreen('deckBuild')
            }}
            onBack={() => setSetupScreen('godSelect')}
          />
        )
      }
      if (setupScreen === 'deckBuild' && godId) {
        return (
          <DeckBuilderScreen
            godId={godId}
            // DAILY-01：神域挑戦の対戦相手は今日のボス固定（表示用。開始時の敵確定はstartDailyGameが行う）
            enemyId={dailyKey ? dailyBossFor(dailyKey).enemyId : selectedEnemyId}
            dailyChallenge={dailyKey !== null}
            otomoGrowthPath={otomoGrowthPath}
            onOtomoGrowthPathChange={setOtomoGrowthPath}
            onBack={() => setSetupScreen(dailyKey ? 'daily' : 'enemySelect')}
            onConfirm={(confirmedDeck) => {
              setDeck(confirmedDeck)
              saveDeckPreference(godId, confirmedDeck)
              if (dailyKey) {
                const started = engine.startDailyGame(
                  godId,
                  confirmedDeck,
                  dailyKey,
                  loadRewardBonuses(godId),
                  otomoGrowthPath,
                )
                if (!started) setSetupScreen('daily')
                return
              }
              engine.startGame(
                godId,
                confirmedDeck,
                difficulty,
                loadRewardBonuses(godId),
                otomoGrowthPath,
                selectedEnemyId,
                stake,
                stakeChoice,
              )
            }}
          />
        )
      }
      return (
        <GodSelectScreen
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
          skipDifficulty={dailyKey !== null}
          stake={dailyKey ? 0 : stake}
          onStakeChange={dailyKey ? undefined : setStake}
          stakeChoice={stakeChoice}
          onStakeChoiceChange={dailyKey ? undefined : setStakeChoice}
          onSelect={(selectedGodId) => {
            setGodId(selectedGodId)
            // DAILY-01：神域挑戦は敵選択を通らずデッキ構築へ
            setSetupScreen(dailyKey ? 'deckBuild' : 'enemySelect')
          }}
          onBack={dailyKey ? () => setSetupScreen('daily') : goHome}
        />
      )
    }

    // DAILY-01：決着後の「もう一度」は同じ日の残り回数がある間だけ（同じ敵・同じseed）
    const inDaily = engine.state.mode === 'daily'
    const attemptsLeft = inDaily && dailyKey ? dailyAttemptsLeft(dailyKey) : null
    return (
      <BattleScreen
        engine={engine}
        rematchLabel={inDaily ? `もう一度挑戦（残り${attemptsLeft ?? 0}回）` : undefined}
        rematchDisabled={inDaily ? (attemptsLeft ?? 0) <= 0 : false}
        onRematch={() => {
          if (!godId || !deck) return
          if (inDaily) {
            if (!dailyKey) return
            const started = engine.startDailyGame(
              godId,
              deck,
              dailyKey,
              loadRewardBonuses(godId),
              otomoGrowthPath,
            )
            if (!started) {
              engine.resetGame()
              setSetupScreen('daily')
            }
            return
          }
          // LANE-D（選択後の一貫性）：「もう一度」は直前に戦った敵（state.enemy.defId）
          // と再戦する。「神に委ねる」で始めた対局や「続きから」再開後でも、
          // リマッチ相手が突然すり替わらない（新しい敵と戦いたい時は
          // 「神を選び直す」からEnemy Selectを通る）。URLバックドアは従来どおり最優先。
          // 決定126：「もう一度」は同じ神階・同じ最終試練で再戦する（state側の値を優先）
          engine.startGame(
            godId,
            deck,
            difficulty,
            loadRewardBonuses(godId),
            otomoGrowthPath,
            engine.state?.enemy.defId ?? selectedEnemyId,
            engine.state?.stake ?? stake,
            engine.state?.stakeChoice ?? stakeChoice,
          )
        }}
        onReselect={backToGodSelect}
      />
    )
  })()

  return (
    <>
      {screen}
      {pendingDiscard && (
        <ConfirmDialog
          title="新しい挑戦を始めますか？"
          message={'現在の挑戦データは失われます。\n新しい挑戦を始めますか？'}
          confirmLabel="新しく始める"
          onCancel={() => setPendingDiscard(null)}
          onConfirm={() => {
            const { proceed } = pendingDiscard
            setPendingDiscard(null)
            proceed()
          }}
        />
      )}
    </>
  )
}

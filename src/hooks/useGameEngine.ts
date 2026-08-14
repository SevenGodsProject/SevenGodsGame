import { useCallback, useState } from 'react'
import type {
  CardDefId,
  CardUid,
  Difficulty,
  GameAction,
  GameEvent,
  GameState,
  GodId,
  GrowthPath,
} from '../core/types'
import { applyAction } from '../core/engine'
import { ENEMY_IDS, pickEnemyId } from '../core/data/enemies'
import { clearBattleSave, saveBattle } from './battleSaveStorage'
import { recordGameResult } from './recordStorage'

/** ラウンド終了→次ラウンド開始の結果を見せる前に「敵のターン」を溜める時間（見せ方のみ。判定タイミングは変えない） */
const ENEMY_TURN_REVEAL_MS = 900

/**
 * 開発用の敵指定バックドア（決定40）。`?enemy=oni`のようにURLで指定すると、
 * `pickEnemyId`のシード選択を上書きして狙った敵と対戦できる（プレイテスト用）。
 * `ENEMY_IDS`のキー名と一致しない・未指定の場合は通常どおりシードから選ぶ。
 */
function resolveForcedEnemyId() {
  const slug = new URLSearchParams(window.location.search).get('enemy')
  if (!slug || !(slug in ENEMY_IDS)) return null
  return ENEMY_IDS[slug as keyof typeof ENEMY_IDS]
}
/** カードが手札から消える前に、使用アニメーションを見せる時間（見せ方のみ） */
const CARD_PLAY_REVEAL_MS = 220

export type UseGameEngine = {
  state: GameState | null
  log: GameEvent[]
  error: string | null
  /** true の間は「敵のターン」演出中。ラウンド終了の判定自体はもう確定している */
  isEnemyTurn: boolean
  /** アニメーション再生中のカードのuid（手札からはこの直後に消える） */
  pendingCardUid: CardUid | null
  /** 直前の決着でスコアの自己ベストを更新したか（決定48フォローアップ） */
  newBest: boolean
  startGame: (
    godId: GodId,
    deck: CardDefId[],
    difficulty: Difficulty,
    bonusCopies?: Map<CardDefId, number>,
    otomoGrowthPath?: GrowthPath,
  ) => void
  /** 保存済みのGameStateからバトルを再開する（決定29） */
  resumeGame: (savedState: GameState) => void
  /** 進行中／決着済みのゲームを未開始状態に戻す（神選択からやり直すため） */
  resetGame: () => void
  playCard: (uid: CardUid) => void
  endRound: () => void
  divine: (choiceIndex: number) => void
}

/**
 * core/engine の reducer を React の state に橋渡しするフック。
 * ここより下の層（core）は Phaser も React も知らない、という不変ルールを守るため、
 * 「つなぐ」役目はこのフックだけに閉じ込めます。
 */
export function useGameEngine(): UseGameEngine {
  const [state, setState] = useState<GameState | null>(null)
  const [log, setLog] = useState<GameEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isEnemyTurn, setIsEnemyTurn] = useState(false)
  const [pendingCardUid, setPendingCardUid] = useState<CardUid | null>(null)
  const [newBest, setNewBest] = useState(false)

  const commit = useCallback((result: { state: GameState; events: GameEvent[] }) => {
    setState(result.state)
    setLog((prev) => [...prev, ...result.events])
    setError(null)
    // 決定29：毎アクション後に自動保存する。決着がついた瞬間は保存済みデータを消す
    // （決着済みの状態を「続きから」で開いてもゲームオーバー画面が出るだけのため）。
    if (result.state.status === 'playing') {
      saveBattle(result.state)
    } else {
      clearBattleSave()
      // 決定48フォローアップ：決着した瞬間に神ごとの戦績（自己ベスト・勝敗数）を更新する。
      setNewBest(recordGameResult(result.state).isNewBest)
    }
  }, [])

  const dispatch = useCallback(
    (action: GameAction) => {
      try {
        const result = applyAction(state, action)

        // 判定（誰が何ダメージ受けるか等）はここで確定済み。
        // END_ROUNDだけは「敵のターン」の間を置いてから見せることで、
        // 予告→即着弾ではなく「敵が行動する瞬間」を演出として作る。
        if (action.type === 'END_ROUND') {
          setIsEnemyTurn(true)
          window.setTimeout(() => {
            setIsEnemyTurn(false)
            commit(result)
          }, ENEMY_TURN_REVEAL_MS)
        } else {
          commit(result)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    },
    [state, commit],
  )

  const startGame = useCallback(
    (
      godId: GodId,
      deck: CardDefId[],
      difficulty: Difficulty,
      bonusCopies?: Map<CardDefId, number>,
      otomoGrowthPath?: GrowthPath,
    ) => {
      setLog([])
      setError(null)
      setIsEnemyTurn(false)
      setPendingCardUid(null)
      setNewBest(false)
      const seed = `seed-${Date.now()}`
      dispatch({
        type: 'START_GAME',
        seed,
        godId,
        enemyId: resolveForcedEnemyId() ?? pickEnemyId(seed),
        deck,
        difficulty,
        bonusCopies: bonusCopies ? Object.fromEntries(bonusCopies) : undefined,
        otomoGrowthPath,
      })
    },
    [dispatch],
  )

  const playCard = useCallback(
    (uid: CardUid) => {
      // 判定はまだ行わない。まずアニメーションを見せてから、実際にPLAY_CARDを発行する
      // （isEnemyTurnと同じ「見せ方だけ遅らせる」パターン）。
      setPendingCardUid(uid)
      window.setTimeout(() => {
        setPendingCardUid(null)
        dispatch({ type: 'PLAY_CARD', uid })
      }, CARD_PLAY_REVEAL_MS)
    },
    [dispatch],
  )
  const endRound = useCallback(() => dispatch({ type: 'END_ROUND' }), [dispatch])
  const divine = useCallback(
    (choiceIndex: number) => dispatch({ type: 'USE_DIVINATION', choiceIndex }),
    [dispatch],
  )

  const resumeGame = useCallback((savedState: GameState) => {
    setLog([])
    setError(null)
    setIsEnemyTurn(false)
    setPendingCardUid(null)
    setNewBest(false)
    setState(savedState)
  }, [])

  const resetGame = useCallback(() => {
    setState(null)
    setLog([])
    setError(null)
    setIsEnemyTurn(false)
    setPendingCardUid(null)
    setNewBest(false)
  }, [])

  return {
    state,
    log,
    error,
    isEnemyTurn,
    pendingCardUid,
    newBest,
    startGame,
    resumeGame,
    resetGame,
    playCard,
    endRound,
    divine,
  }
}

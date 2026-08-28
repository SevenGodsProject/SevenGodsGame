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
import type { EnemyId } from '../core/types'
import { applyAction } from '../core/engine'
import { ENEMY_IDS } from '../core/data/enemies'
import { resolveStartEnemyId } from './startEnemy'
import { clearBattleSave, saveBattle } from './battleSaveStorage'
import { recordGameResult } from './recordStorage'
import { recordOtomoBond, type OtomoBondRecord } from './otomoBondStorage'

/**
 * ラウンド終了→次ラウンド開始の結果を見せる前に「敵のターン」を溜める時間（見せ方のみ。判定タイミングは変えない）。
 * 決定61（Task A4）：900ms→700msに短縮。CARD_PLAY_REVEAL_MS(220ms)との比率を
 * 約3.2倍に保ちつつ（カード1枚の演出より明確に長い「間」は維持）、7ラウンド分
 * 積み重なる待機時間を短縮する。charge/attackによる分岐は追加しない。
 * 決定90でCARD_PLAY_REVEAL_MSを220ms→280msに変更したため、比率は約2.5倍になった
 * （カード1枚の演出より明確に長い「間」という決定61の意図は2.5倍でも維持されるため、
 * ENEMY_TURN_REVEAL_MS自体はここでは変更しない）。
 */
const ENEMY_TURN_REVEAL_MS = 700

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
/**
 * カードが手札から消える前に、使用アニメーションを見せる時間（見せ方のみ）。
 * 決定90：220ms→280msに変更。battle.cssのタイプ別cast-flash-pop-*演出（attack=0.4s、
 * guard/resonance/hinder=0.45s、support/oracle=0.5s）のうちopacity:1のピーク到達時刻の
 * 最大値（support=250ms地点）を上回る最小のキリのいい値とし、6タイプ全てが最大不透明度に
 * 到達してから結果が着弾するようにした。
 */
const CARD_PLAY_REVEAL_MS = 280

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
  /** 直前の決着時点の自己ベスト（更新前の値。STEP-UX6-B、GameOverOverlayの
   * 「自己ベストまであとN点」表示に使う。未記録なら0） */
  prevBest: number
  /** 直前の決着でOTOMOの育成記録がどう変わったか（決定74・Task C3、Lv到達演出の判定に使う） */
  otomoBondChange: { prevRecord: OtomoBondRecord; nextRecord: OtomoBondRecord } | null
  startGame: (
    godId: GodId,
    deck: CardDefId[],
    difficulty: Difficulty,
    bonusCopies?: Map<CardDefId, number>,
    otomoGrowthPath?: GrowthPath,
    /**
     * LANE-D（Enemy Select）：プレイヤーが選んだ対戦相手。null/省略なら
     * 「神に委ねる」＝従来どおりシードから選出（`pickEnemyId`）。
     * URLバックドア`?enemy=`は常にこの指定より優先される（`resolveStartEnemyId`参照）
     */
    enemyId?: EnemyId | null,
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
  const [prevBest, setPrevBest] = useState(0)
  const [otomoBondChange, setOtomoBondChange] = useState<{
    prevRecord: OtomoBondRecord
    nextRecord: OtomoBondRecord
  } | null>(null)

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
      // STEP-UX6-B：戻り値のprevBest（更新前の自己ベスト）も同時に保持する。
      const recordResult = recordGameResult(result.state)
      setNewBest(recordResult.isNewBest)
      setPrevBest(recordResult.prevBest)
      // 決定70（Task C1）：決着した瞬間にOTOMO育成記録（表示専用）を更新する。
      // recordGameResultと同じ分岐・同じ1回性なので二重加算は発生しない
      // （詳細はotomoBondStorage.tsのコメントを参照）。
      // 決定74（Task C3）：更新前後の記録を両方保持し、Lv到達演出の判定に使う。
      setOtomoBondChange(recordOtomoBond(result.state))
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
      enemyId?: EnemyId | null,
    ) => {
      setLog([])
      setError(null)
      setIsEnemyTurn(false)
      setPendingCardUid(null)
      setNewBest(false)
      setPrevBest(0)
      setOtomoBondChange(null)
      const seed = `seed-${Date.now()}`
      dispatch({
        type: 'START_GAME',
        seed,
        godId,
        // LANE-D：URLバックドア > プレイヤー選択 > シード選出（既存pickEnemyId）
        enemyId: resolveStartEnemyId(resolveForcedEnemyId(), enemyId, seed),
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
    setPrevBest(0)
    setOtomoBondChange(null)
    setState(savedState)
  }, [])

  const resetGame = useCallback(() => {
    setState(null)
    setLog([])
    setError(null)
    setIsEnemyTurn(false)
    setPendingCardUid(null)
    setNewBest(false)
    setPrevBest(0)
    setOtomoBondChange(null)
  }, [])

  return {
    state,
    log,
    error,
    isEnemyTurn,
    pendingCardUid,
    newBest,
    prevBest,
    otomoBondChange,
    startGame,
    resumeGame,
    resetGame,
    playCard,
    endRound,
    divine,
  }
}

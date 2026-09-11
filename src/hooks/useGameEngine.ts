import { useCallback, useRef, useState } from 'react'
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
import type { EnemyId, StakeChoiceId } from '../core/types'
import { isStakeLevel } from '../core/data/stakes'
import { recordStakeResult, type StakeResultOutcome } from './stakeStorage'
import { ENEMY_IDS } from '../core/data/enemies'
import { resolveStartEnemyId } from './startEnemy'
import { clearBattleSave, saveBattle } from './battleSaveStorage'
import { recordGameResult } from './recordStorage'
import { recordOtomoBond, type OtomoBondRecord } from './otomoBondStorage'
import { recordDailyResult, startDailyAttempt, type DailyRecordResult } from './dailyStorage'
import { resolveDailyStart } from './startDaily'
import { applyAndRecord, resumeRunLog, toReplayInput, type DailyRunLog } from '../core/replay'
import { createClientRunId } from './clientRunId'
import { clearRunLog, loadRunLog, saveRunLog } from './dailyRunLogStorage'
import { enqueuePendingRun } from './pendingRunStorage'
import { clearTicket, loadTicketFor } from './rankingTicketStorage'

/**
 * ラウンド終了→次ラウンド開始の結果を見せる前に「敵のターン」を溜める時間（見せ方のみ。判定タイミングは変えない）。
 * 決定61（Task A4）：900ms→700msに短縮。CARD_PLAY_REVEAL_MS(220ms)との比率を
 * 約3.2倍に保ちつつ（カード1枚の演出より明確に長い「間」は維持）、7ラウンド分
 * 積み重なる待機時間を短縮する。charge/attackによる分岐は追加しない。
 * 決定90でCARD_PLAY_REVEAL_MSを220ms→280msに変更したため、比率は約2.5倍になった
 * （カード1枚の演出より明確に長い「間」という決定61の意図は2.5倍でも維持されるため、
 * ENEMY_TURN_REVEAL_MS自体はここでは変更しない）。
 */
export const ENEMY_TURN_REVEAL_MS = 700

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
 * 決定126（Seed共有）：`?seed=<文字列>`で通常モードのシードを固定する。同じシード・同じ神・
 * 同じ神階なら初手・託宣結果まで同一（決定論エンジン）。Dailyでは参照しない。
 * 英数字・ハイフンのみ、64文字まで（それ以外は無視して通常どおり発行）
 */
function resolveForcedSeed(): string | null {
  const seed = new URLSearchParams(window.location.search).get('seed')
  if (!seed || !/^[A-Za-z0-9_-]{1,64}$/.test(seed)) return null
  return seed
}
/** 決定126（Seed共有）：`?stake=1..7`で神階を固定する（解放状態に関わらず挑戦できる共有用バックドア） */
function resolveForcedStake(): number | null {
  const raw = new URLSearchParams(window.location.search).get('stake')
  if (raw === null) return null
  const n = Number(raw)
  return isStakeLevel(n) && n > 0 ? n : null
}
/**
 * カードが手札から消える前に、使用アニメーションを見せる時間（見せ方のみ）。
 * 決定90：220ms→280msに変更。battle.cssのタイプ別cast-flash-pop-*演出（attack=0.4s、
 * guard/resonance/hinder=0.45s、support/oracle=0.5s）のうちopacity:1のピーク到達時刻の
 * 最大値（support=250ms地点）を上回る最小のキリのいい値とし、6タイプ全てが最大不透明度に
 * 到達してから結果が着弾するようにした。
 */
export const CARD_PLAY_REVEAL_MS = 280

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
  /**
   * DAILY-01：直前の決着が神域挑戦だった場合の結果（今日のベスト更新・残り回数）。
   * 通常モードの決着ではnull。通常の`newBest`/`prevBest`はDailyでは更新しない
   * （CEO決定5：Daily結果を通常の自己ベストへ混ぜない）
   */
  dailyResult: DailyRecordResult | null
  /**
   * DAILY-01 / Phase 4.1：神域挑戦を開始する。
   *
   * **`bonusCopies`を引数に取らない**ことが公平性の実装そのものである
   * （`resolveDailyStart`が`forcedId`を取らないのと同じ設計）。決定43の報酬ボーナス
   * （＝プレイ量に応じてlocalStorageへ積み上がる「同じカードを3枚積める」権利）は
   * プレイヤーごとに異なる永続進行であり、Dailyの「全員共通の条件」と両立しない。
   * Phase 4.0監査（決定131）で、この差だけで1,000人規模の順位が平均14.8・最大45
   * 動くと実測したため、Dailyでは**渡す経路自体を型から消す**。
   * 通常モード（`startGame`）は従来どおり`bonusCopies`を受け取り、決定43は無変更。
   *
   * 敵・seed・難易度・補正は日付キーから`resolveDailyStart`が確定し、URLバックドア・
   * 敵選択・難易度選択は参照しない。挑戦回数を1回消費する。残り0なら開始せずfalseを返す。
   */
  startDailyGame: (
    godId: GodId,
    deck: CardDefId[],
    dailyKey: string,
    otomoGrowthPath?: GrowthPath,
    /**
     * Phase 4.6：サーバーで確保した挑戦枠。
     *
     * 省略すると従来どおり「ランキングとは無関係のDaily」として始まる
     * （kill switch が閉じている間は常にこちら）。渡す場合、`clientRunId` は
     * **ticketと同じ値**でなければならない（提出時に突き合わせるため）。
     */
    session?: DailyRunSession | null,
  ) => boolean
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
    /** 決定126：神階（0＝通常）。URLバックドア`?stake=`が優先される */
    stake?: number,
    /** 決定126：神階Ⅶの最終試練の選択 */
    stakeChoice?: StakeChoiceId | null,
  ) => void
  /**
   * 決定126：直近の決着の神階記録（通常モードで神階>0、またはむずかしい撃破時）。
   * 通常モードの決着でnullになり得る（神階0かつ通常/かんたん）。Dailyでは常にnull
   */
  stakeResult: StakeResultOutcome | null
  /**
   * 決定128：新規開始（startGame／startDailyGame）ごとに増える。「続きから」では増えない。
   * BattleScreen が Boss Entrance を出す条件に使う（表示専用）
   */
  battleStartKey: number
  /**
   * Phase 4.2：進行中のDaily runの行動ログが健全か（＝将来ランキングへ提出できるか）。
   * Daily以外では常にfalse。「続きから」でログを引き継げなかった場合もfalseになる
   * （ゲームの続行は妨げないが、そのrunは検証できないため提出対象外になる）。
   */
  dailyRunLogAvailable: boolean
  /**
   * Phase 4.6：進行中のDaily runがランキング対象か。
   *
   * false でも対局・保存・再開は従来どおり動く（決定139 §12 の
   * 「サーバー障害でもゲーム本体を壊さない」）。UIはこの値で
   * 「ランキング対象外」を明示する。Daily以外では常にfalse。
   */
  dailyRanked: boolean
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
/**
 * Phase 4.6（決定139 §4・§12）：サーバーで確保した挑戦枠の情報。
 *
 * ランキング対象のDailyは **start（枠の予約）→ ticketの控え → START_GAME** の順で始まる。
 * この型は「その順序を既に通ってきた」ことの証で、`clientRunId` はサーバーが
 * 発行済みの枠と同じ値でなければならない。
 *
 * `ranked: false` は「サーバーが落ちている・kill switchが閉じている・枠を使い切った」
 * のいずれか。この場合でもDailyは従来どおり遊べる（ランキングに載らないだけ）。
 */
export type DailyRunSession = {
  clientRunId: string
  ranked: boolean
}

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
  const [dailyResult, setDailyResult] = useState<DailyRecordResult | null>(null)
  const [stakeResult, setStakeResult] = useState<StakeResultOutcome | null>(null)
  const [battleStartKey, setBattleStartKey] = useState(0)
  /**
   * Phase 4.2：Daily実プレイの行動ログ。
   *
   * refで持つのは、①レンダリングに関係しない記録であり、②Reactのre-renderや
   * StrictModeの二重実行の影響を受けない場所へ置きたいため。追記は`commit`の中で
   * GameStateの更新と**同時に**行う（片方だけ進むと再開時に食い違うため）。
   */
  const runLogRef = useRef<DailyRunLog | null>(null)
  const [dailyRunLogAvailable, setDailyRunLogAvailable] = useState(false)
  const [dailyRanked, setDailyRanked] = useState(false)

  const commit = useCallback((result: { state: GameState; events: GameEvent[] }, runLog: DailyRunLog | null) => {
    setState(result.state)
    setLog((prev) => [...prev, ...result.events])
    setError(null)
    // Phase 4.2：行動ログはGameStateと足並みを揃えて進める。END_ROUNDは演出のため
    // 700ms遅らせてcommitされるので、dispatch時点で記録を進めると「ログだけ1手先」
    // の状態で中断されうる。ここで一緒に更新すれば、保存されるログと保存される
    // 盤面は常に同じ地点を指す。
    runLogRef.current = runLog
    setDailyRunLogAvailable(runLog !== null)
    // 決定29：毎アクション後に自動保存する。決着がついた瞬間は保存済みデータを消す
    // （決着済みの状態を「続きから」で開いてもゲームオーバー画面が出るだけのため）。
    if (result.state.status === 'playing') {
      saveBattle(result.state)
      // 中断・再開でログを失わないよう、盤面と同じタイミングで永続化する
      if (runLog) saveRunLog(runLog)
    } else {
      clearBattleSave()
      if (result.state.mode === 'daily') {
        // Phase 4.2：決着したDaily runは送信待ちへ控える（送信はPhase 4.3）。
        // 未完走runはこの経路を通らないため、そもそも提出対象にならない。
        if (runLog) {
          enqueuePendingRun(
            { clientRunId: runLog.clientRunId, dailyKey: runLog.dailyKey, input: toReplayInput(runLog) },
            runLog.dailyKey,
          )
        }
        clearRunLog()
        // 決着した run の ticket 控えは役目を終える（提出待ちは pendingRuns が持つ）
        clearTicket()
        runLogRef.current = null
        setDailyRunLogAvailable(false)
        // DAILY-01：神域挑戦の決着は`sevengods.daily`にだけ記録し、通常モードの
        // 神別自己ベスト（recordGameResult）は更新しない（CEO決定5）。
        setDailyResult(recordDailyResult(result.state))
        setNewBest(false)
        setPrevBest(0)
      } else {
        // 決定48フォローアップ：決着した瞬間に神ごとの戦績（自己ベスト・勝敗数）を更新する。
        // STEP-UX6-B：戻り値のprevBest（更新前の自己ベスト）も同時に保持する。
        const recordResult = recordGameResult(result.state)
        setNewBest(recordResult.isNewBest)
        setPrevBest(recordResult.prevBest)
        setDailyResult(null)
    setStakeResult(null)
      setStakeResult(null)
        // 決定126：神階の到達・段別ベスト・むずかしい撃破（解放）を記録する
        setStakeResult(recordStakeResult(result.state))
      }
      // 決定70（Task C1）：決着した瞬間にOTOMO育成記録（表示専用）を更新する。
      // recordGameResultと同じ分岐・同じ1回性なので二重加算は発生しない
      // （詳細はotomoBondStorage.tsのコメントを参照）。
      // 決定74（Task C3）：更新前後の記録を両方保持し、Lv到達演出の判定に使う。
      setOtomoBondChange(recordOtomoBond(result.state))
    }
  }, [])

  const dispatch = useCallback(
    (action: GameAction, clientRunId?: string) => {
      try {
        // Phase 4.2：エンジンの適用と行動ログへの追記を1つの関数に閉じ込める。
        // 例外が出れば記録も増えない＝**エンジンが受理した操作だけがログに残る**。
        // UI側でログを組み立てないので、「画面には出たがエンジンに届かなかった操作」
        // や「届いたのに記録されなかった操作」が構造的に発生しない。
        const { result, log: nextLog } = applyAndRecord(state, action, runLogRef.current, clientRunId)

        // 判定（誰が何ダメージ受けるか等）はここで確定済み。
        // END_ROUNDだけは「敵のターン」の間を置いてから見せることで、
        // 予告→即着弾ではなく「敵が行動する瞬間」を演出として作る。
        if (action.type === 'END_ROUND') {
          setIsEnemyTurn(true)
          window.setTimeout(() => {
            setIsEnemyTurn(false)
            commit(result, nextLog)
          }, ENEMY_TURN_REVEAL_MS)
        } else {
          commit(result, nextLog)
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
      stake?: number,
      stakeChoice?: StakeChoiceId | null,
    ) => {
      setLog([])
      setError(null)
      setIsEnemyTurn(false)
      setPendingCardUid(null)
      setNewBest(false)
      setPrevBest(0)
      setOtomoBondChange(null)
      setStakeResult(null)
      // Phase 4.2：通常モードは記録対象外。進行中のDailyログが残っていれば捨てる
      runLogRef.current = null
      setDailyRunLogAvailable(false)
      clearRunLog()
      // 決定126：Seed共有（`?seed=`）。無ければ従来どおり時刻から発行
      const seed = resolveForcedSeed() ?? `seed-${Date.now()}`
      // 決定126：URLバックドア`?stake=` > 画面の選択。神階>0は「ふつう」基準に固定
      const resolvedStake = resolveForcedStake() ?? (isStakeLevel(stake) ? stake : 0)
      setBattleStartKey((k) => k + 1)
      dispatch({
        type: 'START_GAME',
        seed,
        godId,
        // LANE-D：URLバックドア > プレイヤー選択 > シード選出（既存pickEnemyId）
        enemyId: resolveStartEnemyId(resolveForcedEnemyId(), enemyId, seed),
        deck,
        difficulty: resolvedStake > 0 ? 'normal' : difficulty,
        bonusCopies: bonusCopies ? Object.fromEntries(bonusCopies) : undefined,
        otomoGrowthPath,
        ...(resolvedStake > 0 ? { stake: resolvedStake, ...(stakeChoice ? { stakeChoice } : {}) } : {}),
      })
    },
    [dispatch],
  )

  const startDailyGame = useCallback(
    (
      godId: GodId,
      deck: CardDefId[],
      dailyKey: string,
      otomoGrowthPath?: GrowthPath,
      session?: DailyRunSession | null,
    ): boolean => {
      // DAILY-01：残り回数が無ければ開始しない（画面側もボタンを無効化するが二重に守る）
      const attempt = startDailyAttempt(dailyKey)
      if (!attempt.ok) return false
      setLog([])
      setError(null)
      setIsEnemyTurn(false)
      setPendingCardUid(null)
      setNewBest(false)
      setPrevBest(0)
      setOtomoBondChange(null)
      setDailyResult(null)
    setStakeResult(null)
      setStakeResult(null)
      // Phase 4.2：このrunのIDを1度だけ発行する。中断・再開しても、将来の再送でも
      // 同じIDのままなので、サーバー側は二重submitを冪等に扱える。
      // 乱数が使えない環境ではIDを発行できない＝記録なしで進行する（提出対象外）。
      // Phase 4.6：ランキング対象なら、IDは既にサーバーへ登録済みのものを使う。
      // ここで振り直すと、確保した枠と結びつかない提出物になってしまう。
      let clientRunId: string | undefined
      if (session) {
        clientRunId = session.clientRunId
      } else {
        try {
          clientRunId = createClientRunId()
        } catch {
          clientRunId = undefined
        }
      }
      setDailyRanked(session?.ranked === true)
      runLogRef.current = null
      setDailyRunLogAvailable(false)
      clearRunLog()
      const daily = resolveDailyStart(dailyKey)
      setBattleStartKey((k) => k + 1)
      dispatch({
        type: 'START_GAME',
        seed: daily.seed,
        godId,
        // 共通条件：敵はdailyBossForの確定値のみ。`?enemy=`・敵選択・難易度選択は参照しない
        enemyId: daily.enemyId,
        deck,
        difficulty: daily.difficulty,
        // Phase 4.1：Dailyは`bonusCopies`を一切乗せない（＝全員が同じ編成ルール）。
        // 省略時はcreateInitialStateが空Mapとして扱い、validateDeckは
        // `RULES.deckBuilding.maxCopiesPerCard`（2枚）で判定する
        otomoGrowthPath,
        mode: daily.mode,
        dailyKey: daily.dailyKey,
        modifier: daily.modifier,
      }, clientRunId)
      return true
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
    setDailyResult(null)
    setStakeResult(null)
    // Phase 4.2 Step 7：中断・再開でDailyの行動ログを失わない。
    // 保存されていたログをそのまま信用せず、`resumeRunLog`がリプレイで再生して
    // 「このログから本当にこの盤面になるか」を確かめてから引き継ぐ。
    // 食い違えば捨てる（ログと盤面がずれたまま追記を続けると、決着時に
    // 「正しく遊んだのにリプレイが通らない」提出物が出来てしまうため）。
    const recovered = resumeRunLog(savedState, loadRunLog())
    if (recovered.ok) {
      runLogRef.current = recovered.log
      setDailyRunLogAvailable(true)
      // Phase 4.6：この run の ticket が控えてあれば、再開後もランキング対象のまま。
      // ticketは開始時に保存済みなので、reloadでもクラッシュ後でも拾える（決定139 §12）
      setDailyRanked(loadTicketFor(recovered.log.clientRunId, recovered.log.dailyKey) !== null)
    } else {
      runLogRef.current = null
      setDailyRunLogAvailable(false)
      setDailyRanked(false)
      if (recovered.reason !== 'not-daily') clearRunLog()
    }
    setState(savedState)
  }, [])

  const resetGame = useCallback(() => {
    // 進行中runの記録はメモリ上だけ手放す。永続化したログは`battleSaveStorage`と
    // 同じ扱いで残し、「続きから」で戻ってきたときに引き継げるようにする
    runLogRef.current = null
    setDailyRunLogAvailable(false)
    setState(null)
    setLog([])
    setError(null)
    setIsEnemyTurn(false)
    setPendingCardUid(null)
    setNewBest(false)
    setPrevBest(0)
    setOtomoBondChange(null)
    setDailyResult(null)
    setStakeResult(null)
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
    dailyResult,
    stakeResult,
    battleStartKey,
    dailyRunLogAvailable,
    dailyRanked,
    startDailyGame,
    startGame,
    resumeGame,
    resetGame,
    playCard,
    endRound,
    divine,
  }
}

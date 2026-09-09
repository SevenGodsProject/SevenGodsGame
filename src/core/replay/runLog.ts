import type { CardDefId, GameAction, GameState, GodId, GrowthPath } from '../types/index.js'
import { RULES } from '../data/rules.js'
import { applyAction } from '../engine/reducer.js'
import type { ReduceResult } from '../engine/reducer.js'
import { REPLAY_ACTION_TYPES, type ReplayAction, type ReplayInput } from './types.js'

/**
 * Phase 4.2：Daily実プレイの行動ログ。
 *
 * ★記録するのは「UIのクリック」ではなく「production engine が実際に受理したAction」。
 * `useGameEngine.dispatch` は `applyAction` を try/catch で包み、例外が出た操作は
 * state を更新しない（＝無かったことになる）。したがって記録も同じ境界で行う必要があり、
 * それを1つの関数 `applyAndRecord` に閉じ込めてある。UI側でログを組み立てる余地を
 * 作らないことで、「画面には出たがエンジンには届かなかった操作」や
 * 「エンジンには届いたが記録されなかった操作」が構造的に発生しない。
 *
 * ★Phase 4.1 との関係
 * ここは `ReplayInput` を**組み立てるだけ**で、検証はしない。検証は `runReplay` が
 * サーバー側で行う。clientが計算した score・勝敗・HP・rngCursor は
 * `DailyRunLog` にも `ReplayInput` にも入れない（入れる場所が無い）。
 */

/**
 * 進行中／決着済みのDaily 1runの記録。
 *
 * `ReplayInput` に `clientRunId` を足しただけの形にしてある（`toReplayInput` は
 * その1フィールドを落とすだけ）。2つの構造がずれていく余地を残さないため。
 */
export type DailyRunLog = {
  /** `RULES.replay.formatVersion`。`saveVersion`とは独立 */
  version: number
  /**
   * このrunを識別するID。二重submitの防止に使う。
   * 生成はクライアント側の関心事なので、この層では受け取るだけ
   * （coreはブラウザAPIに触れない＝`replayBoundary.test.ts`で機械検査している）。
   */
  clientRunId: string
  dailyKey: string
  godId: GodId
  deck: CardDefId[]
  otomoGrowthPath: GrowthPath
  actions: ReplayAction[]
}

type StartGameAction = Extract<GameAction, { type: 'START_GAME' }>

/** リプレイで再生できる操作か（`START_GAME`と未知のtypeを除く） */
export function isLoggableAction(action: GameAction): action is ReplayAction {
  return (REPLAY_ACTION_TYPES as readonly string[]).includes(action.type)
}

/**
 * START_GAME から新しいrun記録を作る。Daily以外ではnullを返す
 * （通常モードは記録対象外。決定131のランキング対象はDailyのみ）。
 */
export function createRunLog(action: StartGameAction, clientRunId: string): DailyRunLog | null {
  if (action.mode !== 'daily' || !action.dailyKey) return null
  return {
    version: RULES.replay.formatVersion,
    clientRunId,
    dailyKey: action.dailyKey,
    godId: action.godId,
    deck: [...action.deck],
    otomoGrowthPath: action.otomoGrowthPath ?? 'guardian',
    actions: [],
  }
}

/** 受理済みの操作を1件追記した新しい記録を返す（元の記録は変更しない） */
export function appendAction(log: DailyRunLog, action: ReplayAction): DailyRunLog {
  return { ...log, actions: [...log.actions, action] }
}

/**
 * サーバーへ渡す `ReplayInput` を組み立てる。
 *
 * `clientRunId` を落とすだけで、他は素通し。score・win・HP・rngCursor といった
 * 「クライアントが計算した結果」は**元の`DailyRunLog`にも存在しない**ので、
 * ここで足さない／足せない。seed・敵も入れない（サーバーが`dailyKey`から再導出する）。
 */
export function toReplayInput(log: DailyRunLog): ReplayInput {
  return {
    version: log.version,
    mode: 'daily',
    dailyKey: log.dailyKey,
    godId: log.godId,
    deck: [...log.deck],
    otomoGrowthPath: log.otomoGrowthPath,
    actions: [...log.actions],
  }
}

export type RecordResult = {
  /** エンジンの結果。呼び出し側はこれをそのままcommitする */
  result: ReduceResult
  /** 更新後の記録。通常モードや記録対象外ならnull */
  log: DailyRunLog | null
}

/**
 * **本番の唯一の記録経路。** `applyAction` を呼び、受理された場合だけ記録へ追記する。
 *
 * - エンジンが例外を投げたら、この関数も同じ例外を投げる（記録は増えない）。
 *   `useGameEngine.dispatch` は従来どおり catch して `error` を出すだけなので、
 *   **拒否された操作は正式ログに残らない**（Step 2の要件）。
 * - `START_GAME` は記録に含めない。代わりにDailyなら新しい記録を作る
 *   （Phase 4.1の契約：seed・敵・補正をクライアントが宣言する経路を作らない）。
 * - 通常モードでは常に `log: null` を返す（記録しない）。
 * - 記録が無い状態（`log: null`）でDailyの操作が来た場合は記録を**作らない**。
 *   途中から記録を始めると先頭が欠けたログになり、リプレイが必ず失敗するため。
 *   再開時の記録の引き継ぎは `resumeRunLog` が担当する。
 *
 * 同じ操作が二重に記録されないことは、この関数が「1回のdispatchにつき1回だけ
 * 呼ばれる」ことと「純粋関数で、呼ばれた回数ぶんしか追記しない」ことで担保する。
 * Reactのre-render・StrictModeの二重実行はレンダリングとstate updaterを対象とし、
 * この関数はどちらでもない（イベントハンドラから呼ばれる副作用のない計算）。
 */
export function applyAndRecord(
  state: GameState | null,
  action: GameAction,
  log: DailyRunLog | null,
  clientRunId?: string,
): RecordResult {
  const result = applyAction(state, action)

  if (action.type === 'START_GAME') {
    if (!clientRunId) return { result, log: null }
    return { result, log: createRunLog(action, clientRunId) }
  }

  if (!log || !isLoggableAction(action)) return { result, log }
  return { result, log: appendAction(log, action) }
}

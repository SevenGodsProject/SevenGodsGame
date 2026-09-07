import type { CardInstance, CardDefId, GameAction, GameState, GodId, GrowthPath } from '../types'
import { cardUid } from '../types/ids'
import { getCardDef } from '../data/cards'
import { DIVINATION_CHOICES } from '../data/divination'
import { resolveDailyStart } from '../data/dailyStart'
import { applyAction } from '../engine/reducer'
import type { ReplayAction } from './types'
import { applyAndRecord, type DailyRunLog } from './runLog'

/**
 * Phase 4.1：テスト専用の「実プレイ再現」ドライバ。
 *
 * 本番UI（`startDailyGame` → `playCard`/`endRound`/`divine`）とまったく同じ
 * Actionの並びを、決定論的な打ち筋で生成する。これで得た「ライブ実行の結果」と
 * 「同じログを`runReplay`へ通した結果」を突き合わせることで、Determinismを検証する。
 *
 * ★不変ルール2：`Math.random()`は使わない。打ち筋のばらつきはLCG（線形合同法）で作る。
 * `policySeed`が同じなら、いつ何度実行しても同じ操作列になる。
 */

/** 打ち筋のばらつき用の小さな決定論乱数（ゲームのRNGとは無関係） */
function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s
  }
}

function costOf(card: CardInstance): number {
  return getCardDef(card.defId).cost + (card.costModifier ?? 0)
}

export type LiveRun = {
  /** 本番と同じ形の行動ログ（START_GAMEは含まない） */
  actions: ReplayAction[]
  /** ライブ実行の最終GameState */
  state: GameState
}

export type LiveRunOptions = {
  dailyKey: string
  godId: GodId
  deck: CardDefId[]
  otomoGrowthPath?: GrowthPath
  /** 打ち筋のばらつきの種。同じ値なら同じ操作列になる */
  policySeed: number
  /** 託宣を使うか（falseなら一度も使わない） */
  useDivination?: boolean
}

/**
 * Dailyを1試合、決定論的な打ち筋で最後まで進める。
 *
 * 開始条件は本番と同じく`resolveDailyStart(dailyKey)`から作り、`bonusCopies`と
 * `stake`は渡さない（Phase 4.1で本番Dailyが到達した公平版と同一条件）。
 */
export function playDailyRun(options: LiveRunOptions): LiveRun {
  const { dailyKey, godId, deck, otomoGrowthPath, policySeed, useDivination = true } = options
  const rand = lcg(policySeed)
  const daily = resolveDailyStart(dailyKey)

  let state = applyAction(null, {
    type: 'START_GAME',
    seed: daily.seed,
    godId,
    enemyId: daily.enemyId,
    deck,
    difficulty: daily.difficulty,
    otomoGrowthPath,
    mode: daily.mode,
    dailyKey: daily.dailyKey,
    modifier: daily.modifier,
  }).state

  const actions: ReplayAction[] = []
  const push = (action: ReplayAction) => {
    actions.push(action)
    state = applyAction(state, action).state
  }

  // 7ラウンド固定なので上限は構造的に決まるが、万一の無限ループを避ける保険を置く
  let roundGuard = 0
  while (state.status === 'playing' && roundGuard++ < 32) {
    if (
      useDivination &&
      state.divination.remaining > 0 &&
      !state.divination.usedThisRound &&
      rand() % 4 === 0
    ) {
      push({ type: 'USE_DIVINATION', choiceIndex: rand() % DIVINATION_CHOICES.length })
      if (state.status !== 'playing') break
    }

    let playGuard = 0
    while (state.status === 'playing' && playGuard++ < 64) {
      const playable = state.hand.filter((c) => costOf(c) <= state.ap.current)
      if (playable.length === 0) break
      // ときどき手を止めることで、seedごとに違う長さ・違う並びの操作列を作る
      if (rand() % 8 === 0) break
      push({ type: 'PLAY_CARD', uid: playable[rand() % playable.length].uid })
    }

    if (state.status !== 'playing') break
    push({ type: 'END_ROUND' })
  }

  return { actions, state }
}

/**
 * Phase 4.2：**本番の記録経路（`applyAndRecord`）を通した**1試合ランナー。
 *
 * `useGameEngine.dispatch` と同じ形で呼ぶ：
 *   - `applyAndRecord(state, action, log, clientRunId)` を try/catch で包む
 *   - 例外が出たら state も log も進めない（＝受理された操作だけが記録される）
 * これにより「テスト用に組み立てたログ」ではなく「本番と同じ経路が出したログ」を
 * 検証できる（Phase 4.2 Step 5 の要件）。
 */
export type RecordedRun = {
  /** 本番の記録経路が生成した行動ログ */
  log: DailyRunLog
  /** ライブ実行の最終GameState */
  state: GameState
  /** エンジンに拒否された操作の回数（記録に残ってはいけない） */
  rejected: number
}

export type RecordedRunOptions = LiveRunOptions & {
  clientRunId?: string
  /**
   * 各ラウンドで「拒否されるはずの操作」を混ぜる（誤操作・二度押しの再現）。
   * 記録に残らないことを確認するために使う。
   */
  injectRejected?: boolean
}

/** `useGameEngine.dispatch` と同じ境界。拒否された操作は state も log も進めない */
function productionDispatch(
  state: GameState | null,
  action: GameAction,
  log: DailyRunLog | null,
  clientRunId?: string,
): { state: GameState | null; log: DailyRunLog | null; accepted: boolean } {
  try {
    const { result, log: nextLog } = applyAndRecord(state, action, log, clientRunId)
    return { state: result.state, log: nextLog, accepted: true }
  } catch {
    return { state, log, accepted: false }
  }
}

export function playRecordedDailyRun(options: RecordedRunOptions): RecordedRun {
  const {
    dailyKey,
    godId,
    deck,
    otomoGrowthPath,
    policySeed,
    useDivination = true,
    clientRunId = 'test-run-0000000000000000000000',
    injectRejected = false,
  } = options
  const rand = lcg(policySeed)
  const daily = resolveDailyStart(dailyKey)

  // TSの制御フロー解析が閉包内の代入を追えないため、可変な入れ物にまとめる
  const box: { state: GameState | null; log: DailyRunLog | null; rejected: number } = {
    state: null,
    log: null,
    rejected: 0,
  }

  const send = (action: GameAction): GameState | null => {
    const out = productionDispatch(box.state, action, box.log, clientRunId)
    if (!out.accepted) box.rejected++
    box.state = out.state
    box.log = out.log
    return out.state
  }

  // 本番の `startDailyGame` と同じ START_GAME（bonusCopies も stake も渡さない）
  let state = send({
    type: 'START_GAME',
    seed: daily.seed,
    godId,
    enemyId: daily.enemyId,
    deck,
    difficulty: daily.difficulty,
    otomoGrowthPath,
    mode: daily.mode,
    dailyKey: daily.dailyKey,
    modifier: daily.modifier,
  })

  let roundGuard = 0
  while (state !== null && state.status === 'playing' && roundGuard++ < 32) {
    if (injectRejected) {
      // 手札に無いカード（誤操作・二度押し相当）。必ず拒否される
      state = send({ type: 'PLAY_CARD', uid: cardUid('c-not-in-hand') })
      // 存在しない託宣（不正な選択）。必ず拒否される
      state = send({ type: 'USE_DIVINATION', choiceIndex: 99 })
      if (state === null) break
    }

    if (
      useDivination &&
      state.divination.remaining > 0 &&
      !state.divination.usedThisRound &&
      rand() % 4 === 0
    ) {
      state = send({ type: 'USE_DIVINATION', choiceIndex: rand() % DIVINATION_CHOICES.length })
      if (state === null || state.status !== 'playing') break
    }

    let playGuard = 0
    for (;;) {
      if (state === null || state.status !== 'playing' || playGuard++ >= 64) break
      const playable = state.hand.filter((card) => costOf(card) <= (state as GameState).ap.current)
      if (playable.length === 0) break
      if (rand() % 8 === 0) break
      state = send({ type: 'PLAY_CARD', uid: playable[rand() % playable.length].uid })
    }

    if (state === null || state.status !== 'playing') break
    state = send({ type: 'END_ROUND' })
  }

  if (!box.state || !box.log) throw new Error('記録付きの試合を進められませんでした')
  return { log: box.log, state: box.state, rejected: box.rejected }
}

import type { GameState } from '../types'
import { RULES } from '../data/rules'
import { isValidDailyKey, seedIdOf } from '../data/dailyBoss'
import { resolveDailyStart } from '../data/dailyStart'
import { validateDeck } from '../data/deckBuilder'
import { applyAction } from '../engine/reducer'
import { getFinalScore } from '../engine/score'
import {
  REPLAY_ACTION_TYPES,
  type ReplayAction,
  type ReplayInput,
  type ReplayOptions,
  type ReplayRejectionCode,
  type ReplayResult,
  type VerifiedOutcome,
} from './types'

/**
 * Phase 4.1：行動ログから対局を再現し、結果を**サーバー側で計算し直す**検証器。
 *
 * ★アーキテクチャ境界（Phase 4.1 Step 8）
 * このモジュールは`src/core`だけに依存し、React・DOM・localStorage・window・
 * Phaser・Vercel・DBのいずれにも触れない。将来 Vercel の Node Function から
 * そのまま import して同じ結果を得られることが要件であり、
 * `replayBoundary.test.ts`が実ファイルの依存を機械的に検査している。
 *
 * ★検証ロジックを二重実装しない（Phase 4.1 Step 5）
 * 「手札に無いカード」「AP不足」「操作の順序」「決着後の操作」といったルールは、
 * すべて既存エンジン（`playCard`/`endRound`/`applyDivination`）が既に例外として
 * 表明している。ここではそれを**再実装せず**、`applyAction`をtry/catchで包んで
 * `ENGINE_REJECTED`へ翻訳するだけにしている。デッキ検証も`validateDeck`という
 * 同一の関数を呼ぶ（UI・`createInitialState`・リプレイの3者が同じ1つの実装を見る）。
 * リプレイ独自に持つのは、エンジンが原理的に知り得ない4点だけ：
 * フォーマット版・action数の上限・申告値との照合・決着到達の要求。
 */
export function runReplay(input: ReplayInput, options: ReplayOptions = {}): ReplayResult {
  const requireFinished = options.requireFinished ?? true

  const reject = (
    code: ReplayRejectionCode,
    message: string,
    actionIndex?: number,
  ): ReplayResult => ({ ok: false, code, message, ...(actionIndex === undefined ? {} : { actionIndex }) })

  // --- 1. 形式検査（エンジンが知り得ない部分だけ） ---
  if (!input || typeof input !== 'object') {
    return reject('MALFORMED', 'リプレイ入力がオブジェクトではありません')
  }
  if (input.version !== RULES.replay.formatVersion) {
    return reject(
      'FORMAT_VERSION',
      `対応していないリプレイ形式です: ${String(input.version)}（期待 ${RULES.replay.formatVersion}）`,
    )
  }
  if (input.mode !== 'daily') {
    return reject('MODE', `Phase 4.1のリプレイは神域挑戦のみです: ${String(input.mode)}`)
  }
  if (typeof input.dailyKey !== 'string' || !isValidDailyKey(input.dailyKey)) {
    return reject('DAILY_KEY', `不正な日付キーです: ${String(input.dailyKey)}`)
  }
  if (!Array.isArray(input.deck)) {
    return reject('MALFORMED', 'deckが配列ではありません')
  }
  if (!Array.isArray(input.actions)) {
    return reject('MALFORMED', 'actionsが配列ではありません')
  }
  if (input.actions.length > RULES.replay.maxActions) {
    return reject(
      'ACTION_LIMIT',
      `操作数が上限を超えています: ${input.actions.length}（上限 ${RULES.replay.maxActions}）`,
    )
  }

  // --- 2. 開始条件をサーバー側で再導出する（申告値は使わない） ---
  const daily = resolveDailyStart(input.dailyKey)

  if (input.claimedSeed !== undefined && input.claimedSeed !== daily.seed) {
    return reject('SEED_MISMATCH', `Seedが一致しません: 申告 ${input.claimedSeed} / 正 ${daily.seed}`)
  }
  if (input.claimedEnemyId !== undefined && input.claimedEnemyId !== daily.enemyId) {
    return reject(
      'ENEMY_MISMATCH',
      `敵が一致しません: 申告 ${input.claimedEnemyId} / 正 ${daily.enemyId}`,
    )
  }

  // --- 3. デッキ検証（UI・engineと同じvalidateDeckを呼ぶ） ---
  // 第3引数（bonusCopies）を渡さない＝報酬ボーナス無しの「全員共通の編成ルール」。
  // Phase 4.1 Step 1でDaily本体を同じ条件へ揃えたため、UIで組めるデッキは
  // ここでも必ず通り、通らないデッキはそもそもDailyで開始できない。
  const deckCheck = validateDeck(input.deck, input.godId)
  if (!deckCheck.valid) {
    return reject('DECK', `デッキが不正です: ${deckCheck.errors.join(' / ')}`)
  }

  // --- 4. 操作の種類検査（START_GAME混入・未知typeを弾く） ---
  for (let i = 0; i < input.actions.length; i++) {
    const action = input.actions[i] as ReplayAction | { type?: unknown } | null
    const type = action && typeof action === 'object' ? (action as { type?: unknown }).type : undefined
    if (typeof type !== 'string' || !(REPLAY_ACTION_TYPES as readonly string[]).includes(type)) {
      return reject('ACTION_TYPE', `再生できない操作です: ${String(type)}`, i)
    }
  }

  // --- 5. 本番エンジンで再生する ---
  let state: GameState
  try {
    const started = applyAction(null, {
      type: 'START_GAME',
      seed: daily.seed,
      godId: input.godId,
      enemyId: daily.enemyId,
      deck: input.deck,
      difficulty: daily.difficulty,
      // bonusCopies は渡さない（Dailyの公平版そのもの）
      otomoGrowthPath: input.otomoGrowthPath,
      mode: daily.mode,
      dailyKey: daily.dailyKey,
      modifier: daily.modifier,
      // stake は渡さない（Dailyは神階0固定）
    })
    state = started.state
  } catch (e) {
    return reject('ENGINE_REJECTED', messageOf(e))
  }

  for (let i = 0; i < input.actions.length; i++) {
    try {
      state = applyAction(state, input.actions[i]).state
    } catch (e) {
      return reject('ENGINE_REJECTED', messageOf(e), i)
    }
  }

  if (requireFinished && state.status === 'playing') {
    return reject('NOT_FINISHED', '操作ログを再生し切っても決着していません')
  }

  return { ok: true, outcome: toOutcome(state, daily.seed, input.actions.length), state }
}

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** 再生後のGameStateから、ランキングが保存すべき値だけを取り出す */
function toOutcome(state: GameState, seed: string, actionCount: number): VerifiedOutcome {
  return {
    dailyKey: state.dailyKey ?? '',
    enemyId: state.enemy.defId,
    seed,
    seedId: seedIdOf(seed),
    godId: state.godId,
    status: state.status,
    win: state.status === 'won',
    round: state.round,
    score: getFinalScore(state.score, state.stake),
    scoreBreakdown: state.score,
    playerHp: state.player.hp,
    enemyHp: state.enemy.hp,
    rngCursor: state.rngCursor,
    actionCount,
  }
}

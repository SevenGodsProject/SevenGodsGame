import type { GameState } from '../../core/types'
import { getFinalScore, getMastery } from '../../core/engine'
import { getEnemyDef } from '../../core/data/enemies'
import { dailyBossFor } from '../../core/data/dailyBoss'
import { todayDailyKey } from '../../hooks/dailyClock'
import { dailyAttemptsLeft, loadDailyDay, type DailyDay, type DailyRecordResult } from '../../hooks/dailyStorage'
import { isStakeUnlocked, type StakeResultOutcome } from '../../hooks/stakeStorage'
import type { OtomoBondRecord } from '../../hooks/otomoBondStorage'
import type { NextGoalInput } from './nextGoal'
import type { DailyDiffCurrent } from './dailyDiff'

/**
 * Phase 7 P1（決定187・仕様 §6-1）：決着した対局から「次の目標」の入力を集める。
 *
 * **読み取りのみ**。記録の書き込みは `useGameEngine` の決着処理（`recordGameResult` ほか）が
 * 既に 1 回だけ済ませており、ここはその戻り値と storage の現在値を読むだけ。
 * React に依存しない（BattleScreen の描画中に呼んでも副作用が無い）。
 */

export type ResultEngineSnapshot = {
  newBest: boolean
  prevBest: number
  stakeResult: StakeResultOutcome | null
  dailyResult: DailyRecordResult | null
  otomoBondChange: { prevRecord: OtomoBondRecord; nextRecord: OtomoBondRecord } | null
}

export type ResultContext = {
  goalInput: Omit<NextGoalInput, 'nowMs'>
  /** 神域挑戦の決着なら、その日の記録（前回との比較用） */
  dailyDay: DailyDay | null
  /** 神域挑戦の決着なら、今回分（`results[]` の中から今回を特定するため） */
  dailyCurrent: DailyDiffCurrent | null
}

export function collectResultContext(state: GameState, engine: ResultEngineSnapshot, now: Date = new Date()): ResultContext | null {
  if (state.status === 'playing') return null
  const isDaily = state.mode === 'daily'
  const enemyName = getEnemyDef(state.enemy.defId).name
  const common = {
    status: state.status,
    godId: state.godId,
    enemyName,
    enemyHpRatio: state.enemy.maxHp > 0 ? state.enemy.hp / state.enemy.maxHp : 0,
    finalScore: getFinalScore(state.score, state.stake),
    difficulty: state.difficulty,
    stake: state.stake ?? 0,
  }

  if (isDaily) {
    const dailyDay = state.dailyKey ? loadDailyDay(state.dailyKey) : null
    const result = engine.dailyResult
    return {
      goalInput: {
        ...common,
        mode: 'daily',
        daily: result
          ? { isNewBest: result.isNewBest, prevBest: result.prevBest, attemptsLeft: result.attemptsLeft }
          : { isNewBest: false, prevBest: 0, attemptsLeft: state.dailyKey ? dailyAttemptsLeft(state.dailyKey) : 0 },
      },
      dailyDay,
      dailyCurrent: { godId: state.godId, score: getFinalScore(state.score), status: state.status, round: state.round },
    }
  }

  const todayKey = todayDailyKey(now)
  const today = loadDailyDay(todayKey)
  return {
    goalInput: {
      ...common,
      mode: 'normal',
      newBest: engine.newBest,
      prevBest: engine.prevBest,
      stakeResult: engine.stakeResult,
      mastery: state.status === 'won' ? getMastery(state) : null,
      bondRecord: engine.otomoBondChange?.nextRecord ?? null,
      stakeUnlocked: isStakeUnlocked(state.godId),
      todayDaily: {
        enemyName: getEnemyDef(dailyBossFor(todayKey).enemyId).name,
        attemptsUsed: today.attemptsUsed,
        attemptsLeft: dailyAttemptsLeft(todayKey),
      },
    },
    dailyDay: null,
    dailyCurrent: null,
  }
}

import type { Difficulty, GameStatus, GodId } from '../../core/types'
import type { MasteryResult } from '../../core/engine'
import { getStakeLevelDef, stakeLabel } from '../../core/data/stakes'
import type { OtomoBondRecord } from '../../hooks/otomoBondStorage'
import type { StakeResultOutcome } from '../../hooks/stakeStorage'
import { formatDailyCountdown, msUntilNextDailyKey } from '../../hooks/dailyClock'
import { computeNextBondGoal } from '../setup/otomoGrowthDisplay'
import { formatScaled } from '../displayScale'
import { formatMasteryPercent, nextMasteryStep } from './masteryDisplay'

/**
 * Phase 7 P1（決定187・仕様 §6）：結果画面の「次の目標」を **1 つだけ** 選ぶ純関数。
 *
 * - 上から順に規則を評価し、最初に成立したものを返す（Mission Engine は作らない）
 * - 入力はすべて決着時に既に存在するデータ（戻り値・storage の読み取り結果）。新しい保存はしない
 * - 返す `action` は Primary CTA と 1:1 で対応する（`resultHub.ts`）
 * - React・storage・時計に依存しない（`nowMs` は呼び出し側が注入する）
 *
 * 神技評価は Human Play QA（2026-09-06）で「あと○%」の差分表現を廃止しているため、
 * 目標文でも「現在値 → 次ランクの閾値」の形で書く（`describeMastery` と同じ流儀）。
 */

export type ResultAction = 'rematch' | 'adjustDeck' | 'goDaily' | 'home' | 'reselect' | 'startNormal' | 'record'

export type NextGoalId = 'N1' | 'N2' | 'N3' | 'N4' | 'N5' | 'N6' | 'N7' | 'N8' | 'N9' | 'N10' | 'D1' | 'D2' | 'D3' | 'D4'

export type NextGoal = {
  id: NextGoalId
  text: string
  action: ResultAction
  /** Primary ボタンの文言を文脈に合わせて変える場合（例：「神階に挑む」）。無ければ出口の既定文言 */
  primaryLabel?: string
}

export type TodayDailyStatus = {
  enemyName: string
  attemptsUsed: number
  attemptsLeft: number
}

export type NextGoalInput = {
  mode: 'normal' | 'daily'
  status: Exclude<GameStatus, 'playing'>
  godId: GodId
  enemyName: string
  /** 敵の残りHP ÷ 最大HP（0〜1） */
  enemyHpRatio: number
  /** 表示前スケールの最終スコア（神階倍率込み） */
  finalScore: number
  difficulty: Difficulty
  stake: number
  nowMs: number
  // ---- 通常モード ----
  newBest?: boolean
  prevBest?: number
  stakeResult?: StakeResultOutcome | null
  mastery?: MasteryResult | null
  /** 決着後の絆記録（`recordOtomoBond` の nextRecord） */
  bondRecord?: OtomoBondRecord | null
  /** 決着後の時点で神階が解放済みか（`isStakeUnlocked`） */
  stakeUnlocked?: boolean
  /** 今日の神域挑戦の状況（通常モードの決着時に読む） */
  todayDaily?: TodayDailyStatus | null
  // ---- 神域挑戦 ----
  daily?: { isNewBest: boolean; prevBest: number; attemptsLeft: number } | null
}

/** 自己ベストとの差が「近い」とみなす割合（仕様 §6-2 N6） */
export const NEXT_GOAL_BEST_NEAR_RATIO = 0.1
/** 神技評価の次ランクが「近い」とみなす距離（raw 0〜1、仕様 §6-2 N5） */
export const NEXT_GOAL_MASTERY_NEAR_GAP = 0.1
/** 絆称号が「近い」とみなす残り pt（仕様 §6-2 N8） */
export const NEXT_GOAL_BOND_NEAR_POINTS = 3

function selectDailyGoal(input: NextGoalInput): NextGoal {
  const daily = input.daily ?? { isNewBest: false, prevBest: 0, attemptsLeft: 0 }
  const left = daily.attemptsLeft
  if (left <= 0) {
    return {
      id: 'D4',
      text: `今日の挑戦は終了。次の敵まで ${formatDailyCountdown(msUntilNextDailyKey(new Date(input.nowMs)))}`,
      action: 'home',
    }
  }
  if (input.status !== 'won') {
    return { id: 'D1', text: `同じ盤面で${input.enemyName}を撃破する（残り${left}回）`, action: 'rematch' }
  }
  if (daily.isNewBest) {
    return { id: 'D3', text: `今日のベスト ${formatScaled(input.finalScore)}。残り${left}回でさらに更新する`, action: 'rematch' }
  }
  if (daily.prevBest > input.finalScore) {
    return { id: 'D2', text: `今日のベストまであと ${formatScaled(daily.prevBest - input.finalScore)} 点（残り${left}回）`, action: 'rematch' }
  }
  return { id: 'D2', text: `今日のベスト ${formatScaled(daily.prevBest)} を超える（残り${left}回）`, action: 'rematch' }
}

function selectNormalGoal(input: NextGoalInput): NextGoal {
  // N1：敗北・未撃破 → 撃破が唯一の次目標
  if (input.status !== 'won') {
    const ratio = Math.max(0, Math.min(1, input.enemyHpRatio))
    if (ratio > 0 && ratio <= 0.1) {
      return { id: 'N1', text: `あと一歩！${input.enemyName}を撃破する`, action: 'rematch' }
    }
    return { id: 'N1', text: `${input.enemyName}を撃破する（残りHP ${Math.ceil(ratio * 100)}%）`, action: 'rematch' }
  }

  const stakeResult = input.stakeResult ?? null
  // N2：神階がこの勝利で解放された
  if (stakeResult?.hardClearedNow) {
    const first = getStakeLevelDef(1)
    return {
      id: 'N2',
      text: `神階${first?.numeral ?? 'Ⅰ'}「${first?.nameJa ?? ''}」が解放された。神階に挑む`,
      action: 'reselect',
      primaryLabel: '神階に挑む（神を選び直す）',
    }
  }
  // N3：神階の段を初めて突破（Ⅶ は最上段なので次は無い）
  if (stakeResult?.clearedNew && stakeResult.stake > 0 && stakeResult.stake < 7) {
    const next = getStakeLevelDef(stakeResult.stake + 1)
    if (next) {
      return {
        id: 'N3',
        text: `次は神階${next.numeral}「${next.nameJa}」：${next.addedRuleJa}`,
        action: 'reselect',
        primaryLabel: '神階に挑む（神を選び直す）',
      }
    }
  }
  // N4：今日の神域挑戦がまだ手つかず（1 日 1 回しか成立しない「翌日に戻る理由」）
  const today = input.todayDaily ?? null
  if (today && today.attemptsUsed === 0 && today.attemptsLeft > 0) {
    return { id: 'N4', text: `今日の神域挑戦：${today.enemyName}に挑む（残り${today.attemptsLeft}回）`, action: 'goDaily' }
  }
  // N5：神技評価の次ランクが近い
  if (input.mastery) {
    const step = nextMasteryStep(input.mastery, input.godId)
    if (step && step.gap <= NEXT_GOAL_MASTERY_NEAR_GAP) {
      return {
        id: 'N5',
        text: `神技評価 ${step.rank}（${step.word}）へ：${formatMasteryPercent(step.raw)} → ${formatMasteryPercent(step.threshold)}`,
        action: 'rematch',
      }
    }
  }
  const newBest = input.newBest ?? false
  const prevBest = input.prevBest ?? 0
  // N6：自己ベストまであと少し（差がベストの 10% 以内）
  if (!newBest && prevBest > input.finalScore && prevBest - input.finalScore <= prevBest * NEXT_GOAL_BEST_NEAR_RATIO) {
    return { id: 'N6', text: `自己ベストまであと ${formatScaled(prevBest - input.finalScore)} 点`, action: 'rematch' }
  }
  // N7：神階の段別ベストまでの差
  if (input.stake > 0 && stakeResult && !stakeResult.isNewStakeBest && stakeResult.prevStakeBest > input.finalScore) {
    return {
      id: 'N7',
      text: `${stakeLabel(input.stake)} のベストまであと ${formatScaled(stakeResult.prevStakeBest - input.finalScore)} 点`,
      action: 'rematch',
    }
  }
  // N8：絆称号が近い
  if (input.bondRecord) {
    const bond = computeNextBondGoal(input.bondRecord)
    if (bond && bond.pointsNeeded > 0 && bond.pointsNeeded <= NEXT_GOAL_BOND_NEAR_POINTS) {
      return {
        id: 'N8',
        text: `絆称号「${bond.title}」まであと${bond.pointsNeeded}pt${bond.needsDoji ? '（童子形態での対局終了も必要）' : ''}`,
        action: 'rematch',
      }
    }
  }
  // N9：神階が未解放で、まだ「むずかしい」で戦っていない
  if (input.stakeUnlocked === false && input.difficulty !== 'hard') {
    return {
      id: 'N9',
      text: '「むずかしい」を1回撃破して神階を解放する',
      action: 'reselect',
      primaryLabel: 'むずかしいに挑む（神を選び直す）',
    }
  }
  // N10：既定
  if (newBest) {
    return { id: 'N10', text: `自己ベスト ${formatScaled(input.finalScore)} をさらに伸ばす`, action: 'rematch' }
  }
  if (prevBest > input.finalScore) {
    return { id: 'N10', text: `自己ベスト ${formatScaled(prevBest)} を超える（あと ${formatScaled(prevBest - input.finalScore)} 点）`, action: 'rematch' }
  }
  return { id: 'N10', text: `自己ベスト ${formatScaled(Math.max(prevBest, input.finalScore))} を超える`, action: 'rematch' }
}

export function selectNextGoal(input: NextGoalInput): NextGoal {
  return input.mode === 'daily' ? selectDailyGoal(input) : selectNormalGoal(input)
}

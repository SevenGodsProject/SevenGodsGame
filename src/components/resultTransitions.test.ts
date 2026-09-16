import { describe, expect, it } from 'vitest'
import type { EnemyId } from '../core/types'
import { planResultTransition, type ResultTransitionContext } from './resultTransitions'

/**
 * Phase 7 P1（決定187）：結果画面の新しい出口の遷移計画。
 * 神域挑戦の回数を消費する経路を増やしていないことも、ソースレベルで固定する。
 */

const lastBattle = { enemyId: 'oni' as EnemyId, stake: 3, stakeChoice: null, difficulty: 'normal' as const, otomoGrowthPath: 'power' as const }
const ctx = (over: Partial<ResultTransitionContext> = {}): ResultTransitionContext => ({
  mode: 'normal',
  dailyKey: null,
  todayKey: '2026-09-17',
  dailyAttemptsLeft: 3,
  lastBattle,
  ...over,
})

describe('planResultTransition', () => {
  it('通常：デッキを調整 → デッキ画面。直前の敵・神階・難易度・成長経路を引き継ぐ', () => {
    expect(planResultTransition('adjustDeck', ctx())).toEqual({ screen: 'deckBuild', dailyKey: null, carry: lastBattle, clearSelection: false })
  })

  it('神域挑戦・同じ日・残りあり：デッキを調整 → 同じ日の挑戦のままデッキ画面（dailyKey 保持）', () => {
    const t = planResultTransition('adjustDeck', ctx({ mode: 'daily', dailyKey: '2026-09-17', dailyAttemptsLeft: 1 }))
    expect(t).toEqual({ screen: 'deckBuild', dailyKey: 'keep', carry: null, clearSelection: false })
  })

  it('神域挑戦・残り 0：デッキを調整しても神域挑戦画面（開始させない）', () => {
    const t = planResultTransition('adjustDeck', ctx({ mode: 'daily', dailyKey: '2026-09-17', dailyAttemptsLeft: 0 }))
    expect(t.screen).toBe('daily')
    expect(t.dailyKey).toBeNull()
  })

  it('神域挑戦・日付をまたいだ：昨日の seed のままデッキ画面へ戻さない', () => {
    const t = planResultTransition('adjustDeck', ctx({ mode: 'daily', dailyKey: '2026-09-16', todayKey: '2026-09-17', dailyAttemptsLeft: 2 }))
    expect(t.screen).toBe('daily')
    expect(t.dailyKey).toBeNull()
  })

  it('今日の神域挑戦へ／ホームへ／戦績／神を選ぶ は通常モードへ戻す', () => {
    expect(planResultTransition('goDaily', ctx({ mode: 'daily', dailyKey: '2026-09-17' }))).toMatchObject({ screen: 'daily', dailyKey: null })
    expect(planResultTransition('home', ctx({ mode: 'daily', dailyKey: '2026-09-17' }))).toMatchObject({ screen: 'home', dailyKey: null })
    expect(planResultTransition('record', ctx())).toMatchObject({ screen: 'record', dailyKey: null })
    expect(planResultTransition('startNormal', ctx({ mode: 'daily', dailyKey: '2026-09-17' }))).toMatchObject({ screen: 'godSelect', dailyKey: null, clearSelection: true })
  })
})

describe('神域挑戦の回数を消費する場所は増えていない（ソース固定）', () => {
  // tsconfig.app の types は vite/client のみのため node:fs ではなく import.meta.glob で読む（dailyFairness.test.ts と同じ）
  const SOURCES = import.meta.glob(
    [
      './GameFlow.tsx',
      './resultTransitions.ts',
      './battle/BattleScreen.tsx',
      './battle/GameOverOverlay.tsx',
      './battle/nextGoal.ts',
      './battle/dailyDiff.ts',
      './battle/resultHub.ts',
      './setup/HomeScreen.tsx',
      './setup/HomeTodayPanel.tsx',
      '../hooks/useGameEngine.ts',
    ],
    { query: '?raw', import: 'default', eager: true },
  ) as Record<string, string>
  const src = (p: string) => {
    const suffix = p.replace(/^\.{1,2}\//, '')
    const key = Object.keys(SOURCES).find((k) => k.endsWith(suffix))
    expect(key, `ソースが見つからない: ${p}`).toBeDefined()
    return SOURCES[key as string]
  }

  it('startDailyAttempt を呼ぶのは useGameEngine.startDailyGame だけ', () => {
    const files = ['./GameFlow.tsx', './resultTransitions.ts', './battle/BattleScreen.tsx', './battle/GameOverOverlay.tsx', './setup/HomeScreen.tsx', './setup/HomeTodayPanel.tsx']
    for (const f of files) expect(src(f)).not.toMatch(/startDailyAttempt\s*\(/)
    const engine = src('../hooks/useGameEngine.ts')
    expect(engine.match(/startDailyAttempt\s*\(/g)).toHaveLength(1)
  })

  it('GameFlow で startDailyGame を呼ぶのは beginDailyChallenge の中だけ', () => {
    const flow = src('./GameFlow.tsx')
    expect(flow.match(/engine\.startDailyGame\s*\(/g)).toHaveLength(1)
    const begin = flow.slice(flow.indexOf('const beginDailyChallenge'), flow.indexOf('const backToGodSelect'))
    expect(begin).toContain('engine.startDailyGame(')
  })

  it('結果画面・ホームの新しい部品は storage へ書き込まない（読み取りのみ）', () => {
    const writers = /\b(record(GameResult|DailyResult|StakeResult|OtomoBond)|saveBattle|clearBattleSave|addRewardBonus|saveDeckPreference|startDailyAttempt|localStorage\.setItem)\s*\(/
    for (const f of ['./resultTransitions.ts', './battle/nextGoal.ts', './battle/dailyDiff.ts', './battle/resultHub.ts', './setup/HomeTodayPanel.tsx', './battle/GameOverOverlay.tsx']) {
      expect(src(f)).not.toMatch(writers)
    }
  })
})

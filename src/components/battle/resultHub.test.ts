import { describe, expect, it } from 'vitest'
import type { NextGoal } from './nextGoal'
import { exitLabel, planResultExits, type ResultHubContext } from './resultHub'

/**
 * Phase 7 P1（決定187・仕様 §5-2）：結果の種別ごとの Primary／Secondary／Tertiary。
 */

const goal = (action: NextGoal['action'], primaryLabel?: string): NextGoal => ({ id: 'N10', text: 't', action, primaryLabel })
const ctx = (over: Partial<ResultHubContext> = {}): ResultHubContext => ({ mode: 'normal', status: 'won', dailyAttemptsLeft: 0, canShare: true, ...over })

const all = (p: ReturnType<typeof planResultExits>) => [p.primary, ...p.secondary, ...p.tertiary]

describe('planResultExits', () => {
  it('通常勝利（目標＝もう一度）：Secondary はデッキ調整と今日の神域挑戦、残りは Tertiary、共有は末尾', () => {
    const p = planResultExits(goal('rematch'), ctx())
    expect(p.primary).toBe('rematch')
    expect(p.primaryLabel).toBe('同じ構成でもう一度')
    expect(p.secondary).toEqual(['adjustDeck', 'goDaily'])
    expect(p.tertiary).toEqual(['home', 'reselect', 'share'])
    expect(all(p)).toHaveLength(6)
  })

  it('通常勝利（目標＝今日の神域挑戦）：Primary と重複しない Secondary', () => {
    const p = planResultExits(goal('goDaily'), ctx())
    expect(p.primary).toBe('goDaily')
    expect(p.secondary).toEqual(['adjustDeck', 'rematch'])
    expect(p.tertiary).toEqual(['home', 'reselect', 'share'])
  })

  it('通常勝利（目標＝神階に挑む）：Primary 文言は目標側の文脈ラベル', () => {
    const p = planResultExits(goal('reselect', '神階に挑む（神を選び直す）'), ctx())
    expect(p.primary).toBe('reselect')
    expect(p.primaryLabel).toBe('神階に挑む（神を選び直す）')
    expect(p.secondary).not.toContain('reselect')
    expect(p.tertiary).not.toContain('reselect')
  })

  it('通常敗北：Primary もう一度、Secondary デッキ調整／選び直す、Tertiary ホーム／今日の神域挑戦／共有', () => {
    const p = planResultExits(goal('rematch'), ctx({ status: 'lost' }))
    expect(p.primary).toBe('rematch')
    expect(p.secondary).toEqual(['adjustDeck', 'reselect'])
    expect(p.tertiary).toEqual(['home', 'goDaily', 'share'])
  })

  it('神域挑戦・残りあり（勝敗とも）：Primary もう一度挑戦（残りN回）', () => {
    for (const status of ['won', 'lost'] as const) {
      const p = planResultExits(goal('rematch'), ctx({ mode: 'daily', status, dailyAttemptsLeft: 2 }))
      expect(p.primary).toBe('rematch')
      expect(p.primaryLabel).toBe('もう一度挑戦（残り2回）')
      expect(p.secondary).toEqual(['adjustDeck', 'reselect'])
      expect(p.tertiary).toEqual(['home', 'share'])
      expect(all(p)).not.toContain('goDaily')
    }
  })

  it('神域挑戦・残り 0：押せない「もう一度挑戦」は出さず、Primary はホーム', () => {
    for (const status of ['won', 'lost'] as const) {
      const p = planResultExits(goal('home'), ctx({ mode: 'daily', status, dailyAttemptsLeft: 0 }))
      expect(p.primary).toBe('home')
      expect(p.primaryLabel).toBe('ホームへ')
      expect(p.secondary).toEqual(['startNormal', 'record'])
      expect(all(p)).not.toContain('rematch')
      expect(all(p)).not.toContain('adjustDeck')
    }
  })

  it('Primary は常に 1 つ、Secondary は最大 2、同じ出口を 2 回出さない、共有が無ければ出さない', () => {
    const cases = [
      planResultExits(goal('rematch'), ctx({ canShare: false })),
      planResultExits(goal('goDaily'), ctx({ status: 'lost' })),
      planResultExits(goal('rematch'), ctx({ mode: 'daily', dailyAttemptsLeft: 1, canShare: false })),
      planResultExits(goal('home'), ctx({ mode: 'daily', dailyAttemptsLeft: 0 })),
    ]
    for (const p of cases) {
      expect(p.secondary.length).toBeLessThanOrEqual(2)
      const list = all(p)
      expect(new Set(list).size).toBe(list.length)
    }
    expect(all(cases[0])).not.toContain('share')
    expect(cases[1].tertiary[cases[1].tertiary.length - 1]).toBe('share')
  })

  it('exitLabel：もう一度はモードで文言が変わる', () => {
    expect(exitLabel('rematch', ctx())).toBe('同じ構成でもう一度')
    expect(exitLabel('rematch', ctx({ mode: 'daily', dailyAttemptsLeft: 1 }))).toBe('もう一度挑戦（残り1回）')
    expect(exitLabel('share', ctx())).toBe('挑戦状をコピー')
  })
})

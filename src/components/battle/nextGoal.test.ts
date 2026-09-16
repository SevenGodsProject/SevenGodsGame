import { describe, expect, it } from 'vitest'
import { GOD_IDS } from '../../core/data/gods'
import { RULES } from '../../core/data/rules'
import type { StakeResultOutcome } from '../../hooks/stakeStorage'
import { selectNextGoal, type NextGoalInput } from './nextGoal'

/**
 * Phase 7 P1（決定187・仕様 §6）：「次の目標」は上から最初に成立した 1 つだけ。
 * スコアは表示前スケール（×10 で表示）。
 */

const NOW = Date.parse('2026-09-17T03:00:00Z') // JST 12:00 → 次の敵まで 12:00

const base = (over: Partial<NextGoalInput> = {}): NextGoalInput => ({
  mode: 'normal',
  status: 'won',
  godId: GOD_IDS.taiyo,
  enemyName: '業斧の鬼将',
  enemyHpRatio: 0,
  finalScore: 894,
  difficulty: 'normal',
  stake: 0,
  nowMs: NOW,
  newBest: false,
  prevBest: 1200,
  stakeResult: null,
  mastery: null,
  bondRecord: null,
  stakeUnlocked: true,
  todayDaily: { enemyName: '蒼海の龍神', attemptsUsed: 1, attemptsLeft: 2 },
  daily: null,
  ...over,
})

const stake = (over: Partial<StakeResultOutcome> = {}): StakeResultOutcome => ({
  stake: 0,
  isNewStakeBest: false,
  prevStakeBest: 0,
  clearedNew: false,
  hardClearedNow: false,
  ...over,
})

describe('selectNextGoal — 通常モード', () => {
  it('N1：敗北は撃破が目標（残りHP%）。Primary はもう一度', () => {
    const g = selectNextGoal(base({ status: 'lost', enemyHpRatio: 0.42 }))
    expect(g).toMatchObject({ id: 'N1', action: 'rematch', text: '業斧の鬼将を撃破する（残りHP 42%）' })
  })

  it('N1：残りHP10%以下は「あと一歩！」、未撃破（7R終了）も同じ', () => {
    expect(selectNextGoal(base({ status: 'lost', enemyHpRatio: 0.08 })).text).toBe('あと一歩！業斧の鬼将を撃破する')
    expect(selectNextGoal(base({ status: 'finished', enemyHpRatio: 0.3 })).id).toBe('N1')
  })

  it('N1 は神階解放や今日の神域挑戦より優先（敗北で他の目標を出さない）', () => {
    const g = selectNextGoal(base({ status: 'lost', enemyHpRatio: 0.5, stakeResult: stake({ hardClearedNow: true }), todayDaily: { enemyName: 'x', attemptsUsed: 0, attemptsLeft: 3 } }))
    expect(g.id).toBe('N1')
  })

  it('N2：むずかしい撃破で神階解放 → 神階に挑む（選び直す）', () => {
    const g = selectNextGoal(base({ difficulty: 'hard', stakeResult: stake({ hardClearedNow: true }), todayDaily: { enemyName: 'x', attemptsUsed: 0, attemptsLeft: 3 } }))
    expect(g).toMatchObject({ id: 'N2', action: 'reselect', primaryLabel: '神階に挑む（神を選び直す）' })
    expect(g.text).toContain('神階Ⅰ「参道」')
  })

  it('N3：神階の段を初突破 → 次の段とその追加ルール。Ⅶ突破では出さない', () => {
    const g = selectNextGoal(base({ stake: 3, stakeResult: stake({ stake: 3, clearedNew: true }) }))
    expect(g).toMatchObject({ id: 'N3', action: 'reselect' })
    expect(g.text).toMatch(/^次は神階Ⅳ「本殿」：/)
    expect(selectNextGoal(base({ stake: 7, stakeResult: stake({ stake: 7, clearedNew: true }) })).id).not.toBe('N3')
  })

  it('N4：今日の神域挑戦が未挑戦なら、同構成の目標より優先して誘導する', () => {
    const g = selectNextGoal(base({ prevBest: 900, todayDaily: { enemyName: '蒼海の龍神', attemptsUsed: 0, attemptsLeft: 3 } }))
    expect(g).toMatchObject({ id: 'N4', action: 'goDaily', text: '今日の神域挑戦：蒼海の龍神に挑む（残り3回）' })
  })

  it('N4 は 1 回でも挑戦していれば出さない（残り回数があっても）', () => {
    const g = selectNextGoal(base({ prevBest: 900, todayDaily: { enemyName: '蒼海の龍神', attemptsUsed: 1, attemptsLeft: 2 } }))
    expect(g.id).not.toBe('N4')
  })

  it('N5：神技評価の次ランクが近い（10pt以内）。差分表現「あと」は使わない', () => {
    const g = selectNextGoal(base({ mastery: { title: '爆発', grade: 'A', raw: 0.55 } }))
    expect(g).toMatchObject({ id: 'N5', action: 'rematch', text: '神技評価 S（神業）へ：55% → 58%' })
    expect(g.text).not.toContain('あと')
  })

  it('N5：遠い（10pt超）・ゲート未達は採用しない', () => {
    expect(selectNextGoal(base({ mastery: { title: '爆発', grade: 'C', raw: RULES.mastery.taiyo.b - 0.2 } })).id).not.toBe('N5')
    expect(selectNextGoal(base({ godId: GOD_IDS.fukuei, mastery: { title: '大勝負', grade: 'C', raw: 0.09, riskGateMet: false } })).id).not.toBe('N5')
  })

  it('N6：自己ベストまで 10% 以内', () => {
    const g = selectNextGoal(base({ finalScore: 1100, prevBest: 1200 }))
    expect(g).toMatchObject({ id: 'N6', action: 'rematch', text: '自己ベストまであと 1,000 点' })
    expect(selectNextGoal(base({ finalScore: 1079, prevBest: 1200 })).id).not.toBe('N6')
  })

  it('N7：神階の段別ベストまでの差', () => {
    const g = selectNextGoal(base({ stake: 2, finalScore: 900, prevBest: 2000, stakeResult: stake({ stake: 2, prevStakeBest: 1000 }) }))
    expect(g).toMatchObject({ id: 'N7', text: '神階Ⅱ 鳥居 のベストまであと 1,000 点' })
  })

  it('N8：絆称号まで 3pt 以内（童子が必要なら併記）', () => {
    const near = selectNextGoal(base({ bondRecord: { battlesPlayed: 3, resonanceCount: 4, dojiReached: 0 } }))
    expect(near).toMatchObject({ id: 'N8', text: '絆称号「息の合った相棒」まであと2pt' })
    const tier2 = selectNextGoal(base({ bondRecord: { battlesPlayed: 9, resonanceCount: 10, dojiReached: 0 } }))
    expect(tier2.text).toBe('絆称号「固い絆で結ばれた相棒」まであと2pt（童子形態での対局終了も必要）')
    // pt は満たしていて童子だけが足りない＝近いとは言えないので採用しない
    expect(selectNextGoal(base({ bondRecord: { battlesPlayed: 15, resonanceCount: 13, dojiReached: 0 } })).id).not.toBe('N8')
  })

  it('N9：神階未解放で「むずかしい」以外 → むずかしいに挑む', () => {
    const g = selectNextGoal(base({ stakeUnlocked: false, difficulty: 'normal' }))
    expect(g).toMatchObject({ id: 'N9', action: 'reselect', primaryLabel: 'むずかしいに挑む（神を選び直す）' })
    expect(selectNextGoal(base({ stakeUnlocked: false, difficulty: 'hard' })).id).toBe('N10')
  })

  it('N10：既定（更新時は伸ばす／未更新は超える＋差）', () => {
    expect(selectNextGoal(base({ newBest: true, prevBest: 800, finalScore: 894 }))).toMatchObject({ id: 'N10', text: '自己ベスト 8,940 をさらに伸ばす' })
    expect(selectNextGoal(base({ finalScore: 700, prevBest: 1200 })).text).toBe('自己ベスト 12,000 を超える（あと 5,000 点）')
    expect(selectNextGoal(base({ finalScore: 1200, prevBest: 1200 })).text).toBe('自己ベスト 12,000 を超える')
  })

  it('返すのは常に 1 つで、文字列は空でない（全分岐）', () => {
    const inputs: NextGoalInput[] = [
      base({ status: 'lost', enemyHpRatio: 1 }),
      base({ newBest: true }),
      base({ prevBest: 0, finalScore: 0 }),
      base({ todayDaily: null, stakeUnlocked: undefined }),
    ]
    for (const i of inputs) expect(selectNextGoal(i).text.length).toBeGreaterThan(0)
  })
})

describe('selectNextGoal — 神域挑戦', () => {
  const daily = (over: Partial<NextGoalInput> = {}) =>
    base({ mode: 'daily', todayDaily: null, stakeUnlocked: undefined, prevBest: 0, ...over })

  it('D1：残りあり・敗北 → 同じ盤面で撃破', () => {
    const g = selectNextGoal(daily({ status: 'lost', enemyName: '蒼海の龍神', daily: { isNewBest: false, prevBest: 0, attemptsLeft: 2 } }))
    expect(g).toMatchObject({ id: 'D1', action: 'rematch', text: '同じ盤面で蒼海の龍神を撃破する（残り2回）' })
  })

  it('D2：残りあり・未更新 → 今日のベストまでの差', () => {
    const g = selectNextGoal(daily({ finalScore: 900, daily: { isNewBest: false, prevBest: 969, attemptsLeft: 1 } }))
    expect(g).toMatchObject({ id: 'D2', text: '今日のベストまであと 690 点（残り1回）' })
  })

  it('D2：同点は「超える」', () => {
    const g = selectNextGoal(daily({ finalScore: 900, daily: { isNewBest: false, prevBest: 900, attemptsLeft: 1 } }))
    expect(g.text).toBe('今日のベスト 9,000 を超える（残り1回）')
  })

  it('D3：残りあり・更新 → さらに更新', () => {
    const g = selectNextGoal(daily({ finalScore: 969, daily: { isNewBest: true, prevBest: 897, attemptsLeft: 1 } }))
    expect(g).toMatchObject({ id: 'D3', text: '今日のベスト 9,690。残り1回でさらに更新する' })
  })

  it('D4：残り 0 → 終了と次の敵までの時間。Primary はホーム（勝敗を問わない）', () => {
    for (const status of ['won', 'lost'] as const) {
      const g = selectNextGoal(daily({ status, daily: { isNewBest: false, prevBest: 900, attemptsLeft: 0 } }))
      expect(g).toMatchObject({ id: 'D4', action: 'home', text: '今日の挑戦は終了。次の敵まで 12:00' })
    }
  })

  it('神域挑戦では通常モードの目標（神階・今日の神域挑戦・絆）を出さない', () => {
    const g = selectNextGoal(daily({ stakeResult: stake({ hardClearedNow: true }), bondRecord: { battlesPlayed: 3, resonanceCount: 4, dojiReached: 0 }, daily: { isNewBest: true, prevBest: 0, attemptsLeft: 2 } }))
    expect(g.id).toBe('D3')
  })
})

import { describe, expect, it } from 'vitest'
import { hasPlayTrace, selectHomePrimary, type HomePrimaryInput, type PlayTraceInput } from './homePrimary'

/** Phase 7 Entrance E1（決定193・仕様 §6）：Home の金色の Primary は状態で 1 つだけ */
const noTrace: PlayTraceInput = {
  hasSavedBattle: false,
  godRecords: Array.from({ length: 7 }, () => ({ wins: 0, losses: 0, finished: 0 })),
  lastUsedGodId: null,
  dailyAttemptsUsed: [],
}

const base: HomePrimaryInput = { canResume: false, playTrace: true, todayAttemptsUsed: 1, todayAttemptsLeft: 2 }

describe('hasPlayTrace（プレイの痕跡）', () => {
  it('何も無ければ痕跡なし', () => {
    expect(hasPlayTrace(noTrace)).toBe(false)
  })

  it.each([
    ['保存済みバトル（壊れていて Resume を出せない保存も含む）', { hasSavedBattle: true }],
    ['いずれかの神の勝ち', { godRecords: [{ wins: 1, losses: 0, finished: 0 }] }],
    ['いずれかの神の負け', { godRecords: [{ wins: 0, losses: 1, finished: 0 }] }],
    ['いずれかの神の未撃破', { godRecords: [{ wins: 0, losses: 0, finished: 1 }] }],
    ['最後にデッキを確定した神', { lastUsedGodId: 'taiyo' }],
    ['神域挑戦を 1 回でも始めた日', { dailyAttemptsUsed: [0, 1] }],
  ])('%s があれば痕跡あり', (_label, patch) => {
    expect(hasPlayTrace({ ...noTrace, ...patch })).toBe(true)
  })
})

describe('selectHomePrimary', () => {
  it('A：続きがあれば「続きから」（他の条件より優先）', () => {
    expect(selectHomePrimary({ canResume: true, playTrace: true, todayAttemptsUsed: 0, todayAttemptsLeft: 3 })).toBe('resume')
    expect(selectHomePrimary({ canResume: true, playTrace: false, todayAttemptsUsed: 0, todayAttemptsLeft: 3 })).toBe('resume')
  })

  it('B：痕跡が無ければ「初陣へ」（今日の神域挑戦が手つかずでも Daily を勧めない）', () => {
    expect(selectHomePrimary({ canResume: false, playTrace: false, todayAttemptsUsed: 0, todayAttemptsLeft: 3 })).toBe('firstBattle')
  })

  it('D：今日の神域挑戦がまだ手つかず（P1 Next Goal N4 と同じ条件）なら「神域へ挑む」', () => {
    expect(selectHomePrimary({ ...base, todayAttemptsUsed: 0, todayAttemptsLeft: 3 })).toBe('daily')
  })

  it('C：今日すでに挑戦した日は Daily を強制しない（「神を選ぶ」）', () => {
    expect(selectHomePrimary({ ...base, todayAttemptsUsed: 1, todayAttemptsLeft: 2 })).toBe('normal')
    expect(selectHomePrimary({ ...base, todayAttemptsUsed: 3, todayAttemptsLeft: 0 })).toBe('normal')
  })

  it('C：回数が残っていなければ手つかずでも Daily にしない（境界）', () => {
    expect(selectHomePrimary({ ...base, todayAttemptsUsed: 0, todayAttemptsLeft: 0 })).toBe('normal')
  })

  it('未知の敵を含む保存（canResume=false）は A にならず、痕跡ありとして D または C', () => {
    const playTrace = hasPlayTrace({ ...noTrace, hasSavedBattle: true })
    expect(selectHomePrimary({ canResume: false, playTrace, todayAttemptsUsed: 0, todayAttemptsLeft: 3 })).toBe('daily')
    expect(selectHomePrimary({ canResume: false, playTrace, todayAttemptsUsed: 2, todayAttemptsLeft: 1 })).toBe('normal')
  })

  it('日付が変わって今日の回数が 0 に戻ると C → D に切り替わる', () => {
    expect(selectHomePrimary({ ...base, todayAttemptsUsed: 3, todayAttemptsLeft: 0 })).toBe('normal')
    expect(selectHomePrimary({ ...base, todayAttemptsUsed: 0, todayAttemptsLeft: 3 })).toBe('daily')
  })
})

import { describe, expect, it } from 'vitest'
import { hasPlayTrace, isFirstBattleOnly, selectHomePrimary, type HomePrimaryInput, type PlayTraceInput } from './homePrimary'

/** Phase 7 Entrance E1（決定193・仕様 §6）：Home の金色の Primary は状態で 1 つだけ */
const noTrace: PlayTraceInput = {
  hasSavedBattle: false,
  godRecords: Array.from({ length: 7 }, () => ({ wins: 0, losses: 0, finished: 0 })),
  lastUsedGodId: null,
  dailyAttemptsUsed: [],
}

const base: HomePrimaryInput = { canResume: false, playTrace: true, firstBattleOnly: false, todayAttemptsUsed: 1, todayAttemptsLeft: 2 }

/** 7 神ぶんの空の戦績に、指定した神だけ勝ち負けを足す */
const records = (patch: Partial<Record<number, { wins?: number; losses?: number; finished?: number }>>) =>
  Array.from({ length: 7 }, (_, i) => ({ wins: 0, losses: 0, finished: 0, ...(patch[i] ?? {}) }))

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

describe('isFirstBattleOnly（v1.0.3 束 #3：「初陣 1 戦まで」）', () => {
  it('決着 1 戦（勝ち／負け／未撃破のどれでも）・神域 0・保存バトル無し → 初陣 1 戦まで', () => {
    expect(isFirstBattleOnly({ ...noTrace, godRecords: records({ 0: { wins: 1 } }), lastUsedGodId: 'taiyo' })).toBe(true)
    expect(isFirstBattleOnly({ ...noTrace, godRecords: records({ 0: { losses: 1 } }), lastUsedGodId: 'taiyo' })).toBe(true)
    expect(isFirstBattleOnly({ ...noTrace, godRecords: records({ 3: { finished: 1 } }) })).toBe(true)
  })

  it('決着 0 戦（デッキを確定しただけ）も「初陣 1 戦まで」に含める（2 戦目ではない）', () => {
    expect(isFirstBattleOnly({ ...noTrace, lastUsedGodId: 'taiyo' })).toBe(true)
  })

  it('決着が 2 戦以上（同じ神でも別の神でも）なら初陣 1 戦までではない', () => {
    expect(isFirstBattleOnly({ ...noTrace, godRecords: records({ 0: { wins: 2 } }) })).toBe(false)
    expect(isFirstBattleOnly({ ...noTrace, godRecords: records({ 0: { wins: 1 }, 5: { losses: 1 } }) })).toBe(false)
  })

  it('神域挑戦が 1 回でもある、または進行中の保存バトルがあるなら初陣 1 戦までではない', () => {
    expect(isFirstBattleOnly({ ...noTrace, godRecords: records({ 0: { wins: 1 } }), dailyAttemptsUsed: [0, 1] })).toBe(false)
    expect(isFirstBattleOnly({ ...noTrace, godRecords: records({ 0: { wins: 1 } }), hasSavedBattle: true })).toBe(false)
  })
})

describe('selectHomePrimary', () => {
  it('A：続きがあれば「続きから」（他の条件より優先）', () => {
    expect(selectHomePrimary({ canResume: true, playTrace: true, firstBattleOnly: false, todayAttemptsUsed: 0, todayAttemptsLeft: 3 })).toBe('resume')
    expect(selectHomePrimary({ canResume: true, playTrace: false, firstBattleOnly: false, todayAttemptsUsed: 0, todayAttemptsLeft: 3 })).toBe('resume')
    expect(selectHomePrimary({ canResume: true, playTrace: true, firstBattleOnly: true, todayAttemptsUsed: 0, todayAttemptsLeft: 3 })).toBe('resume')
  })

  it('B：痕跡が無ければ「初陣へ」（今日の神域挑戦が手つかずでも Daily を勧めない）', () => {
    expect(selectHomePrimary({ canResume: false, playTrace: false, firstBattleOnly: false, todayAttemptsUsed: 0, todayAttemptsLeft: 3 })).toBe('firstBattle')
  })

  it("C'：初陣 1 戦のみ（Daily 未挑戦・回数あり）でも「神域へ挑む」ではなく「神を選ぶ」（v1.0.3 束 #3）", () => {
    const trace: PlayTraceInput = { ...noTrace, godRecords: records({ 0: { wins: 1 } }), lastUsedGodId: 'taiyo' }
    expect(hasPlayTrace(trace)).toBe(true)
    expect(selectHomePrimary({ canResume: false, playTrace: true, firstBattleOnly: isFirstBattleOnly(trace), todayAttemptsUsed: 0, todayAttemptsLeft: 3 })).toBe('normal')
  })

  it("D：2 戦以上＋Daily 未挑戦（今日の回数あり）なら従来どおり「神域へ挑む」（C' は 2 戦目以降に効かない）", () => {
    const trace: PlayTraceInput = { ...noTrace, godRecords: records({ 0: { wins: 1, losses: 1 } }), lastUsedGodId: 'taiyo' }
    expect(selectHomePrimary({ canResume: false, playTrace: true, firstBattleOnly: isFirstBattleOnly(trace), todayAttemptsUsed: 0, todayAttemptsLeft: 3 })).toBe('daily')
  })

  it("C：Daily を 1 回でも挑戦済み（今日）なら C' の有無に関わらず「神を選ぶ」（Daily を強制しない）", () => {
    const trace: PlayTraceInput = { ...noTrace, godRecords: records({ 0: { wins: 1 } }), dailyAttemptsUsed: [1] }
    expect(isFirstBattleOnly(trace)).toBe(false)
    expect(selectHomePrimary({ canResume: false, playTrace: true, firstBattleOnly: isFirstBattleOnly(trace), todayAttemptsUsed: 1, todayAttemptsLeft: 2 })).toBe('normal')
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
    const trace: PlayTraceInput = { ...noTrace, hasSavedBattle: true }
    const playTrace = hasPlayTrace(trace)
    const firstBattleOnly = isFirstBattleOnly(trace)
    expect(firstBattleOnly).toBe(false)
    expect(selectHomePrimary({ canResume: false, playTrace, firstBattleOnly, todayAttemptsUsed: 0, todayAttemptsLeft: 3 })).toBe('daily')
    expect(selectHomePrimary({ canResume: false, playTrace, firstBattleOnly, todayAttemptsUsed: 2, todayAttemptsLeft: 1 })).toBe('normal')
  })

  it('日付が変わって今日の回数が 0 に戻ると C → D に切り替わる', () => {
    expect(selectHomePrimary({ ...base, todayAttemptsUsed: 3, todayAttemptsLeft: 0 })).toBe('normal')
    expect(selectHomePrimary({ ...base, todayAttemptsUsed: 0, todayAttemptsLeft: 3 })).toBe('daily')
  })
})

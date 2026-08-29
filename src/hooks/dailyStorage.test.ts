import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearDailyRecords,
  dailyAttemptsLeft,
  loadDailyDay,
  loadRecentDailyDays,
  recordDailyResult,
  startDailyAttempt,
} from './dailyStorage'
import { loadGodRecord } from './recordStorage'
import { resolveDailyStart } from './startDaily'
import { applyAction } from '../core/engine/reducer'
import { getFinalScore } from '../core/engine'
import { GOD_IDS } from '../core/data/gods'
import { STARTER_DECK } from '../core/data/decks'
import { RULES } from '../core/data/rules'
import { dailyBossFor } from '../core/data/dailyBoss'
import type { GameState } from '../core/types'

class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() {
    return this.store.size
  }
  clear(): void {
    this.store.clear()
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
})

const KEY = '2026-09-02'

function startDaily(dateKey = KEY): GameState {
  const d = resolveDailyStart(dateKey)
  return applyAction(null, {
    type: 'START_GAME',
    seed: d.seed,
    godId: GOD_IDS.ebisu,
    enemyId: d.enemyId,
    deck: STARTER_DECK,
    difficulty: d.difficulty,
    mode: d.mode,
    dailyKey: d.dailyKey,
    modifier: d.modifier,
  }).state
}

/** 決着済みのDaily stateを作る（勝利・スコア付き）。engineを回さず表示専用の値だけ書き換える */
function finished(state: GameState, total: number, status: GameState['status'] = 'won'): GameState {
  return { ...state, status, score: { ...state.score, total } }
}

describe('dailyStorage（DAILY-01）', () => {
  it('未挑戦の日は空の記録で、敵・seedは日付から確定している', () => {
    const day = loadDailyDay(KEY)
    const boss = dailyBossFor(KEY)
    expect(day.attemptsUsed).toBe(0)
    expect(day.bestScore).toBe(0)
    expect(day.enemyId).toBe(boss.enemyId)
    expect(day.seed).toBe(boss.seed)
    expect(dailyAttemptsLeft(KEY)).toBe(RULES.daily.attemptsPerDay)
  })

  it('挑戦は1日3回まで。4回目はok:falseで消費されない', () => {
    expect(startDailyAttempt(KEY)).toEqual({ ok: true, attemptsLeft: 2 })
    expect(startDailyAttempt(KEY)).toEqual({ ok: true, attemptsLeft: 1 })
    expect(startDailyAttempt(KEY)).toEqual({ ok: true, attemptsLeft: 0 })
    expect(startDailyAttempt(KEY)).toEqual({ ok: false, attemptsLeft: 0 })
    expect(loadDailyDay(KEY).attemptsUsed).toBe(3)
    // 別の日は独立
    expect(dailyAttemptsLeft('2026-09-03')).toBe(3)
  })

  it('決着を記録すると今日のベスト・神別ベストが更新され、通常の神別自己ベストは動かない', () => {
    startDailyAttempt(KEY)
    const s1 = finished(startDaily(), 500)
    const r1 = recordDailyResult(s1, 1000)
    expect(r1).toEqual({ isNewBest: true, prevBest: 0, attemptsLeft: 2 })
    expect(loadDailyDay(KEY).bestScore).toBe(getFinalScore(s1.score))
    expect(loadDailyDay(KEY).bestGodId).toBe(GOD_IDS.ebisu)
    expect(loadDailyDay(KEY).bestByGod[GOD_IDS.ebisu]).toBe(getFinalScore(s1.score))
    // CEO決定5：通常モードの自己ベストには混ぜない
    expect(loadGodRecord(GOD_IDS.ebisu).bestBattleScore).toBe(0)
    expect(loadGodRecord(GOD_IDS.ebisu).wins).toBe(0)

    // 低いスコアはベストを更新しない（敗北も記録はされる）
    startDailyAttempt(KEY)
    const s2 = finished(startDaily(), 100, 'lost')
    const r2 = recordDailyResult(s2, 2000)
    expect(r2).toEqual({ isNewBest: false, prevBest: getFinalScore(s1.score), attemptsLeft: 1 })
    expect(loadDailyDay(KEY).results).toHaveLength(2)
    expect(loadDailyDay(KEY).results[1].status).toBe('lost')
    expect(loadDailyDay(KEY).bestScore).toBe(getFinalScore(s1.score))
  })

  it('通常モードのstate・進行中のstateは記録しない', () => {
    const normal = applyAction(null, {
      type: 'START_GAME',
      seed: 's',
      godId: GOD_IDS.ebisu,
      enemyId: dailyBossFor(KEY).enemyId,
      deck: STARTER_DECK,
    }).state
    expect(recordDailyResult(finished(normal, 300))).toBeNull()
    expect(recordDailyResult(startDaily())).toBeNull()
    expect(loadRecentDailyDays(7)).toHaveLength(0)
  })

  it('直近n日は新しい順で返り、保持日数を超えた古い日は剪定される', () => {
    const days = ['2026-09-01', '2026-09-02', '2026-09-03']
    for (const d of days) startDailyAttempt(d)
    expect(loadRecentDailyDays(2).map((x) => x.dateKey)).toEqual(['2026-09-03', '2026-09-02'])
    // retentionDays+1 日ぶん作ると最古が落ちる
    clearDailyRecords()
    const many: string[] = []
    for (let i = 0; i < RULES.daily.retentionDays + 1; i++) {
      const date = new Date(Date.UTC(2026, 0, 1 + i))
      const key = date.toISOString().slice(0, 10)
      many.push(key)
      startDailyAttempt(key)
    }
    const kept = loadRecentDailyDays(100).map((x) => x.dateKey)
    expect(kept).toHaveLength(RULES.daily.retentionDays)
    expect(kept).not.toContain(many[0])
  })

  it('壊れたデータ・版違いは空扱いで例外にならない', () => {
    localStorage.setItem('sevengods.daily', '{not json')
    expect(loadDailyDay(KEY).attemptsUsed).toBe(0)
    localStorage.setItem('sevengods.daily', JSON.stringify({ version: 99, days: { [KEY]: { attemptsUsed: 3 } } }))
    expect(dailyAttemptsLeft(KEY)).toBe(3)
  })
})

describe('dailyStorage 表示用純関数（8/31 P0-3）', () => {
  it('bestResultOf / bestResultsByGod は保存済みresultsから勝敗付きのベストを引き直す', async () => {
    const mod = await import('./dailyStorage')
    startDailyAttempt(KEY)
    mod.recordDailyResult(finished(startDaily(), 100, 'lost'), 1)
    startDailyAttempt(KEY)
    mod.recordDailyResult(finished(startDaily(), 300, 'won'), 2)
    startDailyAttempt(KEY)
    mod.recordDailyResult(finished({ ...startDaily(), godId: GOD_IDS.taiyo }, 200, 'finished'), 3)
    const day = loadDailyDay(KEY)
    const best = mod.bestResultOf(day)
    expect(best?.status).toBe('won')
    expect(best?.score).toBe(day.bestScore)
    const byGod = mod.bestResultsByGod(day)
    expect(byGod[GOD_IDS.ebisu]?.status).toBe('won')
    expect(byGod[GOD_IDS.taiyo]?.status).toBe('finished')
    expect(Object.keys(byGod)).toHaveLength(2)
    // bestByGod（保存値）と一致する
    expect(byGod[GOD_IDS.ebisu]?.score).toBe(day.bestByGod[GOD_IDS.ebisu])
    expect(byGod[GOD_IDS.taiyo]?.score).toBe(day.bestByGod[GOD_IDS.taiyo])
    // 未挑戦の日はnull
    expect(mod.bestResultOf(loadDailyDay('2026-09-09'))).toBeNull()
  })
})

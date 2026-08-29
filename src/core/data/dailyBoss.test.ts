import { describe, expect, it } from 'vitest'
import {
  DAILY_BOSS_POOL,
  dailyBossFor,
  dailyKeyOf,
  isValidDailyKey,
  seedIdOf,
  weekKeyOf,
  weeklyBossOrder,
} from './dailyBoss'
import { ENEMY_IDS } from './enemies'

describe('dailyKeyOf（JST 00:00固定）', () => {
  it('UTCでは前日でも、JSTで日付が変わっていれば新しい日付キーになる', () => {
    // 2026-08-29 15:00Z = 2026-08-30 00:00 JST
    expect(dailyKeyOf(new Date('2026-08-29T15:00:00Z'))).toBe('2026-08-30')
    expect(dailyKeyOf(new Date('2026-08-29T14:59:59Z'))).toBe('2026-08-29')
  })

  it('端末タイムゾーンに依存しない（同じ瞬間なら同じキー）', () => {
    const t = new Date('2026-12-31T16:30:00Z') // = 2027-01-01 01:30 JST
    expect(dailyKeyOf(t)).toBe('2027-01-01')
  })

  it('月末・年末・うるう日をまたぐ', () => {
    expect(dailyKeyOf(new Date('2026-02-28T15:00:00Z'))).toBe('2026-03-01')
    expect(dailyKeyOf(new Date('2028-02-28T15:00:00Z'))).toBe('2028-02-29')
    expect(dailyKeyOf(new Date('2026-12-31T15:00:00Z'))).toBe('2027-01-01')
  })
})

describe('isValidDailyKey', () => {
  it('実在する日付だけを受け付ける', () => {
    expect(isValidDailyKey('2026-08-30')).toBe(true)
    expect(isValidDailyKey('2028-02-29')).toBe(true)
    expect(isValidDailyKey('2026-02-30')).toBe(false)
    expect(isValidDailyKey('2026-13-01')).toBe(false)
    expect(isValidDailyKey('20260830')).toBe(false)
    expect(isValidDailyKey('')).toBe(false)
  })
})

describe('weekKeyOf（週キー＝その週の月曜）', () => {
  it('月曜〜日曜が同じ週キーになり、曜日番号は月=0…日=6', () => {
    // 2026-08-31 は月曜
    expect(weekKeyOf('2026-08-31')).toEqual({ weekKey: '2026-08-31', dayIndex: 0 })
    expect(weekKeyOf('2026-09-01')).toEqual({ weekKey: '2026-08-31', dayIndex: 1 })
    expect(weekKeyOf('2026-09-06')).toEqual({ weekKey: '2026-08-31', dayIndex: 6 })
    expect(weekKeyOf('2026-09-07')).toEqual({ weekKey: '2026-09-07', dayIndex: 0 })
  })

  it('不正なキーは例外', () => {
    expect(() => weekKeyOf('2026-02-30')).toThrow()
  })
})

describe('weeklyBossOrder / dailyBossFor（週次シャッフル巡回）', () => {
  it('同じ週キーからは常に同じ並びが出る（決定論）', () => {
    expect(weeklyBossOrder('2026-08-31')).toEqual(weeklyBossOrder('2026-08-31'))
  })

  it('1週間で7体が必ず1回ずつ登場する（順列である）', () => {
    for (const weekKey of ['2026-08-31', '2026-09-07', '2026-12-28', '2027-03-01']) {
      const order = weeklyBossOrder(weekKey)
      expect(order).toHaveLength(7)
      expect(new Set(order).size).toBe(7)
      expect([...order].sort()).toEqual([...DAILY_BOSS_POOL].sort())
    }
  })

  it('週が違えば並びも変わる（少なくとも一部の週で）', () => {
    const weeks = ['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21']
    const distinct = new Set(weeks.map((w) => weeklyBossOrder(w).join(',')))
    expect(distinct.size).toBeGreaterThan(1)
  })

  it('dailyBossForは週の並びの曜日番号を取り、seedは日付と敵から決まる', () => {
    const boss = dailyBossFor('2026-09-02') // 水曜 → dayIndex 2
    expect(boss.weekKey).toBe('2026-08-31')
    expect(boss.dayIndex).toBe(2)
    expect(boss.enemyId).toBe(weeklyBossOrder('2026-08-31')[2])
    expect(boss.seed).toBe(`daily-2026-09-02-${boss.enemyId}`)
    expect(Object.values(ENEMY_IDS)).toContain(boss.enemyId)
  })

  it('同じ日付キーなら誰が計算しても同じ敵・同じseed・同じSeed ID（共通条件の根拠）', () => {
    const a = dailyBossFor('2026-09-02')
    const b = dailyBossFor('2026-09-02')
    expect(a).toEqual(b)
    expect(a.seedId).toHaveLength(6)
    expect(a.seedId).toBe(seedIdOf(a.seed))
  })

  it('連続する7日で7体すべてが登場する', () => {
    const days = ['2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06']
    const ids = days.map((d) => dailyBossFor(d).enemyId)
    expect(new Set(ids).size).toBe(7)
  })
})

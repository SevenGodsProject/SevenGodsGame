import { describe, expect, it } from 'vitest'
import { isExpiredDailySave, todayDailyKey } from './dailyClock'
import { startTestGame } from '../core/engine/testUtils'

describe('dailyClock（DAILY-01）', () => {
  it('todayDailyKeyはJST基準（15:00Zで翌日）', () => {
    expect(todayDailyKey(new Date('2026-09-01T14:59:59Z'))).toBe('2026-09-01')
    expect(todayDailyKey(new Date('2026-09-01T15:00:00Z'))).toBe('2026-09-02')
  })

  it('別の日の神域挑戦セーブは期限切れ、同じ日は有効、通常モードは常に有効', () => {
    const base = startTestGame('clock')
    const now = new Date('2026-09-02T03:00:00Z') // 2026-09-02 12:00 JST
    expect(isExpiredDailySave({ ...base, mode: 'daily', dailyKey: '2026-09-01' }, now)).toBe(true)
    expect(isExpiredDailySave({ ...base, mode: 'daily', dailyKey: '2026-09-02' }, now)).toBe(false)
    expect(isExpiredDailySave({ ...base, mode: 'normal' }, now)).toBe(false)
    const { mode: _m, ...legacy } = base
    void _m
    expect(isExpiredDailySave(legacy, now)).toBe(false)
  })
})

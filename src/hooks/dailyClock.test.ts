import { describe, expect, it } from 'vitest'
import { formatDailyCountdown, isExpiredDailySave, msUntilNextDailyKey, todayDailyKey } from './dailyClock'
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

describe('次の神域挑戦までの残り時間（Phase 7 P1・表示専用）', () => {
  it('JST 12:00 なら残り 12 時間', () => {
    const now = new Date('2026-09-02T03:00:00Z')
    expect(msUntilNextDailyKey(now)).toBe(12 * 60 * 60_000)
    expect(formatDailyCountdown(msUntilNextDailyKey(now))).toBe('12:00')
  })

  it('JST 23:59:59 は残り 1 秒で「00:01」（切り上げ）。1 秒後に日付キーが翌日へ変わる', () => {
    const now = new Date('2026-09-01T14:59:59Z')
    expect(msUntilNextDailyKey(now)).toBe(1000)
    expect(formatDailyCountdown(msUntilNextDailyKey(now))).toBe('00:01')
    const after = new Date(now.getTime() + msUntilNextDailyKey(now))
    expect(todayDailyKey(now)).toBe('2026-09-01')
    expect(todayDailyKey(after)).toBe('2026-09-02')
  })

  it('JST 0:00:00 ちょうどは残り 24 時間（「24:00」）で、日付キーは既に新しい日', () => {
    const now = new Date('2026-09-01T15:00:00Z')
    expect(todayDailyKey(now)).toBe('2026-09-02')
    expect(msUntilNextDailyKey(now)).toBe(24 * 60 * 60_000)
    expect(formatDailyCountdown(msUntilNextDailyKey(now))).toBe('24:00')
  })

  it('カウントダウンの終端は常に「日付キーが変わる瞬間」と一致する（月末・年末をまたいでも）', () => {
    for (const iso of ['2026-09-30T10:12:34Z', '2026-12-31T14:30:00Z', '2027-02-28T00:00:01Z', '2028-02-28T15:30:00Z']) {
      const now = new Date(iso)
      const ms = msUntilNextDailyKey(now)
      expect(ms).toBeGreaterThan(0)
      expect(ms).toBeLessThanOrEqual(24 * 60 * 60_000)
      expect(todayDailyKey(new Date(now.getTime() + ms - 1))).toBe(todayDailyKey(now))
      expect(todayDailyKey(new Date(now.getTime() + ms))).not.toBe(todayDailyKey(now))
    }
  })

  it('formatDailyCountdown は 0 未満・24 時間超を丸める', () => {
    expect(formatDailyCountdown(-5)).toBe('00:00')
    expect(formatDailyCountdown(0)).toBe('00:00')
    expect(formatDailyCountdown(90 * 60_000 + 1)).toBe('01:31')
    expect(formatDailyCountdown(10 * 24 * 60 * 60_000)).toBe('24:00')
  })
})

import { describe, expect, it } from 'vitest'
import { dateKeyOf } from './quotaProvider'

/**
 * 決定72（Task D1）：`dateKeyOf`（ローカル日付キーを作る純粋関数）の
 * 単体テスト。時計に依存させず、明示的に渡した`Date`だけで検証する。
 */
describe('dateKeyOf', () => {
  it('年月日をゼロ埋めした"YYYY-MM-DD"を返す', () => {
    expect(dateKeyOf(new Date(2026, 0, 5, 10, 30))).toBe('2026-01-05')
  })

  it('ローカルタイムゾーンの年月日を使う（UTC変換はしない）', () => {
    // 現地時刻で2026-08-15 23:59を表すDate（UTC変換すると別の日になりうる値）
    const localLateNight = new Date(2026, 7, 15, 23, 59)
    expect(dateKeyOf(localLateNight)).toBe('2026-08-15')
  })

  it('月末→翌月の繰り上がりを正しく扱う', () => {
    expect(dateKeyOf(new Date(2026, 0, 31, 12, 0))).toBe('2026-01-31')
    expect(dateKeyOf(new Date(2026, 1, 1, 0, 0))).toBe('2026-02-01')
  })

  it('年末→翌年の繰り上がりを正しく扱う', () => {
    expect(dateKeyOf(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
    expect(dateKeyOf(new Date(2027, 0, 1, 0, 0))).toBe('2027-01-01')
  })

  it('うるう年の2/29を正しく扱う（2028年はうるう年）', () => {
    expect(dateKeyOf(new Date(2028, 1, 29, 12, 0))).toBe('2028-02-29')
    expect(dateKeyOf(new Date(2028, 2, 1, 0, 0))).toBe('2028-03-01')
  })
})

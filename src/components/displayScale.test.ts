import { describe, expect, it } from 'vitest'
import { DISPLAY_SCALE, formatPlain, formatScaled, scaleDisplay } from './displayScale'

/** D2b：表示スケール（内部値×10＋カンマ区切り）の基本仕様を固定する */
describe('displayScale', () => {
  it('DISPLAY_SCALEは10（UX-AUDIT承認のprototype値）', () => {
    expect(DISPLAY_SCALE).toBe(10)
  })

  it('scaleDisplay：内部20 → 表示200', () => {
    expect(scaleDisplay(20)).toBe(200)
  })

  it('formatScaled：内部103 → 「1,030」（4桁以上はカンマ区切り）', () => {
    expect(formatScaled(103)).toBe('1,030')
  })

  it('formatScaled：内部20 → 「200」（3桁はカンマなし）', () => {
    expect(formatScaled(20)).toBe('200')
  })

  it('formatScaled：内部880 → 「8,800」（Battle Score表示）', () => {
    expect(formatScaled(880)).toBe('8,800')
  })

  it('formatScaled：負値も正しく（difficultyBonus easy -20 → 「-200」）', () => {
    expect(formatScaled(-20)).toBe('-200')
  })

  it('formatPlain：既に×10済みの値をカンマ区切りだけする', () => {
    expect(formatPlain(10270)).toBe('10,270')
  })
})

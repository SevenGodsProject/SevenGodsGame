import { describe, expect, it } from 'vitest'
import type { Buff } from '../types'
import { sumBuff, tickBuffs } from './buffs'

/**
 * 決定68（夜間自律開発）：`buffs.ts`（決定51で見つかった「バフが保存されるだけで
 * 消費されない」バグと同じ仕組みの中核）に直接のテストが無かったため追加。
 * 純粋関数のみで副作用が無いため、ブラウザ検証は不要。
 */
describe('sumBuff', () => {
  it('指定したstatのバフだけを合計する（他のstatは無視する）', () => {
    const buffs: Buff[] = [
      { stat: 'atk', amount: 3, remainingRounds: 2 },
      { stat: 'def', amount: 10, remainingRounds: 1 },
    ]
    expect(sumBuff(buffs, 'atk')).toBe(3)
    expect(sumBuff(buffs, 'def')).toBe(10)
  })

  it('同じstatの複数バフを合計する', () => {
    const buffs: Buff[] = [
      { stat: 'atk', amount: 3, remainingRounds: 2 },
      { stat: 'atk', amount: 2, remainingRounds: 1 },
    ]
    expect(sumBuff(buffs, 'atk')).toBe(5)
  })

  it('デバフ（負の値）も正しく合計に反映する', () => {
    const buffs: Buff[] = [
      { stat: 'atk', amount: 5, remainingRounds: 2 },
      { stat: 'atk', amount: -8, remainingRounds: 1 },
    ]
    expect(sumBuff(buffs, 'atk')).toBe(-3)
  })

  it('該当するバフが無ければ0を返す', () => {
    expect(sumBuff([], 'atk')).toBe(0)
  })
})

describe('tickBuffs', () => {
  it('残りラウンドを1減らす', () => {
    const buffs: Buff[] = [{ stat: 'atk', amount: 3, remainingRounds: 2 }]
    const next = tickBuffs(buffs)
    expect(next).toEqual([{ stat: 'atk', amount: 3, remainingRounds: 1 }])
  })

  it('残りラウンドが0になったバフを取り除く', () => {
    const buffs: Buff[] = [{ stat: 'atk', amount: 3, remainingRounds: 1 }]
    const next = tickBuffs(buffs)
    expect(next).toEqual([])
  })

  it('複数バフのうち、切れたものだけを取り除く', () => {
    const buffs: Buff[] = [
      { stat: 'atk', amount: 3, remainingRounds: 1 },
      { stat: 'def', amount: 5, remainingRounds: 3 },
    ]
    const next = tickBuffs(buffs)
    expect(next).toEqual([{ stat: 'def', amount: 5, remainingRounds: 2 }])
  })

  it('元の配列を変更しない', () => {
    const buffs: Buff[] = [{ stat: 'atk', amount: 3, remainingRounds: 2 }]
    const original = JSON.parse(JSON.stringify(buffs))
    tickBuffs(buffs)
    expect(buffs).toEqual(original)
  })
})

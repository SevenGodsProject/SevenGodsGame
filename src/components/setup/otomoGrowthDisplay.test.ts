import { describe, expect, it } from 'vitest'
import { computeOtomoGrowthDisplay, detectOtomoLevelUp } from './otomoGrowthDisplay'
import type { OtomoBondRecord } from '../../hooks/otomoBondStorage'

function record(overrides: Partial<OtomoBondRecord> = {}): OtomoBondRecord {
  return { battlesPlayed: 0, resonanceCount: 0, dojiReached: 0, ...overrides }
}

describe('computeOtomoGrowthDisplay', () => {
  it('未プレイ（全て0）はLv1・進捗0・「まだ出会ったばかり」', () => {
    const display = computeOtomoGrowthDisplay(record())
    expect(display.level).toBe(1)
    expect(display.pointsInLevel).toBe(0)
    expect(display.progressRatio).toBe(0)
    expect(display.bondText).toBe('まだ出会ったばかり')
  })

  it('resonanceCountが1レベル分(3)未満なら引き続きLv1', () => {
    const display = computeOtomoGrowthDisplay(record({ battlesPlayed: 1, resonanceCount: 2 }))
    expect(display.level).toBe(1)
    expect(display.pointsInLevel).toBe(2)
    expect(display.progressRatio).toBeCloseTo(2 / 3)
  })

  it('resonanceCountがちょうど1レベル分(3)でLv2に上がり、レベル内ポイントは0に戻る', () => {
    const display = computeOtomoGrowthDisplay(record({ battlesPlayed: 2, resonanceCount: 3 }))
    expect(display.level).toBe(2)
    expect(display.pointsInLevel).toBe(0)
    expect(display.progressRatio).toBe(0)
  })

  it('Lv3以上は「息の合った相棒」、doji到達かつLv5以上は「固い絆で結ばれた相棒」になる', () => {
    const lv3 = computeOtomoGrowthDisplay(record({ battlesPlayed: 5, resonanceCount: 6 }))
    expect(lv3.level).toBe(3)
    expect(lv3.bondText).toBe('息の合った相棒')

    const lv5NoDoji = computeOtomoGrowthDisplay(record({ battlesPlayed: 10, resonanceCount: 12, dojiReached: 0 }))
    expect(lv5NoDoji.level).toBe(5)
    expect(lv5NoDoji.bondText).toBe('息の合った相棒') // doji未到達なら最上位テキストにはならない

    const lv5WithDoji = computeOtomoGrowthDisplay(record({ battlesPlayed: 10, resonanceCount: 12, dojiReached: 2 }))
    expect(lv5WithDoji.bondText).toBe('固い絆で結ばれた相棒')
  })

  it('battlesPlayedが1以上ならLv1でも「まだ出会ったばかり」ではなく「共に歩み始めた相棒」になる', () => {
    const display = computeOtomoGrowthDisplay(record({ battlesPlayed: 1, resonanceCount: 1 }))
    expect(display.bondText).toBe('共に歩み始めた相棒')
  })

  it('pointsPerLevelは常に3を返す', () => {
    expect(computeOtomoGrowthDisplay(record()).pointsPerLevel).toBe(3)
    expect(computeOtomoGrowthDisplay(record({ resonanceCount: 100 })).pointsPerLevel).toBe(3)
  })
})

/** 決定74（Task C3）：Lv到達演出の発動判定ロジックのテスト */
describe('detectOtomoLevelUp', () => {
  it('Lvが上がった場合、prevLevel/nextLevelを含むオブジェクトを返す', () => {
    const prev = record({ resonanceCount: 2 }) // Lv1
    const next = record({ battlesPlayed: 1, resonanceCount: 3 }) // Lv2
    expect(detectOtomoLevelUp(prev, next)).toEqual({ prevLevel: 1, nextLevel: 2 })
  })

  it('Lvが変わらない場合はnullを返す（同じ対局結果を渡してもLvUP扱いにしない）', () => {
    const prev = record({ resonanceCount: 1 }) // Lv1
    const next = record({ battlesPlayed: 1, resonanceCount: 1 }) // Lv1のまま（例：spirit形態止まりの対局）
    expect(detectOtomoLevelUp(prev, next)).toBeNull()
  })

  it('prevとnextが全く同じ場合（playing状態を渡したケース相当）はnullを返す', () => {
    const same = record({ resonanceCount: 5 })
    expect(detectOtomoLevelUp(same, same)).toBeNull()
  })

  it('Lvが下がることは通常発生しないが、下がった場合もnullを返す（UPのみ検知する設計）', () => {
    const prev = record({ resonanceCount: 5 }) // Lv2
    const next = record({ resonanceCount: 0 }) // Lv1
    expect(detectOtomoLevelUp(prev, next)).toBeNull()
  })

  it('未プレイ→初戦でLv1のまま（resonanceCount+0）ならnullを返す', () => {
    const prev = record()
    const next = record({ battlesPlayed: 1, resonanceCount: 0 })
    expect(detectOtomoLevelUp(prev, next)).toBeNull()
  })
})

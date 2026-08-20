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

/**
 * OTOMO育成インセンティブ改善（8/31版）：絆称号の段階（bondTier）と
 * 「次の解放」プレビュー（nextUnlockText）のテスト。判定条件は既存の
 * `computeBondText`（決定71）の分岐と完全に一致させているため、bondTextの
 * 既存テストケースと矛盾しないことも合わせて確認する。
 */
describe('computeOtomoGrowthDisplay（絆称号tier・次の解放）', () => {
  it('未プレイはbondTier=0で、次の解放は初戦クリアで得られる絆称号を示す', () => {
    const display = computeOtomoGrowthDisplay(record())
    expect(display.bondTier).toBe(0)
    expect(display.nextUnlockText).toBe('絆称号「共に歩み始めた相棒」（初めての対局を終えると解放）')
  })

  it('bondTier=1（Lv1、対局済み）は次のLv3到達に必要なptを示す', () => {
    const display = computeOtomoGrowthDisplay(record({ battlesPlayed: 1, resonanceCount: 0 }))
    expect(display.bondTier).toBe(1)
    expect(display.level).toBe(1)
    expect(display.nextUnlockText).toBe('絆称号「息の合った相棒」（あと6pt）')
  })

  it('bondTier=1（Lv2）は必要ptがレベル内ポイントぶん減る', () => {
    const display = computeOtomoGrowthDisplay(record({ battlesPlayed: 2, resonanceCount: 4 }))
    expect(display.bondTier).toBe(1)
    expect(display.level).toBe(2)
    expect(display.nextUnlockText).toBe('絆称号「息の合った相棒」（あと2pt）')
  })

  it('bondTier=2（Lv3、doji未到達）は次の解放にptと童子到達の両方を示す', () => {
    const display = computeOtomoGrowthDisplay(record({ battlesPlayed: 5, resonanceCount: 6, dojiReached: 0 }))
    expect(display.bondTier).toBe(2)
    expect(display.nextUnlockText).toBe('絆称号「固い絆で結ばれた相棒」（あと6pt・童子形態での対局終了が1回以上必要）')
  })

  it('bondTier=2（Lv5、doji未到達）はpt条件を満たしているため童子到達のみを示す', () => {
    const display = computeOtomoGrowthDisplay(record({ battlesPlayed: 10, resonanceCount: 12, dojiReached: 0 }))
    expect(display.bondTier).toBe(2)
    expect(display.nextUnlockText).toBe('絆称号「固い絆で結ばれた相棒」（童子形態での対局終了が1回以上必要）')
  })

  it('bondTier=3（最上位）に到達すると、これ以上の絆称号は存在しないためnullを返す', () => {
    const display = computeOtomoGrowthDisplay(record({ battlesPlayed: 10, resonanceCount: 12, dojiReached: 2 }))
    expect(display.bondTier).toBe(3)
    expect(display.nextUnlockText).toBeNull()
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

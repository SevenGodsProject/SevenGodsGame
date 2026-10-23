import { describe, expect, it } from 'vitest'
import { computeNextBondGoal, computeOtomoGrowthDisplay, computeSevenBondSummary, detectOtomoLevelUp } from './otomoGrowthDisplay'
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

  it('Lv3以上は「息の合った相棒」、Lv5以上は童子到達に依らず「固い絆で結ばれた相棒」になる（v1.0.4 Retention 束 ①）', () => {
    const lv3 = computeOtomoGrowthDisplay(record({ battlesPlayed: 5, resonanceCount: 6 }))
    expect(lv3.level).toBe(3)
    expect(lv3.bondText).toBe('息の合った相棒')

    const lv5NoDoji = computeOtomoGrowthDisplay(record({ battlesPlayed: 10, resonanceCount: 12, dojiReached: 0 }))
    expect(lv5NoDoji.level).toBe(5)
    expect(lv5NoDoji.bondText).toBe('固い絆で結ばれた相棒') // v1.0.4：童子未到達でも Lv5 で最上位

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
  it('未プレイはbondTier=0で、次の解放は初戦クリアで得られる絆称号＋受肉態の記録を示す', () => {
    const display = computeOtomoGrowthDisplay(record())
    expect(display.bondTier).toBe(0)
    expect(display.nextUnlockText).toBe('絆称号「共に歩み始めた相棒」＋受肉態の記録（初めての対局を終えると解放）')
  })

  it('bondTier=1（Lv1、対局済み）は次のLv3到達に必要なptを示す（形態記録の追加なし）', () => {
    const display = computeOtomoGrowthDisplay(record({ battlesPlayed: 1, resonanceCount: 0 }))
    expect(display.bondTier).toBe(1)
    expect(display.level).toBe(1)
    expect(display.nextUnlockText).toBe('絆称号「息の合った相棒」（あと6pt）')
  })

  it('bondTier=1（Lv2）は必要ptがレベル内ポイントぶん減る（形態記録の追加なし）', () => {
    const display = computeOtomoGrowthDisplay(record({ battlesPlayed: 2, resonanceCount: 4 }))
    expect(display.bondTier).toBe(1)
    expect(display.level).toBe(2)
    expect(display.nextUnlockText).toBe('絆称号「息の合った相棒」（あと2pt）')
  })

  it('bondTier=2（Lv3、doji未到達）は次の解放に Lv5 までの pt だけを示す（童子条件なし）', () => {
    const display = computeOtomoGrowthDisplay(record({ battlesPlayed: 5, resonanceCount: 6, dojiReached: 0 }))
    expect(display.bondTier).toBe(2)
    expect(display.nextUnlockText).toBe('絆称号「固い絆で結ばれた相棒」（あと6pt）')
  })

  it('Lv5・doji未到達は bondTier=3 になり、次の解放は童子の記録だけを示す', () => {
    const display = computeOtomoGrowthDisplay(record({ battlesPlayed: 10, resonanceCount: 12, dojiReached: 0 }))
    expect(display.bondTier).toBe(3)
    expect(display.nextUnlockText).toBe('童子の記録（童子形態で対局を終えると解放）')
  })

  it('既存の Lv5 記録は ★3 へ昇格するのみ（Lv5 未満は従来どおり tier2 以下＝降格なし）', () => {
    expect(computeOtomoGrowthDisplay(record({ battlesPlayed: 9, resonanceCount: 11, dojiReached: 0 })).bondTier).toBe(2)
    expect(computeOtomoGrowthDisplay(record({ battlesPlayed: 9, resonanceCount: 11, dojiReached: 3 })).bondTier).toBe(2)
    expect(computeOtomoGrowthDisplay(record({ battlesPlayed: 30, resonanceCount: 20, dojiReached: 3 })).bondTier).toBe(3)
  })

  it('bondTier=3（最上位）に到達すると、これ以上の絆称号・形態記録は存在しないためnullを返す', () => {
    const display = computeOtomoGrowthDisplay(record({ battlesPlayed: 10, resonanceCount: 12, dojiReached: 2 }))
    expect(display.bondTier).toBe(3)
    expect(display.nextUnlockText).toBeNull()
  })
})

/**
 * Phase1.5 TASK1/5：3形態ギャラリーの解放条件（unlockedForms）のテスト。
 * bondTierの既存境界（tier1・tier3到達）をそのまま再利用しているため、
 * 上のbondTierテストケースと矛盾しないことも合わせて確認する。
 */
describe('computeOtomoGrowthDisplay（unlockedForms）', () => {
  it('tier0（未プレイ）は精霊態のみ閲覧可能', () => {
    const display = computeOtomoGrowthDisplay(record())
    expect(display.bondTier).toBe(0)
    expect(display.unlockedForms).toEqual(['spirit'])
  })

  it('tier1（Lv1、対局済み）は精霊態＋受肉態を閲覧可能', () => {
    const display = computeOtomoGrowthDisplay(record({ battlesPlayed: 1, resonanceCount: 0 }))
    expect(display.bondTier).toBe(1)
    expect(display.unlockedForms).toEqual(['spirit', 'incarnate'])
  })

  it('tier2（Lv3、doji未到達）は精霊態＋受肉態のまま（童子はまだ）', () => {
    const display = computeOtomoGrowthDisplay(record({ battlesPlayed: 5, resonanceCount: 6, dojiReached: 0 }))
    expect(display.bondTier).toBe(2)
    expect(display.unlockedForms).toEqual(['spirit', 'incarnate'])
  })

  it('tier3・doji未到達は精霊態＋受肉態のまま（童子の記録は童子到達で開く）', () => {
    const display = computeOtomoGrowthDisplay(record({ battlesPlayed: 10, resonanceCount: 12, dojiReached: 0 }))
    expect(display.bondTier).toBe(3)
    expect(display.unlockedForms).toEqual(['spirit', 'incarnate'])
  })

  it('tier2 でも doji 到達済みなら童子の記録を閲覧可能（称号と記録の分離）', () => {
    const display = computeOtomoGrowthDisplay(record({ battlesPlayed: 4, resonanceCount: 6, dojiReached: 1 }))
    expect(display.bondTier).toBe(2)
    expect(display.unlockedForms).toEqual(['spirit', 'incarnate', 'doji'])
  })

  it('tier3（Lv5以上・doji到達済み）は3形態すべて閲覧可能', () => {
    const display = computeOtomoGrowthDisplay(record({ battlesPlayed: 10, resonanceCount: 12, dojiReached: 2 }))
    expect(display.bondTier).toBe(3)
    expect(display.unlockedForms).toEqual(['spirit', 'incarnate', 'doji'])
  })
})

/** Phase1.5 TASK3/5：「七柱との絆」全体進捗の集計テスト */
describe('computeSevenBondSummary', () => {
  it('7体とも未プレイなら0/7', () => {
    const records = Array.from({ length: 7 }, () => record())
    expect(computeSevenBondSummary(records)).toEqual({ achievedCount: 0, total: 7 })
  })

  it('一部のOTOMOがbondTier>=1（対局済み）なら達成数としてカウントされる（中間状態）', () => {
    const records = [
      record({ battlesPlayed: 1, resonanceCount: 1 }), // tier1
      record({ battlesPlayed: 3, resonanceCount: 9 }), // tier2
      record(), // tier0（未達成）
      record(), // tier0（未達成）
      record({ battlesPlayed: 1, resonanceCount: 0 }), // tier1
      record(), // tier0（未達成）
      record(), // tier0（未達成）
    ]
    expect(computeSevenBondSummary(records)).toEqual({ achievedCount: 3, total: 7 })
  })

  it('7体ともbondTier>=1（最低1戦ずつ済み）なら7/7', () => {
    const records = Array.from({ length: 7 }, () => record({ battlesPlayed: 1, resonanceCount: 1 }))
    expect(computeSevenBondSummary(records)).toEqual({ achievedCount: 7, total: 7 })
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

describe('computeNextBondGoal（Phase 7 P1）', () => {
  it('未対局と最終称号は null', () => {
    expect(computeNextBondGoal(record())).toBeNull()
    expect(computeNextBondGoal(record({ battlesPlayed: 20, resonanceCount: 12, dojiReached: 1 }))).toBeNull()
  })

  it('tier1：Lv3（6pt）までの残り pt。OTOMO 画面の「あとNpt」と一致する', () => {
    const rec = record({ battlesPlayed: 3, resonanceCount: 4 })
    const goal = computeNextBondGoal(rec)
    expect(goal).toEqual({ title: '息の合った相棒', pointsNeeded: 2 })
    expect(computeOtomoGrowthDisplay(rec).nextUnlockText).toContain('あと2pt')
  })

  it('tier2：Lv5（12pt）までの残り pt（童子条件なし）', () => {
    expect(computeNextBondGoal(record({ battlesPlayed: 9, resonanceCount: 10, dojiReached: 0 }))).toEqual({
      title: '固い絆で結ばれた相棒',
      pointsNeeded: 2,
    })
    // Lv5 到達済みは童子未到達でも最終称号＝null
    expect(computeNextBondGoal(record({ battlesPlayed: 15, resonanceCount: 13, dojiReached: 0 }))).toBeNull()
  })
})

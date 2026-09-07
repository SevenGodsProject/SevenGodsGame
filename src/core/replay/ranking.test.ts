import { describe, it, expect } from 'vitest'
import { assignRanks } from './ranking'

/**
 * Phase 4.2 Step 11：順位付けの規則を固定する。
 *
 * Phase 4.0 決定131 §6 で「1,000人以上では一意順位を出すと実質の決定要因が
 * 先着になる」と実測した。その対処が「同点を同点として正直に扱う」であり、
 * ここではその規則が実装として守られていることを確かめる。
 */

const of = (...scores: number[]) => scores.map((score, i) => ({ entry: `p${i}`, score }))

describe('assignRanks：同点は同順位（1, 1, 3 方式）', () => {
  it('同点は同じ順位になり、次の順位は人数ぶん飛ぶ', () => {
    const ranked = assignRanks(of(100, 100, 90, 80, 80, 80, 70))
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3, 4, 4, 4, 7])
  })

  it('同順位の人数を併記できる', () => {
    const ranked = assignRanks(of(100, 100, 90, 80, 80, 80))
    expect(ranked.map((r) => r.tiedCount)).toEqual([2, 2, 1, 3, 3, 3])
  })

  it('パーセンタイル（上位何%）を併記できる', () => {
    const ranked = assignRanks(of(100, 90, 80, 70))
    expect(ranked.map((r) => r.topPercent)).toEqual([25, 50, 75, 100])
    // 同点なら同じパーセンタイルになる
    const tied = assignRanks(of(100, 100, 80, 70))
    expect(tied[0].topPercent).toBe(tied[1].topPercent)
  })

  it('「次の順位まであと○点」は次の異なるスコアまでの差になる', () => {
    const ranked = assignRanks(of(100, 90, 90, 72))
    expect(ranked.map((r) => r.pointsToNextRank)).toEqual([null, 10, 10, 18])
  })

  it('提出順（入力順）は順位を変えない。同順位内の表示順にしか影響しない', () => {
    const early = [
      { entry: 'early', score: 100 },
      { entry: 'late', score: 100 },
      { entry: 'other', score: 50 },
    ]
    const late = [
      { entry: 'late', score: 100 },
      { entry: 'early', score: 100 },
      { entry: 'other', score: 50 },
    ]
    const a = assignRanks(early)
    const b = assignRanks(late)
    // 順位・人数・パーセンタイルは提出順に依らず同じ
    expect(a.map((r) => r.rank)).toEqual(b.map((r) => r.rank))
    expect(a.map((r) => r.tiedCount)).toEqual(b.map((r) => r.tiedCount))
    // 表示順だけが入力順に従う（安定ソート）
    expect(a.map((r) => r.entry)).toEqual(['early', 'late', 'other'])
    expect(b.map((r) => r.entry)).toEqual(['late', 'early', 'other'])
  })

  it('全員同点でも全員1位になる（先着で差を付けない）', () => {
    const ranked = assignRanks(of(500, 500, 500, 500))
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 1, 1])
    expect(ranked.every((r) => r.tiedCount === 4)).toBe(true)
    expect(ranked.every((r) => r.pointsToNextRank === null)).toBe(true)
  })

  it('空・単独でも壊れない', () => {
    expect(assignRanks([])).toEqual([])
    const solo = assignRanks(of(123))
    expect(solo).toEqual([
      { entry: 'p0', score: 123, rank: 1, tiedCount: 1, topPercent: 100, pointsToNextRank: null },
    ])
  })

  it('Phase 4.0が測ったTie Densityの規模でも規則が崩れない（1,000人・137種）', () => {
    // 決定131 §6-2：到達しうるスコアの種類数は137前後で頭打ちになる
    const entries = Array.from({ length: 1000 }, (_, i) => ({
      entry: i,
      score: 900 + (i % 137),
    }))
    const ranked = assignRanks(entries)
    expect(ranked.length).toBe(1000)
    // 順位の種類数＝スコアの種類数（同点が潰れている）
    expect(new Set(ranked.map((r) => r.rank)).size).toBe(137)
    // 最上位の順位は必ず1
    expect(ranked[0].rank).toBe(1)
    // 同点グループの人数は全員一致しており、合計は参加者数になる
    const byRank = new Map<number, number>()
    for (const r of ranked) byRank.set(r.rank, (byRank.get(r.rank) ?? 0) + 1)
    for (const r of ranked) expect(r.tiedCount).toBe(byRank.get(r.rank))
    expect([...byRank.values()].reduce((a, b) => a + b, 0)).toBe(1000)
  })
})

import { describe, expect, it } from 'vitest'
import { createRng } from './seededRandom'

/**
 * 決定68（夜間自律開発）：`seededRandom.ts`（不変ルール2「Math.random()を
 * 使わない」の中核実装）に直接のテストファイルが一件も存在しなかったため追加。
 * 特に「同じseed+cursorから再開すると、続けて呼んだ場合と完全に同じ数列になる」
 * 性質は、決定29（バトル状態のセーブ・再開）が全面的に依存している前提であり、
 * ここが壊れると「続きから」機能が静かに破綻しうる。既存ロジックは一切変更せず、
 * 現在の実装が持つ性質を固定する再現防止テストとして追加する。
 */
describe('createRng', () => {
  it('同じseedなら同じ数列を返す（決定論的）', () => {
    const a = createRng('seed-abc')
    const b = createRng('seed-abc')
    const seqA = Array.from({ length: 10 }, () => a.next())
    const seqB = Array.from({ length: 10 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('異なるseedなら異なる数列を返す', () => {
    const a = createRng('seed-abc')
    const b = createRng('seed-xyz')
    const seqA = Array.from({ length: 10 }, () => a.next())
    const seqB = Array.from({ length: 10 }, () => b.next())
    expect(seqA).not.toEqual(seqB)
  })

  it('next()は常に0以上1未満を返す', () => {
    const rng = createRng('range-check')
    for (let i = 0; i < 200; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('nextInt(min,max)は常にmin以上max未満の整数を返す', () => {
    const rng = createRng('int-range-check')
    for (let i = 0; i < 200; i++) {
      const v = rng.nextInt(3, 10)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThan(10)
    }
  })

  it('shuffleは元配列を変更せず、同じ要素の並べ替えを返す', () => {
    const rng = createRng('shuffle-check')
    const original = [1, 2, 3, 4, 5, 6, 7, 8]
    const originalCopy = [...original]
    const shuffled = rng.shuffle(original)
    expect(original).toEqual(originalCopy) // 元配列は不変
    expect(shuffled).not.toBe(original) // 新しい配列
    expect([...shuffled].sort((x, y) => x - y)).toEqual(originalCopy.sort((x, y) => x - y)) // 要素は同じ集合
  })

  it('callCountはnext()の呼び出し回数（nextInt/shuffle内部の呼び出しも含む）を正しく数える', () => {
    const rng = createRng('call-count-check')
    expect(rng.callCount()).toBe(0)
    rng.next()
    rng.next()
    expect(rng.callCount()).toBe(2)
    rng.nextInt(0, 10) // 内部でnext()を1回呼ぶ
    expect(rng.callCount()).toBe(3)
    rng.shuffle([1, 2, 3, 4]) // 内部でnext()をn-1回呼ぶ（Fisher-Yates）
    expect(rng.callCount()).toBe(3 + 3)
  })

  it('決定29の前提：cursorから再開すると、続けて呼んだ場合と完全に同じ数列になる', () => {
    const seed = 'resume-check'
    // 通しで20回呼んだ場合
    const continuous = createRng(seed)
    const continuousSeq = Array.from({ length: 20 }, () => continuous.next())

    // 最初の8回を呼んだ後、そのcallCountをcursorとして新しいRngを作り、残り12回を呼ぶ
    const first = createRng(seed)
    const firstPart = Array.from({ length: 8 }, () => first.next())
    const resumed = createRng(seed, first.callCount())
    const secondPart = Array.from({ length: 12 }, () => resumed.next())

    expect([...firstPart, ...secondPart]).toEqual(continuousSeq)
  })

  it('cursor=0はデフォルト（省略時）と同じ結果になる', () => {
    const withDefault = createRng('cursor-default-check')
    const withZero = createRng('cursor-default-check', 0)
    expect(withDefault.next()).toBe(withZero.next())
  })
})

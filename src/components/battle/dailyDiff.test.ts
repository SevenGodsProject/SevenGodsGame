import { describe, expect, it } from 'vitest'
import type { EnemyId, GameStatus, GodId } from '../../core/types'
import { GOD_IDS } from '../../core/data/gods'
import type { DailyDay, DailyRecordResult, DailyResult } from '../../hooks/dailyStorage'
import { describeDailyDiff, formatSignedScaled, type DailyDiffCurrent } from './dailyDiff'

/**
 * Phase 7 P1（決定187・仕様 §9）：神域挑戦の決着 2 行（BEST 軸／前回軸）。
 * スコアは表示前スケール（×10 で表示）。
 */

const r = (score: number, status: GameStatus, round: number, godId: GodId = GOD_IDS.taiyo): DailyResult => ({ godId, score, status, round, at: 0 })

function day(results: DailyResult[], attemptsUsed = results.length): DailyDay {
  const best = results.reduce((m, x) => Math.max(m, x.score), 0)
  return { dateKey: '2026-09-17', enemyId: 'ryujin' as EnemyId, seed: 's', attemptsUsed, results, bestScore: best, bestGodId: null, bestByGod: {} }
}

const cur = (x: DailyResult): DailyDiffCurrent => ({ godId: x.godId, score: x.score, status: x.status, round: x.round })
const rec = (isNewBest: boolean, prevBest: number, attemptsLeft: number): DailyRecordResult => ({ isNewBest, prevBest, attemptsLeft })

describe('describeDailyDiff', () => {
  it('初挑戦で勝利：今日のベスト（1回目）＋残り回数', () => {
    const now = r(925, 'won', 5)
    const d = describeDailyDiff(day([now]), cur(now), rec(true, 0, 2))
    expect(d.best).toEqual({ kind: 'firstBest', text: '今日のベスト 9,250（1回目）' })
    expect(d.previous).toEqual({ kind: 'remaining', text: '残り 2 回' })
  })

  it('既知 bug の回帰：初挑戦で敗北・スコア 0（ベスト未記録）は「同点」と出さない', () => {
    const now = r(0, 'lost', 5)
    const d = describeDailyDiff(day([now]), cur(now), rec(false, 0, 2))
    expect(d.best.kind).toBe('none')
    expect(d.best.text).toBe('今日のベストはまだありません')
    expect(`${d.best.text}${d.previous.text}`).not.toContain('同点')
  })

  it('2 回目もベストが 0 のまま（0 点同士）は「同点」と出さない', () => {
    const a = r(0, 'lost', 4)
    const b = r(0, 'lost', 5)
    const d = describeDailyDiff(day([a, b]), cur(b), rec(false, 0, 1))
    expect(d.best.kind).toBe('none')
    expect(d.previous.text).toBe('前回 0 → 今回 0（±0）')
    expect(`${d.best.text}${d.previous.text}`).not.toContain('同点')
  })

  it('BEST 更新：更新幅と前回差、両方勝利で撃破ラウンドが変わればそれも出す', () => {
    const a = r(897, 'won', 4)
    const b = r(969, 'won', 3)
    const d = describeDailyDiff(day([a, b]), cur(b), rec(true, 897, 1))
    expect(d.best).toEqual({ kind: 'newBest', text: '✨ 今日のベスト更新！ 9,690（+720）' })
    expect(d.previous).toEqual({ kind: 'diff', text: '前回 8,970 → 今回 9,690（+720）・撃破 R4→R3' })
  })

  it('BEST 未更新の敗北：ベストまでの差と、前回との差（マイナス）', () => {
    const a = r(969, 'won', 3)
    const b = r(240, 'lost', 6)
    const d = describeDailyDiff(day([a, b]), cur(b), rec(false, 969, 1))
    expect(d.best).toEqual({ kind: 'gap', text: '今日のベスト 9,690 まであと 7,290 点' })
    expect(d.previous.text).toBe('前回 9,690 → 今回 2,400（−7,290）')
  })

  it('BEST 同点（ベストが 1 点以上あるときだけ「同点」）', () => {
    const a = r(900, 'won', 4)
    const b = r(900, 'won', 4)
    const d = describeDailyDiff(day([a, b]), cur(b), rec(false, 900, 1))
    expect(d.best).toEqual({ kind: 'tie', text: '今日のベスト 9,000 と同点' })
    // 撃破ラウンドが同じなら「R4→R4」は出さない（情報を増やさない）
    expect(d.previous.text).toBe('前回 9,000 → 今回 9,000（±0）')
  })

  it('前回が敗北なら撃破ラウンドの比較は出さない', () => {
    const a = r(300, 'lost', 5)
    const b = r(880, 'won', 5)
    const d = describeDailyDiff(day([a, b]), cur(b), rec(true, 300, 1))
    expect(d.previous.text).toBe('前回 3,000 → 今回 8,800（+5,800）')
  })

  it('残り 0：3 回目の決着でも前回差は出す。前回が無いときは「今日の挑戦は終了」', () => {
    const a = r(900, 'won', 4)
    const b = r(910, 'won', 4)
    const c = r(850, 'won', 5)
    const d = describeDailyDiff(day([a, b, c]), cur(c), rec(false, 910, 0))
    expect(d.best.text).toBe('今日のベスト 9,100 まであと 600 点')
    expect(d.previous.text).toBe('前回 9,100 → 今回 8,500（−600）・撃破 R4→R5')

    // 途中放棄 2 回（結果なし）→ 3 回目が初めての決着
    const only = r(700, 'won', 5)
    const d2 = describeDailyDiff(day([only], 3), cur(only), rec(true, 0, 0))
    expect(d2.best.text).toBe('今日のベスト 7,000（3回目）')
    expect(d2.previous).toEqual({ kind: 'remaining', text: '今日の挑戦は終了' })
  })

  it('前回なし：保存に失敗して今回分が results に無い場合は前回を捏造しない', () => {
    const now = r(500, 'won', 6)
    const d = describeDailyDiff(day([], 1), cur(now), rec(true, 0, 2))
    expect(d.best.kind).toBe('firstBest')
    expect(d.previous.kind).toBe('remaining')
  })

  it('別の神で挑んだ回も「前回」として比較する（同じ盤面の直前の挑戦）', () => {
    const a = r(800, 'won', 5, GOD_IDS.sobi)
    const b = r(850, 'won', 5, GOD_IDS.taiyo)
    const d = describeDailyDiff(day([a, b]), cur(b), rec(true, 800, 1))
    expect(d.previous.text).toBe('前回 8,000 → 今回 8,500（+500）')
  })
})

describe('formatSignedScaled', () => {
  it('正・負・0 の符号', () => {
    expect(formatSignedScaled(72)).toBe('+720')
    expect(formatSignedScaled(-729)).toBe('−7,290')
    expect(formatSignedScaled(0)).toBe('±0')
  })
})

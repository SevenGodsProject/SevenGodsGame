import { describe, expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { GodId } from '../../src/core/types'
import { GOD_IDS } from '../../src/core/data/gods'
import { getRecommendedDeck } from '../../src/core/data/deckBuilder'
import { getFinalScore } from '../../src/core/engine/score'
import { playRecordedDailyRun } from '../../src/core/replay/replayTestUtils'
import { runReplay, toReplayInput } from '../../src/core/replay'

/**
 * Phase 4.5 PSF-2：「提出回数の制限」と「挑戦回数の制限」の差を本番エンジンで測る。
 *
 * 現行仕様（3 submissions）では、seed が公開・決定論なので、同じ日を何度でも遊び
 * 最良の3回だけを提出できる。ここでは同一の Daily 条件で N 回遊んだときの
 * 「最良スコアの期待値」が N とともにどれだけ伸びるかを、実エンジン（`applyAction`）と
 * 本番の記録経路（`applyAndRecord`）で計測する。プレイヤーの腕は固定
 * （疑似乱数方針＝Phase 4.2 の `playRecordedDailyRun`）なので、伸びは**純粋に試行回数の効果**。
 *
 * 出力：scripts/phase45-psf/out/retry_inflation.{json,md}
 */

const DAILY_KEY = '2026-09-09'
const RUNS_PER_GOD = 300
const KS = [1, 3, 10, 30, 100, 300] as const

type GodRow = {
  godId: GodId
  winRate: number
  meanScore: number
  /** k回遊んだときの最良スコアの期待値（ブロック平均） */
  expectedBestOf: Record<number, number>
  /** best-of-3 に対する比 */
  inflationVsBestOf3: Record<number, number>
  maxObserved: number
}

function expectedMaxOfK(scores: number[], k: number): number {
  const blocks = Math.floor(scores.length / k)
  let sum = 0
  for (let b = 0; b < blocks; b++) {
    let m = -Infinity
    for (let i = b * k; i < (b + 1) * k; i++) m = Math.max(m, scores[i])
    sum += m
  }
  return blocks > 0 ? sum / blocks : NaN
}

describe('PSF-2 retry inflation（本番エンジン）', () => {
  it(`同一Dailyを${RUNS_PER_GOD}回遊んだときの best-of-k の伸びを全神で計測する`, () => {
    const rows: GodRow[] = []
    for (const godId of Object.values(GOD_IDS)) {
      const deck = getRecommendedDeck(godId)
      const scores: number[] = []
      let wins = 0
      for (let seed = 1; seed <= RUNS_PER_GOD; seed++) {
        const run = playRecordedDailyRun({ dailyKey: DAILY_KEY, godId, deck, policySeed: seed })
        // 提出物として通ることも確認する（検証器が計算した score を採用）
        const verified = runReplay(toReplayInput(run.log))
        expect(verified.ok, `${godId} seed=${seed} replay`).toBe(true)
        if (!verified.ok) continue
        expect(verified.outcome.score).toBe(getFinalScore(run.state.score, run.state.stake))
        scores.push(verified.outcome.score)
        if (verified.outcome.win) wins++
      }
      const expectedBestOf: Record<number, number> = {}
      const inflationVsBestOf3: Record<number, number> = {}
      for (const k of KS) expectedBestOf[k] = Math.round(expectedMaxOfK(scores, k))
      for (const k of KS) inflationVsBestOf3[k] = Number((expectedBestOf[k] / expectedBestOf[3]).toFixed(3))
      rows.push({
        godId,
        winRate: Number((wins / scores.length).toFixed(3)),
        meanScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        expectedBestOf,
        inflationVsBestOf3,
        maxObserved: Math.max(...scores),
      })
    }

    const outDir = path.resolve(__dirname, 'out')
    mkdirSync(outDir, { recursive: true })
    writeFileSync(
      path.join(outDir, 'retry_inflation.json'),
      JSON.stringify({ dailyKey: DAILY_KEY, runsPerGod: RUNS_PER_GOD, ks: KS, rows }, null, 2),
    )
    const header = `| 神 | 勝率 | 平均 | ${KS.map((k) => `best of ${k}`).join(' | ')} | ×(300/3) |`
    const sep = `|---|---|---|${KS.map(() => '---').join('|')}|---|`
    const body = rows.map(
      (r) =>
        `| ${r.godId} | ${(r.winRate * 100).toFixed(0)}% | ${r.meanScore} | ${KS.map((k) => r.expectedBestOf[k]).join(' | ')} | ${r.inflationVsBestOf3[300]} |`,
    )
    writeFileSync(
      path.join(outDir, 'retry_inflation.md'),
      [
        `# PSF-2 retry inflation（dailyKey=${DAILY_KEY}, ${RUNS_PER_GOD} runs/god, 疑似乱数方針）`,
        '',
        '同じ腕のプレイヤーが同一Dailyを k 回遊んだときの「最良スコアの期待値」。',
        '現行仕様（3 submissions）では k は無制限。提案仕様（3 tickets）では k=3 に固定される。',
        '',
        header,
        sep,
        ...body,
        '',
      ].join('\n'),
    )

    // 監査の主張：試行回数を増やすほど最良スコアは単調に伸びる（＝提出回数制限では公平性が担保されない）
    for (const r of rows) {
      expect(r.expectedBestOf[300]).toBeGreaterThan(r.expectedBestOf[3])
      expect(r.expectedBestOf[30]).toBeGreaterThanOrEqual(r.expectedBestOf[3])
    }
  })
})

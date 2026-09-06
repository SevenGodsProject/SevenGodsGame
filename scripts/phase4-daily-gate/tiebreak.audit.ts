/**
 * D6 — 同点解消の本命候補：**丸める前の素点**を server-side の並び順キーに使う案の検証。
 *
 * 背景：表示スコアは `getFinalScore = Math.round(score.total × finalScale)` で、
 * ここで **丸めによって解像度が捨てられている**。`score.total` は
 * damage（実効ダメージ×1.2）や survival（残HP率×30）を含むため実数値であり、
 * エンジンが既に計算している。したがって
 *   - 表示スコア＝従来どおり（1点も変えない）
 *   - サーバー側の並び順＝丸める前の `score.total`
 * とすれば、**新しいゲーム内スコアを一切増やさずに**同点を解消できる可能性がある。
 *
 * D2 で試した副指標（撃破R・残HP・操作回数）は、いずれも既にスコア式へ織り込み済みの
 * ため同点グループ内でほぼ一定になり、解消率が 1〜12% に留まった。その反省を踏まえた案。
 */
import { describe, expect, it } from 'vitest'
import { RULES } from '../../src/core/data/rules'
import { createRng } from '../../src/core/rng/seededRandom'
import type { GodId, GrowthPath } from '../../src/core/types'
import {
  avg,
  dateKeysFrom,
  deckFor,
  GOD_ORDER,
  GROWTH_PATHS,
  heuristicAgent,
  mdTable,
  PROFILES,
  r1,
  r2,
  runDailyGame,
  searchAgent,
  writeOut,
  type Agent,
  type DailyMetrics,
} from './dailyHarness'

const FIELD_DAYS = dateKeysFrom('2026-09-07', 7)
type LineId = 'h-balanced' | 'h-aggressive' | 'h-defensive' | 's-balanced' | 's-rush' | 's-score' | 's-score-deep'
function agentOf(line: LineId): Agent {
  switch (line) {
    case 'h-balanced': return heuristicAgent('balanced')
    case 'h-aggressive': return heuristicAgent('aggressive')
    case 'h-defensive': return heuristicAgent('defensive')
    case 's-balanced': return searchAgent(PROFILES.balanced, 800)
    case 's-rush': return searchAgent(PROFILES.rush, 800)
    case 's-score': return searchAgent(PROFILES.score, 800)
    case 's-score-deep': return searchAgent(PROFILES.score, 2000)
  }
}
const DECK_KINDS = ['recommended', 'variant1', 'variant2', 'variant3', 'variant4', 'variant5'] as const
const ARCHETYPES = [
  { id: 'casual', weight: 0.40, lines: ['h-balanced'] as LineId[] },
  { id: 'average', weight: 0.35, lines: ['h-balanced', 'h-aggressive', 'h-defensive'] as LineId[] },
  { id: 'advanced', weight: 0.20, lines: ['s-balanced', 's-rush', 's-score'] as LineId[] },
  { id: 'optimal', weight: 0.05, lines: ['s-score', 's-score-deep'] as LineId[] },
]

const cache = new Map<string, DailyMetrics>()
function run(dateKey: string, godId: GodId, deckKind: string, growthPath: GrowthPath, line: LineId): DailyMetrics {
  const key = `${dateKey}|${godId}|${deckKind}|${growthPath}|${line}`
  const hit = cache.get(key)
  if (hit) return hit
  const m = runDailyGame({ dateKey, godId, deck: deckFor(godId, deckKind as 'recommended'), growthPath }, agentOf(line))
  cache.set(key, m)
  return m
}

type P = { display: number; raw: number }

function field(dateKey: string, players: number): P[] {
  const rng = createRng(`field-${dateKey}-${players}`)
  const cum: { a: (typeof ARCHETYPES)[number]; upto: number }[] = []
  let acc = 0
  for (const a of ARCHETYPES) { acc += a.weight; cum.push({ a, upto: acc }) }
  const out: P[] = []
  for (let i = 0; i < players; i++) {
    const godId = GOD_ORDER[rng.nextInt(0, GOD_ORDER.length)]
    const deckKind = DECK_KINDS[rng.nextInt(0, DECK_KINDS.length)]
    const growthPath = GROWTH_PATHS[rng.nextInt(0, GROWTH_PATHS.length)]
    const roll = rng.next()
    const arch = (cum.find((c) => roll <= c.upto) ?? cum[cum.length - 1]).a
    let best: DailyMetrics | null = null
    for (const line of arch.lines.slice(0, RULES.daily.attemptsPerDay)) {
      const m = run(dateKey, godId, deckKind, growthPath, line)
      if (!best || m.finalScore > best.finalScore) best = m
    }
    out.push({ display: best!.finalScore, raw: best!.breakdown.total })
  }
  return out
}

function density(values: number[], frac: number) {
  const sorted = [...values].sort((a, b) => b - a)
  const n = Math.max(1, Math.round(sorted.length * frac))
  const top = sorted.slice(0, n)
  return { perRank: top.length / new Set(top).size, distinct: new Set(top).size }
}

describe('D6 — 丸める前の素点による同点解消', () => {
  it('表示スコアを変えずに順位の解像度がどれだけ上がるか', () => {
    const md: string[] = []
    const report: Record<string, unknown> = {}
    const rows: (string | number)[][] = []

    // まず素点が実数かどうかを確認（整数なら案は成立しない）
    const sample = run(FIELD_DAYS[0], GOD_ORDER[0], 'recommended', 'guardian', 's-score')
    const isFractional = !Number.isInteger(sample.breakdown.total)
    report.rawIsFractional = isFractional
    report.sample = { display: sample.finalScore, raw: sample.breakdown.total }

    for (const players of [300, 1000, 3000]) {
      const dispAll: number[] = []
      const rawAll: number[] = []
      const d1: number[] = []
      const r1s: number[] = []
      const d5: number[] = []
      const r5s: number[] = []
      const d10: number[] = []
      const r10s: number[] = []
      for (const dateKey of FIELD_DAYS) {
        const f = field(dateKey, players)
        const disp = f.map((p) => p.display)
        const raw = f.map((p) => p.raw)
        dispAll.push(new Set(disp).size)
        rawAll.push(new Set(raw).size)
        d1.push(density(disp, 0.01).perRank); r1s.push(density(raw, 0.01).perRank)
        d5.push(density(disp, 0.05).perRank); r5s.push(density(raw, 0.05).perRank)
        d10.push(density(disp, 0.10).perRank); r10s.push(density(raw, 0.10).perRank)
      }
      rows.push([
        players,
        r1(avg(dispAll)), r1(avg(rawAll)),
        `${r2(avg(d1))} → ${r2(avg(r1s))}`,
        `${r2(avg(d5))} → ${r2(avg(r5s))}`,
        `${r2(avg(d10))} → ${r2(avg(r10s))}`,
      ])
      report[`players${players}`] = {
        distinctDisplay: r1(avg(dispAll)),
        distinctRaw: r1(avg(rawAll)),
        top1: { display: r2(avg(d1)), raw: r2(avg(r1s)) },
        top5: { display: r2(avg(d5)), raw: r2(avg(r5s)) },
        top10: { display: r2(avg(d10)), raw: r2(avg(r10s)) },
      }
    }

    md.push('## D6 — 丸める前の素点を並び順キーに使う案')
    md.push('')
    md.push(`素点 \`score.total\` は実数か：**${isFractional ? 'はい' : 'いいえ'}**（例：表示 ${sample.finalScore} ← 素点 ${sample.breakdown.total}）`)
    md.push('')
    md.push('「1順位あたりの人数」を「表示スコアで並べた場合 → 素点で並べた場合」で比較。')
    md.push('')
    md.push(mdTable(
      ['参加人数', 'ユニーク数(表示)', 'ユニーク数(素点)', 'Top1%', 'Top5%', 'Top10%'],
      rows,
    ))
    md.push('')

    writeOut('tiebreak.md', md.join('\n'))
    writeOut('tiebreak.json', report)
    expect(rows.length).toBe(3)
  })
})

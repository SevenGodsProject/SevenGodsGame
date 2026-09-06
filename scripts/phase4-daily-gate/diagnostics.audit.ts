/**
 * Phase 4.0 追補診断 — gate.audit.ts の結果を受けた原因分析と最小修正案の検証。
 *
 * D1  Tie density の参加人数感応度（決定論パズルなので distinct score 数は人数に依らず一定）
 * D2  既存engine由来の二次tie-break候補の比較（新しいゲーム内スコアは増やさない）
 * D3  G1 FAIL の原因分解（寿楽はなぜ届かないか）
 * D4  最小修正案の再simulation（プロセス内でのみデータを差し替え、本番ファイルは変更しない）
 * D5  bonusCopies の優位を「順位」に換算する
 */
import { describe, expect, it } from 'vitest'
import { GODS } from '../../src/core/data/gods'
import { RULES } from '../../src/core/data/rules'
import { createRng } from '../../src/core/rng/seededRandom'
import type { Effect, GodId, GrowthPath } from '../../src/core/types'
import {
  avg,
  dateKeysByEnemy,
  dateKeysFrom,
  deckFor,
  GOD_NAME,
  GOD_ORDER,
  GROWTH_PATHS,
  heuristicAgent,
  mdTable,
  PROFILES,
  r1,
  r2,
  runDailyGame,
  searchAgent,
  spreadPct,
  writeOut,
  type Agent,
  type DailyMetrics,
} from './dailyHarness'

const START_DAY = '2026-09-07'
const MATRIX_DAYS = dateKeysFrom(START_DAY, 168)
const FIELD_DAYS = dateKeysFrom(START_DAY, 21)

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
const MATRIX_LINES: LineId[] = ['h-balanced', 'h-aggressive', 'h-defensive', 's-balanced', 's-rush', 's-score']
const DECK_KINDS = ['recommended', 'variant1', 'variant2', 'variant3', 'variant4', 'variant5'] as const

const cache = new Map<string, DailyMetrics>()
function run(dateKey: string, godId: GodId, deckKind: string, growthPath: GrowthPath, line: LineId, tag = '-'): DailyMetrics {
  const key = `${tag}|${dateKey}|${godId}|${deckKind}|${growthPath}|${line}`
  const hit = cache.get(key)
  if (hit) return hit
  const m = runDailyGame({ dateKey, godId, deck: deckFor(godId, deckKind as 'recommended'), growthPath }, agentOf(line))
  cache.set(key, m)
  return m
}

type Archetype = { id: string; weight: number; lines: LineId[] }
const ARCHETYPES: Archetype[] = [
  { id: 'casual', weight: 0.40, lines: ['h-balanced'] },
  { id: 'average', weight: 0.35, lines: ['h-balanced', 'h-aggressive', 'h-defensive'] },
  { id: 'advanced', weight: 0.20, lines: ['s-balanced', 's-rush', 's-score'] },
  { id: 'optimal', weight: 0.05, lines: ['s-score', 's-score-deep'] },
]

type Player = { godId: GodId; best: number; round: number; hp: number; actions: number; bursts: number }

function buildField(dateKey: string, players: number, tag = '-'): Player[] {
  const rng = createRng(`field-${dateKey}-${players}`)
  const cum: { a: Archetype; upto: number }[] = []
  let acc = 0
  for (const a of ARCHETYPES) { acc += a.weight; cum.push({ a, upto: acc }) }
  const out: Player[] = []
  for (let i = 0; i < players; i++) {
    const godId = GOD_ORDER[rng.nextInt(0, GOD_ORDER.length)]
    const deckKind = DECK_KINDS[rng.nextInt(0, DECK_KINDS.length)]
    const growthPath = GROWTH_PATHS[rng.nextInt(0, GROWTH_PATHS.length)]
    const roll = rng.next()
    const arch = (cum.find((c) => roll <= c.upto) ?? cum[cum.length - 1]).a
    let best: DailyMetrics | null = null
    for (const line of arch.lines.slice(0, RULES.daily.attemptsPerDay)) {
      const m = run(dateKey, godId, deckKind, growthPath, line, tag)
      if (!best || m.finalScore > best.finalScore) best = m
    }
    out.push({ godId, best: best!.finalScore, round: best!.round, hp: best!.playerHp, actions: best!.actions, bursts: best!.bursts })
  }
  return out
}

describe('Phase 4.0 追補診断', () => {
  const report: Record<string, unknown> = {}
  const md: string[] = []

  it('D1 — Tie density の参加人数感応度', () => {
    const sizes = [300, 1000, 3000]
    const rows: (string | number)[][] = []
    const detail: Record<string, unknown> = {}

    for (const size of sizes) {
      const uniqAll: number[] = []
      const perRankTop1: number[] = []
      const perRankTop5: number[] = []
      const perRankTop10: number[] = []
      const distinctTop10: number[] = []
      for (const dateKey of FIELD_DAYS.slice(0, 7)) {
        const field = buildField(dateKey, size, 'd1')
        const sorted = field.map((p) => p.best).sort((a, b) => b - a)
        uniqAll.push(new Set(sorted).size)
        const band = (frac: number) => {
          const n = Math.max(1, Math.round(sorted.length * frac))
          const top = sorted.slice(0, n)
          return { perRank: top.length / new Set(top).size, distinct: new Set(top).size }
        }
        perRankTop1.push(band(0.01).perRank)
        perRankTop5.push(band(0.05).perRank)
        const b10 = band(0.10)
        perRankTop10.push(b10.perRank)
        distinctTop10.push(b10.distinct)
      }
      rows.push([size, r1(avg(uniqAll)), r2(avg(perRankTop1)), r2(avg(perRankTop5)), r2(avg(perRankTop10)), r1(avg(distinctTop10))])
      detail[size] = { distinctScoresAll: r1(avg(uniqAll)), playersPerRankTop1: r2(avg(perRankTop1)), playersPerRankTop5: r2(avg(perRankTop5)), playersPerRankTop10: r2(avg(perRankTop10)) }
    }
    report.d1 = detail
    md.push('## D1 — Tie density は参加人数に比例して悪化する')
    md.push('')
    md.push('Daily は決定論パズルのため、**到達しうるスコアの種類数は参加人数に依存しない**（設定空間で決まる）。')
    md.push('したがって参加者が増えるほど1順位あたりの人数が線形に増える。')
    md.push('')
    md.push(mdTable(
      ['参加人数', '全体のユニークスコア数', 'Top1% 1順位あたり', 'Top5% 1順位あたり', 'Top10% 1順位あたり', 'Top10%のユニーク数'],
      rows,
    ))
    md.push('')
    expect(rows.length).toBe(3)
  })

  it('D2 — 二次tie-break候補の比較（新しいスコアは作らない）', () => {
    // 同点グループを、既存 GameState 由来の副指標だけでどこまで解けるか
    const keys = [
      { id: 'round', label: '撃破ラウンドが早い', get: (p: Player) => -p.round },
      { id: 'hp', label: '残HPが多い', get: (p: Player) => p.hp },
      { id: 'actions', label: '操作回数が少ない', get: (p: Player) => -p.actions },
      { id: 'round+hp', label: '撃破R → 残HP', get: (p: Player) => -p.round * 1000 + p.hp },
    ]
    const resolved: Record<string, number[]> = {}
    let tiedGroupsTotal = 0
    let tiedPlayersTotal = 0

    for (const dateKey of FIELD_DAYS) {
      const field = buildField(dateKey, 1000, 'd2')
      const byScore = new Map<number, Player[]>()
      for (const p of field) byScore.set(p.best, [...(byScore.get(p.best) ?? []), p])
      const groups = [...byScore.values()].filter((g) => g.length > 1)
      tiedGroupsTotal += groups.length
      tiedPlayersTotal += groups.reduce((s, g) => s + g.length, 0)
      for (const k of keys) {
        let solved = 0
        let total = 0
        for (const g of groups) {
          const vals = g.map(k.get)
          total += g.length
          solved += new Set(vals).size === 1 ? 0 : g.length - countMax(vals)
        }
        resolved[k.id] = [...(resolved[k.id] ?? []), total === 0 ? 0 : solved / total]
      }
    }
    function countMax(vals: number[]): number {
      const counts = new Map<number, number>()
      for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1)
      return Math.max(...counts.values())
    }

    report.d2 = {
      tiedGroups: tiedGroupsTotal,
      tiedPlayers: tiedPlayersTotal,
      resolutionRate: Object.fromEntries(keys.map((k) => [k.label, r2(avg(resolved[k.id]))])),
    }
    md.push('## D2 — 二次tie-break候補（既存engine由来・新スコアなし）')
    md.push('')
    md.push('1,000人 × 21日の同点グループに対し、各副指標が「同点をどれだけ解けるか」（解消率）。')
    md.push('')
    md.push(mdTable(
      ['副指標', '同点解消率'],
      keys.map((k) => [k.label, r2(avg(resolved[k.id]))]),
    ))
    md.push('')
    expect(tiedGroupsTotal).toBeGreaterThan(0)
  })

  it('D3 — G1 FAIL の原因分解（寿楽はなぜ届かないか）', () => {
    const rows: (string | number)[][] = []
    const detail: Record<string, unknown> = {}
    for (const godId of GOD_ORDER) {
      const bd = { damage: [] as number[], combo: [] as number[], victory: [] as number[], tempo: [] as number[], survival: [] as number[] }
      const rounds: number[] = []
      const bursts: number[] = []
      for (const dateKey of FIELD_DAYS) {
        let best: DailyMetrics | null = null
        for (const line of MATRIX_LINES) {
          const m = run(dateKey, godId, 'recommended', 'guardian', line, 'd3')
          if (!best || m.finalScore > best.finalScore) best = m
        }
        bd.damage.push(best!.breakdown.damage)
        bd.combo.push(best!.breakdown.combo)
        bd.victory.push(best!.breakdown.victory)
        bd.tempo.push(best!.breakdown.tempo)
        bd.survival.push(best!.breakdown.survival)
        rounds.push(best!.round)
        bursts.push(best!.bursts)
      }
      rows.push([
        GOD_NAME[godId],
        r1(avg(bd.damage)), r1(avg(bd.combo)), r1(avg(bd.victory)), r1(avg(bd.tempo)), r1(avg(bd.survival)),
        r2(avg(rounds)), r2(avg(bursts)),
      ])
      detail[GOD_NAME[godId]] = {
        damage: r1(avg(bd.damage)), combo: r1(avg(bd.combo)), tempo: r1(avg(bd.tempo)),
        survival: r1(avg(bd.survival)), winRound: r2(avg(rounds)), bursts: r2(avg(bursts)),
      }
    }
    report.d3 = detail
    md.push('## D3 — スコア内訳の神別分解（最良打ち筋・推奨デッキ・21日平均）')
    md.push('')
    md.push(mdTable(
      ['神', 'damage', 'combo', 'victory', 'tempo(早期撃破)', 'survival', '撃破R', 'BURST回数'],
      rows,
    ))
    md.push('')
    expect(rows.length).toBe(7)
  })

  it('D4 — 最小修正案の再simulation（プロセス内のみでデータ差し替え）', () => {
    const juraku = GODS.find((g) => GOD_NAME[g.id] === '寿楽')!
    const original = juraku.resonanceEffects.map((e) => ({ ...e })) as Effect[]

    /** 候補：寿楽のBURSTを「封じる」だけでなく「削る」方向へ寄せる（rules外のデータ調整） */
    const CANDIDATES: { id: string; label: string; effects: Effect[] }[] = [
      { id: 'J0', label: '現行（damage 23 + atk-6/3R）', effects: original },
      { id: 'J1', label: 'damage 23→27（debuff据置）', effects: [{ kind: 'damage', target: 'enemy', amount: 27 }, original[1]] as Effect[] },
      { id: 'J2', label: 'damage 23→30（debuff据置）', effects: [{ kind: 'damage', target: 'enemy', amount: 30 }, original[1]] as Effect[] },
      { id: 'J3', label: 'damage 23→33（debuff据置）', effects: [{ kind: 'damage', target: 'enemy', amount: 33 }, original[1]] as Effect[] },
    ]

    const byEnemy = dateKeysByEnemy(MATRIX_DAYS)
    const results: Record<string, unknown> = {}
    const rows: (string | number)[][] = []

    for (const cand of CANDIDATES) {
      ;(juraku as { resonanceEffects: Effect[] }).resonanceEffects = cand.effects
      cache.clear()

      const bestByGod = new Map<GodId, number[]>()
      const spreadsPerEnemy: number[] = []
      for (const [, days] of byEnemy) {
        const meansThisEnemy: number[] = []
        for (const godId of GOD_ORDER) {
          const scores: number[] = []
          for (const dateKey of days.slice(0, 8)) {
            let best = -1
            for (const line of MATRIX_LINES) {
              const m = run(dateKey, godId, 'recommended', 'guardian', line, cand.id)
              if (m.finalScore > best) best = m.finalScore
            }
            scores.push(best)
          }
          const mean = avg(scores)
          meansThisEnemy.push(mean)
          bestByGod.set(godId, [...(bestByGod.get(godId) ?? []), ...scores])
        }
        spreadsPerEnemy.push(spreadPct(meansThisEnemy))
      }
      const overall = GOD_ORDER.map((g) => avg(bestByGod.get(g)!))
      const g1 = spreadPct(overall)
      const worst = Math.max(...spreadsPerEnemy)
      const jurakuMean = avg(bestByGod.get(juraku.id as GodId)!)
      results[cand.id] = {
        label: cand.label,
        overallSpreadPct: r2(g1),
        worstEnemySpreadPct: r2(worst),
        jurakuMean: Math.round(jurakuMean),
        byGod: Object.fromEntries(GOD_ORDER.map((g, i) => [GOD_NAME[g], Math.round(overall[i])])),
        g1Pass: g1 <= 5,
      }
      rows.push([cand.id, cand.label, Math.round(jurakuMean), r2(g1), r2(worst), g1 <= 5 ? 'PASS' : 'FAIL'])
    }

    // 必ず元へ戻す（本番データを汚さない）
    ;(juraku as { resonanceEffects: Effect[] }).resonanceEffects = original
    cache.clear()
    expect(juraku.resonanceEffects).toEqual(original)

    report.d4 = results
    md.push('## D4 — 最小修正案（寿楽BURST）の再simulation')
    md.push('')
    md.push('敵ごと8シード（計56日ぶん）での再測定。本番データはプロセス内で一時差し替えし、終了時に復元している。')
    md.push('')
    md.push(mdTable(['案', '内容', '寿楽 best平均', 'G1 全体spread%', 'G1b 最悪敵spread%', '判定'], rows))
    md.push('')
  })

  it('D5 — bonusCopies の優位を順位に換算する', () => {
    const gains = [0.5, 1.0, 1.22, 2.0, 2.54]
    const rows: (string | number)[][] = []
    for (const gainPct of gains) {
      const shifts: number[] = []
      for (const dateKey of FIELD_DAYS) {
        const field = buildField(dateKey, 1000, 'd5')
        const sorted = [...field].sort((a, b) => b.best - a.best)
        // 上位帯（Top 10%）にいるプレイヤーが gainPct% のブーストを得たとき何位上がるか
        const n = Math.round(sorted.length * 0.1)
        for (let i = 0; i < n; i += 5) {
          const boosted = sorted[i].best * (1 + gainPct / 100)
          const newRank = sorted.filter((p) => p.best > boosted).length + 1
          shifts.push(i + 1 - newRank)
        }
      }
      rows.push([`+${gainPct}%`, r1(avg(shifts)), Math.max(...shifts)])
    }
    report.d5 = { rows }
    md.push('## D5 — bonusCopies の優位は「順位」でどれだけの差か')
    md.push('')
    md.push('1,000人規模の場で、上位10%のプレイヤーがスコアを x% 押し上げたときに上がる順位数。')
    md.push('')
    md.push(mdTable(['スコア優位', '平均で上がる順位', '最大'], rows))
    md.push('')
  })

  it('出力', () => {
    writeOut('diagnostics.json', report)
    writeOut('diagnostics.md', md.join('\n'))
    expect(md.length).toBeGreaterThan(5)
  })
})

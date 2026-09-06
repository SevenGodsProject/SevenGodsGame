/**
 * Phase 4.0 Daily Ranking Competitive Gate — 本体シミュレーション
 *
 * Step 3  Simulation Matrix     7神 × 7敵 × 実Dailyシード × 複数戦略
 * Step 4  Primary Gates         G1（神間 best-score spread）／G2（神別 win rate、Wilson 95%CI付き）
 * Step 5  Tie Density Gate      上位帯の同点密度（本命リスク）
 * Step 6  God Dominance         上位帯の神構成比
 * Step 7  Three Attempts        1日3runのみのプレイヤー場をモンテカルロで再現
 * Step 8  bonusCopies Impact    現行Daily（報酬編成ボーナス有）vs 公平版（無）の paired 比較
 *
 * 出力は out/ 配下。監査報告は docs/PHASE4_DAILY_RANKING_COMPETITIVE_GATE.md。
 */
import { describe, expect, it } from 'vitest'
import { dailyBossFor } from '../../src/core/data/dailyBoss'
import { getCardDef } from '../../src/core/data/cards'
import { getCardPoolForGod, getRecommendedDeck, validateDeck } from '../../src/core/data/deckBuilder'
import { RULES } from '../../src/core/data/rules'
import { createRng } from '../../src/core/rng/seededRandom'
import type { CardDefId, EnemyId, GodId, GrowthPath } from '../../src/core/types'
import {
  avg,
  dateKeysByEnemy,
  dateKeysFrom,
  deckFor,
  ENEMY_NAME,
  GOD_NAME,
  GOD_ORDER,
  GROWTH_PATHS,
  heuristicAgent,
  mdTable,
  median,
  PROFILES,
  quantile,
  r1,
  r2,
  runDailyGame,
  searchAgent,
  spreadPct,
  wilson95,
  writeOut,
  type Agent,
  type DailyMetrics,
} from './dailyHarness'

// ---------------------------------------------------------------------------
// 実行規模
// ---------------------------------------------------------------------------
const START_DAY = '2026-09-07' // 月曜。週境界と揃える
const MATRIX_WEEKS = 24 // 168日 ＝ 敵ごとに実Dailyシード24本
const FIELD_WEEKS = 3 //  21日 ＝ 7敵 × 3seed でプレイヤー場を作る
const FIELD_PLAYERS = 300 // 1日あたりの想定参加者

const MATRIX_DAYS = dateKeysFrom(START_DAY, MATRIX_WEEKS * 7)
const FIELD_DAYS = dateKeysFrom(START_DAY, FIELD_WEEKS * 7)

// ---------------------------------------------------------------------------
// エージェント一覧（プレイヤーの「打ち筋」）
// ---------------------------------------------------------------------------
type LineId =
  | 'h-balanced' | 'h-aggressive' | 'h-defensive'
  | 's-balanced' | 's-rush' | 's-score' | 's-score-deep'

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

// ---------------------------------------------------------------------------
// メモ化（決定論エンジンなので同一設定は同一結果。tie density の実体でもある）
// ---------------------------------------------------------------------------
type Cfg = {
  dateKey: string
  godId: GodId
  deckKind: string
  growthPath: GrowthPath
  line: LineId
  bonusKey?: string
  bonusCopies?: Partial<Record<CardDefId, number>>
  deck?: CardDefId[]
}
const runCache = new Map<string, DailyMetrics>()
let engineRuns = 0
function run(cfg: Cfg): DailyMetrics {
  const key = `${cfg.dateKey}|${cfg.godId}|${cfg.deckKind}|${cfg.growthPath}|${cfg.line}|${cfg.bonusKey ?? '-'}`
  const hit = runCache.get(key)
  if (hit) return hit
  const m = runDailyGame(
    {
      dateKey: cfg.dateKey,
      godId: cfg.godId,
      deck: cfg.deck ?? deckFor(cfg.godId, cfg.deckKind as 'recommended'),
      growthPath: cfg.growthPath,
      ...(cfg.bonusCopies ? { bonusCopies: cfg.bonusCopies } : {}),
    },
    agentOf(cfg.line),
  )
  engineRuns++
  runCache.set(key, m)
  return m
}

// ---------------------------------------------------------------------------
// Step 8 用：報酬編成ボーナスを持つ「熟練プレイヤー」のモデル
// ---------------------------------------------------------------------------
const cardDmg = (id: CardDefId) =>
  getCardDef(id).effects.reduce((s, e) => s + (e.kind === 'damage' && e.target === 'enemy' ? e.amount : 0), 0)

/** その神のプール内で「3枚積みたくなる」上位K枚に +1 の編成上限を与える */
function veteranBonus(godId: GodId, k: number): Partial<Record<CardDefId, number>> {
  const pool = getCardPoolForGod(godId).map((c) => c.id)
  const ranked = [...pool].sort((a, b) => cardDmg(b) / getCardDef(b).cost - cardDmg(a) / getCardDef(a).cost)
  const out: Partial<Record<CardDefId, number>> = {}
  for (const id of ranked.slice(0, k)) out[id] = 1
  return out
}

/** ボーナスを実際に使い切るデッキ（上位K枚を3枚ずつ入れ、残りを推奨デッキで埋める） */
function veteranDeck(godId: GodId, bonus: Partial<Record<CardDefId, number>>): CardDefId[] {
  const deck: CardDefId[] = []
  for (const [id, extra] of Object.entries(bonus) as [CardDefId, number][]) {
    for (let i = 0; i < RULES.deckBuilding.maxCopiesPerCard + extra; i++) deck.push(id)
  }
  const counts = new Map<CardDefId, number>()
  for (const id of deck) counts.set(id, (counts.get(id) ?? 0) + 1)
  for (const id of getRecommendedDeck(godId)) {
    if (deck.length >= RULES.deck.size) break
    const max = RULES.deckBuilding.maxCopiesPerCard + (bonus[id] ?? 0)
    const cur = counts.get(id) ?? 0
    if (cur < max) {
      deck.push(id)
      counts.set(id, cur + 1)
    }
  }
  // まだ埋まらなければプールから補充
  for (const c of getCardPoolForGod(godId)) {
    while (deck.length < RULES.deck.size) {
      const max = RULES.deckBuilding.maxCopiesPerCard + (bonus[c.id] ?? 0)
      const cur = counts.get(c.id) ?? 0
      if (cur >= max) break
      deck.push(c.id)
      counts.set(c.id, cur + 1)
    }
    if (deck.length >= RULES.deck.size) break
  }
  return deck.slice(0, RULES.deck.size)
}

// ---------------------------------------------------------------------------
// プレイヤー場（Step 5・6・7）
// ---------------------------------------------------------------------------
const DECK_KINDS = ['recommended', 'variant1', 'variant2', 'variant3', 'variant4', 'variant5'] as const

/**
 * 技量アーキタイプ＝「3回の挑戦で試す打ち筋の列」。
 * Daily は決定論なので**挑戦を重ねても引き直しは起きない**。3回は「同じ問題を学習して
 * 詰める」機会であり、モデルもそれに合わせて「別の打ち筋を試して最良を採る」形にする。
 */
type Archetype = { id: string; label: string; weight: number; lines: LineId[] }
const ARCHETYPES: Archetype[] = [
  { id: 'casual', label: '初級（同じ打ち筋を繰り返す）', weight: 0.40, lines: ['h-balanced'] },
  { id: 'average', label: '平均（3回で打ち筋を変える）', weight: 0.35, lines: ['h-balanced', 'h-aggressive', 'h-defensive'] },
  { id: 'advanced', label: '上級（先読みして詰める）', weight: 0.20, lines: ['s-balanced', 's-rush', 's-score'] },
  { id: 'optimal', label: '最適寄り（スコア最大化を探索）', weight: 0.05, lines: ['s-score', 's-score-deep'] },
]

type PlayerResult = {
  godId: GodId
  archetype: string
  best: number
  attempts: number
  won: boolean
}

function buildField(dateKey: string): PlayerResult[] {
  const rng = createRng(`field-${dateKey}`)
  const cum: { a: Archetype; upto: number }[] = []
  let acc = 0
  for (const a of ARCHETYPES) { acc += a.weight; cum.push({ a, upto: acc }) }

  const out: PlayerResult[] = []
  for (let i = 0; i < FIELD_PLAYERS; i++) {
    const godId = GOD_ORDER[rng.nextInt(0, GOD_ORDER.length)]
    const deckKind = DECK_KINDS[rng.nextInt(0, DECK_KINDS.length)]
    const growthPath = GROWTH_PATHS[rng.nextInt(0, GROWTH_PATHS.length)]
    const roll = rng.next()
    const arch = (cum.find((c) => roll <= c.upto) ?? cum[cum.length - 1]).a
    const lines = arch.lines.slice(0, RULES.daily.attemptsPerDay)
    let best = -1
    let won = false
    for (const line of lines) {
      const m = run({ dateKey, godId, deckKind, growthPath, line })
      if (m.finalScore > best) best = m.finalScore
      if (m.status === 'won') won = true
    }
    out.push({ godId, archetype: arch.id, best, attempts: lines.length, won })
  }
  return out
}

// ---------------------------------------------------------------------------
// 同点密度
// ---------------------------------------------------------------------------
function tieStats(scores: number[], topFrac: number) {
  const sorted = [...scores].sort((a, b) => b - a)
  const n = Math.max(1, Math.round(sorted.length * topFrac))
  const top = sorted.slice(0, n)
  const counts = new Map<number, number>()
  for (const s of top) counts.set(s, (counts.get(s) ?? 0) + 1)
  const uniqueRatio = counts.size / top.length
  const tiedPlayers = [...counts.values()].filter((v) => v > 1).reduce((a, b) => a + b, 0)
  const avgPerRank = top.length / counts.size
  // 1点差以内（内部値。表示は×10なので表示上は10点差以内）
  let within1 = 0
  for (let i = 1; i < top.length; i++) if (Math.abs(top[i] - top[i - 1]) <= 1) within1++
  return {
    n: top.length,
    uniqueScores: counts.size,
    uniqueRatio: r2(uniqueRatio),
    tiedShare: r2(tiedPlayers / top.length),
    avgPlayersPerRank: r2(avgPerRank),
    within1ptShare: r2(top.length > 1 ? within1 / (top.length - 1) : 0),
    maxTie: Math.max(...counts.values()),
  }
}

function godShare(players: PlayerResult[], topFrac: number) {
  const sorted = [...players].sort((a, b) => b.best - a.best)
  const n = Math.max(1, Math.round(sorted.length * topFrac))
  const top = sorted.slice(0, n)
  const counts = new Map<GodId, number>()
  for (const p of top) counts.set(p.godId, (counts.get(p.godId) ?? 0) + 1)
  const shares: Record<string, number> = {}
  for (const g of GOD_ORDER) shares[GOD_NAME[g]] = r2((counts.get(g) ?? 0) / top.length)
  const topGod = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return { n, shares, topGod: topGod ? GOD_NAME[topGod[0]] : '—', topGodShare: topGod ? r2(topGod[1] / top.length) : 0 }
}

// ===========================================================================
describe('Phase 4.0 Daily Ranking Competitive Gate', () => {
  const report: Record<string, unknown> = {}
  const md: string[] = []

  it('Step 3 — Simulation Matrix（7神 × 7敵 × 実Dailyシード × 6打ち筋）', () => {
    const byEnemy = dateKeysByEnemy(MATRIX_DAYS)
    const t0 = Date.now()

    // cell[enemy][god] = { scores(各日の最良), wins, n, byLine }
    type Cell = { best: number[]; wins: number; n: number; rounds: number[]; bursts: number[]; allScores: number[] }
    const cells = new Map<string, Cell>()
    const key = (e: EnemyId, g: GodId) => `${e}|${g}`

    for (const [enemyId, days] of byEnemy) {
      for (const godId of GOD_ORDER) {
        const cell: Cell = { best: [], wins: 0, n: 0, rounds: [], bursts: [], allScores: [] }
        for (const dateKey of days) {
          let dayBest = -1
          let dayWon = false
          let bestRound = 0
          let bestBursts = 0
          for (const line of MATRIX_LINES) {
            const m = run({ dateKey, godId, deckKind: 'recommended', growthPath: 'guardian', line })
            cell.allScores.push(m.finalScore)
            if (m.status === 'won') dayWon = true
            if (m.finalScore > dayBest) {
              dayBest = m.finalScore
              bestRound = m.round
              bestBursts = m.bursts
            }
          }
          cell.best.push(dayBest)
          cell.rounds.push(bestRound)
          cell.bursts.push(bestBursts)
          cell.n++
          if (dayWon) cell.wins++
        }
        cells.set(key(enemyId, godId), cell)
      }
    }

    // ---- 集計 ----
    const perEnemy: Record<string, unknown> = {}
    const g1rows: (string | number)[][] = []
    const g2rows: (string | number)[][] = []
    const spreads: number[] = []
    const godWins = new Map<GodId, { w: number; n: number }>()
    const godBest = new Map<GodId, number[]>()

    for (const [enemyId, days] of byEnemy) {
      const bestByGod = GOD_ORDER.map((g) => {
        const c = cells.get(key(enemyId, g))!
        return { g, mean: avg(c.best), max: Math.max(...c.best), wr: c.wins / c.n, n: c.n }
      })
      const spread = spreadPct(bestByGod.map((b) => b.mean))
      spreads.push(spread)
      const top = [...bestByGod].sort((a, b) => b.mean - a.mean)[0]
      const bot = [...bestByGod].sort((a, b) => a.mean - b.mean)[0]

      perEnemy[ENEMY_NAME[enemyId]] = {
        seeds: days.length,
        spreadPct: r2(spread),
        bestGod: GOD_NAME[top.g],
        bestGodScore: Math.round(top.mean),
        worstGod: GOD_NAME[bot.g],
        worstGodScore: Math.round(bot.mean),
        byGod: Object.fromEntries(bestByGod.map((b) => [GOD_NAME[b.g], Math.round(b.mean)])),
        winRateByGod: Object.fromEntries(bestByGod.map((b) => [GOD_NAME[b.g], r1(b.wr * 100)])),
      }
      g1rows.push([
        ENEMY_NAME[enemyId],
        days.length,
        ...bestByGod.map((b) => Math.round(b.mean)),
        r2(spread),
        GOD_NAME[top.g],
      ])
      for (const b of bestByGod) {
        const c = cells.get(key(enemyId, b.g))!
        const gw = godWins.get(b.g) ?? { w: 0, n: 0 }
        gw.w += c.wins
        gw.n += c.n
        godWins.set(b.g, gw)
        godBest.set(b.g, [...(godBest.get(b.g) ?? []), ...c.best])
      }
    }

    for (const g of GOD_ORDER) {
      const gw = godWins.get(g)!
      const ci = wilson95(gw.w, gw.n)
      const bests = godBest.get(g)!
      const sorted = [...bests].sort((a, b) => a - b)
      g2rows.push([
        GOD_NAME[g],
        gw.n,
        r1((gw.w / gw.n) * 100),
        `${r1(ci.lo * 100)}–${r1(ci.hi * 100)}`,
        Math.round(avg(bests)),
        Math.round(median(bests)),
        Math.round(quantile(sorted, 0.9)),
        Math.round(quantile(sorted, 0.95)),
        Math.max(...bests),
      ])
    }

    const overallBestByGod = GOD_ORDER.map((g) => avg(godBest.get(g)!))
    const g1Overall = spreadPct(overallBestByGod)
    const g1WorstEnemy = Math.max(...spreads)
    const minWr = Math.min(...GOD_ORDER.map((g) => godWins.get(g)!.w / godWins.get(g)!.n))
    const minWrCi = (() => {
      let worst = { g: GOD_ORDER[0], lo: 1 }
      for (const g of GOD_ORDER) {
        const gw = godWins.get(g)!
        const ci = wilson95(gw.w, gw.n)
        if (ci.lo < worst.lo) worst = { g, lo: ci.lo }
      }
      return worst
    })()

    report.step3 = { days: MATRIX_DAYS.length, seedsPerEnemy: MATRIX_DAYS.length / 7, lines: MATRIX_LINES, perEnemy }
    report.g1 = {
      overallSpreadPct: r2(g1Overall),
      worstEnemySpreadPct: r2(g1WorstEnemy),
      perEnemySpreadPct: Object.fromEntries(
        [...byEnemy.keys()].map((e, i) => [ENEMY_NAME[e], r2(spreads[i])]),
      ),
      target: 5,
      passOverall: g1Overall <= 5,
      passAllEnemies: g1WorstEnemy <= 5,
    }
    report.g2 = {
      minWinRatePct: r1(minWr * 100),
      worstGod: GOD_NAME[minWrCi.g],
      worstGodCiLoPct: r1(minWrCi.lo * 100),
      target: 90,
      pass: minWrCi.lo >= 0.9,
      perGod: Object.fromEntries(GOD_ORDER.map((g) => {
        const gw = godWins.get(g)!
        return [GOD_NAME[g], { n: gw.n, winRate: r1((gw.w / gw.n) * 100), ci95: wilson95(gw.w, gw.n) }]
      })),
    }

    md.push('## Step 3 — Simulation Matrix')
    md.push('')
    md.push(`- 日数 **${MATRIX_DAYS.length}日**（${MATRIX_WEEKS}週）＝ 敵ごとに実Dailyシード **${MATRIX_DAYS.length / 7}本**`)
    md.push(`- 打ち筋 **${MATRIX_LINES.length}種**（heuristic 3 + 探索AI 3）／デッキは推奨デッキ固定／bonusCopies 無効`)
    md.push(`- エンジン実行 **${engineRuns.toLocaleString()}試合**（所要 ${((Date.now() - t0) / 1000).toFixed(1)}s）`)
    md.push('')
    md.push('### 敵別 × 神別 best score（各日の6打ち筋の最良を、その敵の全シードで平均）')
    md.push('')
    md.push(mdTable(
      ['敵', 'seed数', ...GOD_ORDER.map((g) => GOD_NAME[g]), 'spread%', '最良神'],
      g1rows,
    ))
    md.push('')
    md.push('### 神別サマリ（全敵・全シード）')
    md.push('')
    md.push(mdTable(
      ['神', 'n', '勝率%', '95%CI', 'best平均', 'best中央', 'P90', 'P95', 'max'],
      g2rows,
    ))
    md.push('')

    expect(cells.size).toBe(49)
  })

  it('Step 4 — Primary Gates（G1 / G2）', () => {
    const g1 = report.g1 as { overallSpreadPct: number; worstEnemySpreadPct: number; passOverall: boolean; passAllEnemies: boolean }
    const g2 = report.g2 as { minWinRatePct: number; worstGod: string; worstGodCiLoPct: number; pass: boolean }

    md.push('## Step 4 — Primary Gates')
    md.push('')
    md.push(mdTable(
      ['ゲート', '基準', '実測', '判定'],
      [
        ['G1 全敵込みの神間 best-score spread', '≤ 5%', `${g1.overallSpreadPct}%`, g1.passOverall ? 'PASS' : 'FAIL'],
        ['G1b 敵ごとに見た最悪 spread', '≤ 5%', `${g1.worstEnemySpreadPct}%`, g1.passAllEnemies ? 'PASS' : 'FAIL'],
        ['G2 最小勝率（Wilson 95%CI 下限）', '≥ 90%', `${g2.minWinRatePct}%（下限 ${g2.worstGodCiLoPct}%・${g2.worstGod}）`, g2.pass ? 'PASS' : 'FAIL'],
      ],
    ))
    md.push('')
    expect(typeof g1.overallSpreadPct).toBe('number')
  })

  it('Step 5/6/7 — Tie Density・God Dominance・Three Attempts', () => {
    const t0 = Date.now()
    const perDay: Record<string, unknown> = {}
    const tie1: ReturnType<typeof tieStats>[] = []
    const tie5: ReturnType<typeof tieStats>[] = []
    const tie10: ReturnType<typeof tieStats>[] = []
    const tieAll: ReturnType<typeof tieStats>[] = []
    const share1: ReturnType<typeof godShare>[] = []
    const share5: ReturnType<typeof godShare>[] = []
    const share10: ReturnType<typeof godShare>[] = []
    const archRank: Record<string, number[]> = {}
    const attemptGain: number[] = []

    for (const dateKey of FIELD_DAYS) {
      const field = buildField(dateKey)
      const scores = field.map((p) => p.best)
      const t1 = tieStats(scores, 0.01)
      const t5 = tieStats(scores, 0.05)
      const t10 = tieStats(scores, 0.10)
      const tA = tieStats(scores, 1)
      tie1.push(t1); tie5.push(t5); tie10.push(t10); tieAll.push(tA)
      const s1 = godShare(field, 0.01)
      const s5 = godShare(field, 0.05)
      const s10 = godShare(field, 0.10)
      share1.push(s1); share5.push(s5); share10.push(s10)

      // 技量アーキタイプ別の順位（パーセンタイル）
      const sorted = [...field].sort((a, b) => b.best - a.best)
      sorted.forEach((p, i) => {
        const pctile = (i + 1) / sorted.length
        archRank[p.archetype] = [...(archRank[p.archetype] ?? []), pctile]
      })

      perDay[dateKey] = {
        enemy: ENEMY_NAME[dailyBossFor(dateKey).enemyId],
        players: field.length,
        uniqueScoresAll: tA.uniqueScores,
        top1: t1, top5: t5, top10: t10,
        godShareTop10: s10.shares,
      }
    }

    // 3回の挑戦がどれだけスコアを伸ばすか（＝運ではなく学習であることの確認）
    for (const dateKey of FIELD_DAYS) {
      for (const godId of GOD_ORDER) {
        const first = run({ dateKey, godId, deckKind: 'recommended', growthPath: 'guardian', line: 'h-balanced' })
        const bestOf3 = Math.max(
          first.finalScore,
          run({ dateKey, godId, deckKind: 'recommended', growthPath: 'guardian', line: 'h-aggressive' }).finalScore,
          run({ dateKey, godId, deckKind: 'recommended', growthPath: 'guardian', line: 'h-defensive' }).finalScore,
        )
        attemptGain.push(first.finalScore === 0 ? 0 : ((bestOf3 - first.finalScore) / first.finalScore) * 100)
      }
    }

    const meanOf = (rows: ReturnType<typeof tieStats>[], k: keyof ReturnType<typeof tieStats>) =>
      r2(avg(rows.map((r) => r[k] as number)))

    report.step5 = {
      players: FIELD_PLAYERS,
      days: FIELD_DAYS.length,
      top1: { uniqueRatio: meanOf(tie1, 'uniqueRatio'), tiedShare: meanOf(tie1, 'tiedShare'), avgPlayersPerRank: meanOf(tie1, 'avgPlayersPerRank'), within1pt: meanOf(tie1, 'within1ptShare'), maxTie: Math.max(...tie1.map((t) => t.maxTie)) },
      top5: { uniqueRatio: meanOf(tie5, 'uniqueRatio'), tiedShare: meanOf(tie5, 'tiedShare'), avgPlayersPerRank: meanOf(tie5, 'avgPlayersPerRank'), within1pt: meanOf(tie5, 'within1ptShare'), maxTie: Math.max(...tie5.map((t) => t.maxTie)) },
      top10: { uniqueRatio: meanOf(tie10, 'uniqueRatio'), tiedShare: meanOf(tie10, 'tiedShare'), avgPlayersPerRank: meanOf(tie10, 'avgPlayersPerRank'), within1pt: meanOf(tie10, 'within1ptShare'), maxTie: Math.max(...tie10.map((t) => t.maxTie)) },
      all: { uniqueRatio: meanOf(tieAll, 'uniqueRatio'), tiedShare: meanOf(tieAll, 'tiedShare'), avgPlayersPerRank: meanOf(tieAll, 'avgPlayersPerRank') },
    }
    report.step6 = {
      top1: { avgTopGodShare: r2(avg(share1.map((s) => s.topGodShare))), maxTopGodShare: r2(Math.max(...share1.map((s) => s.topGodShare))) },
      top5: { avgTopGodShare: r2(avg(share5.map((s) => s.topGodShare))), maxTopGodShare: r2(Math.max(...share5.map((s) => s.topGodShare))) },
      top10: { avgTopGodShare: r2(avg(share10.map((s) => s.topGodShare))), maxTopGodShare: r2(Math.max(...share10.map((s) => s.topGodShare))) },
      perGodTop10: Object.fromEntries(GOD_ORDER.map((g) => [GOD_NAME[g], r2(avg(share10.map((s) => s.shares[GOD_NAME[g]])))])),
    }
    report.step7 = {
      archetypeMeanPercentile: Object.fromEntries(
        ARCHETYPES.map((a) => [a.label, r2(avg(archRank[a.id] ?? [0]))]),
      ),
      attemptGainPct: { mean: r2(avg(attemptGain)), max: r2(Math.max(...attemptGain)) },
      note: 'Dailyは決定論のため、同じ打ち筋を繰り返す限り3回挑戦しても結果は1回目と完全に同一（parity.audit.ts で実証）',
    }
    report.step5PerDay = perDay

    const s5 = report.step5 as Record<string, { uniqueRatio: number; tiedShare: number; avgPlayersPerRank: number; within1pt?: number; maxTie?: number }>
    md.push('## Step 5 — Tie Density')
    md.push('')
    md.push(`プレイヤー場：**1日 ${FIELD_PLAYERS}人 × ${FIELD_DAYS.length}日**（神・デッキ・OTOMO路線・技量を分布から抽選し、各自が1日3回だけ挑戦した best を採用）`)
    md.push('')
    md.push(mdTable(
      ['帯', 'ユニークスコア率', '同点者の割合', '1順位あたり平均人数', '隣接1点差以内', '最大同点人数'],
      [
        ['Top 1%', s5.top1.uniqueRatio, s5.top1.tiedShare, s5.top1.avgPlayersPerRank, s5.top1.within1pt ?? '—', s5.top1.maxTie ?? '—'],
        ['Top 5%', s5.top5.uniqueRatio, s5.top5.tiedShare, s5.top5.avgPlayersPerRank, s5.top5.within1pt ?? '—', s5.top5.maxTie ?? '—'],
        ['Top 10%', s5.top10.uniqueRatio, s5.top10.tiedShare, s5.top10.avgPlayersPerRank, s5.top10.within1pt ?? '—', s5.top10.maxTie ?? '—'],
        ['全体', s5.all.uniqueRatio, s5.all.tiedShare, s5.all.avgPlayersPerRank, '—', '—'],
      ],
    ))
    md.push('')
    const s6 = report.step6 as { top1: { avgTopGodShare: number; maxTopGodShare: number }; top5: { avgTopGodShare: number; maxTopGodShare: number }; top10: { avgTopGodShare: number; maxTopGodShare: number }; perGodTop10: Record<string, number> }
    md.push('## Step 6 — God Dominance')
    md.push('')
    md.push(mdTable(
      ['帯', '最多神の平均構成比', '最悪日の構成比'],
      [
        ['Top 1%', s6.top1.avgTopGodShare, s6.top1.maxTopGodShare],
        ['Top 5%', s6.top5.avgTopGodShare, s6.top5.maxTopGodShare],
        ['Top 10%', s6.top10.avgTopGodShare, s6.top10.maxTopGodShare],
      ],
    ))
    md.push('')
    md.push('Top 10% の神別平均構成比（均等なら 0.14）')
    md.push('')
    md.push(mdTable(GOD_ORDER.map((g) => GOD_NAME[g]), [GOD_ORDER.map((g) => s6.perGodTop10[GOD_NAME[g]])]))
    md.push('')
    const s7 = report.step7 as { archetypeMeanPercentile: Record<string, number>; attemptGainPct: { mean: number; max: number } }
    md.push('## Step 7 — Three Attempts Reality')
    md.push('')
    md.push(mdTable(
      ['技量アーキタイプ', '平均到達パーセンタイル（0に近いほど上位）'],
      Object.entries(s7.archetypeMeanPercentile),
    ))
    md.push('')
    md.push(`3回で打ち筋を変えた場合のスコア改善：平均 **+${s7.attemptGainPct.mean}%**（最大 +${s7.attemptGainPct.max}%）`)
    md.push('')
    md.push(`（所要 ${((Date.now() - t0) / 1000).toFixed(1)}s／累計エンジン実行 ${engineRuns.toLocaleString()}試合）`)
    md.push('')

    expect(Object.keys(perDay).length).toBe(FIELD_DAYS.length)
  })

  it('Step 8 — bonusCopies Impact（paired 比較）', () => {
    const rows: (string | number)[][] = []
    const diffs: number[] = []
    const diffPcts: number[] = []
    const perGod: Record<string, unknown> = {}

    for (const godId of GOD_ORDER) {
      const bonus3 = veteranBonus(godId, 3)
      const bonus6 = veteranBonus(godId, 6)
      const deck3 = veteranDeck(godId, bonus3)
      const deck6 = veteranDeck(godId, bonus6)
      // 公平版で legal であってはならない（＝ボーナス無しでは組めないデッキであることの確認）
      const illegalWithoutBonus = !validateDeck(deck3, godId).valid && !validateDeck(deck6, godId).valid

      const fair: number[] = []
      const vet3: number[] = []
      const vet6: number[] = []
      for (const dateKey of FIELD_DAYS) {
        const f = Math.max(
          ...DECK_KINDS.map((dk) => run({ dateKey, godId, deckKind: dk, growthPath: 'guardian', line: 's-score' }).finalScore),
        )
        const v3 = Math.max(
          f,
          run({ dateKey, godId, deckKind: 'vet3', deck: deck3, bonusKey: 'b3', bonusCopies: bonus3, growthPath: 'guardian', line: 's-score' }).finalScore,
        )
        const v6 = Math.max(
          f,
          run({ dateKey, godId, deckKind: 'vet6', deck: deck6, bonusKey: 'b6', bonusCopies: bonus6, growthPath: 'guardian', line: 's-score' }).finalScore,
        )
        fair.push(f); vet3.push(v3); vet6.push(v6)
      }
      const mf = avg(fair)
      const m3 = avg(vet3)
      const m6 = avg(vet6)
      diffs.push(m6 - mf)
      diffPcts.push(((m6 - mf) / mf) * 100)
      rows.push([
        GOD_NAME[godId],
        Math.round(mf),
        Math.round(m3),
        `+${r2(((m3 - mf) / mf) * 100)}%`,
        Math.round(m6),
        `+${r2(((m6 - mf) / mf) * 100)}%`,
        illegalWithoutBonus ? '○' : '×',
      ])
      perGod[GOD_NAME[godId]] = { fair: Math.round(mf), vet3: Math.round(m3), vet6: Math.round(m6), gain6Pct: r2(((m6 - mf) / mf) * 100) }
    }

    // 「熟練者だけが上位を占める」度合い＝ボーナス有無での順位差
    report.step8 = {
      pairedSeeds: FIELD_DAYS.length,
      meanScoreGain: r2(avg(diffs)),
      meanScoreGainPct: r2(avg(diffPcts)),
      maxScoreGainPct: r2(Math.max(...diffPcts)),
      perGod,
    }

    md.push('## Step 8 — bonusCopies Impact（paired 比較）')
    md.push('')
    md.push(`同一の実Dailyシード **${FIELD_DAYS.length}本**・同一の神・同一の探索AI（score profile）で、`)
    md.push('「公平版＝1種2枚上限の最良デッキ」と「現行＝報酬ボーナスで上位カードを3枚積んだデッキ」を比較した。')
    md.push('')
    md.push(mdTable(
      ['神', '公平版', '熟練(上位3枚+1)', '差', '熟練(上位6枚+1)', '差', 'ボーナス無しでは非合法'],
      rows,
    ))
    md.push('')
    const s8 = report.step8 as { meanScoreGainPct: number; maxScoreGainPct: number }
    md.push(`報酬ボーナスによる平均スコア優位：**+${s8.meanScoreGainPct}%**（最大 +${s8.maxScoreGainPct}%）`)
    md.push('')

    expect(rows.length).toBe(7)
  })

  it('レポート出力', () => {
    report.meta = {
      generatedFor: 'Phase 4.0 Daily Ranking Competitive Gate',
      startDay: START_DAY,
      matrixDays: MATRIX_DAYS.length,
      fieldDays: FIELD_DAYS.length,
      fieldPlayers: FIELD_PLAYERS,
      engineRuns,
      dailyModifier: RULES.daily.modifier,
      attemptsPerDay: RULES.daily.attemptsPerDay,
      bonusCopies: 'disabled (公平版Daily)',
    }
    writeOut('gate_report.json', report)
    writeOut('gate_report.md', md.join('\n'))
    expect(engineRuns).toBeGreaterThan(1000)
  })
})

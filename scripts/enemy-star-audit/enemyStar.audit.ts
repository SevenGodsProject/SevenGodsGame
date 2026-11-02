/**
 * Enemy ★ Difficulty Audit（read-only・v1.0.0 エンジン d2135d2 相当）
 *
 * 目的：敵 7 体の脅威度 ★（`EnemyDef.rank`・固定値）が実戦難易度を反映しているかを、
 *       同一 seed 群・同一難易度・同一打ち筋で 7 敵 × 7 神 × 難易度 3 段階を決定論シミュレーションして検証する。
 *
 * 条件（固定）
 *   - 通常モード（mode 未指定＝'normal'・神階 0・modifier なし）。Daily（神域強化）ではない
 *   - seed 群：`star-audit-<k>`（k = 1..SEEDS）。同じ seed を全 敵×神×難易度 に使う＝paired
 *   - 打ち筋：ranking-v1-1-fairness/dailyHarness の 6 本（heuristic 3 ＋ 探索 AI 3・予算 800）＝決定256／Fairness Gate と同一
 *   - デッキ：推奨デッキ固定・OTOMO 成長 guardian・託宣 3 回（RULES）
 *   - 指標：勝率／敗北率（HP0）／膠着率（7R 未撃破）／平均残 HP（勝利時・全体）／被ダメージ合計／撃破ラウンド（平均・分布）／平均スコア
 *
 * 出力：docs/evidence/enemy-star-audit/{matrix.json, summary.md}
 * 本番コードは変更しない。`npm test` の対象外（拡張子 .audit.ts・専用 config）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { applyAction } from '../../src/core/engine/reducer'
import { getFinalScore } from '../../src/core/engine/score'
import { ENEMIES } from '../../src/core/data/enemies'
import { RULES } from '../../src/core/data/rules'
import type { Difficulty, EnemyActionDef, EnemyId, GameState, GodId } from '../../src/core/types'
import {
  avg,
  deckFor,
  ENEMY_NAME,
  GOD_NAME,
  GOD_ORDER,
  heuristicAgent,
  incomingOf,
  mdTable,
  PROFILES,
  r1,
  r2,
  searchAgent,
  type Agent,
} from './dailyHarness'

const OUT_DIR = path.resolve(__dirname, '../..', process.env.STAR_OUT_DIR ?? 'docs/evidence/enemy-star-audit')
function writeOut(name: string, content: string | object): void {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(path.join(OUT_DIR, name), typeof content === 'string' ? content : JSON.stringify(content, null, 2), 'utf8')
}

type LineId = 'h-balanced' | 'h-aggressive' | 'h-defensive' | 's-balanced' | 's-rush' | 's-score'
const LINES: LineId[] = ['h-balanced', 'h-aggressive', 'h-defensive', 's-balanced', 's-rush', 's-score']
function agentOf(line: LineId): Agent {
  switch (line) {
    case 'h-balanced': return heuristicAgent('balanced')
    case 'h-aggressive': return heuristicAgent('aggressive')
    case 'h-defensive': return heuristicAgent('defensive')
    case 's-balanced': return searchAgent(PROFILES.balanced, 800)
    case 's-rush': return searchAgent(PROFILES.rush, 800)
    case 's-score': return searchAgent(PROFILES.score, 800)
  }
}

const SEEDS = Number(process.env.STAR_SEEDS ?? 16)
const SEED_IDS = Array.from({ length: SEEDS }, (_, i) => `star-audit-${i + 1}`)
const DIFFS: Difficulty[] = ['easy', 'normal', 'hard']
const ENEMY_ORDER: EnemyId[] = ENEMIES.map((e) => e.id)

type Run = {
  status: 'won' | 'lost' | 'finished'
  round: number
  playerHp: number
  playerMaxHp: number
  enemyHpRatio: number
  score: number
  hpLost: number
  specialHits: number
}

function runNormalGame(seed: string, godId: GodId, enemyId: EnemyId, difficulty: Difficulty, agent: Agent): Run {
  let { state } = applyAction(null, {
    type: 'START_GAME',
    seed,
    godId,
    enemyId,
    deck: deckFor(godId, 'recommended'),
    difficulty,
    otomoGrowthPath: 'guardian',
  })
  let guard = 0
  let hpLost = 0
  let specialHits = 0
  while (state.status === 'playing' && guard < 600) {
    guard++
    if (state.phase !== 'playerTurn') break
    const act = agent(state)
    const before = state.player.hp
    const intent = state.enemy.intent
    const r = applyAction(state, act ?? { type: 'END_ROUND' })
    if (!act) {
      const lost = Math.max(0, before - r.state.player.hp)
      hpLost += lost
      if (lost > 0 && intent && (intent.kind === 'special' || (intent.kind === 'multiAttack' && !!intent.special))) specialHits++
    }
    state = r.state
  }
  return {
    status: state.status as Run['status'],
    round: state.round,
    playerHp: state.player.hp,
    playerMaxHp: state.player.maxHp,
    enemyHpRatio: state.enemy.hp / state.enemy.maxHp,
    score: getFinalScore(state.score, state.stake),
    hpLost,
    specialHits,
  }
}

/** 行動表の静的脅威（難易度倍率は合計保存丸め＝round.ts と同じ発想で合計に掛ける） */
function staticThreat(e: (typeof ENEMIES)[number], mul: number) {
  const totals = e.actions.map((a: EnemyActionDef) => {
    if (a.kind === 'attack') return a.amount
    if (a.kind === 'special') return a.amount
    if (a.kind === 'multiAttack') return a.hits.reduce((s, h) => s + h, 0)
    return 0
  })
  const scaled = totals.map((t) => Math.round(t * mul))
  const peak = Math.max(...scaled)
  return {
    perRound: scaled,
    total: scaled.reduce((s, t) => s + t, 0),
    peak,
    peakRound: scaled.indexOf(peak) + 1,
    chargeRounds: e.actions.map((a, i) => (a.kind === 'charge' ? i + 1 : 0)).filter(Boolean),
    specialRounds: e.actions.map((a, i) => (a.kind === 'special' || (a.kind === 'multiAttack' && a.special) ? i + 1 : 0)).filter(Boolean),
    multiRounds: e.actions.map((a, i) => (a.kind === 'multiAttack' ? i + 1 : 0)).filter(Boolean),
    first3: scaled.slice(0, 3).reduce((s, t) => s + t, 0),
    r4to7: scaled.slice(3).reduce((s, t) => s + t, 0),
  }
}

type Cell = { enemyId: EnemyId; godId: GodId; difficulty: Difficulty; line: LineId; seed: string; run: Run }

function summarize(cells: Cell[]) {
  const n = cells.length
  const won = cells.filter((c) => c.run.status === 'won')
  const lost = cells.filter((c) => c.run.status === 'lost')
  const fin = cells.filter((c) => c.run.status === 'finished')
  const rounds = won.map((c) => c.run.round)
  const dist: Record<string, number> = {}
  for (const r of rounds) dist[`R${r}`] = (dist[`R${r}`] ?? 0) + 1
  return {
    n,
    winPct: r1((won.length / n) * 100),
    lossPct: r1((lost.length / n) * 100),
    stallPct: r1((fin.length / n) * 100),
    avgHpWin: r1(avg(won.map((c) => c.run.playerHp))),
    avgHpAll: r1(avg(cells.map((c) => c.run.playerHp))),
    avgHpLost: r1(avg(cells.map((c) => c.run.hpLost))),
    avgHpLostRatio: r2(avg(cells.map((c) => c.run.hpLost / c.run.playerMaxHp))),
    avgKillRound: r2(avg(rounds)),
    killRoundDist: dist,
    avgScore: Math.round(avg(cells.map((c) => c.run.score))),
    specialHitPct: r1((cells.filter((c) => c.run.specialHits > 0).length / n) * 100),
  }
}

/** 難易度指数（0〜100・大きいほど難しい）：非勝率 50%・被ダメ比 30%・撃破 R 20%（式は summary.md に明記） */
function difficultyIndex(s: ReturnType<typeof summarize>): number {
  const nonWin = (100 - s.winPct) / 100
  const dmg = Math.min(1, s.avgHpLostRatio)
  const kr = Number.isFinite(s.avgKillRound) && s.avgKillRound > 0 ? (s.avgKillRound - 1) / (RULES.totalRounds - 1) : 1
  return r1((0.5 * nonWin + 0.3 * dmg + 0.2 * kr) * 100)
}

function rankOf(values: number[]): number[] {
  // 降順の順位（同値は平均順位）
  const idx = values.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v)
  const ranks = new Array(values.length).fill(0)
  let i = 0
  while (i < idx.length) {
    let j = i
    while (j + 1 < idx.length && idx[j + 1].v === idx[i].v) j++
    const r = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) ranks[idx[k].i] = r
    i = j + 1
  }
  return ranks
}
function spearman(a: number[], b: number[]): number {
  const ra = rankOf(a), rb = rankOf(b)
  const n = a.length
  const ma = avg(ra), mb = avg(rb)
  let num = 0, da = 0, db = 0
  for (let i = 0; i < n; i++) { num += (ra[i] - ma) * (rb[i] - mb); da += (ra[i] - ma) ** 2; db += (rb[i] - mb) ** 2 }
  return da && db ? r2(num / Math.sqrt(da * db)) : 0
}

describe('Enemy ★ Difficulty Audit（read-only・7 敵 × 7 神 × 3 難易度 × 固定 seed × 6 打ち筋）', () => {
  it('matrix を実測して docs/evidence/enemy-star-audit に保存する', () => {
    const t0 = Date.now()
    const cells: Cell[] = []
    const agents = Object.fromEntries(LINES.map((l) => [l, agentOf(l)])) as Record<LineId, Agent>
    for (const difficulty of DIFFS) {
      for (const enemyId of ENEMY_ORDER) {
        for (const godId of GOD_ORDER) {
          for (const seed of SEED_IDS) {
            for (const line of LINES) {
              cells.push({ enemyId, godId, difficulty, line, seed, run: runNormalGame(seed, godId, enemyId, difficulty, agents[line]) })
            }
          }
        }
      }
    }
    const elapsedSec = Math.round((Date.now() - t0) / 1000)

    // 集計
    const byEnemyDiff: Record<string, ReturnType<typeof summarize>> = {}
    const byEnemyDiffLine: Record<string, ReturnType<typeof summarize>> = {}
    const byEnemyGodNormal: Record<string, ReturnType<typeof summarize>> = {}
    const byEnemyDiffTypical: Record<string, ReturnType<typeof summarize>> = {} // h-balanced（初級の代表）
    const byEnemyDiffExpertBest: Record<string, { winPct: number; avgKillRound: number; avgScore: number }> = {} // best-of-6
    for (const difficulty of DIFFS) {
      for (const enemyId of ENEMY_ORDER) {
        const cs = cells.filter((c) => c.difficulty === difficulty && c.enemyId === enemyId)
        byEnemyDiff[`${enemyId}:${difficulty}`] = summarize(cs)
        byEnemyDiffTypical[`${enemyId}:${difficulty}`] = summarize(cs.filter((c) => c.line === 'h-balanced'))
        for (const line of LINES) byEnemyDiffLine[`${enemyId}:${difficulty}:${line}`] = summarize(cs.filter((c) => c.line === line))
        // best-of-6：同じ 神×seed の 6 打ち筋のうち最良（勝ち＞早い撃破＞高スコア）
        const bests: Run[] = []
        for (const godId of GOD_ORDER) for (const seed of SEED_IDS) {
          const six = cs.filter((c) => c.godId === godId && c.seed === seed).map((c) => c.run)
          six.sort((a, b) => (b.status === 'won' ? 1 : 0) - (a.status === 'won' ? 1 : 0) || (a.status === 'won' && b.status === 'won' ? a.round - b.round : 0) || b.score - a.score)
          bests.push(six[0])
        }
        const w = bests.filter((b) => b.status === 'won')
        byEnemyDiffExpertBest[`${enemyId}:${difficulty}`] = { winPct: r1((w.length / bests.length) * 100), avgKillRound: r2(avg(w.map((b) => b.round))), avgScore: Math.round(avg(bests.map((b) => b.score))) }
        if (difficulty === 'normal') for (const godId of GOD_ORDER) byEnemyGodNormal[`${enemyId}:${godId}`] = summarize(cs.filter((c) => c.godId === godId))
      }
    }

    // 難易度指数と順位（6 打ち筋平均＝"全体"・h-balanced＝"初級"）
    const index: Record<string, Record<string, number>> = {}
    const rankByDiff: Record<string, { enemyId: EnemyId; star: number; index: number; rank: number; indexTypical: number; rankTypical: number }[]> = {}
    const spearmanByDiff: Record<string, { all: number; typical: number }> = {}
    for (const difficulty of DIFFS) {
      const idx = ENEMY_ORDER.map((e) => difficultyIndex(byEnemyDiff[`${e}:${difficulty}`]))
      const idxT = ENEMY_ORDER.map((e) => difficultyIndex(byEnemyDiffTypical[`${e}:${difficulty}`]))
      const ranks = rankOf(idx), ranksT = rankOf(idxT)
      const stars = ENEMY_ORDER.map((e) => ENEMIES.find((x) => x.id === e)!.rank)
      index[difficulty] = Object.fromEntries(ENEMY_ORDER.map((e, i) => [e, idx[i]]))
      rankByDiff[difficulty] = ENEMY_ORDER.map((e, i) => ({ enemyId: e, star: stars[i], index: idx[i], rank: ranks[i], indexTypical: idxT[i], rankTypical: ranksT[i] }))
      spearmanByDiff[difficulty] = { all: spearman(stars, idx), typical: spearman(stars, idxT) }
    }

    // 静的脅威
    const staticByDiff: Record<string, Record<string, ReturnType<typeof staticThreat> & { hp: number }>> = {}
    for (const difficulty of DIFFS) {
      const p = RULES.difficulty[difficulty]
      staticByDiff[difficulty] = Object.fromEntries(ENEMIES.map((e) => [e.id, { ...staticThreat(e, p.enemyAtkMultiplier), hp: Math.round(e.maxHp * p.enemyHpMultiplier) }]))
    }

    writeOut('matrix.json', {
      meta: { engine: process.env.STAR_ENGINE_LABEL ?? 'v1.0.0 (d2135d2 runtime)', mode: 'normal', seeds: SEED_IDS, lines: LINES, difficulties: DIFFS, deck: 'recommended', growthPath: 'guardian', engineRuns: cells.length, elapsedSec, indexFormula: '0.5*(1-win)+0.3*min(1,hpLost/maxHp)+0.2*((killRound-1)/6) ×100', generatedAt: new Date().toISOString() },
      byEnemyDiff, byEnemyDiffTypical, byEnemyDiffLine, byEnemyDiffExpertBest, byEnemyGodNormal, index, rankByDiff, spearmanByDiff, staticByDiff,
    })

    // Markdown
    const md: string[] = []
    md.push('# Enemy ★ Difficulty Audit — 実測（v1.0.0 エンジン・通常モード）', '')
    md.push(`- 条件：7 敵 × 7 神 × 難易度 3 段階 × 固定 seed ${SEEDS} 本 × 打ち筋 6 本（heuristic 3＋探索 AI 3・予算 800）＝ engine runs **${cells.length}**・所要 ${elapsedSec} 秒・単一プロセス直列`)
    md.push(`- 難易度指数 = 0.5×(1−勝率) + 0.3×min(1, 被ダメ合計/最大HP) + 0.2×((撃破R−1)/6)、×100（大きいほど難しい）`, '')
    for (const difficulty of DIFFS) {
      md.push(`## ${difficulty}（敵HP×${RULES.difficulty[difficulty].enemyHpMultiplier}・敵攻撃×${RULES.difficulty[difficulty].enemyAtkMultiplier}・自HP ${RULES.player.maxHp + RULES.difficulty[difficulty].playerMaxHpBonus}）`, '')
      md.push(mdTable(['敵', '★', 'HP', '攻撃合計', '峰(R)', '必殺R', '溜めR', '勝率%', '敗北%', '膠着%', '残HP(勝)', '被ダメ', '撃破R', '必殺被弾%', 'スコア', '指数', '順位', '初級指数', '初級順位', '上級best勝率'],
        ENEMY_ORDER.map((e) => {
          const s = byEnemyDiff[`${e}:${difficulty}`]; const st = staticByDiff[difficulty][e]; const rk = rankByDiff[difficulty].find((r) => r.enemyId === e)!; const ex = byEnemyDiffExpertBest[`${e}:${difficulty}`]
          return [ENEMY_NAME[e], '★'.repeat(rk.star), st.hp, st.total, `${st.peak}(R${st.peakRound})`, st.specialRounds.join('/') || '—', st.chargeRounds.join('/') || '—', s.winPct, s.lossPct, s.stallPct, s.avgHpWin, s.avgHpLost, s.avgKillRound, s.specialHitPct, s.avgScore, rk.index, rk.rank, rk.indexTypical, rk.rankTypical, ex.winPct]
        })))
      md.push('', `Spearman（★ vs 指数）：全体 ${spearmanByDiff[difficulty].all}／初級 ${spearmanByDiff[difficulty].typical}`, '')
    }
    md.push('## normal：敵 × 神（勝率% / 撃破R / 被ダメ）', '')
    md.push(mdTable(['敵', ...GOD_ORDER.map((g) => GOD_NAME[g])], ENEMY_ORDER.map((e) => [ENEMY_NAME[e], ...GOD_ORDER.map((g) => { const s = byEnemyGodNormal[`${e}:${g}`]; return `${s.winPct}/${s.avgKillRound}/${s.avgHpLost}` })])))
    md.push('', '## 打ち筋別の勝率%（normal）', '')
    md.push(mdTable(['敵', ...LINES], ENEMY_ORDER.map((e) => [ENEMY_NAME[e], ...LINES.map((l) => byEnemyDiffLine[`${e}:normal:${l}`].winPct)])))
    md.push('', '## 打ち筋別の勝率%（hard）', '')
    md.push(mdTable(['敵', ...LINES], ENEMY_ORDER.map((e) => [ENEMY_NAME[e], ...LINES.map((l) => byEnemyDiffLine[`${e}:hard:${l}`].winPct)])))
    writeOut('summary.md', md.join('\n') + '\n')

    console.log(md.join('\n'))
    expect(cells.length).toBe(ENEMY_ORDER.length * GOD_ORDER.length * DIFFS.length * SEEDS * LINES.length)
  })
})

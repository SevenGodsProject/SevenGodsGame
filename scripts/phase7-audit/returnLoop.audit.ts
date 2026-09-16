/**
 * Phase 7 Return Loop Commercial Audit — プレイヤータイプ別シミュレーション（分析専用・本番コード非変更）。
 *
 *   SEEDS=8 npx vitest run scripts/phase7-audit/returnLoop.audit.ts --reporter=verbose
 *   OUT_DIR=<任意の出力先>（既定: scripts/phase7-audit/out。コミットしない）
 *
 * 「もう1戦したくなる理由がどこで生まれるか」をエンジン側の事実で裏付ける：
 *   Q1 プレイヤータイプ別の勝率／スコア／撃破ラウンド（ループがそもそも始まるか、伸びしろがあるか）
 *   Q2 自己BEST更新頻度（同じ神×敵を続けて遊んだとき何戦に1回BESTが更新されるか）
 *   Q3 Daily 3回の価値（同一seedでの再挑戦：同じ腕前なら同一結果＝決定論、腕前差でどれだけ伸びるか）
 *   Q4 神技評価（Mastery）のグレード分布（C固定問題がタイプ別にどれほどか）
 *   Q5 神階（stake）が勝率・スコアに与える影響（通常攻略の育成 vs Daily 公平性）
 *   Q6 OTOMO 成長経路（guardian / power）の差（選び分ける動機があるか）
 *
 * プレイヤータイプ：
 *   New Player       … ヒューリスティック balanced（先読みなし）
 *   Casual           … 探索AI balanced（budget 150）
 *   Optimizer        … 探索AI・神に合ったプロファイル（budget 400）
 *   Daily Competitor … Optimizer と同じ腕前で同一 seed を反復
 */
import { describe, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { GOD_IDS } from '../../src/core/data/gods'
import type { GodId, GrowthPath } from '../../src/core/types'
import { ENEMY_ORDER, ENEMY_NAME, GOD_ORDER, GOD_NAME, PROFILES, getRecommendedDeck, mdTable, r1, r2, avg } from '../phase3-audit/harness'
import { runGame2, searchAgent2, heuristicAgent2, type Agent2 } from '../phase3-audit/step2/harness2'

const SEEDS = Number(process.env.SEEDS ?? 8)
const OUT_DIR = process.env.OUT_DIR ?? path.resolve(__dirname, 'out')
const write = (name: string, body: string | object) => {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(path.join(OUT_DIR, name), typeof body === 'string' ? body : JSON.stringify(body, null, 2), 'utf8')
}

const godProfile = (god: GodId) =>
  god === GOD_IDS.sobi || god === GOD_IDS.shouren ? PROFILES.fortress : god === GOD_IDS.juraku ? PROFILES.control : god === GOD_IDS.saika ? PROFILES.engine : PROFILES.rush

type PlayerType = { name: string; agent: (god: GodId) => Agent2 }
const TYPES: PlayerType[] = [
  { name: 'New', agent: () => heuristicAgent2('balanced') },
  { name: 'Casual', agent: () => searchAgent2(PROFILES.balanced, 150) },
  { name: 'Optimizer', agent: (god) => searchAgent2(godProfile(god), 400) },
]

type Row = { type: string; god: string; enemy: string; seed: number; status: string; round: number; score: number; hp: number; grade: string | null; bursts: number; otomoForm: number }

describe('Phase 7 Return Loop simulation', () => {
  it('Q1/Q2/Q4: タイプ別 勝率・スコア・BEST更新・Mastery', () => {
    const rows: Row[] = []
    for (const t of TYPES) for (const god of GOD_ORDER) {
      const deck = getRecommendedDeck(god)
      for (const enemy of ENEMY_ORDER) for (let i = 0; i < SEEDS; i++) {
        const m = runGame2({ seed: `p7-${god}-${enemy}-${i}`, godId: god, enemyId: enemy, deck }, t.agent(god))
        rows.push({ type: t.name, god: GOD_NAME[god], enemy: ENEMY_NAME[enemy], seed: i, status: m.status, round: m.round, score: m.finalScore, hp: m.playerHp, grade: m.mastery?.grade ?? null, bursts: m.bursts, otomoForm: m.otomoFinalForm })
      }
    }
    write('q1_rows.json', rows)

    // Q1 集計
    const md: string[] = ['# Phase 7 Return Loop simulation', `SEEDS=${SEEDS}／7神×7敵／ふつう／神階なし／おすすめデッキ`, '']
    md.push('## Q1 プレイヤータイプ別：勝率・未撃破(finished)率・平均スコア・勝利時平均撃破R・神の一撃回数')
    const q1: (string | number)[][] = []
    for (const t of TYPES) {
      const rs = rows.filter((r) => r.type === t.name)
      const won = rs.filter((r) => r.status === 'won')
      q1.push([t.name, rs.length, r1(100 * won.length / rs.length) + '%', r1(100 * rs.filter((r) => r.status === 'finished').length / rs.length) + '%', r1(100 * rs.filter((r) => r.status === 'lost').length / rs.length) + '%', Math.round(avg(rs.map((r) => r.score))), Math.round(avg(won.map((r) => r.score))), r2(avg(won.map((r) => r.round))), r2(avg(rs.map((r) => r.bursts))), r2(avg(rs.map((r) => r.otomoForm)))])
    }
    md.push(mdTable(['type', 'games', 'win', 'finished', 'lost', 'avg score(all)', 'avg score(won)', 'avg win round', 'bursts/game', 'otomo form'], q1))
    // 神別 win率（タイプ別）
    md.push('\n### Q1-b 神別勝率（New / Casual / Optimizer）')
    const q1b: (string | number)[][] = []
    for (const god of GOD_ORDER) {
      const cells: (string | number)[] = [GOD_NAME[god]]
      for (const t of TYPES) { const rs = rows.filter((r) => r.type === t.name && r.god === GOD_NAME[god]); cells.push(r1(100 * rs.filter((r) => r.status === 'won').length / rs.length) + '%') }
      for (const t of TYPES) { const rs = rows.filter((r) => r.type === t.name && r.god === GOD_NAME[god]); cells.push(Math.round(avg(rs.map((r) => r.score)))) }
      q1b.push(cells)
    }
    md.push(mdTable(['神', 'win New', 'win Casual', 'win Opt', 'score New', 'score Casual', 'score Opt'], q1b))
    md.push('\n### Q1-c 敵別勝率（New / Casual / Optimizer）')
    const q1c: (string | number)[][] = []
    for (const enemy of ENEMY_ORDER) {
      const cells: (string | number)[] = [ENEMY_NAME[enemy]]
      for (const t of TYPES) { const rs = rows.filter((r) => r.type === t.name && r.enemy === ENEMY_NAME[enemy]); cells.push(r1(100 * rs.filter((r) => r.status === 'won').length / rs.length) + '%') }
      q1c.push(cells)
    }
    md.push(mdTable(['敵', 'New', 'Casual', 'Optimizer'], q1c))

    // Q2 自己BEST更新頻度：同じ神×敵を seed 順に遊んだとき、何戦目で何回 BEST が更新されるか
    md.push('\n## Q2 自己BEST更新頻度（神×敵ごとに seed 順に連戦。1戦目は必ず更新なので除外）')
    const q2: (string | number)[][] = []
    for (const t of TYPES) {
      let updates = 0, chances = 0, firstNoUpdateStreak: number[] = []
      const byPair = new Map<string, Row[]>()
      for (const r of rows.filter((r) => r.type === t.name)) { const k = r.god + '|' + r.enemy; byPair.set(k, [...(byPair.get(k) ?? []), r]) }
      for (const list of byPair.values()) {
        list.sort((a, b) => a.seed - b.seed)
        let best = -Infinity, streak = 0, maxStreak = 0
        list.forEach((r, idx) => { if (idx === 0) { best = r.score; return } chances++; if (r.score > best) { best = r.score; updates++; streak = 0 } else { streak++; maxStreak = Math.max(maxStreak, streak) } })
        firstNoUpdateStreak.push(maxStreak)
      }
      q2.push([t.name, chances, updates, r1(100 * updates / Math.max(1, chances)) + '%', r1(chances / Math.max(1, updates)), r1(avg(firstNoUpdateStreak))])
    }
    md.push(mdTable(['type', '再戦回数', 'BEST更新回数', '更新率', '更新までの平均戦数', '最長無更新連続（平均）'], q2))

    // Q4 Mastery グレード分布（神技を持つ神のみ・勝利時）
    md.push('\n## Q4 神技評価（Mastery）グレード分布（勝利試合のみ・神技を持つ神）')
    const q4: (string | number)[][] = []
    for (const t of TYPES) for (const god of GOD_ORDER) {
      const rs = rows.filter((r) => r.type === t.name && r.god === GOD_NAME[god] && r.status === 'won' && r.grade)
      if (!rs.length) continue
      const g = { S: 0, A: 0, B: 0, C: 0 } as Record<string, number>
      rs.forEach((r) => { g[r.grade!] = (g[r.grade!] ?? 0) + 1 })
      q4.push([t.name, GOD_NAME[god], rs.length, r1(100 * g.C / rs.length) + '%', r1(100 * g.B / rs.length) + '%', r1(100 * g.A / rs.length) + '%', r1(100 * g.S / rs.length) + '%'])
    }
    md.push(mdTable(['type', '神', '勝利数', 'C', 'B', 'A', 'S'], q4))
    write('q1_q2_q4.md', md.join('\n'))
    console.log(md.join('\n'))
  }, 60 * 60 * 1000)

  it('Q3: Daily 3回の価値（同一 seed 反復）', () => {
    const md: string[] = ['## Q3 Daily 同一seed 3回挑戦の価値', 'seed 固定・敵固定で、①同じ腕前で3回（決定論の確認）②New→Casual→Optimizer の順に3回（腕前が上がると何点伸びるか）', '']
    const rowsSame: (string | number)[][] = [], rowsGrow: (string | number)[][] = []
    for (const god of GOD_ORDER) {
      const deck = getRecommendedDeck(god)
      for (const enemy of ENEMY_ORDER.slice(0, 3)) {
        const seed = `daily-2026-09-16-${enemy}-${god}`
        const same = [0, 1, 2].map(() => runGame2({ seed, godId: god, enemyId: enemy, deck }, searchAgent2(godProfile(god), 400)).finalScore)
        rowsSame.push([GOD_NAME[god], ENEMY_NAME[enemy], ...same, same.every((s) => s === same[0]) ? '同一' : '不一致'])
        const grow = TYPES.map((t) => { const m = runGame2({ seed, godId: god, enemyId: enemy, deck }, t.agent(god)); return `${m.finalScore}${m.status === 'won' ? '' : '(' + m.status + ')'}` })
        rowsGrow.push([GOD_NAME[god], ENEMY_NAME[enemy], ...grow])
      }
    }
    md.push('### 同じ腕前で3回（同一seed）'); md.push(mdTable(['神', '敵', '1回目', '2回目', '3回目', '判定'], rowsSame))
    md.push('\n### 腕前が上がると（New → Casual → Optimizer、同一seed）'); md.push(mdTable(['神', '敵', 'New', 'Casual', 'Optimizer'], rowsGrow))
    write('q3.md', md.join('\n')); console.log(md.join('\n'))
  }, 30 * 60 * 1000)

  it('Q5/Q6: 神階（stake）と OTOMO 成長経路の影響（Optimizer）', () => {
    const md: string[] = ['## Q5 神階（stake）別：勝率・平均スコア（Optimizer・全神×全敵）', '']
    const q5: (string | number)[][] = []
    for (const stake of [0, 2, 4, 6]) {
      let games = 0, won = 0; const scores: number[] = [], wonScores: number[] = []
      for (const god of GOD_ORDER) { const deck = getRecommendedDeck(god); for (const enemy of ENEMY_ORDER) for (let i = 0; i < Math.max(2, Math.floor(SEEDS / 2)); i++) {
        const m = runGame2({ seed: `p7s-${god}-${enemy}-${i}`, godId: god, enemyId: enemy, deck, ...(stake ? { stake, stakeChoice: 'race' as const } : {}) }, searchAgent2(godProfile(god), 400))
        games++; scores.push(m.finalScore); if (m.status === 'won') { won++; wonScores.push(m.finalScore) }
      } }
      q5.push([stake === 0 ? 'なし' : 'Ⅰ'.replace('Ⅰ', ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ'][stake - 1]), games, r1(100 * won / games) + '%', Math.round(avg(scores)), Math.round(avg(wonScores))])
    }
    md.push(mdTable(['神階', 'games', 'win', 'avg score(all)', 'avg score(won)'], q5))
    md.push('\n## Q6 OTOMO 成長経路（guardian＝守りの絆 / power＝力の絆）：勝率・スコア・最終形態（Optimizer）')
    const q6: (string | number)[][] = []
    for (const gp of ['guardian', 'power'] as GrowthPath[]) {
      let games = 0, won = 0; const scores: number[] = [], forms: number[] = []
      for (const god of GOD_ORDER) { const deck = getRecommendedDeck(god); for (const enemy of ENEMY_ORDER) for (let i = 0; i < Math.max(2, Math.floor(SEEDS / 2)); i++) {
        const m = runGame2({ seed: `p7g-${god}-${enemy}-${i}`, godId: god, enemyId: enemy, deck, growthPath: gp }, searchAgent2(godProfile(god), 400))
        games++; scores.push(m.finalScore); forms.push(m.otomoFinalForm); if (m.status === 'won') won++
      } }
      q6.push([gp, games, r1(100 * won / games) + '%', Math.round(avg(scores)), r2(avg(forms))])
    }
    md.push(mdTable(['growthPath', 'games', 'win', 'avg score', 'avg final form(0-2)'], q6))
    write('q5_q6.md', md.join('\n')); console.log(md.join('\n'))
  }, 60 * 60 * 1000)
})

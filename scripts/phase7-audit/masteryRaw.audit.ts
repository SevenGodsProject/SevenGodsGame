/**
 * Phase 7 — 神技評価（Mastery）の raw 分布（分析専用・閾値は変更しない）。
 *   SEEDS=24 OUT_DIR=<出力先> npx vitest run --config scripts/phase7-audit/vitest.audit.config.ts scripts/phase7-audit/masteryRaw.audit.ts --reporter=verbose
 * 「C評価だがB条件が不明」問題の定量化：タイプ別に raw の p25/p50/p75 と、現行 B/A/S 閾値に対する到達率を出す。
 */
import { describe, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { RULES } from '../../src/core/data/rules'
import { GOD_IDS } from '../../src/core/data/gods'
import type { GodId } from '../../src/core/types'
import { ENEMY_ORDER, GOD_NAME, PROFILES, getRecommendedDeck, mdTable, r2, avg } from '../phase3-audit/harness'
import { runGame2, searchAgent2, heuristicAgent2 } from '../phase3-audit/step2/harness2'

const SEEDS = Number(process.env.SEEDS ?? 24)
const OUT_DIR = process.env.OUT_DIR ?? path.resolve(__dirname, 'out')
const q = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))] }
const M: { god: GodId; label: string; t: { s: number; a: number; b: number } }[] = [
  { god: GOD_IDS.taiyo, label: '爆発', t: RULES.mastery.taiyo },
  { god: GOD_IDS.sobi, label: '鉄壁', t: RULES.mastery.sobi },
  { god: GOD_IDS.juraku, label: '無力化', t: RULES.mastery.juraku },
  { god: GOD_IDS.fukuei, label: '大勝負', t: RULES.mastery.fukuei },
]
const TYPES = [
  { name: 'New', agent: (_g: GodId) => heuristicAgent2('balanced') },
  { name: 'Casual', agent: (_g: GodId) => searchAgent2(PROFILES.balanced, 150) },
  { name: 'Optimizer', agent: (g: GodId) => searchAgent2(g === GOD_IDS.sobi ? PROFILES.fortress : g === GOD_IDS.juraku ? PROFILES.control : PROFILES.rush, 400) },
]

describe('Phase 7 mastery raw distribution', () => {
  it('raw p25/p50/p75 と閾値到達率', () => {
    const md: string[] = ['## Mastery raw 分布（勝利試合・ふつう・神階なし）', `SEEDS=${SEEDS}／7敵`, '']
    const rows: (string | number)[][] = []
    for (const m of M) {
      const deck = getRecommendedDeck(m.god)
      for (const t of TYPES) {
        const raws: number[] = []
        for (const enemy of ENEMY_ORDER) for (let i = 0; i < SEEDS; i++) {
          const r = runGame2({ seed: `p7m-${m.god}-${enemy}-${i}`, godId: m.god, enemyId: enemy, deck }, t.agent(m.god))
          if (r.status === 'won' && r.mastery) raws.push(r.mastery.raw)
        }
        const ge = (x: number) => (100 * raws.filter((v) => v >= x).length / raws.length).toFixed(0) + '%'
        rows.push([GOD_NAME[m.god] + '「' + m.label + '」', t.name, raws.length, r2(q(raws, 0.25)), r2(q(raws, 0.5)), r2(q(raws, 0.75)), r2(avg(raws)), `B ${m.t.b}: ${ge(m.t.b)}`, `A ${m.t.a}: ${ge(m.t.a)}`, `S ${m.t.s}: ${ge(m.t.s)}`, `B×0.8(${r2(m.t.b * 0.8)}): ${ge(m.t.b * 0.8)}`])
      }
    }
    md.push(mdTable(['神技', 'type', 'wins', 'p25', 'p50', 'p75', 'mean', 'B到達', 'A到達', 'S到達', '参考: B閾値×0.8'], rows))
    fs.mkdirSync(OUT_DIR, { recursive: true }); fs.writeFileSync(path.join(OUT_DIR, 'mastery_raw.md'), md.join('\n'), 'utf8')
    console.log(md.join('\n'))
  }, 60 * 60 * 1000)
})

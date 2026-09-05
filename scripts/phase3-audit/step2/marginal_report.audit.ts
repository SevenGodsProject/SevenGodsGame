/**
 * Step 2.5：marginal.audit.ts の出力（step25_marginal_<RULESET>_<COND>.json）を突き合わせ、
 * Baseline(C0) vs Recommended(C3-4v2) の God×Card 差別化指標を計算する。
 *  - 共通32枚の神別 marginal value ベクトル → 神ペア Spearman 順位相関（平均）
 *  - 「共通最適札固定」：全神で上位8に入る共通カード数／全神でプラス・全神でマイナスの枚数
 *  - 「神で分岐する札」：ある神で上位8かつ別の神で下位8（＋価値の符号反転）
 *  - 報酬3択EV：ランダム3枚で神別最良を選んだときの一致率、および「合意札を選んだ場合に失うEV」
 *  - 変更4枚・Step 1 負価値16枚の値
 * env: BASE=C0 REC=C3-4v2 CONDS=stress,s7
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'vitest'
import { createRng } from '../../../src/core/rng/seededRandom'
import { GOD_ORDER, GOD_NAME, OUT_DIR, writeOut, mdTable, r1, r2, avg } from '../harness'

const BASE = process.env.BASE ?? 'C0'
const REC = process.env.REC ?? 'C3-4v2'
const CONDS = (process.env.CONDS ?? 'stress,s7').split(',')

type CardRow = { id: string; name: string; excl: boolean; mode: string; dWin: number; se: number; dScore: number; inBase: number }
type GodOut = { filler: string; baseWR: number; baseScore: number; cards: CardRow[] }
type Out = { ruleset: string; cond: string; seeds: number; gods: Record<string, GodOut> }

const load = (rs: string, cond: string): Out => JSON.parse(fs.readFileSync(path.join(OUT_DIR, `step25_marginal_${rs}_${cond}.json`), 'utf8'))
/** 合成価値：勝率差(pt) + スコア差/50（Ⅶ normal では勝率が天井に近いためスコア差を併用） */
const value = (r: CardRow) => r.dWin + r.dScore / 50

function spearman(a: number[], b: number[]): number {
  const rank = (xs: number[]) => { const idx = xs.map((v, i) => ({ v, i })).sort((x, y) => y.v - x.v); const r = new Array(xs.length).fill(0); idx.forEach((o, k) => (r[o.i] = k + 1)); return r }
  const ra = rank(a), rb = rank(b); const n = a.length
  return 1 - (6 * ra.reduce((s, x, i) => s + (x - rb[i]) ** 2, 0)) / (n * (n * n - 1))
}

const NEG16 = ['福授け', '一心不乱', '後輩想い', '不動の構え', '誓いの盾', '反撃の刃', '一喝', '独奏', '喝采', '悪戯', '長生きの知恵', 'からかい半分', '幸運の女神', '不屈の一歩', '福袋', '懐の深さ', '笑って許す']
const CHANGED4 = ['不動の構え', '一喝', '福袋', '笑って許す']

describe('Step2.5 report', () => {
  it('baseline vs recommended', () => {
    const md: string[] = [`# Step 2.5 Card Preference Validation — ${BASE} vs ${REC}`]
    const summary: Record<string, unknown> = {}
    for (const cond of CONDS) {
      const B = load(BASE, cond), R = load(REC, cond)
      md.push(`\n# 条件 ${cond}（N=${B.seeds * 7} paired games/card）`)
      const analyze = (O: Out, label: string) => {
        const gods = GOD_ORDER
        const commons = O.gods[gods[0]].cards.filter((c) => !c.excl).map((c) => c.id)
        const val: Record<string, Record<string, number>> = {}
        for (const g of gods) { val[g] = {}; for (const c of O.gods[g].cards) val[g][c.id] = value(c) }
        // 神ごとの中心化（filler差の影響を除く）
        const centered: Record<string, Record<string, number>> = {}
        for (const g of gods) { const m = avg(commons.map((id) => val[g][id])); centered[g] = {}; for (const id of commons) centered[g][id] = val[g][id] - m }
        const names: Record<string, string> = {}; for (const c of O.gods[gods[0]].cards) names[c.id] = c.name
        // 順位相関
        const corr: number[] = []
        const mat: number[][] = gods.map((g1) => gods.map((g2) => { const s = spearman(commons.map((id) => centered[g1][id]), commons.map((id) => centered[g2][id])); if (g1 < g2) corr.push(s); return s }))
        // 上位8／下位8
        const top8: Record<string, Set<string>> = {}, bot8: Record<string, Set<string>> = {}
        for (const g of gods) { const sorted = [...commons].sort((a, b) => centered[g][b] - centered[g][a]); top8[g] = new Set(sorted.slice(0, 8)); bot8[g] = new Set(sorted.slice(-8)) }
        const universalTop = commons.filter((id) => gods.every((g) => top8[g].has(id)))
        const majorityTop = commons.filter((id) => gods.filter((g) => top8[g].has(id)).length >= 5)
        const polarized = commons.filter((id) => gods.some((g) => top8[g].has(id)) && gods.some((g) => bot8[g].has(id)))
        const signFlip = commons.filter((id) => gods.some((g) => val[g][id] > 3) && gods.some((g) => val[g][id] < -3))
        const allPos = commons.filter((id) => gods.every((g) => val[g][id] > 0)).length
        const allNeg = commons.filter((id) => gods.every((g) => val[g][id] < 0)).length
        // 報酬3択EV
        const rng = createRng(`s25-reward-${label}-${cond}`)
        let same = 0, distinct = 0, evLoss = 0
        const T = 4000
        for (let t = 0; t < T; t++) {
          const tri = rng.shuffle(commons).slice(0, 3)
          const picks = gods.map((g) => tri.reduce((b, id) => (val[g][id] > val[g][b] ? id : b), tri[0]))
          const d = new Set(picks).size; distinct += d; if (d === 1) same++
          // 合意札（最多票）を選んだ場合に各神が失う価値
          const counts = new Map<string, number>(); for (const p of picks) counts.set(p, (counts.get(p) ?? 0) + 1)
          const consensus = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
          evLoss += avg(gods.map((g, i) => val[g][picks[i]] - val[g][consensus]))
        }
        // 専用カード
        const excl = gods.flatMap((g) => O.gods[g].cards.filter((c) => c.excl).map((c) => ({ god: GOD_NAME[g], name: c.name, dWin: c.dWin, se: c.se, dScore: c.dScore, v: r1(value(c)) })))
        const negExcl = excl.filter((e) => e.v < 0)
        const negExclSig = excl.filter((e) => e.dWin + e.se < 0 || (e.dWin <= 0 && e.dScore < -20))
        return { commons, names, val, centered, meanCorr: r2(avg(corr)), mat, universalTop: universalTop.map((id) => names[id]), majorityTop: majorityTop.map((id) => names[id]), polarized: polarized.map((id) => names[id]), signFlip: signFlip.map((id) => names[id]), allPos, allNeg, rewardSame: r1((same / T) * 100), avgDistinct: r2(distinct / T), evLoss: r2(evLoss / T), excl, negExcl, negExclSig, top8 }
      }
      const b = analyze(B, BASE), r = analyze(R, REC)
      summary[cond] = { base: { meanCorr: b.meanCorr, universalTop: b.universalTop.length, majorityTop: b.majorityTop.length, polarized: b.polarized.length, signFlip: b.signFlip.length, allPos: b.allPos, allNeg: b.allNeg, rewardSame: b.rewardSame, avgDistinct: b.avgDistinct, evLoss: b.evLoss, negExcl: b.negExcl.length, negExclSig: b.negExclSig.length }, rec: { meanCorr: r.meanCorr, universalTop: r.universalTop.length, majorityTop: r.majorityTop.length, polarized: r.polarized.length, signFlip: r.signFlip.length, allPos: r.allPos, allNeg: r.allNeg, rewardSame: r.rewardSame, avgDistinct: r.avgDistinct, evLoss: r.evLoss, negExcl: r.negExcl.length, negExclSig: r.negExclSig.length } }
      md.push('\n## 指標比較')
      md.push(mdTable(['指標', BASE, REC], [
        ['神ペアの共通カード順位相関（Spearman平均、低いほど差別化）', b.meanCorr, r.meanCorr],
        ['全神で上位8に入る共通カード（共通最適札固定）', `${b.universalTop.length}（${b.universalTop.join('、')}）`, `${r.universalTop.length}（${r.universalTop.join('、')}）`],
        ['5神以上で上位8', b.majorityTop.length, r.majorityTop.length],
        ['ある神で上位8・別の神で下位8（分岐札）', `${b.polarized.length}（${b.polarized.join('、')}）`, `${r.polarized.length}（${r.polarized.join('、')}）`],
        ['価値の符号が神で反転（±3以上）', `${b.signFlip.length}（${b.signFlip.join('、')}）`, `${r.signFlip.length}（${r.signFlip.join('、')}）`],
        ['全神プラス／全神マイナスの共通カード', `${b.allPos}／${b.allNeg}`, `${r.allPos}／${r.allNeg}`],
        ['報酬3択：7神の最良が一致する率', `${b.rewardSame}%`, `${r.rewardSame}%`],
        ['報酬3択：平均選択種類数', b.avgDistinct, r.avgDistinct],
        ['報酬3択：合意札を選ぶと失う平均価値（pt）', b.evLoss, r.evLoss],
        ['専用カード負価値（合成値<0）', `${b.negExcl.length}/28`, `${r.negExcl.length}/28`],
        ['専用カード負価値（有意：dWin+SE<0 または dWin≤0かつdScore<−20）', `${b.negExclSig.length}/28`, `${r.negExclSig.length}/28`],
      ]))
      md.push(`\n### 神ペア順位相関（${REC}）`)
      md.push(mdTable(['', ...GOD_ORDER.map((g) => GOD_NAME[g])], GOD_ORDER.map((g, i) => [GOD_NAME[g], ...r.mat[i].map((x) => r2(x))])))
      md.push(`\n### 神ペア順位相関（${BASE}）`)
      md.push(mdTable(['', ...GOD_ORDER.map((g) => GOD_NAME[g])], GOD_ORDER.map((g, i) => [GOD_NAME[g], ...b.mat[i].map((x) => r2(x))])))
      // 神別 上位8 共通カード
      md.push(`\n### 神別 上位8共通カード（中心化した合成価値、${REC}）`)
      md.push(mdTable(['god', 'top8'], GOD_ORDER.map((g) => [GOD_NAME[g], [...r.top8[g]].map((id) => `${r.names[id]}(${r1(r.centered[g][id])})`).join('、')])))
      md.push(`\n### 神別 上位8共通カード（${BASE}）`)
      md.push(mdTable(['god', 'top8'], GOD_ORDER.map((g) => [GOD_NAME[g], [...b.top8[g]].map((id) => `${b.names[id]}(${r1(b.centered[g][id])})`).join('、')])))
      // God × Card matrix (centered) for REC, sorted by spread
      const rowsM = r.commons.map((id) => { const v = GOD_ORDER.map((g) => r.centered[g][id]); return { id, v, spread: Math.max(...v) - Math.min(...v) } }).sort((a, b) => b.spread - a.spread)
      md.push(`\n### God × Card マトリクス（${REC}、中心化合成価値、スプレッド順）`)
      md.push(mdTable(['card', ...GOD_ORDER.map((g) => GOD_NAME[g]), 'spread'], rowsM.map((x) => [r.names[x.id], ...x.v.map((y) => r1(y)), r1(x.spread)])))
      const rowsB = b.commons.map((id) => { const v = GOD_ORDER.map((g) => b.centered[g][id]); return { id, v, spread: Math.max(...v) - Math.min(...v) } })
      md.push(`平均スプレッド：${BASE} ${r1(avg(rowsB.map((x) => x.spread)))} / ${REC} ${r1(avg(rowsM.map((x) => x.spread)))}；スプレッド≥15の共通カード：${BASE} ${rowsB.filter((x) => x.spread >= 15).length} / ${REC} ${rowsM.filter((x) => x.spread >= 15).length}`)
      ;(summary[cond] as Record<string, unknown>).spread = { base: r1(avg(rowsB.map((x) => x.spread))), rec: r1(avg(rowsM.map((x) => x.spread))), base15: rowsB.filter((x) => x.spread >= 15).length, rec15: rowsM.filter((x) => x.spread >= 15).length }
      // 変更4枚・負価値16枚
      md.push('\n### 変更4枚・Step 1 負価値16枚（専用）の値：dWin pt（±SE）/ dScore')
      const find = (O: ReturnType<typeof analyze>, name: string) => O.excl.find((e) => e.name === name)
      md.push(mdTable(['card', 'god', `${BASE} dWin`, 'SE', `${BASE} dScore`, `${REC} dWin`, 'SE', `${REC} dScore`, '変更対象'], NEG16.map((n) => { const x = find(b, n)!, y = find(r, n)!; return [n, x?.god ?? '', x?.dWin ?? '', x?.se ?? '', x?.dScore ?? '', y?.dWin ?? '', y?.se ?? '', y?.dScore ?? '', CHANGED4.includes(n) ? '◯' : ''] })))
      md.push(`\n### 専用カード全28枚（${REC}）`)
      md.push(mdTable(['god', 'card', 'dWin', '±SE', 'dScore', '合成'], r.excl.map((e) => [e.god, e.name, e.dWin, e.se, e.dScore, e.v])))
    }
    writeOut('step25_report.json', summary)
    writeOut('step25_report.md', md.join('\n'))
    console.log(md.join('\n'))
  })
})

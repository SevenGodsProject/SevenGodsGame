// v1.0.1 Fast Gate RC：敵 ★（EnemyDef.rank）再付番の根拠を実測 matrix から再集計する（監査用。ゲームコードではない）。
//
//   node scripts/v1_0_1-rc/star-reeval.mjs [matrixJsonPath] [outJsonPath]
//
// 入力：enemy-audit の `docs/evidence/enemy-star-audit/matrix.json`（14,112 局・v1.0.0 engine）。
// 規則（案 A＝`docs/ENEMY_STAR_REEVAL_PREP_V1.md` §2）：
//   1. normal の全体指数（6 打ち筋平均・`index.normal`）で 7 体を降順
//   2. 同点は hard の指数（`index.hard`）で割る
//   3. 上位 2 体＝★4・次 2 体＝★3・次 2 体＝★2・最下位＝★1（★5 は Boss 予約・付けない）
// 出力：★ 新旧対応・順位・初級（h-balanced）normal／hard の敗北率と平均残 HP・Spearman ρ（新旧 ★ vs 指数）・
//       `candidates.json` 案 A との一致。`src/core/data/enemies.ts` の rank と `enemies.test.ts` の golden はこの出力に従う。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const matrixPath = process.argv[2] ?? 'C:/Users/kimi1/SevenGodsGame-enemy-audit/docs/evidence/enemy-star-audit/matrix.json'
const outPath = process.argv[3] ?? 'docs/evidence/v1_0_1-rc/star-reeval.json'
const m = JSON.parse(readFileSync(matrixPath, 'utf8'))

const NAMES = {
  enemy_01: '試練の影',
  enemy_02: '業斧の鬼将',
  enemy_03: '藍花の怨霊',
  enemy_04: '銀甲の機工師',
  enemy_05: '双牙の魔獣',
  enemy_06: '蒼海の龍神',
  enemy_07: '乱舞の道化',
}
const CURRENT = { enemy_01: 1, enemy_02: 2, enemy_03: 3, enemy_04: 4, enemy_05: 2, enemy_06: 3, enemy_07: 4 }
/** 案 A（ENEMY_STAR_REEVAL_PREP_V1.md §0）の期待値。再集計と一致するかを機械確認する */
const PLAN_A = { enemy_06: 4, enemy_03: 4, enemy_05: 3, enemy_02: 3, enemy_01: 2, enemy_04: 2, enemy_07: 1 }
const QUARTILE_STARS = [4, 4, 3, 3, 2, 2, 1]
const PLAYER_MAX_HP = { easy: 35, normal: 30, hard: 27 }

const ids = Object.keys(NAMES)
const order = [...ids].sort((a, b) => m.index.normal[b] - m.index.normal[a] || m.index.hard[b] - m.index.hard[a])
const star = Object.fromEntries(order.map((id, i) => [id, QUARTILE_STARS[i]]))

/** Spearman ρ（同点は平均順位） */
function ranks(values) {
  const sorted = [...values].map((v, i) => [v, i]).sort((x, y) => y[0] - x[0])
  const r = new Array(values.length)
  let i = 0
  while (i < sorted.length) {
    let j = i
    while (j + 1 < sorted.length && sorted[j + 1][0] === sorted[i][0]) j++
    const avg = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) r[sorted[k][1]] = avg
    i = j + 1
  }
  return r
}
function spearman(a, b) {
  const ra = ranks(a)
  const rb = ranks(b)
  const n = a.length
  const ma = ra.reduce((s, v) => s + v, 0) / n
  const mb = rb.reduce((s, v) => s + v, 0) / n
  let num = 0
  let da = 0
  let db = 0
  for (let i = 0; i < n; i++) {
    num += (ra[i] - ma) * (rb[i] - mb)
    da += (ra[i] - ma) ** 2
    db += (rb[i] - mb) ** 2
  }
  return Math.round((num / Math.sqrt(da * db)) * 100) / 100
}
/** ★ が異なる 2 体の組について、★ の大小と指数の大小が一致する数 */
function pairAgreement(starMap, index) {
  let total = 0
  let agree = 0
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i]
      const b = ids[j]
      if (starMap[a] === starMap[b]) continue
      total++
      if (Math.sign(starMap[a] - starMap[b]) === Math.sign(index[a] - index[b])) agree++
    }
  }
  return `${agree}/${total}`
}

const rows = order.map((id, i) => {
  const hbN = m.byEnemyDiffLine[`${id}:normal:h-balanced`]
  const hbH = m.byEnemyDiffLine[`${id}:hard:h-balanced`]
  const allN = m.byEnemyDiff[`${id}:normal`]
  const allH = m.byEnemyDiff[`${id}:hard`]
  return {
    id,
    name: NAMES[id],
    orderNormal: i + 1,
    currentRank: CURRENT[id],
    newRank: star[id],
    planA: PLAN_A[id],
    matchesPlanA: star[id] === PLAN_A[id],
    normalIndex: m.index.normal[id],
    hardIndex: m.index.hard[id],
    easyIndex: m.index.easy[id],
    all6Lines: {
      normal: { winPct: allN.winPct, lossPct: allN.lossPct, avgHpAll: allN.avgHpAll, avgKillRound: allN.avgKillRound },
      hard: { winPct: allH.winPct, lossPct: allH.lossPct, avgHpAll: allH.avgHpAll, avgKillRound: allH.avgKillRound },
    },
    hBalanced: {
      normal: { winPct: hbN.winPct, lossPct: hbN.lossPct, avgHpAll: hbN.avgHpAll, remainRatio: Math.round((hbN.avgHpAll / PLAYER_MAX_HP.normal) * 1000) / 1000 },
      hard: { winPct: hbH.winPct, lossPct: hbH.lossPct, avgHpAll: hbH.avgHpAll, remainRatio: Math.round((hbH.avgHpAll / PLAYER_MAX_HP.hard) * 1000) / 1000 },
    },
  }
})

const evalFor = (starMap) => ({
  spearmanVsIndex: {
    easy: spearman(ids.map((id) => starMap[id]), ids.map((id) => m.index.easy[id])),
    normal: spearman(ids.map((id) => starMap[id]), ids.map((id) => m.index.normal[id])),
    hard: spearman(ids.map((id) => starMap[id]), ids.map((id) => m.index.hard[id])),
  },
  spearmanVsHBalancedLoss: {
    normal: spearman(ids.map((id) => starMap[id]), ids.map((id) => m.byEnemyDiffLine[`${id}:normal:h-balanced`].lossPct)),
    hard: spearman(ids.map((id) => starMap[id]), ids.map((id) => m.byEnemyDiffLine[`${id}:hard:h-balanced`].lossPct)),
  },
  pairAgreement: { normal: pairAgreement(starMap, m.index.normal), hard: pairAgreement(starMap, m.index.hard) },
  distribution: [1, 2, 3, 4, 5].map((s) => ids.filter((id) => starMap[id] === s).length),
})

const allMatch = rows.every((r) => r.matchesPlanA)
const out = {
  meta: {
    generatedAt: new Date().toISOString(),
    source: matrixPath,
    sourceEngine: m.meta.engine,
    sourceGeneratedAt: m.meta.generatedAt,
    engineRuns: m.meta.engineRuns,
    seeds: m.meta.seeds.length,
    lines: m.meta.lines,
    indexFormula: m.meta.indexFormula,
    rule: '案 A：normal 全体指数（6 打ち筋平均）降順・同点は hard 指数・4/4/3/3/2/2/1（★5 は Boss 予約）',
    playerMaxHp: PLAYER_MAX_HP,
  },
  orderNormalDesc: order,
  rankById: Object.fromEntries(ids.map((id) => [id, star[id]])),
  matchesPlanA: allMatch,
  tiesInNormalIndex: ids.filter((a) => ids.some((b) => a !== b && m.index.normal[a] === m.index.normal[b])),
  rows,
  eval: { current: evalFor(CURRENT), new: evalFor(star) },
}
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n')

console.log('順位 | 敵 | id | 旧★ | 新★ | 案A | normal指数 | hard指数 | 初級 敗北% n/h | 初級 残HP n/h')
for (const r of rows) {
  console.log(
    `${r.orderNormal} | ${r.name} | ${r.id} | ${r.currentRank} | ${r.newRank} | ${r.planA}${r.matchesPlanA ? '' : ' (MISMATCH)'} | ${r.normalIndex} | ${r.hardIndex} | ${r.hBalanced.normal.lossPct}/${r.hBalanced.hard.lossPct} | ${r.hBalanced.normal.avgHpAll}/${r.hBalanced.hard.avgHpAll}`,
  )
}
console.log('matchesPlanA =', allMatch, '| ties(normal) =', JSON.stringify(out.tiesInNormalIndex))
console.log('eval current =', JSON.stringify(out.eval.current))
console.log('eval new     =', JSON.stringify(out.eval.new))
console.log('written', outPath)
process.exit(allMatch ? 0 : 1)

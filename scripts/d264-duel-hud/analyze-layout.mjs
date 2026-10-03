// 決定264 Fast Gate（決定261 analyze-layout の写し＋HUD 実寸・神÷敵 面積・はみ出し）— runs-layout/*.json を集計して G1/G2/G3/G4/G5/G7/G8/G9（＋入口時刻）を判定する（手入力なし）
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
const DIR = 'docs/evidence/decision264/layout/runs-layout'
const recs = readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')))
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN)
const min = (xs) => Math.min(...xs), max = (xs) => Math.max(...xs)
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : '—'), f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : '—')
const groups = {}
for (const r of recs) (groups[`${r.vp}/${r.side}`] ??= []).push(r)
const L = []
L.push('# 決定264 Fast Gate — layout 集計（runs-layout JSON から自動生成）', '')
L.push(`runs: ${recs.length}（${Object.entries(groups).map(([k, v]) => `${k} ${v.length}`).join('・')}）`, '')
L.push('## A. 面積（画面比 %）・キャラ÷カード高・敵–神 ink 間隔（px）・OTOMO÷敵', '')
L.push('| vp/side | n | 敵 % mean(min–max) | 神 % | OTOMO % | カード %/枚 | 敵÷カード高 | 神÷カード高 | 神÷敵 | OTOMO÷敵 | 間隔 mean(min–max) |')
L.push('|---|---|---|---|---|---|---|---|---|---|---|')
const summary = {}
for (const [k, v] of Object.entries(groups).sort()) {
  const a = (sel) => v.map(sel)
  const row = { n: v.length, enemy: mean(a((r) => r.m.area.enemy)), enemyMin: min(a((r) => r.m.area.enemy)), enemyMax: max(a((r) => r.m.area.enemy)), god: mean(a((r) => r.m.area.god)), godMin: min(a((r) => r.m.area.god)), otomo: mean(a((r) => r.m.area.otomo)), otomoMax: max(a((r) => r.m.area.otomo)), card: mean(a((r) => r.m.area.card)), epc: mean(a((r) => r.m.ratio.enemyPerCard)), epcMin: min(a((r) => r.m.ratio.enemyPerCard)), gpc: mean(a((r) => r.m.ratio.godPerCard)), gpcMin: min(a((r) => r.m.ratio.godPerCard)), gpe: mean(a((r) => r.m.ratio.godPerEnemy)), ope: mean(a((r) => r.m.ratio.otomoPerEnemy)), gap: mean(a((r) => r.m.gapEnemyGod)), gapMin: min(a((r) => r.m.gapEnemyGod)), gapMax: max(a((r) => r.m.gapEnemyGod)) }
  summary[k] = row
  L.push(`| ${k} | ${row.n} | ${f2(row.enemy)} (${f2(row.enemyMin)}–${f2(row.enemyMax)}) | ${f2(row.god)} (${f2(row.godMin)}–) | ${f2(row.otomo)} (max ${f2(row.otomoMax)}) | ${f2(row.card)} | ${f2(row.epc)} (min ${f2(row.epcMin)}) | ${f2(row.gpc)} (min ${f2(row.gpcMin)}) | ${f2(row.gpe)} | ${f2(row.ope)} | ${f1(row.gap)} (${f1(row.gapMin)}–${f1(row.gapMax)}) |`)
}
L.push('')
L.push('## B. 着弾中心∈ink（G3）・重なり（G4）・反転（G7）・文字切れ／横スクロール（G8）・console（G9）・名札行数', '')
L.push('| vp/side | hit in-ink（敵 slash／数字・神 slash／数字） | 重なり合計（敵–神・敵–手札・神–手札・名札・OTOMO） | scale（HUD／cutin） | clipped 要素 | hScroll | console error | 名札行（敵名／神名／予告）max |')
L.push('|---|---|---|---|---|---|---|---|')
for (const [k, v] of Object.entries(groups).sort()) {
  const cnt = (sel) => v.filter(sel).length
  const ov = (key) => v.reduce((s, r) => s + (r.m.overlap[key] ?? 0), 0)
  const scales = [...new Set(v.map((r) => `${r.m.scale}/${r.m.cutinScaleRule}`))].join(' ')
  L.push(`| ${k} | ${cnt((r) => r.m.hit.enemySlashIn)}/${cnt((r) => r.m.hit.enemyNumberIn)}・${cnt((r) => r.m.hit.godSlashIn)}/${cnt((r) => r.m.hit.godNumberIn)} of ${v.length} | ${ov('enemyGod')}・${ov('enemyHand')}・${ov('godHand')}・${ov('enemyPlates') + ov('godPlates') + ov('otomoPlates')}・${ov('godOtomo') + ov('enemyOtomo')} | ${scales} | ${v.reduce((s, r) => s + r.m.clipped.length, 0)} | ${cnt((r) => r.m.hScroll || r.m.bodyHScroll)} | ${v.reduce((s, r) => s + r.errors.length, 0)} | ${max(v.map((r) => r.m.lines.enemyName))}／${max(v.map((r) => r.m.lines.godName))}／${max(v.map((r) => r.m.lines.intent))} |`)
}
L.push('')
L.push('## C. 入口（決定254）T5 HUD 箱差・操作開放／消滅時刻（G5・G10 の一部）', '')
L.push('| vp/side | 操作開放 ms mean(min–max) | 消滅 ms mean | HUD 箱差（消滅直後 vs +2s）0 の run | 要素別 最大差 px |')
L.push('|---|---|---|---|---|')
for (const [k, v] of Object.entries(groups).sort()) {
  const rel = v.map((r) => r.entrance?.releasedRel).filter((x) => x != null), gone = v.map((r) => r.entrance?.goneRel).filter((x) => x != null)
  let zero = 0, maxd = 0, n = 0
  for (const r of v) { const a = r.entrance?.hudAtGone, b = r.entrance?.hudAfter; if (!a || !b) continue; n++; let d = 0; for (const s of Object.keys(a)) { if (!a[s] || !b[s]) continue; for (let i = 0; i < 4; i++) d = Math.max(d, Math.abs(a[s][i] - b[s][i])) } if (d === 0) zero++; maxd = Math.max(maxd, d) }
  L.push(`| ${k} | ${f1(mean(rel))} (${f1(min(rel))}–${f1(max(rel))}) | ${f1(mean(gone))} | ${zero}/${n} | ${maxd} |`)
}
L.push('')
L.push('## D. per-run 一覧（After のみ・面積と間隔・敵÷カード）', '')
L.push('| run | 敵 % | 神 % | OTOMO % | 敵÷カード | 神÷カード | 間隔 | hit 4/4 | overlap 敵–神 | clipped | errors |'); L.push('|---|---|---|---|---|---|---|---|---|---|---|')
for (const r of recs.filter((r) => r.side === 'after').sort((a, b) => a.key.localeCompare(b.key))) L.push(`| ${r.key} | ${f2(r.m.area.enemy)} | ${f2(r.m.area.god)} | ${f2(r.m.area.otomo)} | ${f2(r.m.ratio.enemyPerCard)} | ${f2(r.m.ratio.godPerCard)} | ${r.m.gapEnemyGod} | ${[r.m.hit.enemySlashIn, r.m.hit.enemyNumberIn, r.m.hit.godSlashIn, r.m.hit.godNumberIn].filter(Boolean).length}/4 | ${r.m.overlap.enemyGod} | ${r.m.clipped.length} | ${r.errors.length} |`)
// ---- 決定264 追加：HUD 実寸（HP・共鳴）Before→After、神÷敵（面積）、アリーナ上端・上部バーへのはみ出し ----
L.push('', '## E. HUD 実寸（px・幅×高。全 run で同値のものは 1 つ）Before → After と倍率（G8）', '')
L.push('| vp | 敵 HP Before | 敵 HP After | 倍率 | 神 HP Before | 神 HP After | 倍率 | 共鳴ゲージ Before | 共鳴ゲージ After | 共鳴高 ≤ HP 高 |'); L.push('|---|---|---|---|---|---|---|---|---|---|')
const uniq = (xs) => [...new Set(xs.map((x) => (x ? `${x[0]}×${x[1]}` : '-')))].join(' / ')
const hudE = {}
for (const vp of [...new Set(recs.map((r) => r.vp))]) {
  const b = recs.filter((r) => r.vp === vp && r.side === 'before'), a = recs.filter((r) => r.vp === vp && r.side === 'after')
  const w = (rs, k) => mean(rs.map((r) => r.m.hud?.[k]?.[0]).filter((x) => x != null))
  const ratio = (k) => w(a, k) / w(b, k)
  const resoOk = a.every((r) => r.m.hud.reso && r.m.hud.enemyHp && r.m.hud.reso[1] <= r.m.hud.enemyHp[1])
  hudE[vp] = { enemyHpBefore: w(b, 'enemyHp'), enemyHpAfter: w(a, 'enemyHp'), godHpBefore: w(b, 'godHp'), godHpAfter: w(a, 'godHp'), enemyRatio: ratio('enemyHp'), godRatio: ratio('godHp'), resoBefore: w(b, 'reso'), resoAfter: w(a, 'reso') }
  L.push(`| ${vp} | ${uniq(b.map((r) => r.m.hud.enemyHp))} | ${uniq(a.map((r) => r.m.hud.enemyHp))} | ×${f2(ratio('enemyHp'))} | ${uniq(b.map((r) => r.m.hud.godHp))} | ${uniq(a.map((r) => r.m.hud.godHp))} | ×${f2(ratio('godHp'))} | ${uniq(b.map((r) => r.m.hud.reso))} | ${uniq(a.map((r) => r.m.hud.reso))} | ${resoOk ? 'PASS' : 'FAIL'} |`)
}
L.push('', '## F. 神÷敵（ink 面積）per 組（G1 新規指標・合格 0.9〜1.15）・--artScale・アリーナ上端からのはみ出し px・上部バー重なり', '')
L.push('| run | Before 神÷敵 | After 神÷敵 | 判定 | artScale | 上端はみ出し | 上部バー重なり |'); L.push('|---|---|---|---|---|---|---|')
const gF = {}
for (const r of recs.filter((r) => r.side === 'after').sort((a, b) => a.key.localeCompare(b.key))) {
  const b = recs.find((x) => x.side === 'before' && x.vp === r.vp && x.god === r.god && x.enemy === r.enemy)
  const ge = r.m.area.god / r.m.area.enemy, gb = b ? b.m.area.god / b.m.area.enemy : NaN
  const ok = ge >= 0.9 && ge <= 1.15
  ;(gF[r.vp] ??= { pass: 0, n: 0, min: 9, max: 0 }); gF[r.vp].n++; if (ok) gF[r.vp].pass++; gF[r.vp].min = Math.min(gF[r.vp].min, ge); gF[r.vp].max = Math.max(gF[r.vp].max, ge)
  L.push(`| ${r.key.replace('after-', '')} | ${f2(gb)} | ${f2(ge)} | ${ok ? 'PASS' : 'out'} | ${r.m.hud.artScale} | ${r.m.overlap.enemyOutOfArena ?? '-'} | ${(r.m.overlap.enemyTopbar ?? 0) + (r.m.overlap.godTopbar ?? 0)} |`)
}
L.push('', '| vp | 神÷敵 0.9〜1.15 の組 | min | max |'); L.push('|---|---|---|---|')
for (const [vp, g] of Object.entries(gF)) L.push(`| ${vp} | ${g.pass}/${g.n} | ${f2(g.min)} | ${f2(g.max)} |`)
summary.hud = hudE; summary.godPerEnemyArea = gF
writeFileSync('docs/evidence/decision264/layout/LAYOUT_SUMMARY.md', L.join('\n'))
writeFileSync('docs/evidence/decision264/layout/layout-summary.json', JSON.stringify(summary, null, 1))
console.log(L.slice(0, 40).join('\n'))

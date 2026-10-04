// 決定266：measure-hand の runs/*.json → Before／After 数表と AC1〜AC7 判定（HAND_SUMMARY.md・hand-summary.json）
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
const DIR = 'docs/evidence/decision266/hand'
const recs = readdirSync(`${DIR}/runs`).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(`${DIR}/runs/${f}`, 'utf8')))
const VP_ORDER = ['pc660', 'pc800', 'pc900', 'pc1024', 'sp844', 'sp660']
const AC_VPS = ['pc660', 'pc800', 'sp844', 'sp660']
const spread = (xs) => { const v = xs.filter((x) => typeof x === 'number'); return v.length ? Math.round((Math.max(...v) - Math.min(...v)) * 10) / 10 : null }
const f = (x) => (x == null ? '—' : String(x))
const L = ['# 決定266 手札枚数別 実測（Playwright・大耀 × 蒼海の龍神・seed d266-hand）', '',
  'Before＝:4302（決定264 `0b6c332`）／After＝:4303（決定266）。手札はカードを出さずにラウンドを終えて自然に増やす（R1=5・R2=7・R3=9・R4=10）。', '',
  '| VP | side | 手札 | Arena 高 | Dock 高 | 敵 ink 高×幅 | 神 ink 高×幅 | 敵 HP 幅×高 | 神 HP 幅×高 | intent 高／font | 共鳴 幅×高 | 当たり | 横スク |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|']
const summary = {}
for (const vp of VP_ORDER) for (const side of ['before', 'after']) {
  const r = recs.find((x) => x.vp === vp && x.side === side)
  if (!r) continue
  for (const s of r.steps) {
    const p = s.p
    L.push(`| ${vp} | ${side} | ${s.n} | ${f(p.arena?.h)} | ${f(p.dock?.h)} | ${f(s.ink.enemy?.h)}×${f(s.ink.enemy?.w)} | ${f(s.ink.god?.h)}×${f(s.ink.god?.w)} | ${f(p.enemyHp?.w)}×${f(p.enemyHp?.h)} | ${f(p.godHp?.w)}×${f(p.godHp?.h)} | ${f(p.intent?.h)}／${f(p.intentFont)} | ${f(p.reso?.w)}×${f(p.reso?.h)} | ${s.hits.filter((h) => h.hit).length}/${s.hits.length} | ${s.hScroll ? 'あり' : '0'} |`)
  }
  const st = r.steps
  const g = (fn) => spread(st.map(fn))
  summary[`${side}-${vp}`] = {
    counts: st.map((s) => s.n),
    arenaH: g((s) => s.p.arena?.h), dockH: g((s) => s.p.dock?.h),
    enemyInkH: g((s) => s.ink.enemy?.h), enemyInkW: g((s) => s.ink.enemy?.w), godInkH: g((s) => s.ink.god?.h), godInkW: g((s) => s.ink.god?.w),
    hp: Math.max(...['enemyHp', 'godHp'].flatMap((k) => ['x', 'y', 'w', 'h'].map((a) => g((s) => s.p[k]?.[a]) ?? 0))),
    intentH: g((s) => s.p.intent?.h), intentFont: [...new Set(st.map((s) => s.p.intentFont))],
    reso: Math.max(g((s) => s.p.reso?.w) ?? 0, g((s) => s.p.reso?.h) ?? 0),
    hitsAll: st.every((s) => s.hits.every((h) => h.hit)), click: r.clickTest,
    hScroll: st.some((s) => s.hScroll), clipped: st.reduce((a, s) => a + s.clipped.length, 0), errors: r.errors.length,
  }
}
L.push('', '## 枚数 5→10 の変動幅（max−min）', '', '| VP | side | Arena | Dock | 敵 ink 高 | 敵 ink 幅 | 神 ink 高 | 神 ink 幅 | HP 箱（最大） | intent 高 | intent font | 共鳴（最大） | 全カード当たり | click 反応 | 横スク | 文字切れ | console error |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
for (const [k, s] of Object.entries(summary)) {
  const [side, vp] = k.split('-')
  L.push(`| ${vp} | ${side} | ${s.arenaH} | ${s.dockH} | ${s.enemyInkH} | ${s.enemyInkW} | ${s.godInkH} | ${s.godInkW} | ${s.hp} | ${s.intentH} | ${s.intentFont.join(',')} | ${s.reso} | ${s.hitsAll ? 'PASS' : 'FAIL'} | ${s.click?.reacted ? 'PASS' : 'FAIL'} | ${s.hScroll ? 'あり' : '0'} | ${s.clipped} | ${s.errors} |`)
}
// AC 判定（After・AC 対象 4 VP。pc900／pc1024 は参考）
const A = (vp) => summary[`after-${vp}`]
const ac = {
  AC1: AC_VPS.every((vp) => A(vp) && A(vp).arenaH <= 4),
  AC2: AC_VPS.every((vp) => A(vp) && Math.max(A(vp).enemyInkH, A(vp).enemyInkW, A(vp).godInkH, A(vp).godInkW) <= 2),
  AC3: AC_VPS.every((vp) => A(vp) && A(vp).hp <= 0.5),
  AC4: AC_VPS.every((vp) => A(vp) && A(vp).intentH <= 0.5 && A(vp).intentFont.length === 1),
  AC5: AC_VPS.every((vp) => A(vp) && A(vp).reso <= 0.5),
  AC6: AC_VPS.every((vp) => A(vp) && A(vp).hitsAll && A(vp).click?.reacted),
  AC7: AC_VPS.every((vp) => A(vp) && !A(vp).hScroll && A(vp).clipped === 0 && A(vp).errors === 0),
  ref_pc900_pc1024: ['pc900', 'pc1024'].every((vp) => A(vp) && A(vp).arenaH <= 4 && A(vp).hitsAll && !A(vp).hScroll && A(vp).errors === 0),
}
L.push('', '## AC 判定（After・pc660／pc800／sp844／sp660。pc900／pc1024 は参考）', '', ...Object.entries(ac).map(([k, v]) => `- ${k}: ${v ? 'PASS' : 'FAIL'}`))
writeFileSync(`${DIR}/HAND_SUMMARY.md`, L.join('\n') + '\n')
writeFileSync(`${DIR}/hand-summary.json`, JSON.stringify({ summary, ac }, null, 1))
console.log(L.slice(-40).join('\n'))

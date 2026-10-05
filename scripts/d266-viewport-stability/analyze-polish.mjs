// 決定266 §Polish：polish/runs/*.json（PC 6 VP × Before/After）と polish/sp/runs（SP After 再実測）→ POLISH_SUMMARY.md・polish-summary.json
// Before＝runtime 9c6596a（Polish 前の :4303）／After＝Polish 後の :4303
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
const DIR = 'docs/evidence/decision266/polish'
const load = (d) => readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(`${d}/${f}`, 'utf8')))
const recs = load(`${DIR}/runs`)
const VPS = ['pc1024x660', 'pc1280x660', 'pc1508x660', 'pc1024x800', 'pc1280x800', 'pc1508x800']
const spread = (xs) => { const v = xs.filter((x) => typeof x === 'number'); return v.length ? Math.round((Math.max(...v) - Math.min(...v)) * 10) / 10 : null }
const L = ['# 決定266 §Polish — PC 多枚数手札の視認性（Playwright 実測・大耀 × 蒼海の龍神・seed d266-hand）', '',
  'Before＝runtime `9c6596a`（Polish 前の :4303）／After＝Polish 後の :4303。手札はカードを出さずにラウンドを終えて 5→7→9→10 枚。', '',
  '## A. 手札枚数別（Arena 高・送り幅・重なり・名前／コスト珠／中心が自分に当たる枚数・名前の行数）', '',
  '| VP | side | 手札 | Arena 高 | 送り幅 px | 重なり px | 名前 | コスト珠 | 中心 | 名前 2 行 | 本文はみ出し |', '|---|---|---|---|---|---|---|---|---|---|---|']
const sum = {}
for (const vp of VPS) for (const side of ['before', 'after']) {
  const r = recs.find((x) => x.vp === vp && x.side === side)
  if (!r) continue
  for (const s of r.steps) {
    const p0 = s.per[0]
    L.push(`| ${vp} | ${side} | ${s.n} | ${s.arena?.h} | ${p0?.step ?? '—'} | ${p0?.overlap != null ? Math.max(0, p0.overlap) : '—'} | ${s.per.filter((p) => p.nameHit).length}/${s.n} | ${s.per.filter((p) => p.costHit).length}/${s.n} | ${s.per.filter((p) => p.centerHit).length}/${s.n} | ${s.per.filter((p) => p.nameLines >= 2).length} | ${s.clipped.length} |`)
  }
  const last = r.steps.at(-1)
  const lift = r.hover.map((h) => h.lift), flift = r.focus.map((h) => h.lift)
  sum[`${side}-${vp}`] = {
    arenaSpread: spread(r.steps.map((s) => s.arena?.h)),
    // intent の幅は予告の文言（ラウンドごとに変わる）で変わるため x／y／h のみ
    hudSpread: Math.max(...['enemyHp', 'godHp', 'intent', 'reso'].flatMap((k) => (k === 'intent' ? ['x', 'y', 'h'] : ['x', 'y', 'w', 'h']).map((a) => spread(r.steps.map((s) => s[k]?.[a])) ?? 0))),
    overlap10: Math.max(0, last.per[0]?.overlap ?? 0), step10: last.per[0]?.step,
    name10: `${last.per.filter((p) => p.nameHit).length}/${last.n}`, cost10: `${last.per.filter((p) => p.costHit).length}/${last.n}`, center10: `${last.per.filter((p) => p.centerHit).length}/${last.n}`,
    allNameAll: r.steps.every((s) => s.per.every((p) => p.nameHit && p.costHit && p.centerHit)),
    clipped: r.steps.reduce((a, s) => a + s.clipped.length, 0), hScroll: r.steps.some((s) => s.hScroll),
    hoverFull: `${r.hover.filter((h) => h.full).length}/${r.hover.length}`, hoverInVp: `${r.hover.filter((h) => h.inViewport).length}/${r.hover.length}`, hoverLift: [Math.min(...lift), Math.max(...lift)], hoverTopMin: Math.min(...r.hover.map((h) => h.top)), hoverBottomMax: Math.max(...r.hover.map((h) => h.bottom)),
    focusFull: `${r.focus.filter((h) => h.full && h.focusVisible).length}/${r.focus.length}`, focusInVp: `${r.focus.filter((h) => h.inViewport).length}/${r.focus.length}`, focusLift: [Math.min(...flift), Math.max(...flift)],
    click: r.click, errors: r.errors.length, vh: Number(vp.split('x')[1]),
  }
}
L.push('', '## B. 10 枚・hover／focus（全カードを 1 枚ずつ）', '', '| VP | side | 送り幅 | 重なり | 名前 | コスト | hover 全面表示 | hover viewport 内 | hover 持ち上げ px | hover 上端 min／下端 max | focus 全面表示 | focus 持ち上げ px | click | console |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
for (const [k, s] of Object.entries(sum)) {
  const [side, vp] = k.split('-')
  L.push(`| ${vp} | ${side} | ${s.step10} | ${s.overlap10} | ${s.name10} | ${s.cost10} | ${s.hoverFull} | ${s.hoverInVp} | ${s.hoverLift.join('〜')} | ${s.hoverTopMin}／${s.hoverBottomMax}（vh ${s.vh}） | ${s.focusFull} | ${s.focusLift.join('〜')} | ${s.click?.reacted ? `${s.click.before}→${s.click.after}` : 'FAIL'} | ${s.errors} |`)
}
const A = (vp) => sum[`after-${vp}`]
const ok = (f) => VPS.every((vp) => A(vp) && f(A(vp)))
const ac = {
  AC1_arena: ok((s) => s.arenaSpread === 0 && s.hudSpread === 0),
  AC2_select: ok((s) => s.center10 === '10/10' && s.click?.reacted),
  AC3_nameCost: ok((s) => s.allNameAll),
  AC4_hoverFocusFull: ok((s) => s.hoverFull === '10/10' && s.focusFull === '10/10' && s.focusLift[0] > 0 && s.hoverLift[0] > 0),
  AC5_inViewport: ok((s) => s.hoverInVp === '10/10' && s.focusInVp === '10/10'),
  noClipNoScrollNoError: ok((s) => s.clipped === 0 && !s.hScroll && s.errors === 0),
}
// AC7：SP の After 再実測を Polish 前の After（hand/runs/after-sp*.json）と比較（レイアウト箱が同値か）
const spRows = []
let spSame = true
for (const vp of ['sp844', 'sp660']) {
  const a = `docs/evidence/decision266/hand/runs/after-${vp}.json`, b = `${DIR}/sp/runs/after-${vp}.json`
  if (!existsSync(a) || !existsSync(b)) { spSame = false; spRows.push(`| ${vp} | 欠測 |`); continue }
  const ra = JSON.parse(readFileSync(a, 'utf8')), rb = JSON.parse(readFileSync(b, 'utf8'))
  // 立ち絵（enemyAvatar／godAvatar）は待機（呼吸）アニメで測定時刻により ±1px 揺れる＝完全一致ではなく差 ≤1px で判定
  const keys = ['arena', 'dock', 'hand', 'enemyHp', 'godHp', 'intent', 'reso']
  let avatarMax = 0
  let diff = 0, cmp = 0
  for (let i = 0; i < Math.min(ra.steps.length, rb.steps.length); i++) {
    for (const k of keys) { cmp++; if (JSON.stringify(ra.steps[i].p[k]) !== JSON.stringify(rb.steps[i].p[k])) diff++ }
    for (const k of ['enemyAvatar', 'godAvatar']) for (const a2 of ['x', 'y', 'w', 'h']) avatarMax = Math.max(avatarMax, Math.abs((ra.steps[i].p[k]?.[a2] ?? 0) - (rb.steps[i].p[k]?.[a2] ?? 0)))
    cmp++; if (JSON.stringify(ra.steps[i].p.cardBoxes) !== JSON.stringify(rb.steps[i].p.cardBoxes)) diff++
    cmp++; if (JSON.stringify(ra.steps[i].p.handScroll) !== JSON.stringify(rb.steps[i].p.handScroll)) diff++
  }
  avatarMax = Math.round(avatarMax * 10) / 10
  if (diff || avatarMax > 1) spSame = false
  spRows.push(`| ${vp} | ${rb.steps.map((s) => s.n).join('→')} | ${cmp - diff}/${cmp}（立ち絵の箱 最大差 ${avatarMax}px） | ${rb.steps.map((s) => s.p.arena.h).join('/')} | ${rb.clickTest?.reacted ? 'PASS' : 'FAIL'} | ${rb.errors.length} |`)
}
ac.AC7_sp = spSame
L.push('', '## C. SP（<900px）After 再実測 ↔ Polish 前の After（同一 seed・各枚数）', '', '| VP | 手札 | 箱の一致（Arena・dock・hand・HP・intent・共鳴・全カード箱・横スクロール量） | Arena 高 | click | console |', '|---|---|---|---|---|---|', ...spRows)
L.push('', '## AC 判定（After・PC 6 VP。AC6／AC8 は別ファイル）', '', ...Object.entries(ac).map(([k, v]) => `- ${k}: ${v ? 'PASS' : 'FAIL'}`))
writeFileSync(`${DIR}/POLISH_SUMMARY.md`, L.join('\n') + '\n')
writeFileSync(`${DIR}/polish-summary.json`, JSON.stringify({ sum, ac }, null, 1))
console.log(L.slice(L.indexOf('## B. 10 枚・hover／focus（全カードを 1 枚ずつ）')).join('\n'))

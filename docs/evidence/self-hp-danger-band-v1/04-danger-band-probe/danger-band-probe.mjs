// 神 HP 危険帯 static v1 のブラウザ probe（Playwright chromium・headless・1 browser 直列）。
//   node danger-band-probe.mjs <outDir> <afterBase> <beforeBase>
// 盤面：大耀 × 指定敵・seed 固定・札を 1 枚も出さず「ラウンドを終える」だけ押して HP を落とす。
//   juuma（双牙の魔獣 9/10/12）：R1 末 21（high）→ R2 末 11（half）
//   trial（試練の影 5/8/11）  ：R1 末 25 → R2 末 17（high）→ R3 末 6（quarter）
// 各ラウンド末（敵ターン後・settle 後）に神 HP バーを計測：帯クラス・fill 色・枠（box-shadow）・記号・数字・コントラスト・箱。
// Before（v1.0.5）は同じ盤面で箱（.player-plate／.hp-bar／.hp-bar-label-text）を測り After と比べる（寸法不変の証明）。
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'file:///C:/Users/kimi1/SevenGodsGame-v105rc/node_modules/playwright/index.mjs'

const [outDir, afterBase, beforeBase] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })

const VIEWPORTS = [
  { id: 'pc', viewport: { width: 1508, height: 660 }, isMobile: false },
  { id: 'sp375', viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
]
const CASES = [
  { enemy: 'juuma', name: '双牙の魔獣', rounds: 2, expect: ['high', 'half'] },
  { enemy: 'trial', name: '試練の影', rounds: 3, expect: ['high', 'high', 'quarter'] },
]

const MEASURE = `(() => {
  const parse = (s) => { const m = s.match(/rgba?\\(\\s*([\\d.]+)[, ]+([\\d.]+)[, ]+([\\d.]+)(?:[,/ ]+([\\d.]+))?\\s*\\)/); return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null }
  const lum = (c) => { const ch = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }; return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b) }
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); const [h, l] = l1 >= l2 ? [l1, l2] : [l2, l1]; return (h + 0.05) / (l + 0.05) }
  const comp = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 })
  const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map((v) => +v.toFixed(1)) }
  const panel = document.querySelector('.player-panel')
  const plate = document.querySelector('.player-plate')
  const bar = plate && plate.querySelector('.hp-bar')
  const fill = bar && bar.querySelector('.hp-bar-fill')
  const text = bar && bar.querySelector('.hp-bar-label-text')
  const marker = bar && bar.querySelector('.hp-bar-marker')
  const enemyBar = document.querySelector('.enemy-plate .hp-bar')
  const f = fill && parse(getComputedStyle(fill).backgroundColor)
  const p = text && parse(getComputedStyle(text).backgroundColor)
  const t = text && parse(getComputedStyle(text).color)
  const avatar = document.querySelector('.player-avatar')
  return {
    panelClass: panel ? panel.className : null,
    barClass: bar ? bar.className : null,
    fill: fill ? getComputedStyle(fill).backgroundColor : null,
    fillWidth: fill ? fill.style.width : null,
    barShadow: bar ? getComputedStyle(bar).boxShadow : null,
    barAnimation: bar ? getComputedStyle(bar).animationName : null,
    marker: marker ? marker.textContent : null,
    markerAriaHidden: marker ? marker.getAttribute('aria-hidden') : null,
    label: text ? text.textContent : null,
    contrastOnFill: f && p && t ? +ratio(t, comp(p, f)).toFixed(2) : null,
    markerContrast: marker && p && t ? +ratio(parse(getComputedStyle(marker).color), comp(p, f)).toFixed(2) : null,
    enemyBarClass: enemyBar ? enemyBar.className : null,
    enemyBarShadow: enemyBar ? getComputedStyle(enemyBar).boxShadow : null,
    avatarFilter: avatar ? getComputedStyle(avatar).filter : null,
    rects: { panel: rect(panel), plate: rect(plate), bar: rect(bar), text: rect(text), fill: rect(fill), enemyBar: rect(enemyBar) },
    docScrollW: document.documentElement.scrollWidth, innerW: innerWidth,
  }
})()`

async function clickText(page, text, timeout = 8000) { await page.getByRole('button', { name: text }).first().click({ timeout }) }
async function maybeClick(page, text) { const l = page.getByRole('button', { name: text }).first(); if (await l.isVisible().catch(() => false)) await l.click({ timeout: 3000 }).catch(() => {}) }
const waitEndRound = (page) => page.waitForFunction(() => { const e = document.querySelector('.end-round-button'); return e && !e.disabled }, null, { timeout: 30000 })

async function runCase(base, side, vp, c) {
  const context = await chromium.newContext ? null : null
  void context
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: vp.viewport, isMobile: vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: vp.deviceScaleFactor ?? 1, reducedMotion: 'no-preference' })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  const url = base + '/?seed=hpband-' + c.enemy
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
  await page.goto(url, { waitUntil: 'networkidle' })
  await maybeClick(page, 'わかった')
  await clickText(page, '神を選ぶ')
  await maybeClick(page, '新しく始める')
  await clickText(page, '大耀')
  await clickText(page, 'この構成で始める')
  await clickText(page, c.name)
  await page.waitForSelector('.deck-builder-card-stepper button', { timeout: 8000 })
  await clickText(page, 'この構成でバトル開始')
  await page.waitForSelector('.player-plate .hp-bar-label-text', { timeout: 15000 })
  await waitEndRound(page)
  await page.waitForTimeout(1500)
  const rounds = [{ round: 1, phase: 'start', ...(await page.evaluate(MEASURE)) }]
  for (let r = 1; r <= c.rounds; r++) {
    await page.getByRole('button', { name: 'ラウンドを終える' }).first().click({ timeout: 8000 })
    await page.waitForTimeout(600)
    await waitEndRound(page).catch(() => {})
    await page.waitForTimeout(1800) // 着弾→stop→HP_LAG→主バー 180ms→ゴースト 460ms を含めて settle
    const m = await page.evaluate(MEASURE)
    rounds.push({ round: r, phase: 'afterEnemyTurn', ...m })
    await page.screenshot({ path: join(outDir, side + '-' + vp.id + '-' + c.enemy + '-R' + r + '.png'), fullPage: false })
  }
  await ctx.close()
  await browser.close()
  return { side, viewport: vp.id, enemy: c.enemy, url, rounds, errors }
}

const bandOf = (m) => (m.panelClass || '').match(/player-band-(\w+)/)?.[1] ?? null
const results = []
for (const vp of VIEWPORTS) for (const c of CASES) {
  const after = await runCase(afterBase, 'after', vp, c)
  const before = await runCase(beforeBase, 'before', vp, c)
  const checks = []
  const check = (name, pass, detail) => checks.push({ name, pass: !!pass, detail })
  const a = after.rounds
  const b = before.rounds
  check('JS error 0 (after)', after.errors.length === 0, after.errors)
  check('JS error 0 (before)', before.errors.length === 0, before.errors)
  // 帯の遷移が期待どおり（R1 開始は high）
  check('R1 start band = high / no marker / green fill', bandOf(a[0]) === 'high' && a[0].marker === null && a[0].fill === 'rgb(77, 189, 116)', { band: bandOf(a[0]), fill: a[0].fill })
  c.expect.forEach((exp, i) => {
    const m = a[i + 1]
    const band = bandOf(m)
    check('R' + (i + 1) + ' band = ' + exp, band === exp, { band, label: m.label, fill: m.fill, barClass: m.barClass })
    if (exp === 'high') {
      check('R' + (i + 1) + ' high: no self class / no marker / green', !/hp-bar-self/.test(m.barClass) && m.marker === null && m.fill === 'rgb(77, 189, 116)', m.barShadow)
    }
    if (exp === 'half') {
      check('R' + (i + 1) + ' half: orange fill #d9a441', m.fill === 'rgb(217, 164, 65)', m.fill)
      check('R' + (i + 1) + ' half: class hp-bar-self-half + marker ▽ (aria-hidden)', /hp-bar-self-half/.test(m.barClass) && (m.marker || '').trim() === '▽' && m.markerAriaHidden === 'true', { barClass: m.barClass, marker: m.marker })
      check('R' + (i + 1) + ' half: 1px orange ring in box-shadow', /rgba\(217, 164, 65, 0\.8\) 0px 0px 0px 1px/.test(m.barShadow), m.barShadow)
    }
    if (exp === 'quarter') {
      check('R' + (i + 1) + ' quarter: orange-red fill #ff7a45', m.fill === 'rgb(255, 122, 69)', m.fill)
      check('R' + (i + 1) + ' quarter: class hp-bar-self-quarter + marker ▼', /hp-bar-self-quarter/.test(m.barClass) && (m.marker || '').trim() === '▼' && m.markerAriaHidden === 'true', { barClass: m.barClass, marker: m.marker })
      check('R' + (i + 1) + ' quarter: 2px ring + 12px glow', /rgba\(255, 122, 69, 0\.8\) 0px 0px 0px 2px/.test(m.barShadow) && /0px 0px 12px/.test(m.barShadow), m.barShadow)
    }
    check('R' + (i + 1) + ' label contrast ≥4.5 on fill', (m.contrastOnFill ?? 0) >= 4.5 && (m.markerContrast ?? 99) >= 4.5, { contrastOnFill: m.contrastOnFill, markerContrast: m.markerContrast })
    check('R' + (i + 1) + ' no animation on .hp-bar', m.barAnimation === 'none', m.barAnimation)
    check('R' + (i + 1) + ' enemy bar untouched (no self class)', !/hp-bar-self/.test(m.enemyBarClass || ''), m.enemyBarClass)
    check('R' + (i + 1) + ' no horizontal overflow', m.docScrollW <= m.innerW, { scrollW: m.docScrollW, innerW: m.innerW })
    // 箱：Before と同一（名札・バー・数字 pill・立ち絵の矩形）
    const bm = b[i + 1]
    for (const k of ['panel', 'plate', 'bar', 'fill', 'enemyBar']) {
      const ra = m.rects[k], rb = bm.rects[k]
      const maxDiff = ra && rb ? Math.max(...ra.map((v, j) => Math.abs(v - rb[j]))) : null
      check('R' + (i + 1) + ' rect ' + k + ' Before/After |Δ| ≤ 0.5px', maxDiff !== null && maxDiff <= 0.5, { after: ra, before: rb, maxDiff })
    }
    // pill の幅は記号 2 文字分だけ広がる（高さは同じ・バーの内側）
    const ta = m.rects.text, tb = bm.rects.text, bar = m.rects.bar
    check('R' + (i + 1) + ' pill height same & inside bar', ta && tb && Math.abs(ta[3] - tb[3]) <= 0.5 && ta[0] >= bar[0] - 0.5 && ta[0] + ta[2] <= bar[0] + bar[2] + 0.5, { after: ta, before: tb, bar })
    check('R' + (i + 1) + ' label number same as Before', (m.label || '').replace(/[▽▼\s]/g, '') === (bm.label || '').replace(/\s/g, ''), { after: m.label, before: bm.label })
    check('R' + (i + 1) + ' Before has no band (regression baseline)', !/player-band-/.test(bm.panelClass || '') && bm.fill === 'rgb(77, 189, 116)', { panelClass: bm.panelClass, fill: bm.fill })
  })
  results.push({ viewport: vp.id, enemy: c.enemy, pass: checks.every((x) => x.pass), checks, after, before })
  console.log(vp.id, c.enemy, checks.every((x) => x.pass) ? 'PASS' : 'FAIL', checks.filter((x) => !x.pass).map((x) => x.name + ' ' + JSON.stringify(x.detail)).join(' | '))
}
const summary = { at: new Date().toISOString(), afterBase, beforeBase, allPass: results.every((r) => r.pass), results }
writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 1))
console.log('ALL', summary.allPass ? 'PASS' : 'FAIL')

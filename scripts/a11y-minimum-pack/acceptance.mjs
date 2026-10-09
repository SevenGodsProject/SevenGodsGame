// A11y Minimum Pack v1：実ブラウザで ①HP 数字のコントラスト ②タップ領域 ③ミュートの aria／キーボード ④Tutorial の Esc・フォーカス を測る。
//   PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/a11y-minimum-pack/acceptance.mjs <outJson> [baseUrl]
// 音は出さない（headless）。storage は各ケースの冒頭で消す。
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const out = args[0]
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:4173'
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const VIEWPORTS = [
  { id: 'pc', viewport: { width: 1508, height: 660 }, isMobile: false },
  { id: 'sp', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { id: 'sp375', viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true },
]

/** WCAG コントラスト（ブラウザ側で計算。src/components/a11y/contrast.ts と同じ式） */
const CONTRAST_JS = `(() => {
  const parse = (s) => { const m = s.match(/rgba?\\(\\s*([\\d.]+)[, ]+([\\d.]+)[, ]+([\\d.]+)(?:[,/ ]+([\\d.]+))?\\s*\\)/); return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null }
  const lum = (c) => { const ch = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }; return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b) }
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); const [h, l] = l1 >= l2 ? [l1, l2] : [l2, l1]; return (h + 0.05) / (l + 0.05) }
  const comp = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 })
  return Array.from(document.querySelectorAll('.hp-bar')).map((bar) => {
    const fill = bar.querySelector('.hp-bar-fill'); const text = bar.querySelector('.hp-bar-label-text')
    if (!fill || !text) return { error: 'missing' }
    const f = parse(getComputedStyle(fill).backgroundColor); const p = parse(getComputedStyle(text).backgroundColor); const t = parse(getComputedStyle(text).color)
    const trough = parse(getComputedStyle(bar).backgroundColor) || { r: 22, g: 32, b: 60, a: 1 }
    const r = text.getBoundingClientRect(); const b = bar.getBoundingClientRect()
    return { fill: getComputedStyle(fill).backgroundColor, pill: getComputedStyle(text).backgroundColor, text: getComputedStyle(text).color,
      onFill: +ratio(t, comp(p, f)).toFixed(2), onTrough: +ratio(t, comp(p, trough)).toFixed(2), noPill: +ratio(t, f).toFixed(2),
      pillH: Math.round(r.height), barH: Math.round(b.height), label: text.textContent }
  })
})()`

async function clickText(page, text, timeout = 8000) { await page.getByRole('button', { name: text }).first().click({ timeout }) }
async function maybeClick(page, text) { const l = page.getByRole('button', { name: text }).first(); if (await l.isVisible().catch(() => false)) await l.click({ timeout: 3000 }).catch(() => {}) }
async function fresh(page) {
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
  await page.goto(base, { waitUntil: 'networkidle' })
}

const browser = await chromium.launch()
const results = []
for (const vp of VIEWPORTS) {
  const context = await browser.newContext({ viewport: vp.viewport, isMobile: vp.isMobile, hasTouch: !!vp.hasTouch })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  const r = { viewport: vp.id, checks: [] }
  const check = (name, pass, detail) => r.checks.push({ name, pass: !!pass, detail })

  // --- ④ Tutorial：本のアイコン → Esc → フォーカス復帰 ---
  await fresh(page)
  await maybeClick(page, 'わかった')
  const help = page.getByRole('button', { name: '遊び方を見る' })
  await help.focus(); await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: '遊び方' })
  check('tutorial opens', await dialog.isVisible().catch(() => false))
  const focusInside = await page.evaluate(() => { const d = document.querySelector('.tutorial-overlay'); return !!d && d.contains(document.activeElement) && document.activeElement.classList.contains('tutorial-card') })
  check('initial focus on dialog card', focusInside)
  const scrollTop = await page.evaluate(() => document.querySelector('.tutorial-card')?.scrollTop ?? -1)
  check('dialog not scrolled to bottom on open', scrollTop === 0, { scrollTop })
  await page.keyboard.press('Tab')
  const tabInside = await page.evaluate(() => !!document.querySelector('.tutorial-overlay')?.contains(document.activeElement))
  check('Tab stays inside dialog', tabInside)
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab')
  const trapInside = await page.evaluate(() => !!document.querySelector('.tutorial-overlay')?.contains(document.activeElement))
  check('Shift+Tab wraps inside dialog', trapInside)
  await page.keyboard.press('Escape')
  check('Escape closes tutorial', !(await dialog.isVisible().catch(() => false)))
  const focusBack = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
  check('focus returns to opener (遊び方を見る)', focusBack === '遊び方を見る', { focusBack })

  // --- ④' Brief から開いた Tutorial：Esc で Tutorial だけ閉じる ---
  await fresh(page)
  await maybeClick(page, 'わかった')
  const firstBattle = page.getByRole('button', { name: /初陣へ/ }).first()
  if (await firstBattle.isVisible().catch(() => false)) {
    await firstBattle.click()
    const briefVisible = await page.getByRole('button', { name: '詳しい遊び方' }).first().isVisible().catch(() => false)
    check('brief opens', briefVisible)
    if (briefVisible) {
      await clickText(page, '詳しい遊び方')
      check('tutorial opens from brief', await dialog.isVisible().catch(() => false))
      await page.keyboard.press('Escape')
      const tutorialClosed = !(await dialog.isVisible().catch(() => false))
      const briefStill = await page.getByRole('button', { name: '詳しい遊び方' }).first().isVisible().catch(() => false)
      check('Escape closes only the tutorial (brief stays)', tutorialClosed && briefStill, { tutorialClosed, briefStill })
      await page.keyboard.press('Escape')
    }
  } else {
    check('brief opens', true, 'skipped: 初陣へ not shown')
  }

  // --- ③ ミュート：aria・クリック・キーボード ---
  await fresh(page)
  await maybeClick(page, 'わかった')
  const mute = page.getByRole('button', { name: 'ミュート' })
  check('mute button has fixed name', (await mute.count()) === 1)
  check('mute aria-pressed=false initially', (await mute.getAttribute('aria-pressed')) === 'false')
  await mute.click()
  check('mute click → aria-pressed=true', (await mute.getAttribute('aria-pressed')) === 'true')
  await mute.focus(); await page.keyboard.press('Space')
  check('mute Space → aria-pressed=false', (await mute.getAttribute('aria-pressed')) === 'false')
  const muteHit = await page.evaluate(() => { const b = document.querySelector('button[aria-label="ミュート"]'); const cs = getComputedStyle(b, '::after'); return { w: parseFloat(cs.width), h: parseFloat(cs.height) } })
  check('mute hit area ≥44 (::after)', muteHit.w >= 44 && muteHit.h >= 44, muteHit)

  // --- ② デッキ stepper の見た目 44px・横はみ出し 0 ---
  await clickText(page, '神を選ぶ')
  await maybeClick(page, '新しく始める')
  await clickText(page, '大耀')
  await clickText(page, 'この構成で始める')
  await clickText(page, '業斧の鬼将')
  // 神 → 難易度確定 → 敵選択 → デッキ構築（stepper はここ）
  await page.waitForSelector('.deck-builder-card-stepper button', { timeout: 8000 })
  const stepper = await page.evaluate(() => { const bs = Array.from(document.querySelectorAll('.deck-builder-card-stepper button')); const rects = bs.map((b) => b.getBoundingClientRect()); return { n: bs.length, minW: Math.min(...rects.map((r) => r.width)), minH: Math.min(...rects.map((r) => r.height)), scrollWidth: document.documentElement.scrollWidth, innerWidth } })
  check('stepper visual ≥44×44', stepper.n > 0 && stepper.minW >= 44 && stepper.minH >= 44, stepper)
  check('deck builder no horizontal overflow', stepper.scrollWidth <= stepper.innerWidth, stepper)

  // --- ① 戦闘：HP 数字のコントラスト・託宣の判定 ---
  await clickText(page, 'この構成でバトル開始')
  await page.waitForSelector('.hp-bar-label-text', { timeout: 15000 })
  await page.waitForFunction(() => { const e = document.querySelector('.end-round-button'); return e && !e.disabled }, null, { timeout: 20000 }).catch(() => {})
  const hp = await page.evaluate(CONTRAST_JS)
  check('two HP bars measured', hp.length >= 2 && hp.every((x) => !x.error), hp)
  for (const x of hp) if (!x.error) check(`HP ${x.label} contrast ≥4.5 on fill (was ${x.noPill})`, x.onFill >= 4.5 && x.onTrough >= 4.5, x)
  const div = await page.evaluate(() => Array.from(document.querySelectorAll('.divination-choice')).map((b) => { const r = b.getBoundingClientRect(); const a = getComputedStyle(b, '::after'); return { w: Math.round(r.width), h: Math.round(r.height), afterH: parseFloat(a.height) } }))
  if (div.length) check('divination hit height ≥44 (::after)', div.every((d) => d.afterH >= 44), div)
  const hitAudit = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button, a[href], [role="button"], [role="radio"]')).filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 })
    const small = []
    for (const e of els) {
      const r = e.getBoundingClientRect(); const a = getComputedStyle(e, '::after')
      const afterOk = a.position === 'absolute' && parseFloat(a.width) >= 44 && parseFloat(a.height) >= 44
      if (!(r.width >= 44 && r.height >= 44) && !afterOk) small.push({ tag: e.tagName, cls: e.className?.toString().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) })
    }
    return { total: els.length, small }
  })
  check('battle: no control under 44px without ::after extension', hitAudit.small.length === 0, hitAudit)
  check('JS error 0', errors.length === 0, errors)
  r.pass = r.checks.every((c) => c.pass)
  results.push(r)
  await context.close()
}
await browser.close()
const summary = { base, at: new Date().toISOString(), allPass: results.every((r) => r.pass), results }
if (out) writeFileSync(out, JSON.stringify(summary, null, 2))
for (const r of results) for (const c of r.checks) console.log(`${c.pass ? 'PASS' : 'FAIL'} [${r.viewport}] ${c.name}${c.pass ? '' : ' ' + JSON.stringify(c.detail).slice(0, 300)}`)
console.log(`RESULT: ${summary.allPass ? 'ALL PASS' : 'FAIL'}`)
process.exit(summary.allPass ? 0 : 1)

// juuma Restoration Pilot / Step 5：実ゲームの enemy box の中で撮る（拡大なしの 100% 判定用）。
//   PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/juuma-restoration/game-capture.mjs <outDir> <baseUrl> <tag>
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const [outDir, base, tag] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const pw = process.env.PLAYWRIGHT_MODULE
const { chromium } = pw ? await import(pathToFileURL(pw).href) : await import('playwright')

const CONDS = [
  ['pc1366-dpr1', 1366, 768, 1, false],
  ['pc1366-dpr2', 1366, 768, 2, false],
  ['pc1508-dpr1', 1508, 660, 1, false],
  ['sp390x760-dpr1', 390, 760, 1, true],
  ['sp390x844-dpr1', 390, 844, 1, true],
  ['sp390x760-dpr2', 390, 760, 2, true],
]
const click = (page, t) => page.evaluate((text) => {
  const el = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(text) && !x.disabled)
  if (!el) return false
  el.click(); return true
}, t)

const browser = await chromium.launch()
const report = []
for (const [cid, w, h, dpr, mobile] of CONDS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile })
  const page = await ctx.newPage()
  try {
    await page.goto(`${base}/?enemy=juuma&seed=restore-pilot`, { waitUntil: 'load' })
    await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
    await page.waitForTimeout(400)
    await click(page, 'わかった'); await page.waitForTimeout(200)
    await click(page, '神を選ぶ'); await page.waitForTimeout(400)
    if (await click(page, '新しく始める')) await page.waitForTimeout(200)
    await click(page, '大耀'); await page.waitForTimeout(300)
    await click(page, 'この構成で始める'); await page.waitForTimeout(400)
    await click(page, '双牙の魔獣'); await page.waitForTimeout(500)
    await click(page, 'この構成でバトル開始')
    await page.waitForSelector('.hand .card-view', { timeout: 20000 })
    await page.waitForFunction(() => { const e = document.querySelector('.end-round-button'); return e && !e.disabled }, null, { timeout: 25000 })
    for (let i = 0; i < 80; i++) {
      if (!(await page.evaluate(() => !!document.querySelector('.boss-entrance, .enemy-cutin')))) break
      await page.screenshot({ path: join(outDir, '_pump.png') })
      await page.waitForTimeout(150)
    }
    await page.evaluate(() => { document.querySelector('.boss-entrance')?.remove(); document.querySelector('.enemy-cutin')?.remove() })
    await page.waitForTimeout(600)
    await page.addStyleTag({ content: '*, *::before, *::after { animation-play-state: paused !important; transition: none !important; }' })
    await page.addStyleTag({ content: '.enemy-reaction-idle, .enemy-reaction, .enemy-avatar { transform: none !important; }' })
    await page.waitForTimeout(200)
    const m = await page.evaluate(() => {
      const el = document.querySelector('.enemy-avatar'); const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height, bg: (getComputedStyle(el).backgroundImage.match(/url\("?([^")]+)"?\)/) ?? [])[1] ?? null }
    })
    const clip = { x: Math.max(0, Math.round(m.x)), y: Math.max(0, Math.round(m.y)), width: Math.round(m.w), height: Math.round(m.h) }
    await page.screenshot({ path: join(outDir, `${cid}-enemy.png`), clip })
    await page.screenshot({ path: join(outDir, `${cid}-full.png`) })
    report.push({ tag, cond: cid, dpr, box: m })
    console.log(`${cid}: box ${m.w.toFixed(1)}x${m.h.toFixed(1)} css (dpr ${dpr})`)
  } catch (e) {
    console.log(`${cid}: ERROR ${String(e).slice(0, 120)}`)
    report.push({ tag, cond: cid, error: String(e).slice(0, 200) })
  }
  await ctx.close()
}
await browser.close()
writeFileSync(join(outDir, 'capture.json'), JSON.stringify(report, null, 2))
console.log('done', outDir)

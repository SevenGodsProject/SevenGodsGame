// Phase 6 Commercial Benchmark Audit v2：セットアップ〜結果までの各画面のスクリーンショット（監査用）。
//   node scripts/phase6-commercial-benchmark/screens.mjs <outDir> [baseUrl]
// PC（1508×660）と SP（390×760）で、First 10 Minutes／神選択／デッキ／敵選択／結果画面を撮る。
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const outDir = args[0] ?? 'cb-screens'
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:5173'
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')
mkdirSync(outDir, { recursive: true })

const VPS = [
  { id: 'pc', viewport: { width: 1508, height: 660 }, isMobile: false },
  { id: 'sp', viewport: { width: 390, height: 760 }, isMobile: true },
]
const browser = await chromium.launch({ headless: true })
for (const vp of VPS) {
  const ctx = await browser.newContext({ viewport: vp.viewport, isMobile: vp.isMobile, hasTouch: vp.isMobile })
  const page = await ctx.newPage()
  const click = (t) =>
    page.evaluate((text) => {
      const el = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(text))
      if (!el) return false
      el.click()
      return true
    }, t)
  const shot = (n, full = false) => page.screenshot({ path: join(outDir, `${vp.id}-${n}.png`), fullPage: full })
  await page.goto(base + '/?enemy=oni&seed=cb-screens')
  await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
  await page.waitForTimeout(800)
  await shot('01-home-tutorial')
  await click('わかった')
  await page.waitForTimeout(300)
  await shot('02-home')
  await click('神を選ぶ')
  await page.waitForTimeout(500)
  await shot('03-godselect')
  await shot('03-godselect-full', true)
  await click('大耀')
  await page.waitForTimeout(300)
  await shot('04-difficulty')
  await click('この構成で始める')
  await page.waitForTimeout(400)
  await shot('05-enemyselect')
  await shot('05-enemyselect-full', true)
  await click('業斧の鬼将')
  await page.waitForTimeout(500)
  await shot('06-deckbuilder')
  await shot('06-deckbuilder-full', true)
  await click('この構成でバトル開始')
  await page.waitForSelector('.hand .card-view', { timeout: 10000 })
  await page.waitForTimeout(400)
  await shot('07-boss-entrance')
  await page.waitForFunction(() => { const c = document.querySelector('.hand .card-view'); return c && !c.disabled }, null, { timeout: 15000 })
  await page.waitForTimeout(300)
  await shot('08-battle-start')
  // ログを開いた状態
  await click('ログ')
  await page.waitForTimeout(200)
  await shot('09-battle-log-open')
  await click('ログ')
  // OTOMO・戦績・Daily 画面
  await page.goto(base + '/')
  await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
  await click('わかった')
  await click('OTOMOとの絆')
  await page.waitForTimeout(400)
  await shot('10-otomo')
  await page.goto(base + '/')
  await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
  await click('わかった')
  await click('戦績')
  await page.waitForTimeout(400)
  await shot('11-record')
  await page.goto(base + '/')
  await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
  await click('わかった')
  await click('今日の神域挑戦')
  await page.waitForTimeout(800)
  await shot('12-daily')
  await ctx.close()
  console.log(vp.id, 'done')
}
await browser.close()

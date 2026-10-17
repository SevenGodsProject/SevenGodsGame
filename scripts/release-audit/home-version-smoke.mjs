// Production Smoke S1：Home が表示され、version ラベル（v<version> (<sha>)）・title・favicon・OGP が配信されていることを read-only で確認する。
//   PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/release-audit/home-version-smoke.mjs <outJson> <baseUrl> <expectVersion> <expectSha>
// localStorage は headless の隔離プロファイル。書き込みは行わない（Home を開くだけ）。
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'

const [outJson, base, expectVersion, expectSha] = process.argv.slice(2)
if (!outJson || !base || !expectVersion || !expectSha) throw new Error('usage: home-version-smoke.mjs <outJson> <baseUrl> <version> <sha>')
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const browser = await chromium.launch()
const results = []
for (const vp of [{ id: 'pc1508', viewport: { width: 1508, height: 660 } }, { id: 'sp390', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]) {
  const ctx = await browser.newContext(vp)
  const page = await ctx.newPage()
  const errors = []
  const failed = []
  const external = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('requestfailed', (r) => failed.push(r.url()))
  page.on('request', (r) => { const u = new URL(r.url()); if (u.origin !== new URL(base).origin) external.push(r.url()) })
  const res = await page.goto(base + '/', { waitUntil: 'networkidle' })
  const status = res?.status()
  const title = await page.title()
  const bodyText = await page.locator('body').innerText()
  const m = bodyText.match(/v(\d+\.\d+\.\d+[^\s()]*)\s*\(([0-9a-f]{7})\)/)
  const favicon = await page.locator('link[rel="icon"]').first().getAttribute('href')
  const og = await page.locator('meta[property="og:title"]').first().getAttribute('content')
  const desc = await page.locator('meta[name="description"]').first().getAttribute('content')
  const hasStart = await page.getByRole('button', { name: /初陣へ|神を選ぶ/ }).first().isVisible().catch(() => false)
  const sw = await page.evaluate(() => document.documentElement.scrollWidth)
  const cw = await page.evaluate(() => document.documentElement.clientWidth)
  mkdirSync(dirname(outJson), { recursive: true })
  await page.screenshot({ path: `${dirname(outJson)}/s1-home-${vp.id}.png`, fullPage: true })
  const checks = [
    ['HTTP 200', status === 200],
    ['title は SEVEN GODS', /SEVEN GODS/.test(title)],
    [`version ラベル v${expectVersion} (${expectSha})`, !!m && m[1] === expectVersion && m[2] === expectSha],
    ['favicon link あり', !!favicon],
    ['og:title あり', !!og],
    ['meta description あり', !!desc],
    ['開始ボタンが見える', hasStart],
    ['横はみ出し 0', sw <= cw],
    ['console error 0', errors.length === 0],
    ['失敗リクエスト 0', failed.length === 0],
    ['外部オリジン通信 0', external.length === 0],
  ].map(([label, pass]) => ({ label, pass }))
  for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'} [${vp.id}] ${c.label}`)
  results.push({ viewport: vp.id, status, title, versionLabel: m ? m[0] : null, favicon, og, desc: desc?.slice(0, 80), errors, failed, external, checks })
  await ctx.close()
}
await browser.close()
const allPass = results.every((r) => r.checks.every((c) => c.pass))
writeFileSync(outJson, JSON.stringify({ base, at: new Date().toISOString(), expectVersion, expectSha, allPass, results }, null, 2))
console.log('RESULT: ' + (allPass ? 'ALL PASS' : 'FAIL'))

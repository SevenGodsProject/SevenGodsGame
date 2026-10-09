// Legal／Credits 画面（CM-02／03）：Home → クレジット・権利表記 → 本文・禁止語・横はみ出し・戻る を PC／SP375 で確認。
//   PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/legal-credits/acceptance.mjs <outJson> [baseUrl]
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const out = args[0]
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:4179'
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const FORBIDDEN = /権利クリア|権利処理済み|許諾済み|ライセンス取得|商用利用可|人間製|公式ボイス|公式の声|神の音声|外部送信なし/
const REQUIRED = ['非公式のファン作品', '公式・公認・提携作品ではありません', 'SEVENGODS Games Creator Kit', 'Suno', '生成 AI', 'localStorage', 'Vercel', '問い合わせ先は準備中', 'SEVENGODS（SGG）二次創作']

const browser = await chromium.launch()
const results = []
for (const vp of [{ id: 'pc', viewport: { width: 1508, height: 660 } }, { id: 'sp375', viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true }]) {
  const context = await browser.newContext(vp)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.evaluate(() => { try { localStorage.clear() } catch {} })
  await page.goto(base, { waitUntil: 'networkidle' })
  const r = { viewport: vp.id, checks: [] }
  const check = (name, pass, detail) => r.checks.push({ name, pass: !!pass, detail })
  const link = page.getByRole('button', { name: 'クレジット・権利表記' })
  check('home link exists (1)', (await link.count()) === 1)
  const linkRect = await link.boundingBox()
  check('home link tap ≥44px', !!linkRect && linkRect.height >= 44, linkRect)
  await link.click()
  const screen = page.getByTestId('credits-screen')
  check('credits screen shown', await screen.isVisible().catch(() => false))
  const text = await screen.innerText().catch(() => '')
  check('no forbidden words in rendered text', !FORBIDDEN.test(text), text.match(FORBIDDEN)?.[0])
  for (const w of REQUIRED) check(`contains: ${w}`, text.includes(w))
  const layout = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth, h1: document.querySelector('.credits-screen .setup-title')?.textContent }))
  check('no horizontal overflow', layout.scrollWidth <= layout.innerWidth, layout)
  check('title', layout.h1 === 'クレジット・権利表記', layout)
  const back = page.getByRole('button', { name: /ホームへ戻る/ })
  const backRect = await back.boundingBox()
  check('back button tap ≥44px', !!backRect && backRect.height >= 44, backRect)
  await back.click()
  check('back to home', await page.getByTestId('home-screen').isVisible().catch(() => false))
  check('localStorage untouched by credits screen', (await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('sevengods.')).length)) === 0)
  check('JS error 0', errors.length === 0, errors)
  await page.screenshot({ path: `docs/evidence/legal-credits/credits-${vp.id}.png`, fullPage: vp.id === 'pc' })
  if (vp.id === 'sp375') { await link.click(); await page.screenshot({ path: 'docs/evidence/legal-credits/credits-sp375.png', fullPage: true }) }
  r.pass = r.checks.every((c) => c.pass)
  results.push(r)
  await context.close()
}
await browser.close()
const summary = { base, at: new Date().toISOString(), allPass: results.every((r) => r.pass), results }
if (out) writeFileSync(out, JSON.stringify(summary, null, 2))
for (const r of results) for (const c of r.checks) console.log(`${c.pass ? 'PASS' : 'FAIL'} [${r.viewport}] ${c.name}${c.pass ? '' : ' ' + JSON.stringify(c.detail).slice(0, 200)}`)
console.log(`RESULT: ${summary.allPass ? 'ALL PASS' : 'FAIL'}`)
process.exit(summary.allPass ? 0 : 1)

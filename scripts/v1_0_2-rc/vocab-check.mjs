// v1.0.2 RC：語彙整合ホットフィックス 3 点（FIRST_PLAYER_TUTORIAL_AUDIT_V1 §10-1 (a)(b)(c)）の実機 DOM 確認（Playwright headless・QA 用。ゲームコードではない）。
//   node scripts/v1_0_2-rc/vocab-check.mjs <outJson> [baseUrl]
// 見るもの（PC 1508×660／SP 375×667）：
//   (b) 遊び方 ① 本文に「得意技」があり「神技」が無い
//   (c) 遊び方 ② の図が SVG グリフ＋「50」（×10 表示値）で、「次の攻撃」「⚔」が無い
//   (a) 戦闘（大耀 × 既定の 1 体目）の共鳴名札が「あと N で神の一撃」で、「神技発動」が無い
//   JS error 0
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const out = args[0]
if (!out) throw new Error('usage: vocab-check.mjs <outJson> [baseUrl]')
const shotDir = dirname(out)
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:4199'
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const VIEWPORTS = [
  { id: 'pc', viewport: { width: 1508, height: 660 } },
  { id: 'sp375', viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
]

async function clickText(page, text, timeout = 8000) {
  await page.getByRole('button', { name: text }).first().click({ timeout })
}
async function maybeClick(page, text) {
  const l = page.getByRole('button', { name: text }).first()
  if (await l.isVisible().catch(() => false)) { await l.click({ timeout: 3000 }).catch(() => {}); return true }
  return false
}

mkdirSync(shotDir, { recursive: true })
const browser = await chromium.launch()
const results = []
for (const vp of VIEWPORTS) {
  const context = await browser.newContext(vp)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  const r = { viewport: vp.id, checks: [], shots: [] }
  const check = (name, pass, detail) => r.checks.push({ name, pass: !!pass, ...(detail !== undefined ? { detail } : {}) })

  await page.goto(base + '/', { waitUntil: 'networkidle' })
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
  await page.goto(base + '/', { waitUntil: 'networkidle' })
  await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
  await page.waitForTimeout(500)

  // ---- 遊び方（初陣へ → 詳しい遊び方）----
  await maybeClick(page, '初陣へ')
  await page.getByTestId('first-battle-brief-lines').waitFor({ timeout: 8000 })
  await clickText(page, '詳しい遊び方')
  const overlay = page.locator('.tutorial-overlay[aria-label="遊び方"]')
  await overlay.waitFor({ timeout: 8000 })
  const dds = await overlay.locator('.tutorial-sections dd').allInnerTexts()
  check('(b) 遊び方 ① に「得意技」がある', /得意技/.test(dds[0] ?? ''), dds[0])
  check('(b) 遊び方 ① に「神技」が無い', !/神技/.test(dds[0] ?? ''), dds[0])
  check('(b) 遊び方 ① は 71 コードポイント', [...(dds[0] ?? '')].length === 71, [...(dds[0] ?? '')].length)
  const fig = await page.evaluate(() => {
    const el = document.querySelector('.tutorial-overlay[aria-label="遊び方"] .tutorial-section:nth-child(2) .tutorial-visual-intent')
    if (!el) return null
    return { text: el.textContent.trim(), svg: el.querySelectorAll('svg.intent-glyph').length, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }
  })
  check('(c) 遊び方 ② の図 = SVG グリフ 1 個 ＋「50」', !!fig && fig.svg === 1 && fig.text === '50', fig)
  check('(c) 遊び方 ② の図に「次の攻撃」「⚔」が無い', !!fig && !/次の攻撃|⚔/.test(fig.text), fig?.text)
  check('(c) 図枠に横 overflow 無し', !!fig && fig.scrollWidth <= fig.clientWidth, fig)
  await overlay.locator('.tutorial-section:nth-child(1)').scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${shotDir}/tutorial-1-${vp.id}.png` })
  r.shots.push(`tutorial-1-${vp.id}.png`)
  await overlay.locator('.tutorial-section:nth-child(2)').scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${shotDir}/tutorial-2-${vp.id}.png` })
  r.shots.push(`tutorial-2-${vp.id}.png`)
  await overlay.locator('.tutorial-close').click()
  await clickText(page, 'もどる')

  // ---- 戦闘（大耀 × 1 体目）の共鳴名札 ----
  await maybeClick(page, 'わかった')
  await clickText(page, '神を選ぶ')
  await maybeClick(page, '新しく始める')
  await clickText(page, '大耀')
  await clickText(page, 'この構成で始める')
  await page.getByText('挑む敵を選ぼう').first().waitFor({ timeout: 8000 })
  await page.locator('.enemy-select-card').first().click()
  await clickText(page, 'この構成でバトル開始')
  await page.getByRole('button', { name: 'ラウンドを終える' }).first().waitFor({ timeout: 30000 })
  // 降臨の間（Boss Entrance）が名札を覆っている間はスクリーンショットに写らないため、演出の終了を待つ（最大 12 秒・無ければ即時）
  await page.waitForFunction(() => !document.querySelector('.boss-entrance, [data-testid="boss-entrance"]'), null, { timeout: 12000 }).catch(() => {})
  await page.waitForTimeout(800)
  const head = await page.locator('.burst-preview-head').first().innerText().catch(() => '')
  check('(a) 共鳴名札 = 「あと N で神の一撃」', /^あと\d+で神の一撃$/.test(head.trim()), head)
  check('(a) 共鳴名札に「神技」が無い', !/神技/.test(head), head)
  const bodyText = await page.locator('body').innerText()
  check('(a) 戦闘画面のどこにも「神技発動」が無い', !/神技発動/.test(bodyText))
  await page.screenshot({ path: `${shotDir}/battle-plate-${vp.id}.png` })
  r.shots.push(`battle-plate-${vp.id}.png`)

  check('JS error 0', errors.length === 0, errors)
  results.push(r)
  await context.close()
}
await browser.close()
const total = results.flatMap((r) => r.checks)
const passed = total.filter((c) => c.pass).length
writeFileSync(out, JSON.stringify({ base, passed, total: total.length, results }, null, 2))
console.log(`vocab-check: ${passed}/${total.length} PASS`)
for (const r of results) for (const c of r.checks) if (!c.pass) console.log(`  FAIL [${r.viewport}] ${c.name}`, JSON.stringify(c.detail ?? null))
process.exit(passed === total.length ? 0 : 1)

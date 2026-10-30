// v1.0.3 RC：敗北画面の事実行（defeatFacts）と敗北→結果画面の流れを実機 DOM で確認（Playwright headless・QA 用。ゲームコードではない）。
//   node scripts/v1_0_3-rc/defeat-check.mjs <outJson> [baseUrl]
// 大耀 × 業斧の鬼将をカードを出さず「ラウンドを終える」だけで進め、R4「業斧・断岩」260 で敗北させる（qa-flow C と同じ経路）。
// 見るもの（PC 1508×660／SP 375×667）：結果画面が出る・敗因に「業斧・断岩」・事実行 [data-testid="defeat-fact"] の文言と字数・
// 既存の「敵の残り HP」行との重複なし・結果カード内の横 overflow 0・JS error 0。スクリーンショット保存。
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const out = args[0]
if (!out) throw new Error('usage: defeat-check.mjs <outJson> [baseUrl]')
const shotDir = dirname(out)
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:4197'
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const VIEWPORTS = [
  { id: 'pc', viewport: { width: 1508, height: 660 } },
  { id: 'sp375', viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
]
async function clickText(page, text, timeout = 8000) { await page.getByRole('button', { name: text }).first().click({ timeout }) }
async function maybeClick(page, text) { const l = page.getByRole('button', { name: text }).first(); if (await l.isVisible().catch(() => false)) { await l.click({ timeout: 3000 }).catch(() => {}); return true } return false }

mkdirSync(shotDir, { recursive: true })
const browser = await chromium.launch({ channel: 'chromium' }).catch(() => chromium.launch())
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
  await maybeClick(page, '初陣へ')
  if (await page.getByTestId('first-battle-brief-lines').isVisible().catch(() => false)) await clickText(page, 'もどる')
  await maybeClick(page, 'わかった')
  await clickText(page, '神を選ぶ')
  await maybeClick(page, '新しく始める')
  await clickText(page, '大耀')
  await clickText(page, 'この構成で始める')
  await page.getByText('挑む敵を選ぼう').first().waitFor({ timeout: 8000 })
  await page.locator('.enemy-select-card', { hasText: '業斧の鬼将' }).first().click()
  await clickText(page, 'この構成でバトル開始')
  await page.getByRole('button', { name: 'ラウンドを終える' }).first().waitFor({ timeout: 30000 })
  await page.waitForFunction(() => !document.querySelector('[data-testid="boss-entrance"]'), null, { timeout: 12000 }).catch(() => {})

  let rounds = 0
  for (let i = 0; i < 8; i++) {
    const btn = page.getByRole('button', { name: 'ラウンドを終える' }).first()
    if (!(await btn.isVisible().catch(() => false))) break
    await btn.click({ timeout: 5000 }).catch(() => {})
    rounds++
    const over = await page.locator('.game-over, .result-overlay, [data-testid="game-over"]').first().waitFor({ timeout: 20000 }).then(() => true).catch(() => false)
    if (over) break
    await page.waitForTimeout(500)
  }
  await page.waitForTimeout(1200)
  const bodyText = await page.locator('body').innerText()
  check('結果画面が出た（敗北）', /敗北/.test(bodyText), { rounds })
  check('敗因に「業斧・断岩」', /業斧・断岩/.test(bodyText))
  const fact = await page.locator('[data-testid="defeat-fact"]').first().innerText().catch(() => '')
  check('事実行が表示される', fact.length > 0, fact)
  check('事実行＝「必殺 N を加護（予告の50%のブロック）で受けていれば残HP X」の形', /^必殺\d+を加護（予告の50%のブロック）で受けていれば残HP\d+$/.test(fact.trim()), fact)
  check('事実行は 40 字以内', [...fact.trim()].length <= 40, [...fact.trim()].length)
  const hpLine = (bodyText.match(/敵の残り\s*HP[^\n]*/) ?? [''])[0]
  check('既存「敵の残り HP」行は 1 回だけ', (bodyText.match(/敵の残り\s*HP/g) ?? []).length === 1, hpLine)
  const factBox = await page.evaluate(() => { const el = document.querySelector('[data-testid="defeat-fact"]'); if (!el) return null; const r = el.getBoundingClientRect(); return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, lines: Math.round(r.height / parseFloat(getComputedStyle(el).lineHeight || '16')), top: Math.round(r.top), vh: window.innerHeight } })
  check('事実行に横 overflow 無し', !!factBox && factBox.scrollWidth <= factBox.clientWidth, factBox)
  check('事実行は 2 行以内', !!factBox && factBox.lines <= 2, factBox)
  await page.screenshot({ path: `${shotDir}/defeat-${vp.id}.png` })
  r.shots.push(`defeat-${vp.id}.png`)
  check('JS error 0', errors.length === 0, errors)
  results.push(r)
  await context.close()
}
await browser.close()
const total = results.flatMap((r) => r.checks)
const passed = total.filter((c) => c.pass).length
writeFileSync(out, JSON.stringify({ base, passed, total: total.length, results }, null, 2))
console.log(`defeat-check: ${passed}/${total.length} PASS`)
for (const r of results) for (const c of r.checks) if (!c.pass) console.log(`  FAIL [${r.viewport}] ${c.name}`, JSON.stringify(c.detail ?? null))
process.exit(passed === total.length ? 0 : 1)

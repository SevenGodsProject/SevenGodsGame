// v1.0.4 Preview Gate G8（Stage B「同じ盤面 Retry の前回比」の採否判断用・計測のみ。QA 用。ゲームコードではない）。
//   node scripts/v1_0_4-rc/defeat-g8.mjs <outJson> [baseUrl]
// 経路は scripts/v1_0_3-rc/defeat-check.mjs と同じ（大耀 × 業斧の鬼将・カードを出さず「ラウンドを終える」→ R4 断岩で敗北）。
// 1 回目の敗北 → Primary（同じ盤面でもう一度）→ 2 回目の敗北（＝Stage B の前回比 1 行が出る画面）の結果画面を測る。
// 見るもの（PC 1508×660／SP 375×667／SP 390×844）：Primary の文言・位置・初期可視か、結果カード内の行数、
// Primary 下端から「カード／viewport の可視下端」までの余白（px）＝前回比 1 行（≈20px）を足しても Primary が残るか。
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const out = args[0]
if (!out) throw new Error('usage: defeat-g8.mjs <outJson> [baseUrl]')
const shotDir = dirname(out)
mkdirSync(shotDir, { recursive: true })
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:4197'
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const VIEWPORTS = [
  { id: 'pc1508', viewport: { width: 1508, height: 660 } },
  { id: 'sp375', viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true },
  { id: 'sp390', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
]
/** 前回比 1 行の想定高さ（結果カード本文の line-height 相当） */
const ONE_LINE_PX = 21

async function clickText(page, text, timeout = 8000) {
  await page.getByRole('button', { name: text }).first().click({ timeout })
}
async function maybeClick(page, text) {
  const l = page.getByRole('button', { name: text }).first()
  if (await l.isVisible().catch(() => false)) { await l.click({ timeout: 3000 }).catch(() => {}); return true }
  return false
}

async function loseByEndingRounds(page) {
  await page.getByRole('button', { name: 'ラウンドを終える' }).first().waitFor({ timeout: 30000 })
  await page.waitForFunction(() => !document.querySelector('[data-testid="boss-entrance"]'), null, { timeout: 12000 }).catch(() => {})
  for (let i = 0; i < 8; i++) {
    const btn = page.getByRole('button', { name: 'ラウンドを終える' }).first()
    if (!(await btn.isVisible().catch(() => false))) break
    await btn.click({ timeout: 5000 }).catch(() => {})
    const over = await page.locator('.game-over-card').first().waitFor({ timeout: 20000 }).then(() => true).catch(() => false)
    if (over) break
    await page.waitForTimeout(500)
  }
  await page.waitForSelector('[data-testid="result-primary"]', { timeout: 20000 })
  await page.waitForTimeout(2600)
}

const MEASURE = (oneLine) => {
  const vh = window.innerHeight
  const card = document.querySelector('.game-over-card')
  const primary = document.querySelector('[data-testid="result-primary"]')
  if (!card || !primary) return null
  const c = card.getBoundingClientRect()
  const p = primary.getBoundingClientRect()
  const visibleBottom = Math.min(vh, c.bottom)
  // 結果カード内のテキスト行（p・li・div 直下テキスト）を上から数える（Primary より上だけ）
  const textEls = [...card.querySelectorAll('p, li, h2, h3, .game-over-status, .game-over-score')].filter((el) => {
    const r = el.getBoundingClientRect()
    return r.height > 0 && r.bottom <= p.top + 1 && el.textContent.trim()
  })
  const lineCount = textEls.reduce((n, el) => {
    const lh = parseFloat(getComputedStyle(el).lineHeight) || 16
    return n + Math.max(1, Math.round(el.getBoundingClientRect().height / lh))
  }, 0)
  const slack = Math.round(visibleBottom - p.bottom)
  return {
    vh,
    primaryText: primary.textContent.trim(),
    primaryTop: Math.round(p.top),
    primaryBottom: Math.round(p.bottom),
    primaryInView: p.top >= Math.max(0, c.top) && p.bottom <= visibleBottom,
    cardScrollTop: card.scrollTop,
    cardScrolls: card.scrollHeight > card.clientHeight + 1,
    lineCountAbovePrimary: lineCount,
    defeatFact: document.querySelector('[data-testid="defeat-fact"]')?.textContent.trim() ?? null,
    // v1.0.5 Stage B：同じ盤面の前回比 1 行（無ければ null）と、その行の折り返し数・横はみ出し
    sameBoard: (() => {
      const el = document.querySelector('[data-testid="same-board-diff"]')
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { text: el.textContent.trim(), lines: Math.round(r.height / (parseFloat(getComputedStyle(el).lineHeight) || 18)), overflowX: el.scrollWidth > el.clientWidth + 1, bottom: Math.round(r.bottom) }
    })(),
    slackPx: slack,
    fitsOneMoreLine: slack >= oneLine,
    overflowX: card.scrollWidth > card.clientWidth + 1,
  }
}

const browser = await chromium.launch({ headless: true })
const results = {}
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: vp.viewport, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()))
  const r = { errors }
  try {
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
    await loseByEndingRounds(page)
    r.defeat1 = await page.evaluate(MEASURE, ONE_LINE_PX)
    await page.screenshot({ path: `${shotDir}/g8-${vp.id}-defeat1.png` })
    await page.locator('[data-testid="result-primary"]').first().click()
    await loseByEndingRounds(page)
    r.defeat2 = await page.evaluate(MEASURE, ONE_LINE_PX)
    await page.screenshot({ path: `${shotDir}/g8-${vp.id}-defeat2.png` })
  } catch (e) {
    r.error = String(e)
  }
  results[vp.id] = r
  await ctx.close()
}
await browser.close()
const report = { base, oneLinePx: ONE_LINE_PX, at: new Date().toISOString(), results }
writeFileSync(out, JSON.stringify(report, null, 2))
for (const [id, r] of Object.entries(results)) {
  for (const k of ['defeat1', 'defeat2']) {
    const m = r[k]
    console.log(`${id} ${k}: ${m ? `primary「${m.primaryText}」 inView=${m.primaryInView} lines=${m.lineCountAbovePrimary} slack=${m.slackPx}px fits+1=${m.fitsOneMoreLine} sameBoard=${m.sameBoard ? `「${m.sameBoard.text}」(${m.sameBoard.lines}行・overflowX=${m.sameBoard.overflowX})` : 'なし'}` : 'n/a'}`)
  }
  if (r.error) console.log(`${id} ERROR ${r.error.slice(0, 200)}`)
  console.log(`${id} errors=${r.errors.length}`)
}
console.log('wrote', out)

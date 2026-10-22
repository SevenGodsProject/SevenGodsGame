// v1.0.3 RC：SP 手札本文 9px → 9.5px（Lane 8 MOBILE_UX_AUDIT_V1 §4 案 F）の実機 DOM 確認（Playwright headless・QA 用。ゲームコードではない）。
//   node scripts/v1_0_3-rc/sp-text-check.mjs <outJson> [baseUrl]
// 見るもの（PC 1508×660／SP 375×667／SP 390×844）：
//   (1) デッキ編成画面（大耀 × 1 体目の直前）に並ぶカード全枚：.deck-builder-card と本文 .deck-builder-card-text の
//       scrollHeight <= clientHeight・scrollWidth <= clientWidth、computed font-size
//   (2) 戦闘（大耀 × 既定の 1 体目）の手札 5 枚：.card-view・.card-view-body・.card-view-text の overflow 無し、
//       本文の computed font-size（PC 9.5px／SP375×667＝140px 札 9px／SP390×844＝158px 札 9.5px）・条件行 9px
//   JS error 0。スクリーンショット：deck-<vp>.png（fullPage）・hand-<vp>.png
// 実行は PM が直列で行う（preview を立ててから）。本 Lane では実行しない。
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const out = args[0]
if (!out) throw new Error('usage: sp-text-check.mjs <outJson> [baseUrl]')
const shotDir = dirname(out)
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:4199'
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const VIEWPORTS = [
  { id: 'pc', viewport: { width: 1508, height: 660 }, handFontPx: 9.5, cardHeightPx: null },
  { id: 'sp375', viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, handFontPx: 9, cardHeightPx: 140 },
  { id: 'sp390', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, handFontPx: 9.5, cardHeightPx: 158 },
]

async function clickText(page, text, timeout = 8000) {
  await page.getByRole('button', { name: text }).first().click({ timeout })
}
async function maybeClick(page, text) {
  const l = page.getByRole('button', { name: text }).first()
  if (await l.isVisible().catch(() => false)) { await l.click({ timeout: 3000 }).catch(() => {}); return true }
  return false
}

/** 画面内のカードを全枚測る（ブラウザ側で実行） */
// Playwright の page.evaluate は引数 1 つまで＝セレクタはオブジェクトで渡す
function measureCards({ cardSel, bodySel, textSel, bonusSel, nameSel }) {
  const px = (v) => Number.parseFloat(v) || 0
  const box = (el) => (el ? { sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight, w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height } : null)
  const fits = (b) => !b || (b.sw <= b.cw && b.sh <= b.ch)
  return Array.from(document.querySelectorAll(cardSel)).map((card) => {
    const body = card.querySelector(bodySel)
    const text = card.querySelector(textSel)
    const bonus = bonusSel ? card.querySelector(bonusSel) : null
    const name = card.querySelector(nameSel)
    const r = {
      name: name ? name.textContent.trim() : '',
      text: text ? text.textContent.trim() : '',
      card: box(card),
      body: box(body),
      textBox: box(text),
      fontSize: text ? px(getComputedStyle(text).fontSize) : null,
      lineHeight: text ? getComputedStyle(text).lineHeight : null,
      bonusFontSize: bonus ? px(getComputedStyle(bonus).fontSize) : null,
    }
    r.fits = fits(r.card) && fits(r.body) && fits(r.textBox)
    return r
  })
}

mkdirSync(shotDir, { recursive: true })
const browser = await chromium.launch()
const results = []
for (const vp of VIEWPORTS) {
  const { handFontPx, cardHeightPx, ...ctxOpts } = vp
  const context = await browser.newContext(ctxOpts)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  const r = { viewport: vp.id, expected: { handFontPx, cardHeightPx }, checks: [], shots: [], deck: [], hand: [] }
  const check = (name, pass, detail) => r.checks.push({ name, pass: !!pass, ...(detail !== undefined ? { detail } : {}) })

  await page.goto(base + '/', { waitUntil: 'networkidle' })
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
  await page.goto(base + '/', { waitUntil: 'networkidle' })
  await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
  await page.waitForTimeout(500)

  // ---- Home → 神を選ぶ → 大耀 → この構成で始める → 敵選択（1 体目）→ デッキ編成 ----
  // 初回の Home は「初陣へ」が primary のことがある：その場合は Brief から「もどる」で Home に戻ってから「神を選ぶ」
  if (!(await maybeClick(page, '神を選ぶ'))) {
    await maybeClick(page, '初陣へ')
    await page.getByTestId('first-battle-brief-lines').waitFor({ timeout: 8000 }).catch(() => {})
    await clickText(page, 'もどる')
    await maybeClick(page, 'わかった')
    await clickText(page, '神を選ぶ')
  }
  await maybeClick(page, '新しく始める')
  await clickText(page, '大耀')
  await clickText(page, 'この構成で始める')
  await page.getByText('挑む敵を選ぼう').first().waitFor({ timeout: 8000 })
  await page.locator('.enemy-select-card').first().click()
  await page.getByRole('button', { name: 'この構成でバトル開始' }).first().waitFor({ timeout: 8000 })
  await page.waitForSelector('.deck-builder-card', { timeout: 8000 })
  await page.waitForTimeout(400)

  r.deck = await page.evaluate(measureCards, { cardSel: '.deck-builder-card', bodySel: '.deck-builder-card-body', textSel: '.deck-builder-card-text', bonusSel: '.deck-builder-card-effect-bonus', nameSel: '.deck-builder-card-name' })
  const deckBad = r.deck.filter((c) => !c.fits).map((c) => c.name)
  check(`デッキ編成：カード ${r.deck.length} 枚すべて overflow 無し（.deck-builder-card／body／text）`, r.deck.length > 0 && deckBad.length === 0, deckBad)
  check('デッキ編成：本文 font-size を記録（12px 既定）', r.deck.every((c) => c.fontSize !== null), [...new Set(r.deck.map((c) => c.fontSize))])
  const deckScroll = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  check('デッキ編成：横スクロール無し', deckScroll.sw <= deckScroll.cw, deckScroll)
  await page.screenshot({ path: `${shotDir}/deck-${vp.id}.png`, fullPage: true })
  r.shots.push(`deck-${vp.id}.png`)

  // ---- バトル開始 → 手札 5 枚 ----
  await clickText(page, 'この構成でバトル開始')
  await page.getByRole('button', { name: 'ラウンドを終える' }).first().waitFor({ timeout: 30000 })
  // 降臨の間（Boss Entrance）が手札を覆っている間は測らない（最大 12 秒・無ければ即時）
  await page.waitForFunction(() => !document.querySelector('.boss-entrance, [data-testid="boss-entrance"]'), null, { timeout: 12000 }).catch(() => {})
  await page.waitForSelector('.hand .card-view', { timeout: 8000 })
  await page.waitForTimeout(1200)

  r.hand = await page.evaluate(measureCards, { cardSel: '.hand .card-view', bodySel: '.card-view-body', textSel: '.card-view-text', bonusSel: '.card-view-bonus', nameSel: '.card-view-name' })
  const handBad = r.hand.filter((c) => !c.fits).map((c) => ({ name: c.name, card: c.card, body: c.body, text: c.textBox }))
  check('戦闘：手札 5 枚', r.hand.length === 5, r.hand.length)
  check('戦闘：手札すべて overflow 無し（.card-view／body／text）', r.hand.length > 0 && handBad.length === 0, handBad)
  const sizes = [...new Set(r.hand.map((c) => c.fontSize))]
  check(`戦闘：手札本文 font-size = ${handFontPx}px`, sizes.length === 1 && sizes[0] === handFontPx, sizes)
  const bonusSizes = [...new Set(r.hand.map((c) => c.bonusFontSize).filter((v) => v !== null))]
  check('戦闘：条件行 font-size = 9px（条件行がある札のみ）', bonusSizes.every((v) => v === 9), bonusSizes)
  if (cardHeightPx !== null) {
    const heights = [...new Set(r.hand.map((c) => Math.round(c.card?.h ?? 0)))]
    check(`戦闘：札の高さ = ${cardHeightPx}px`, heights.length === 1 && heights[0] === cardHeightPx, heights)
  }
  const battleScroll = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  check('戦闘：横スクロール無し', battleScroll.sw <= battleScroll.cw, battleScroll)
  await page.screenshot({ path: `${shotDir}/hand-${vp.id}.png` })
  r.shots.push(`hand-${vp.id}.png`)

  check('JS error 0', errors.length === 0, errors)
  results.push(r)
  await context.close()
}
await browser.close()
const total = results.flatMap((r) => r.checks)
const passed = total.filter((c) => c.pass).length
writeFileSync(out, JSON.stringify({ base, passed, total: total.length, results }, null, 2))
console.log(`sp-text-check: ${passed}/${total.length} PASS`)
for (const r of results) for (const c of r.checks) if (!c.pass) console.log(`  FAIL [${r.viewport}] ${c.name}`, JSON.stringify(c.detail ?? null))
process.exit(passed === total.length ? 0 : 1)

// 決定267 Release Gate：deterministic Seed／score 不変の確認。
//
//   node scripts/d267-reward-relevance-v1/determinism.mjs <url> <seed> [label]
//
// 同じ `?seed=` で 恵比寿×試練の影 を決定論 bot（手札を同じ規則で選ぶ・託宣は天啓固定）で最後まで打ち、
// 勝敗・スコア・決着ラウンド・敵の予告列を JSON で出す。RC と Production で同じ出力になれば、
// 報酬側の変更がバトルの seed／score に影響していない（src/core 不変の runtime 側の裏付け）。
import { chromium } from 'playwright'

const base = (process.argv[2] ?? 'http://127.0.0.1:4305').replace(/\/$/, '')
const seed = process.argv[3] ?? 'd267-det'
const label = process.argv[4] ?? base

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()))

const clickText = (t) =>
  page.evaluate((t) => {
    const el = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(t) && !x.disabled)
    if (!el) return false
    el.click()
    return true
  }, t)
const clickSel = (s) =>
  page.evaluate((s) => {
    const el = document.querySelector(s)
    if (!el || el.disabled) return false
    el.click()
    return true
  }, s)

await page.goto(`${base}/?seed=${encodeURIComponent(seed)}`)
await page.waitForSelector('.home-screen .home-cta-primary', { timeout: 30000 })
await page.waitForTimeout(400)
if (await clickText('わかった')) await page.waitForTimeout(400)
if (!(await clickSel('[data-testid="home-start"]'))) await clickText('神を選ぶ')
await page.waitForTimeout(400)
if (await clickText('新しく始める')) await page.waitForTimeout(400)
await clickText('恵比寿')
await page.waitForTimeout(300)
await clickText('この構成で始める')
await page.waitForTimeout(300)
await clickText('試練の影')
await page.waitForTimeout(400)
await clickText('この構成でバトル開始')
await page.waitForSelector('.hand .card-view', { timeout: 20000 })
await page.waitForFunction(() => {
  const b = document.querySelector('.end-round-button')
  return b && !b.disabled
}, null, { timeout: 20000 })
await page.waitForTimeout(400)

const intents = []
const plays = []
const over = () => page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay, .enemy-defeat'))
for (let round = 1; round <= 8; round++) {
  if (await over()) break
  intents.push(await page.evaluate(() => document.querySelector('.enemy-intent, [class*="intent"]')?.textContent.replace(/\s+/g, ' ').trim() ?? null))
  for (let k = 0; k < 8; k++) {
    const picked = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.hand .card-view')].filter((c) => !c.disabled)
      if (!cards.length) return null
      const name = (c) => c.querySelector('.card-view-name')?.textContent ?? ''
      const score = (c) => (/⚔|🌟|💀/.test(name(c)) ? 3 : 0) + (c.querySelector('.card-view-bonus-ready') ? 1.5 : 0)
      cards.sort((x, y) => score(y) - score(x))
      cards[0].click()
      return name(cards[0]).trim()
    })
    if (!picked) break
    plays.push(`${round}:${picked}`)
    await page.waitForTimeout(850)
    if (await over()) break
  }
  if (await over()) break
  await page.evaluate(() => document.querySelectorAll('.divination-choice')[2]?.click())
  await page.waitForTimeout(400)
  await clickSel('.end-round-button')
  await page.waitForTimeout(3300)
}
await page.waitForFunction(() => !!document.querySelector('.reward-overlay, .game-over-overlay'), null, { timeout: 25000 })
await page.waitForTimeout(2600)
await page.waitForSelector('.game-over-status', { timeout: 15000 })
await page.waitForTimeout(1500)
const result = await page.evaluate(() => ({
  status: document.querySelector('.game-over-status')?.textContent.trim() ?? null,
  score: document.querySelector('.game-over-score')?.textContent.replace(/[^0-9,]/g, '') ?? null,
  recap: [...document.querySelectorAll('[data-testid="battle-recap"] li')].map((li) => li.textContent.trim()),
  saveSeed: (() => {
    try {
      return JSON.parse(localStorage.getItem('sevengods.battleSave') ?? 'null')?.state?.seed ?? null
    } catch {
      return null
    }
  })(),
}))
await browser.close()
console.log(JSON.stringify({ label, seed, result, intents, plays, errors }, null, 2))

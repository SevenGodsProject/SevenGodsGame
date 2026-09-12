// Phase 6-D Visual Direction Audit：各画面のスクリーンショット（監査用・ゲームコードには触れない）。
//   PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/phase6d-visual-audit/screens.mjs <outDir> [baseUrl]
// PC（1508×660）と SP（390×760）で Home／神選択／敵選択／デッキ／Boss Entrance／戦闘開始／初着弾／
// 神の一撃（cut-in の 3 コマ）／決着／結果（振り返り）／報酬 を撮る。
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const outDir = args[0] ?? 'p6d-screens'
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:5173'
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')
mkdirSync(outDir, { recursive: true })

const VPS = [
  { id: 'pc', viewport: { width: 1508, height: 660 }, isMobile: false },
  { id: 'sp', viewport: { width: 390, height: 760 }, isMobile: true },
]
// 神の一撃が早く出る組合せ（共鳴が貯まりやすい大耀×鬼将、seed 固定）
const GOD = '大耀', ENEMY = '業斧の鬼将', URL = '?enemy=oni&seed=p6d-screens'
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
  const shot = async (n, full = false) => {
    // ヘッドレスは描画要求が無いと CSS animation が進まないため 1 枚流してから保存
    await page.screenshot({ path: join(outDir, '_pump.png') })
    await page.screenshot({ path: join(outDir, `${vp.id}-${n}.png`), fullPage: full })
  }
  await page.goto(base + '/' + URL)
  await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
  await page.waitForTimeout(800)
  await shot('01-home-tutorial')
  await click('わかった')
  await page.waitForTimeout(300)
  await shot('02-home')
  await shot('02-home-full', true)
  await click('神を選ぶ')
  await page.waitForTimeout(500)
  if (await click('新しく始める')) await page.waitForTimeout(300)
  await shot('03-godselect')
  await shot('03-godselect-full', true)
  await click(GOD)
  await page.waitForTimeout(300)
  await shot('04-difficulty')
  await click('この構成で始める')
  await page.waitForTimeout(400)
  await shot('05-enemyselect')
  await shot('05-enemyselect-full', true)
  await click(ENEMY)
  await page.waitForTimeout(500)
  await shot('06-deckbuilder')
  await shot('06-deckbuilder-full', true)
  await click('この構成でバトル開始')
  await page.waitForSelector('.hand .card-view', { timeout: 10000 })
  await page.waitForTimeout(300)
  await shot('07-boss-entrance')
  await page.waitForFunction(() => { const e = document.querySelector('.end-round-button'); return e && !e.disabled }, null, { timeout: 15000 })
  await page.waitForTimeout(300)
  await shot('08-battle-start')

  let impactShot = false, strikeShot = false, blowShot = false
  const t0 = Date.now()
  while (Date.now() - t0 < 120000) {
    if (await page.evaluate(() => !!document.querySelector('.game-over-overlay, .reward-overlay'))) break
    if (!blowShot && (await page.evaluate(() => !!document.querySelector('.enemy-defeat')))) {
      await page.waitForTimeout(150); await shot('11-final-blow'); blowShot = true
      await page.waitForTimeout(900); await shot('11-final-blow-b')
      continue
    }
    const played = await page.evaluate(() => {
      const c = [...document.querySelectorAll('.hand .card-view')].filter((c) => !c.disabled)
      if (!c.length) return false
      c[0].click()
      return true
    })
    if (played) {
      // 神の一撃 cut-in を 3 コマ
      for (let i = 0; i < 20 && !strikeShot; i++) {
        await page.waitForTimeout(100)
        if (await page.evaluate(() => !!document.querySelector('.resonance-cutin, .burst-banner, .god-burst-strike'))) {
          await shot('10-god-strike-a'); await page.waitForTimeout(450)
          await shot('10-god-strike-b'); await page.waitForTimeout(700)
          await shot('10-god-strike-c'); strikeShot = true
        }
      }
      if (!impactShot && !strikeShot) { await page.waitForTimeout(120); await shot('09-first-impact'); impactShot = true }
      await page.waitForTimeout(1100)
      continue
    }
    const ended = await page.evaluate(() => { const e = document.querySelector('.end-round-button'); if (e && !e.disabled) { e.click(); return true } return false })
    await page.waitForTimeout(ended ? 3200 : 300)
  }
  await page.waitForFunction(() => !!document.querySelector('.game-over-overlay, .reward-overlay'), null, { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(500)
  await shot('12-result')
  await shot('12-result-full', true)
  if (await click('報酬カードを選ぶ')) { await page.waitForTimeout(600); await shot('13-reward') }
  await ctx.close()
}
await browser.close()
console.log('done', outDir)

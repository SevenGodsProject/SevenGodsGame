// Final Visual Acceptance Gate：OLD / NEW を「プレイヤーが実際に見る 100% 表示」で撮る（QA 用・ゲームコードには触れない）。
//   PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/enemy-visual-batch-a/acceptance-capture.mjs <outDir> <baseUrl> <tag>
//
// 各条件で 2 枚撮る：
//   product  … 製品そのままの見え方（100% 判定用）。背景・drop-shadow・HUD を含む
//   isolated … 計測用。ステージ背景と drop-shadow を外し、既知の平坦色の上に敵だけを置く。
//              Chromium の実際の縮小フィルタは通したまま「敵の画素だけ」を取り出すための細工で、
//              製品の CSS は変更していない（このページ内に一時的な style を足すだけ）。
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const [outDir, base, tag] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const ENEMIES = { trial: '試練の影', karakuri: '銀甲の機工師', doukeshi: '乱舞の道化' }
// [id, width, height, deviceScaleFactor, isMobile]
const CONDS = [
  ['pc1366-dpr1', 1366, 768, 1, false],
  ['pc1366-dpr2', 1366, 768, 2, false],
  ['pc1508-dpr1', 1508, 660, 1, false],
  ['pc1508-dpr2', 1508, 660, 2, false],
  ['sp390x760-dpr1', 390, 760, 1, true],
  ['sp390x760-dpr2', 390, 760, 2, true],
  ['sp390x760-dpr3', 390, 760, 3, true],
  ['sp390x844-dpr1', 390, 844, 1, true],
  ['sp390x844-dpr2', 390, 844, 2, true],
]
const FLAT = '#101018' // 計測用の平坦背景

const click = (page, t) => page.evaluate((text) => {
  const el = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(text) && !x.disabled)
  if (!el) return false
  el.click()
  return true
}, t)

const MEASURE = `() => {
  const el = document.querySelector('.enemy-avatar')
  const r = el.getBoundingClientRect()
  const cs = getComputedStyle(el)
  return {
    box: { x: r.x, y: r.y, w: r.width, h: r.height },
    bg: (cs.backgroundImage.match(/url\\("?([^")]+)"?\\)/) ?? [])[1] ?? null,
    bgSize: cs.backgroundSize, bgPos: cs.backgroundPosition, filter: cs.filter,
    dpr: devicePixelRatio,
  }
}`

const browser = await chromium.launch()
const report = []
for (const [cid, w, h, dpr, mobile] of CONDS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile })
  const page = await ctx.newPage()
  for (const [key, name] of Object.entries(ENEMIES)) {
    const id = `${cid}-${key}`
    try {
      await page.goto(`${base}/?enemy=${key}&seed=acceptance`, { waitUntil: 'load' })
      await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
      await page.waitForTimeout(400)
      await click(page, 'わかった'); await page.waitForTimeout(200)
      await click(page, '神を選ぶ'); await page.waitForTimeout(400)
      if (await click(page, '新しく始める')) await page.waitForTimeout(200)
      await click(page, '大耀'); await page.waitForTimeout(300)
      await click(page, 'この構成で始める'); await page.waitForTimeout(400)
      await click(page, name); await page.waitForTimeout(500)
      await click(page, 'この構成でバトル開始')
      await page.waitForSelector('.hand .card-view', { timeout: 20000 })
      await page.waitForFunction(() => { const e = document.querySelector('.end-round-button'); return e && !e.disabled }, null, { timeout: 25000 })
      // Boss Entrance（JS タイマー）が閉じるまでフレームを送る
      for (let i = 0; i < 80; i++) {
        if (!(await page.evaluate(() => !!document.querySelector('.boss-entrance, .enemy-cutin')))) break
        await page.screenshot({ path: join(outDir, '_pump.png') })
        await page.waitForTimeout(150)
      }
      await page.evaluate(() => { document.querySelector('.boss-entrance')?.remove(); document.querySelector('.enemy-cutin')?.remove() })
      await page.waitForTimeout(600)
      // idle を止め、変形を打ち消す（OLD/NEW を同じ位相で比べるため）
      await page.addStyleTag({ content: '*, *::before, *::after { animation-play-state: paused !important; transition: none !important; }' })
      await page.addStyleTag({ content: '.enemy-reaction-idle, .enemy-reaction, .enemy-avatar { transform: none !important; }' })
      await page.waitForTimeout(200)

      const m = await page.evaluate(`(${MEASURE})()`)
      const clip = { x: Math.max(0, Math.round(m.box.x)), y: Math.max(0, Math.round(m.box.y)), width: Math.round(m.box.w), height: Math.round(m.box.h) }
      await page.screenshot({ path: join(outDir, `${id}-product.png`), clip })
      await page.screenshot({ path: join(outDir, `${id}-product-full.png`) })

      // 計測パス：背景・影・オーラ・HUD を消して平坦色の上に敵だけを残す
      // レイアウトを 1px も変えないため、消すものは display ではなく visibility で隠す
      await page.addStyleTag({
        content: `.enemy-stage { background-image: none !important; background-color: ${FLAT} !important; }
          body, #root, .app, .battle, .battle-main, .enemy-collapse, .enemy-reaction, .enemy-reaction-idle, .enemy-avatar-wrap { background: ${FLAT} !important; }
          .enemy-avatar { filter: none !important; box-shadow: none !important; }
          .enemy-avatar-wrap::before, .battle-arena-glow, .enemy-plate, .enemy-speech-bubble, .enemy-turn-banner, .battle-topbar, .battle-dock, .player-stage, .resonance-panel { visibility: hidden !important; }
          .enemy-avatar { visibility: visible !important; }`,
      })
      await page.waitForTimeout(250)
      const m2 = await page.evaluate(`(${MEASURE})()`)
      if (Math.abs(m2.box.w - m.box.w) > 0.5 || Math.abs(m2.box.h - m.box.h) > 0.5) {
        throw new Error(`isolated pass changed layout: ${m.box.w}x${m.box.h} → ${m2.box.w}x${m2.box.h}`)
      }
      const clip2 = { x: Math.max(0, Math.round(m2.box.x)), y: Math.max(0, Math.round(m2.box.y)), width: Math.round(m2.box.w), height: Math.round(m2.box.h) }
      await page.screenshot({ path: join(outDir, `${id}-isolated.png`), clip: clip2 })

      report.push({ tag, cond: cid, enemy: key, dpr, viewport: `${w}x${h}`, box: m.box, boxIsolated: m2.box, bg: m.bg, bgSize: m.bgSize, bgPos: m.bgPos, filter: m.filter })
      console.log(`${id}: box ${m.box.w.toFixed(1)}x${m.box.h.toFixed(1)} css (dpr ${dpr} → ${(m.box.w * dpr).toFixed(0)}x${(m.box.h * dpr).toFixed(0)} device) bg=${(m.bg ?? '').split('/').pop()} isolated ${m2.box.w.toFixed(1)}x${m2.box.h.toFixed(1)}`)
    } catch (e) {
      console.log(`${id}: ERROR ${String(e).slice(0, 120)}`)
      report.push({ tag, cond: cid, enemy: key, error: String(e).slice(0, 200) })
    }
  }
  await ctx.close()
}
await browser.close()
writeFileSync(join(outDir, 'capture.json'), JSON.stringify(report, null, 2))
console.log('done', outDir)

// Enemy Visual Quality Audit：Production 戦闘画面で敵7体がどう見えるかを撮る（監査用・ゲームコードではない）。
//   PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/enemy-visual-audit/capture.mjs <outDir> [baseUrl]
//
// viewport 4 種（PC 1366×768 / 1508×660、Mobile 390×760 / 390×844）× DPR 1 / 2 × 敵 7 体。
// 各組合せで：`.enemy-avatar` の CSS 箱・background-image・描画倍率、`.player-avatar`（神）の箱、
// 敵と神の要素クロップ（実ピクセル）と画面全体を保存する。
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const [outDir = 'enemy-audit-shots', base = 'https://seven-gods-game.vercel.app'] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const ENEMIES = ['trial', 'oni', 'onryo', 'karakuri', 'juuma', 'ryujin', 'doukeshi']
const NAMES = { trial: '試練の影', oni: '業斧の鬼将', onryo: '藍花の怨霊', karakuri: '銀甲の機工師', juuma: '双牙の魔獣', ryujin: '蒼海の龍神', doukeshi: '乱舞の道化' }
const VPS = [
  ['pc1366', { width: 1366, height: 768 }, false],
  ['pc1508', { width: 1508, height: 660 }, false],
  ['sp760', { width: 390, height: 760 }, true],
  ['sp844', { width: 390, height: 844 }, true],
]
const DPRS = process.env.DPRS ? process.env.DPRS.split(',').map(Number) : [1, 2]

const click = (page, t) => page.evaluate((text) => {
  const el = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(text) && !x.disabled)
  if (!el) return false
  el.click()
  return true
}, t)

const MEASURE = `() => {
  const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }
  const en = document.querySelector('.enemy-avatar')
  const cs = en ? getComputedStyle(en) : null
  const url = cs ? (cs.backgroundImage.match(/url\\("?([^")]+)"?\\)/) ?? [])[1] ?? null : null
  const god = document.querySelector('.player-avatar')
  const stage = document.querySelector('.enemy-stage') ?? document.querySelector('.enemy-avatar-wrap')
  return {
    enemyBox: rect(en), enemyBg: url, enemyBgSize: cs?.backgroundSize, enemyFilter: cs?.filter, enemyTransform: cs?.transform,
    godBox: rect(god), godSrc: god?.getAttribute('src') ?? null, godNatural: god ? { w: god.naturalWidth, h: god.naturalHeight } : null,
    stageBox: rect(stage), dpr: devicePixelRatio, inner: { w: innerWidth, h: innerHeight },
  }
}`

const browser = await chromium.launch()
const report = []
for (const [vid, viewport, mobile] of VPS) {
  for (const dpr of DPRS) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile })
    const page = await ctx.newPage()
    for (const enemy of ENEMIES) {
      const tag = `${vid}-dpr${dpr}-${enemy}`
      try {
        await page.goto(`${base}/?enemy=${enemy}&seed=enemy-audit`, { waitUntil: 'load' })
        await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
        await page.waitForTimeout(400)
        await click(page, 'わかった')
        await page.waitForTimeout(200)
        await click(page, '神を選ぶ'); await page.waitForTimeout(400)
        if (await click(page, '新しく始める')) await page.waitForTimeout(200)
        await click(page, '大耀'); await page.waitForTimeout(300)
        await click(page, 'この構成で始める'); await page.waitForTimeout(400)
        await click(page, NAMES[enemy]); await page.waitForTimeout(500)
        await click(page, 'この構成でバトル開始')
        await page.waitForSelector('.hand .card-view', { timeout: 20000 })
        await page.waitForFunction(() => { const e = document.querySelector('.end-round-button'); return e && !e.disabled }, null, { timeout: 25000 })
        // Boss Entrance（.enemy-cutin）は animationend で閉じる。ヘッドレスは描画要求が無いと
        // アニメーションが進まないので、スクリーンショットでフレームを流して閉じるのを待つ。
        // Boss Entrance（.boss-entrance）は JS タイマーで閉じる（BOSS_ENTRANCE_MS）。閉じるまでフレームを流して待つ。
        for (let i = 0; i < 80; i++) {
          if (!(await page.evaluate(() => !!document.querySelector('.boss-entrance, .enemy-cutin')))) break
          await page.screenshot({ path: join(outDir, '_pump.png') })
          await page.waitForTimeout(150)
        }
        await page.evaluate(() => { document.querySelector('.boss-entrance')?.remove(); document.querySelector('.enemy-cutin')?.remove() })
        // 6-A/6-D の演出が落ち着くまで待ち、敵アイドルアニメを止めて同一条件で撮る
        await page.waitForTimeout(600)
        await page.addStyleTag({ content: '*, *::before, *::after { animation-play-state: paused !important; transition: none !important; }' })
        await page.waitForTimeout(200)
        // アイドル揺れの transform を打ち消し、素の描画倍率で撮る
        await page.addStyleTag({ content: '.enemy-reaction-idle, .enemy-reaction, .enemy-avatar { transform: none !important; }' })
        await page.waitForTimeout(100)
        const m = await page.evaluate(`(${MEASURE})()`)
        await page.screenshot({ path: join(outDir, `${tag}-full.png`) })
        if (m.enemyBox) await page.screenshot({ path: join(outDir, `${tag}-enemy.png`), clip: { x: Math.max(0, m.enemyBox.x - 8), y: Math.max(0, m.enemyBox.y - 8), width: m.enemyBox.w + 16, height: m.enemyBox.h + 16 } })
        if (m.godBox && enemy === 'oni') await page.screenshot({ path: join(outDir, `${vid}-dpr${dpr}-god-taiyo.png`), clip: { x: Math.max(0, m.godBox.x - 8), y: Math.max(0, m.godBox.y - 8), width: m.godBox.w + 16, height: m.godBox.h + 16 } })
        report.push({ vp: vid, dpr, enemy, ...m })
        console.log(`${tag}: enemy ${m.enemyBox?.w}x${m.enemyBox?.h} css px (${m.enemyBg}) god ${m.godBox?.w}x${m.godBox?.h} (${m.godNatural?.w}) stage ${m.stageBox?.w}x${m.stageBox?.h}`)
      } catch (e) {
        console.log(`${tag}: ERROR ${String(e).slice(0, 120)}`)
        report.push({ vp: vid, dpr, enemy, error: String(e).slice(0, 200) })
      }
    }
    await ctx.close()
  }
}
await browser.close()
writeFileSync(join(outDir, 'measure.json'), JSON.stringify(report, null, 2))
console.log('done', outDir)

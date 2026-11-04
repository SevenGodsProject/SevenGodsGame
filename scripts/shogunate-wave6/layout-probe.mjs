// W6 敵演出 品質向上（決定288 v1.1 §10-3）：将軍家 10 体（＋基準の CORE 3 体）の立ち絵の大きさを実ブラウザで測る。
//   PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/shogunate-wave6/layout-probe.mjs <outDir> <baseUrl> [vps] [enemies]
//   vps（既定 pc660,sp844,sp375）・enemies（既定 CORE 3＋将軍家 10 の slug・カンマ区切り）
// 計測は 決定264 lib.mjs の MEASURE（ink bbox alpha>32・決定229 方式）をそのまま使う：敵／神の ink 面積 %（viewport 比）・神÷敵・
// 敵÷カード高・重なり・--artScale。神は大耀固定（probe と同じ）・seed 固定（w6-layout）・R1 開始直後（入口消滅後 +0.6s）に 1 回。
// RAM 6GB 運用：1 browser 直列・run ごとに context を閉じる。評価（0.9〜1.15 の帯・目標 5.5%）は analyze 側で行う。
import { withBrowser, MEASURE, logger } from '../d264-duel-hud/lib.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'

const [outDir = 'docs/evidence/shogunate-wave6/layout', base = 'http://localhost:4199', vpsArg, enemiesArg] = process.argv.slice(2)
const VPS = {
  pc660: { viewport: { width: 1508, height: 660 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
  pc800: { viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
  sp844: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
  sp375: { viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
}
export const ENEMIES = {
  trial: '試練の影', karakuri: '銀甲の機工師', ryujin: '蒼海の龍神',
  tadatsugu: '将軍四天王・忠次', okappiki: '捕り方・岡っ引き', naomasa: '将軍四天王・直政', yasumasa: '将軍四天王・康政',
  kage: '忍者衆・影', kunoichi: '忍者衆・くノ一', onihanzo: '影の頭領・鬼半蔵', tadakatsu: '将軍四天王・忠勝', doman: '科学者・ドーマン', yasutora: '十七代将軍・康虎',
}
const vps = (vpsArg ?? 'pc660,sp844,sp375').split(',').filter((v) => VPS[v])
const enemies = (enemiesArg ?? Object.keys(ENEMIES).join(',')).split(',').filter((e) => ENEMIES[e])
const GOD = '大耀'

const clickText = (page, text) =>
  page.evaluate((t) => {
    const el = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(t) && !x.disabled)
    if (!el) return false
    el.click()
    return true
  }, text)

async function startBattle(browser, vpName, enemyName) {
  const ctx = await browser.newContext(VPS[vpName])
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('pageerror ' + String(e).slice(0, 200)))
  const url = `${base}/?seed=w6-layout`
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="home-start"]', { timeout: 30000 })
  if (await clickText(page, 'わかった')) await page.waitForTimeout(200)
  await page.locator('[data-testid="home-start"]').click({ timeout: 8000 })
  await page.waitForTimeout(300)
  if (await clickText(page, '新しく始める')) await page.waitForTimeout(300)
  await clickText(page, GOD)
  await page.waitForTimeout(250)
  await clickText(page, 'この構成で始める')
  await page.getByText('挑む敵を選ぼう').first().waitFor({ timeout: 8000 })
  await page.getByRole('button', { name: new RegExp(enemyName) }).first().click({ timeout: 8000 })
  await page.waitForTimeout(300)
  await clickText(page, 'この構成でバトル開始')
  await page.waitForTimeout(600)
  await page.keyboard.press('Escape').catch(() => {})
  await page.waitForFunction(() => { const b = document.querySelector('.end-round-button'); return b && !b.disabled }, null, { timeout: 25000 }).catch(() => {})
  await page.waitForFunction(() => !document.querySelector('[data-testid="boss-entrance"]'), null, { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(600)
  return { ctx, page, errors }
}

mkdirSync(`${outDir}/runs`, { recursive: true })
const log = logger(`${outDir}/layout-probe.log.txt`)
const rows = []
const { mem } = await withBrowser(async (browser) => {
  for (const vp of vps) {
    for (const slug of enemies) {
      const name = ENEMIES[slug]
      const t0 = Date.now()
      let rec
      try {
        const { ctx, page, errors } = await startBattle(browser, vp, name)
        const m = await page.evaluate(MEASURE)
        const enemyName = await page.locator('.enemy-panel .panel-title').first().innerText().catch(() => '')
        await page.screenshot({ path: `${outDir}/runs/${vp}-${slug}.png` })
        rec = { vp, slug, name, enemyName, dataEnemy: m.hud.dataEnemy, artScale: m.hud.artScale, area: m.area, ratio: m.ratio, enemyInk: m.enemyInk, godInk: m.godInk, cardH: m.cardH, overlap: m.overlap, hScroll: m.hScroll || m.bodyHScroll, errors }
        writeFileSync(`${outDir}/runs/${vp}-${slug}.json`, JSON.stringify({ ...rec, measure: m }, null, 1))
        await ctx.close().catch(() => {})
      } catch (e) {
        rec = { vp, slug, name, crashed: String(e).split('\n')[0], errors: [] }
      }
      rows.push(rec)
      log(`${vp} ${slug} ${rec.crashed ? 'CRASH ' + rec.crashed : `enemy ${rec.area.enemy}% god ${rec.area.god}% g/e ${rec.ratio.godPerEnemy} e/card ${rec.ratio.enemyPerCard} artScale ${rec.artScale} inkH ${Math.round(rec.enemyInk?.h ?? 0)} errors ${rec.errors.length}`} (${Math.round((Date.now() - t0) / 100) / 10}s)`)
    }
  }
}, log)
writeFileSync(`${outDir}/summary.json`, JSON.stringify({ base, god: GOD, seed: 'w6-layout', mem, at: new Date().toISOString(), rows }, null, 1))
log(`done ${rows.length} runs → ${outDir}/summary.json`)

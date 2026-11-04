// 舞台背景（stage.bg）表示の実ブラウザ検証（v1.1.5 Hotfix・読み取り専用）
//   node scripts/release-audit/stage-bg-probe.mjs <outDir> <baseUrl>
//   env: BG_ENEMIES（カンマ区切りの表示名。既定＝既存 7 体＋将軍家 10 体の 17 体）／BG_VIEWPORTS（既定 pc,sp375）／BG_GOD（既定 大耀）
// 各敵のバトル R1 で `.battle-main` の計算済み background-image を読み、url( 層（stage.bg）が含まれるかを記録する。
// 判定は hasUrl（true＝舞台画像あり）。jpeg（q70）の画面も残す。決定論・save には一切触れない。
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const [outDir, base] = process.argv.slice(2)
if (!outDir || !base) {
  console.error('usage: node scripts/release-audit/stage-bg-probe.mjs <outDir> <baseUrl>')
  process.exit(2)
}
mkdirSync(outDir, { recursive: true })
const DEFAULT_ENEMIES = [
  '試練の影',
  '業斧の鬼将',
  '藍花の怨霊',
  '銀甲の機工師',
  '双牙の魔獣',
  '蒼海の龍神',
  '乱舞の道化',
  '将軍四天王・忠次',
  '捕り方・岡っ引き',
  '将軍四天王・直政',
  '将軍四天王・康政',
  '忍者衆・影',
  '忍者衆・くノ一',
  '影の頭領・鬼半蔵',
  '将軍四天王・忠勝',
  '科学者・ドーマン',
  '十七代将軍・康虎',
]
const ENEMIES = (process.env.BG_ENEMIES || '').split(',').filter(Boolean)
const enemies = ENEMIES.length ? ENEMIES : DEFAULT_ENEMIES
const GOD = process.env.BG_GOD || '大耀'
const ALL_VIEWPORTS = { pc: { width: 1508, height: 660 }, sp375: { width: 375, height: 667, mobile: true } }
const vpNames = (process.env.BG_VIEWPORTS || 'pc,sp375').split(',').filter((v) => ALL_VIEWPORTS[v])

const clickText = async (page, t, timeout = 8000) => page.getByRole('button', { name: t }).first().click({ timeout })
const maybeClick = async (page, t) => {
  const l = page.getByRole('button', { name: t }).first()
  if (await l.isVisible().catch(() => false)) await l.click({ timeout: 3000 }).catch(() => {})
}

const browser = await chromium.launch()
const rows = []
for (const vp of vpNames) {
  const size = ALL_VIEWPORTS[vp]
  for (const enemy of enemies) {
    const ctx = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      isMobile: !!size.mobile,
      hasTouch: !!size.mobile,
      deviceScaleFactor: 1,
    })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e).split('\n')[0].slice(0, 200)))
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text().slice(0, 200))
    })
    const row = { vp, enemy }
    try {
      const url = `${base}/?seed=stage-bg-probe`
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.evaluate(() => {
        try {
          localStorage.clear()
          sessionStorage.clear()
        } catch {}
      })
      await page.goto(url, { waitUntil: 'networkidle' })
      await maybeClick(page, 'わかった')
      await clickText(page, '神を選ぶ')
      await maybeClick(page, '新しく始める')
      await clickText(page, GOD)
      await clickText(page, 'この構成で始める')
      await page.getByText('挑む敵を選ぼう').first().waitFor({ timeout: 8000 })
      await page.getByRole('button', { name: new RegExp(enemy) }).first().click({ timeout: 8000 })
      await clickText(page, 'この構成でバトル開始')
      await page.waitForTimeout(500)
      await page.keyboard.press('Escape').catch(() => {})
      await page.getByRole('button', { name: 'ラウンドを終える' }).first().waitFor({ timeout: 25000 })
      // 入口（降臨の間）の消え残りと立ち絵の読み込みを待ってから読む
      await page.waitForTimeout(2500)
      const info = await page.evaluate(() => {
        const b = document.querySelector('.battle')
        const m = document.querySelector('.battle-main')
        const cs = m ? getComputedStyle(m) : null
        const img = document.querySelector('.enemy-panel img, .enemy-avatar img, .enemy-avatar')
        return {
          dataEnemy: b?.getAttribute('data-enemy') ?? null,
          stageVar: b?.style.getPropertyValue('--stage-bg') ?? '',
          bgImage: cs ? cs.backgroundImage.replace(/\s+/g, ' ').slice(0, 320) : '',
          hasUrl: cs ? /url\(/.test(cs.backgroundImage) : false,
          stageUrlApplied: cs ? /backgrounds\/stages\/[0-9]{2}-[a-z-]+\.webp/.test(cs.backgroundImage) : false,
          enemyArtVisible: !!img && img.getBoundingClientRect().height > 40,
        }
      })
      Object.assign(row, info, { errors })
      await page.screenshot({ path: `${outDir}/${vp}-${info.dataEnemy ?? 'unknown'}.jpg`, type: 'jpeg', quality: 70 })
    } catch (e) {
      row.error = String(e).split('\n')[0].slice(0, 200)
    }
    rows.push(row)
    console.log(JSON.stringify(row))
    await ctx.close()
  }
}
await browser.close()
const total = rows.length
const ok = rows.filter((r) => r.stageUrlApplied && !r.error).length
const summary = {
  base,
  god: GOD,
  viewports: vpNames,
  total,
  stageUrlApplied: ok,
  verdict: ok === total ? 'PASS' : 'FAIL',
  failing: rows.filter((r) => !(r.stageUrlApplied && !r.error)).map((r) => `${r.vp}:${r.enemy}:${r.dataEnemy ?? r.error}`),
  rows,
}
writeFileSync(`${outDir}/stage-bg-probe.json`, JSON.stringify(summary, null, 2))
console.log(`stage-bg-probe ${ok}/${total} ${summary.verdict}`)
process.exit(ok === total ? 0 : 1)

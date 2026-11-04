// 最終 Release Gate／運営報告書 §4 用の画面撮影（Home／Enemy Select／戦闘 R1／結果）。pc 1508×660・sp 390×844。
// 評価はしない（撮影のみ）。seed 固定・localStorage を空にしてから撮る。sharp があれば webp（品質 82）に変換し png を消す。
//   node scripts/final-gate/screens.mjs <outDir> <baseUrl>
import { mkdirSync, unlinkSync } from 'node:fs'
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const outDir = args[0] ?? 'docs/evidence/final-gate/screens'
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:4198'
mkdirSync(outDir, { recursive: true })
let sharp = null
try {
  sharp = (await import('sharp')).default
} catch {}

const VPS = {
  pc: { viewport: { width: 1508, height: 660 } },
  sp: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
}
const click = (page, name, timeout = 8000) => page.getByRole('button', { name }).first().click({ timeout })
const maybe = async (page, name) => {
  const l = page.getByRole('button', { name }).first()
  if (await l.isVisible().catch(() => false)) await l.click({ timeout: 3000 }).catch(() => {})
}
async function shot(page, name) {
  if (sharp) {
    const png = `${outDir}/${name}.png`
    await page.screenshot({ path: png })
    await sharp(png).webp({ quality: 82 }).toFile(`${outDir}/${name}.webp`)
    unlinkSync(png)
  } else {
    // sharp が無い環境（本 worktree）では jpeg 品質 80 で撮る（png は sp dpr2 で 1 枚 1〜2 MB になり commit に向かない）
    await page.screenshot({ path: `${outDir}/${name}.jpg`, type: 'jpeg', quality: 80 })
  }
  console.log('shot', name)
}

const browser = await chromium.launch()
for (const [id, vp] of Object.entries(VPS)) {
  const context = await browser.newContext(vp)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  const url = `${base}/?seed=final-v114`
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {}
  })
  await page.goto(url, { waitUntil: 'networkidle' })
  await maybe(page, 'わかった')
  await page.waitForTimeout(800)
  await shot(page, `${id}-01-home`)
  await click(page, '神を選ぶ')
  await maybe(page, '新しく始める')
  await page.waitForTimeout(600)
  await shot(page, `${id}-02-god-select`)
  await click(page, '大耀')
  await click(page, 'この構成で始める')
  await page.getByText('挑む敵を選ぼう').first().waitFor({ timeout: 8000 })
  await page.waitForTimeout(800)
  await shot(page, `${id}-03-enemy-select`)
  await page.getByRole('button', { name: /十七代将軍・康虎/ }).first().click({ timeout: 8000 })
  await click(page, 'この構成でバトル開始')
  await page.waitForTimeout(1200)
  await shot(page, `${id}-04-entrance`)
  await page.keyboard.press('Escape').catch(() => {})
  await page.getByRole('button', { name: 'ラウンドを終える' }).first().waitFor({ timeout: 25000 })
  await page.waitForTimeout(1500)
  await shot(page, `${id}-05-battle-r1`)
  console.log(id, 'errors', errors.length)
  await context.close()
}
await browser.close()

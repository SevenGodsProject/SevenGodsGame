// 決定266：PC 900 幅・手札 10 枚（最大の重なり）で、マウスを載せたカードが隣より前に出る（右端の文字が読める）ことの確認
import { withBrowser, startBattle, BASES, logger } from './lib.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'
const OUT = 'docs/evidence/decision266/hover'
mkdirSync(OUT, { recursive: true })
const log = logger(`${OUT}/hover-probe.log.txt`)
const { result } = await withBrowser(async (browser) => {
  const { page, errors } = await startBattle(browser, BASES.after, 'pc900', { god: 'taiyo', enemy: 'ryujin', seed: 'd266-hand' })
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => document.querySelector('.end-round-button')?.click())
    await page.waitForFunction(() => document.querySelector('.end-round-button')?.disabled, null, { timeout: 8000 }).catch(() => {})
    await page.waitForFunction(() => { const b = document.querySelector('.end-round-button'); return b && !b.disabled }, null, { timeout: 30000 })
    await page.waitForTimeout(1500)
  }
  const out = []
  for (const idx of [0, 4]) {
    const loc = page.locator('.hand .card-view').nth(idx)
    await loc.hover()
    await page.waitForTimeout(400)
    const r = await page.evaluate((idx) => {
      const c = document.querySelectorAll('.hand .card-view')[idx]
      const b = c.getBoundingClientRect()
      const h = document.elementFromPoint(b.x + b.width - 12, b.y + b.height / 2)
      return { idx, n: document.querySelectorAll('.hand .card-view').length, rightEdgeHitsSelf: !!h && c.contains(h), z: getComputedStyle(c).zIndex, disabled: c.disabled }
    }, idx)
    await page.screenshot({ path: `${OUT}/after-pc900-hand10-hover${idx}.jpg`, type: 'jpeg', quality: 60, clip: { x: 0, y: 440, width: 900, height: 220 } })
    out.push(r)
    log(JSON.stringify(r))
  }
  return { out, errors }
}, log)
writeFileSync(`${OUT}/hover-probe.json`, JSON.stringify(result, null, 1))

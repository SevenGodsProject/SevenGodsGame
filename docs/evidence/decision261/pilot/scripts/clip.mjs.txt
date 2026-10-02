// 部分拡大：node scripts/d261/clip.mjs <side> <vp> <god> <enemy> x y w h
import { withBrowser, startBattle, BASES } from './lib.mjs'
const [side, vp, god, enemy, x, y, w, h] = process.argv.slice(2)
const out = 'C:/Users/kimi1/AppData/Local/Temp/claude/C--Users-kimi1-SevenGodsGame/1141c1d1-9eb9-4c4a-a511-66373648126e/scratchpad/probe'
await withBrowser(async (browser) => {
  const { page } = await startBattle(browser, BASES[side], vp, { god, enemy, seed: 'd261-probe' })
  const info = await page.evaluate(() => { const f = document.querySelector('.portrait-otomo'); const i = f?.querySelector('img'); return { fig: f ? getComputedStyle(f).opacity + ' ' + getComputedStyle(f).visibility : null, img: i ? [getComputedStyle(i).opacity, i.complete, i.naturalWidth] : null, top: i ? document.elementFromPoint(i.getBoundingClientRect().x + 20, i.getBoundingClientRect().y + 20)?.className : null } })
  console.log(JSON.stringify(info))
  await page.screenshot({ path: `${out}/clip-${side}-${vp}.png`, clip: { x: +x, y: +y, width: +w, height: +h } })
})

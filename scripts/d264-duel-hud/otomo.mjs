import { withBrowser, startBattle, BASES } from './lib.mjs'
const [side, vp, god, enemy] = process.argv.slice(2)
const out = 'C:/Users/kimi1/AppData/Local/Temp/claude/C--Users-kimi1-SevenGodsGame/1141c1d1-9eb9-4c4a-a511-66373648126e/scratchpad/probe'
await withBrowser(async (browser) => {
  const { page } = await startBattle(browser, BASES[side], vp, { god, enemy, seed: 'd261-probe' })
  console.log(JSON.stringify(await page.evaluate(() => { const i = document.querySelector('.portrait-otomo img'); const cs = getComputedStyle(i); return ['visibility','opacity','clipPath','mask','transform','translate','scale','objectPosition','objectFit','width','height','maxHeight','filter','animationName','mixBlendMode','display'].map((k) => k + '=' + cs[k]).join(' | ') + ' src=' + i.currentSrc })))
  await page.screenshot({ path: `${out}/otomo-zoom-${side}-${vp}.png`, clip: await page.evaluate(() => { const r = document.querySelector(".portrait-otomo img").getBoundingClientRect(); return { x: r.x - 30, y: r.y - 30, width: r.width + 60, height: r.height + 60 } }) }); await page.locator(".god-otomo-panel").screenshot({ path: `${out}/otomo-panel-${side}-${vp}.png` })
})

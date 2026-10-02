import { withBrowser, startBattle, BASES } from './lib.mjs'
const [side, vp, god, enemy] = process.argv.slice(2)
const out = 'C:/Users/kimi1/AppData/Local/Temp/claude/C--Users-kimi1-SevenGodsGame/1141c1d1-9eb9-4c4a-a511-66373648126e/scratchpad/probe'
await withBrowser(async (browser) => {
  const { page } = await startBattle(browser, BASES[side], vp, { god, enemy, seed: 'd261-probe' })
  await page.addStyleTag({ content: '.portrait-otomo img{outline:2px solid lime !important}' })
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${out}/otomo-outline-${side}-${vp}.png`, clip: { x: 250, y: 150, width: 140, height: 140 } })
})

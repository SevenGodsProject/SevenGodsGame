// 1 run：指定座標の要素を列挙＋クリップ撮影：node scripts/d264-duel-hud/pick.mjs <side> <vp> <god> <enemy> x,y[;x,y] [clip=x,y,w,h]
import { withBrowser, startBattle, BASES, logger } from './lib.mjs'
const [side, vp, god, enemy, pts, clip] = process.argv.slice(2)
const out = 'C:/Users/kimi1/AppData/Local/Temp/claude/C--Users-kimi1-SevenGodsGame/1141c1d1-9eb9-4c4a-a511-66373648126e/scratchpad/probe'
await withBrowser(async (browser) => {
  const { page } = await startBattle(browser, BASES[side], vp, { god, enemy, seed: 'd264-probe' })
  for (const p of (pts || '').split(';').filter(Boolean)) {
    const [x, y] = p.split(',').map(Number)
    const r = await page.evaluate(([x, y]) => document.elementsFromPoint(x, y).slice(0, 8).map((e) => `${e.tagName}.${String(e.className).slice(0, 50)} ${JSON.stringify(e.getBoundingClientRect().toJSON()).slice(0, 90)}`), [x, y])
    console.log(p, r.join('\n   '))
  }
  if (clip) { const [x, y, width, height] = clip.split(',').map(Number); await page.screenshot({ path: `${out}/clip-${side}-${vp}-${enemy}.png`, clip: { x, y, width, height } }) }
}, logger())

import { withBrowser, startBattle, BASES } from './lib.mjs'
const [side, vp, god, enemy] = process.argv.slice(2)
await withBrowser(async (browser) => {
  const { page } = await startBattle(browser, BASES[side], vp, { god, enemy, seed: 'd261-probe' })
  console.log(JSON.stringify(await page.evaluate(() => { const i = document.querySelector('.portrait-otomo img'); const r = i.getBoundingClientRect(); const desc = (e) => { const cs = getComputedStyle(e); return `${e.tagName}.${typeof e.className === 'string' ? e.className : ''} z=${cs.zIndex} pos=${cs.position} op=${cs.opacity} bg=${cs.backgroundImage.slice(0, 30)}` }; return { r: [r.x, r.y, r.width, r.height], stack: document.elementsFromPoint(r.x + r.width / 2, r.y + r.height / 2).slice(0, 8).map(desc), anc: (() => { const a = []; let e = i; while (e && a.length < 8) { a.push(desc(e) + ' ov=' + getComputedStyle(e).overflow); e = e.parentElement } return a })() } }), null, 1))
})

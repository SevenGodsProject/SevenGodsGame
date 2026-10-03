// 1 run の目視・数値プローブ：node scripts/d264-duel-hud/probe.mjs <before|after> <vp> <god> <enemy> [outDir]
import { withBrowser, startBattle, MEASURE, BASES, logger } from './lib.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'
const [side = 'after', vp = 'pc660', god = 'taiyo', enemy = 'oni', out = 'C:/Users/kimi1/AppData/Local/Temp/claude/C--Users-kimi1-SevenGodsGame/1141c1d1-9eb9-4c4a-a511-66373648126e/scratchpad/probe'] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const log = logger()
const { mem, result } = await withBrowser(async (browser) => {
  const { page, errors, entrance } = await startBattle(browser, BASES[side], vp, { god, enemy, seed: 'd264-probe' })
  const m = await page.evaluate(MEASURE)
  const f = `${out}/${side}-${vp}-${god}-${enemy}`
  await page.screenshot({ path: `${f}.png` })
  writeFileSync(`${f}.json`, JSON.stringify({ m, entrance, errors }, null, 1))
  return { m, errors, entrance }
}, log)
const { m } = result
const h = m.hud
const w = (k) => (h[k] ? `${h[k][0]}x${h[k][1]}@${h[k][2]},${h[k][3]}` : '-')
log(`mem ${mem}MB`)
console.log(`HP e=${w('enemyHp')} g=${w('godHp')} reso=${w('reso')} plates e=${w('enemyPlate')} g=${w('godPlate')} o=${w('otomoPlate')} passive=${w('passive')} head=${w('burstHead')} portrait=${w('portrait')} preview=${w('preview')} bubble=${w('bubble')}`)
console.log(`stage e=${w('enemyStage')} g=${w('godStage')} artScale=${h.artScale} cols=${h.mainCols}`)
console.log(`area e=${m.area.enemy} g=${m.area.god} o=${m.area.otomo} g/e=${(m.area.god / m.area.enemy).toFixed(3)} gap=${m.gapEnemyGod} hit=${[m.hit.enemySlashIn, m.hit.enemyNumberIn, m.hit.godSlashIn, m.hit.godNumberIn].filter(Boolean).length}/4 epc=${m.ratio.enemyPerCard} gpc=${m.ratio.godPerCard}`)
console.log(`overlap ${JSON.stringify(m.overlap)}`)
console.log(`clipped=${JSON.stringify(m.clipped)} hScroll=${m.hScroll || m.bodyHScroll} lines=${JSON.stringify(m.lines)} errors=${result.errors.length}`)

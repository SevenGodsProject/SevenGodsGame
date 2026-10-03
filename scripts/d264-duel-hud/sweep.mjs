// 調整用スイープ（1 browser・context を 1 つずつ直列）：node scripts/d264-duel-hud/sweep.mjs <side> <vp,vp> [enemies=all] [gods=taiyo]
import { withBrowser, startBattle, MEASURE, BASES, logger } from './lib.mjs'
const [side = 'after', vps = 'pc660', en = 'trial,oni,onryo,karakuri,juuma,ryujin,doukeshi', gods = 'taiyo'] = process.argv.slice(2)
const log = logger()
await withBrowser(async (browser) => {
  for (const vp of vps.split(',')) for (const god of gods.split(',')) for (const enemy of en.split(',')) {
    const { ctx, page, errors } = await startBattle(browser, BASES[side], vp, { god, enemy, seed: 'd264-probe' })
    const m = await page.evaluate(MEASURE)
    const h = m.hud
    const o = m.overlap
    const bad = Object.entries(o).filter(([k, v]) => k !== 'dockTopMinusInkBottom' && v).map(([k, v]) => `${k}=${v}`).join(',')
    console.log(`${vp} ${god}-${enemy}: s=${h.artScale} e=${m.area.enemy} g=${m.area.god} o=${m.area.otomo} g/e=${(m.area.god / m.area.enemy).toFixed(3)} gap=${m.gapEnemyGod} hit=${[m.hit.enemySlashIn, m.hit.enemyNumberIn, m.hit.godSlashIn, m.hit.godNumberIn].filter(Boolean).length} epc=${m.ratio.enemyPerCard} gpc=${m.ratio.godPerCard} HP=${h.enemyHp?.[0]}/${h.godHp?.[0]} reso=${h.reso?.[0]}x${h.reso?.[1]} inkTop=${Math.round(m.enemyInk?.y)} dockGap=${o.dockTopMinusInkBottom} bad=[${bad}] clip=${m.clipped.length} hs=${m.hScroll || m.bodyHScroll} err=${errors.length}`)
    await ctx.close()
  }
}, log)

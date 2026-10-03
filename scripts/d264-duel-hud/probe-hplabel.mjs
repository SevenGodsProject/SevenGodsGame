// 決定264 G13 Root Cause：HP ラベル（.hp-bar-label）の計測対象の妥当性確認（Before／After × pc660／sp844 × 大耀×鬼将）
// 記録：DOM の重なり順（label の直下にある要素＝elementsFromPoint）・計算後のスタイル（文字色・text-shadow・fill 色・艶）・HP バーのクロップ PNG
// node scripts/d264-duel-hud/probe-hplabel.mjs
import { withBrowser, startBattle, BASES, logger } from './lib.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'
const OUT = 'docs/evidence/decision264/g13-hplabel'
mkdirSync(OUT, { recursive: true })
const log = logger(`${OUT}/probe.log.txt`)
const out = []
for (const vp of ['pc660', 'sp844']) for (const side of ['before', 'after']) {
  const key = `${side}-${vp}-taiyo-oni`
  const { mem, result } = await withBrowser(async (browser) => {
    const { ctx, page, errors } = await startBattle(browser, BASES[side], vp, { god: 'taiyo', enemy: 'oni', seed: 'd264-hud' })
    const info = await page.evaluate(() => {
      const one = (plateSel) => {
        const bar = document.querySelector(`${plateSel} .hp-bar`)
        const label = bar.querySelector('.hp-bar-label'), fill = bar.querySelector('.hp-bar-fill')
        const ls = getComputedStyle(label), fs = getComputedStyle(fill), bs = getComputedStyle(bar)
        const rg = document.createRange(); rg.selectNodeContents(label); const t = rg.getBoundingClientRect()
        const cx = t.left + t.width / 2, cy = t.top + t.height / 2
        const stack = document.elementsFromPoint(cx, cy).slice(0, 5).map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join('.')}`)
        const b = bar.getBoundingClientRect(), f = fill.getBoundingClientRect()
        return {
          text: label.textContent, color: ls.color, fontSize: ls.fontSize, fontWeight: ls.fontWeight, textShadow: ls.textShadow, labelGloss: ls.backgroundImage.slice(0, 120), zIndex: ls.zIndex,
          fillColor: fs.backgroundColor, fillWidthRatio: +(f.width / b.width).toFixed(3), trackBg: bs.backgroundColor + ' ' + bs.backgroundImage.slice(0, 60),
          bar: [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)], textRect: [Math.round(t.x), Math.round(t.y), Math.round(t.width), Math.round(t.height)],
          stackAtTextCenter: stack,
        }
      }
      return { enemy: one('.enemy-plate'), god: one('.player-plate') }
    })
    for (const k of ['enemy', 'god']) {
      const [x, y, w, h] = info[k].bar
      await page.screenshot({ path: `${OUT}/${key}-${k}HpBar.png`, clip: { x: Math.max(0, x - 6), y: Math.max(0, y - 6), width: w + 12, height: h + 12 } })
    }
    await ctx.close()
    return { info, errors: [...errors] }
  }, log)
  out.push({ key, mem, ...result })
  log(`done ${key} mem=${mem} enemy=${result.info.enemy.color}/${result.info.enemy.fillColor} god=${result.info.god.color}/${result.info.god.fillColor} err=${result.errors.length}`)
}
writeFileSync(`${OUT}/probe-hplabel.json`, JSON.stringify(out, null, 1))
log('probe finished')

// G15（決定228／230）：得意技バッジの行数と共鳴札の段数（SP・得意技の神 3 柱）
const g15 = []
for (const vp of ['sp844', 'sp660']) for (const god of ['sobi', 'fukuei', 'shouren']) for (const side of ['before', 'after']) {
  const key = `${side}-${vp}-${god}-ryujin`
  const { result } = await withBrowser(async (browser) => {
    const { ctx, page, errors } = await startBattle(browser, BASES[side], vp, { god, enemy: 'ryujin', seed: 'd264-hud' })
    const m = await page.evaluate(() => {
      const box = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] }
      const b = document.querySelector('.god-otomo-plate .god-passive-badge')
      const cs = b ? getComputedStyle(b) : null; const lh = cs ? (parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3) : 0; const lines = b ? Math.round((b.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) / lh) : null
      return { badge: box('.god-otomo-plate .god-passive-badge'), badgeLines: lines, badgeLH: b ? getComputedStyle(b).lineHeight : null, plate: box('.god-otomo-plate'), gauge: box('.resonance-gauge'), enemyPlate: box('.enemy-plate'), playerPlate: box('.player-plate') }
    })
    await page.screenshot({ path: `${OUT}/g15-${key}.png`, clip: { x: 0, y: 0, width: 390, height: 260 } })
    await ctx.close()
    return { m, errors: [...errors] }
  }, log)
  g15.push({ key, ...result })
  log(`g15 ${key} ${JSON.stringify(result.m)}`)
}
writeFileSync(`${OUT}/g15-sp-plate.json`, JSON.stringify(g15, null, 1))
log('g15 finished')

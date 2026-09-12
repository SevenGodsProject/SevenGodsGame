// Phase 6-A：着弾の瞬間に何がどこへ描かれているかを調べる（監査用の使い捨て計測）。
//   node scripts/phase6-audit/inspect.mjs [baseUrl]
import { pathToFileURL } from 'node:url'
const base = process.argv[2] ?? 'http://localhost:5173'
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
const click = (t) =>
  page.evaluate((text) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(text))
    if (!b) return false
    b.click()
    return true
  }, t)
await page.goto(`${base}/?enemy=oni&stake=2&seed=p6-taiyo`)
await page.waitForSelector('.home-cta-primary')
await click('わかった')
await page.waitForTimeout(250)
await click('神を選ぶ')
await page.waitForTimeout(400)
await click('大耀')
await page.waitForTimeout(300)
await click('この構成で始める')
await page.waitForTimeout(300)
await click('業斧の鬼将')
await page.waitForTimeout(500)
await click('この構成でバトル開始')
await page.waitForSelector('.hand .card-view')
await page.waitForTimeout(1900)
await page.evaluate(() => [...document.querySelectorAll('.hand .card-view')].find((c) => c.textContent.includes('豪快な一撃'))?.click())
await page.waitForTimeout(520)
await page.screenshot({ path: process.env.SHOT_DIR + "/zoom-impact.png", clip: { x: 120, y: 340, width: 600, height: 380 } })
const info = await page.evaluate(() => {
  const n0 = document.querySelector(".enemy-hit-layer .floating-number")
  const probe = n0 ? (() => { const r = n0.getBoundingClientRect(); const el = document.elementFromPoint(r.x + r.width/2, r.y + r.height/2); return { topEl: el?.className?.toString?.().slice(0,60), tag: el?.tagName, anims: n0.getAnimations().map(a=>({n:a.animationName, st:a.playState, t:Math.round(a.currentTime||0)})), op: getComputedStyle(n0).opacity, tr: getComputedStyle(n0).transform, color: getComputedStyle(n0).color } })() : null
  const rect = (el) => {
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), op: cs.opacity, z: cs.zIndex, fs: cs.fontSize, anim: cs.animationName, delay: cs.animationDelay }
  }
  return {
    stage: rect(document.querySelector('.enemy-stage')),
    layer: rect(document.querySelector('.enemy-hit-layer')),
    numbersWrap: rect(document.querySelector('.enemy-hit-layer .floating-numbers')),
    numbers: [...document.querySelectorAll('.enemy-hit-layer .floating-number')].map((n) => ({ t: n.textContent, cls: n.className, ...rect(n) })),
    slash: rect(document.querySelector('.enemy-hit-layer .slash-fx')),
    reaction: rect(document.querySelector('.enemy-reaction')),
    reactionCls: document.querySelector('.enemy-reaction')?.className,
    reactionDelay: document.querySelector('.enemy-reaction') ? getComputedStyle(document.querySelector('.enemy-reaction')).animationDelay : null,
    avatar: rect(document.querySelector('.enemy-avatar')),
    hp: document.querySelector('.enemy-panel .hp-bar-label')?.textContent,
    ghostW: document.querySelector('.enemy-panel .hp-bar-ghost')?.style.width,
    fillW: document.querySelector('.enemy-panel .hp-bar-fill')?.style.width,
    probe,
  }
})
const dbg = await page.evaluate(() => {
  const stage=document.querySelector(".enemy-stage"); const kids=[...stage.children].map(e=>e.className+"|z="+getComputedStyle(e).zIndex+"|pos="+getComputedStyle(e).position+"|f="+getComputedStyle(e).filter+"|t="+getComputedStyle(e).transform+"|w="+getComputedStyle(e).willChange+"|o="+getComputedStyle(e).opacity);
  const av=document.querySelector(".enemy-avatar"); const chain=[]; let el=av; while(el && !el.classList.contains("battle-main")){ const cs=getComputedStyle(el); chain.push(el.className.toString().slice(0,30)+" z="+cs.zIndex+" pos="+cs.position+" f="+(cs.filter==="none"?0:1)+" op="+cs.opacity+" mixblend="+cs.mixBlendMode+" iso="+cs.isolation+" contain="+cs.contain); el=el.parentElement } const n=document.querySelector(".enemy-hit-layer .floating-number"); const r=n.getBoundingClientRect(); const pts=[]; for (const [dx,dy] of [[5,16],[20,16],[30,16]]) { const el=document.elementsFromPoint(r.x+dx, r.y+dy).slice(0,4).map(e=>e.className?.toString?.().slice(0,28)); pts.push(el) } return { kids, chain, rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)], pts, vis:getComputedStyle(n).visibility, disp:getComputedStyle(n).display, clip:getComputedStyle(n.closest(".enemy-panel")).overflow } });
console.log("DBG "+JSON.stringify(dbg));
await page.screenshot({ path: process.env.SHOT_DIR + "/zoom-number.png", clip: { x: 330, y: 420, width: 200, height: 110 } })
const z = await page.evaluate(() => { const n = document.querySelector(".enemy-hit-layer .floating-number"); const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, parentZ: getComputedStyle(n.closest(".enemy-hit-layer")).zIndex } })
console.log("forced", JSON.stringify(z))
console.log(JSON.stringify(info, null, 1))
await browser.close()

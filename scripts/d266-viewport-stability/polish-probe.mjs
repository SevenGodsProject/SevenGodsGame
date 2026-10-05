// 決定266 §Polish（Human QA フォローアップ）— PC 多枚数手札の視認性（AC1〜AC5・AC9）。
// PC 1024／1280／1508 × 660／800 高。手札はカードを出さずにラウンドを終えて 5→7→9→10 枚。
// 各枚数：Arena 高・送り幅（重なり量）・各カードの名前／コスト珠の被覆・中心の当たり。
// 10 枚：全カードを 1 枚ずつ hover（マウス）と focus-visible（キーボード）→ カード全面の被覆・viewport 内・持ち上げ量。
// 最後に「出せる」カードを実 click して枚数が減ることを確認。1 browser／1 context／1 run 直列。
// node scripts/d266-viewport-stability/polish-probe.mjs side=before|after [vp=pc1024x660,...] [force=1]
import { withBrowser, startBattle, BASES, VPS, logger } from './lib.mjs'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
const OUT = 'docs/evidence/decision266/polish'
mkdirSync(`${OUT}/runs`, { recursive: true })
mkdirSync(`${OUT}/shots`, { recursive: true })
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')))
const side = args.side ?? 'after'
// Before（Polish 前）＝runtime 9c6596a の :4303 を差し替え前に測る（base=after で URL だけ :4303 を使う）
const BASE = BASES[args.base ?? side]
const mk = (w, h) => ({ viewport: { width: w, height: h }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 })
Object.assign(VPS, { pc1024x660: mk(1024, 660), pc1280x660: mk(1280, 660), pc1508x660: mk(1508, 660), pc1024x800: mk(1024, 800), pc1280x800: mk(1280, 800), pc1508x800: mk(1508, 800) })
const VPN = args.vp ? args.vp.split(',') : ['pc1024x660', 'pc1280x660', 'pc1508x660', 'pc1024x800', 'pc1280x800', 'pc1508x800']
const log = logger(`${OUT}/polish-probe.log.txt`)

/** 静止状態：各カードの名前（要素の箱）・コスト珠・中心が、そのカード自身に当たるか */
const STATIC = () => {
  const r1 = (v) => Math.round(v * 10) / 10
  const cards = [...document.querySelectorAll('.hand .card-view')]
  const own = (c, x, y) => { const h = document.elementFromPoint(x, y); return !!h && c.contains(h) }
  const per = cards.map((c, i) => {
    const b = c.getBoundingClientRect()
    const name = c.querySelector('.card-view-name')
    const nb = name.getBoundingClientRect()
    const cost = c.querySelector('.card-view-cost')
    const cb = cost ? cost.getBoundingClientRect() : null
    const ys = [nb.top + 2, nb.top + nb.height / 2, nb.bottom - 2]
    let nameHit = true
    for (const y of ys) for (let x = nb.left + 1; x <= nb.right - 1; x += 3) if (!own(c, x, y)) nameHit = false
    for (const y of ys) if (!own(c, nb.right - 1, y)) nameHit = false
    const costHit = cb ? own(c, cb.left + cb.width / 2, cb.top + cb.height / 2) && own(c, cb.right - 3, cb.top + cb.height / 2) : null
    const centerHit = own(c, b.left + b.width / 2, b.top + b.height / 2)
    const next = cards[i + 1]?.getBoundingClientRect()
    return { i, name: name.textContent.trim(), x: r1(b.x), w: r1(b.width), step: next ? r1(next.x - b.x) : null, overlap: next ? r1(b.right - next.x) : null, nameBox: [r1(nb.x - b.x), r1(nb.width), r1(nb.height)], nameLines: Math.round(nb.height / (parseFloat(getComputedStyle(name).lineHeight) || 15)), nameHit, costHit, centerHit, disabled: c.disabled }
  })
  const q = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: r1(b.x), y: r1(b.y), w: r1(b.width), h: r1(b.height) } }
  // カード内のはみ出し（本文が札の下端を越える等）
  const clipped = []
  for (const c of cards) {
    const cb = c.getBoundingClientRect()
    for (const e of c.querySelectorAll('.card-view-body, .card-view-body *')) {
      const cs = getComputedStyle(e)
      if (cs.display === 'none') continue
      const r = e.getBoundingClientRect()
      if (r.height > 0 && (r.bottom > cb.bottom + 1 || r.top < cb.top - 1)) clipped.push({ card: c.querySelector('.card-view-name')?.textContent.trim(), el: String(e.className).slice(0, 30), over: r1(r.bottom - cb.bottom) })
    }
  }
  return { n: cards.length, per, arena: q('.battle-main'), dock: q('.battle-dock'), hand: q('.hand'), enemyHp: q('.enemy-plate .hp-bar'), godHp: q('.player-plate .hp-bar'), intent: q('.enemy-plate .intent'), reso: q('.resonance-gauge'), hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth, clipped }
}

/** hover／focus 中のカード i：カード全面（5×7 点・内側 8px＝角丸の外を除く）がそのカード自身に当たるか・viewport 内か */
const LIFTED = (i) => {
  const c = document.querySelectorAll('.hand .card-view')[i]
  const b = c.getBoundingClientRect()
  let all = 0, ok = 0
  const miss = []
  for (let yi = 0; yi < 7; yi++) for (let xi = 0; xi < 5; xi++) {
    const x = b.left + 8 + ((b.width - 16) * xi) / 4, y = b.top + 8 + ((b.height - 16) * yi) / 6
    all++
    const h = document.elementFromPoint(x, y)
    if (h && c.contains(h)) ok++
    else miss.push([Math.round(x - b.left), Math.round(y - b.top), h ? String(h.className).slice(0, 30) : null])
  }
  const cs = getComputedStyle(c)
  return { i, top: Math.round(b.top * 10) / 10, bottom: Math.round(b.bottom * 10) / 10, left: Math.round(b.left * 10) / 10, right: Math.round(b.right * 10) / 10, full: ok === all, ok, all, miss, inViewport: b.top >= 0 && b.left >= 0 && b.right <= innerWidth && b.bottom <= innerHeight, z: cs.zIndex, transform: cs.transform, focusVisible: c.matches(':focus-visible'), hover: c.matches(':hover') }
}

// 低メモリ機では transition の開始が main thread の混雑で数百 ms 遅れる＝カードのアニメが終わるまで待ってから測る
async function settle(page, i) {
  // transform が 2 回続けて同じ値・アニメ無し・（持ち上げがある規則なら）恒等でなくなるまで（最大 3 秒）
  let prev = null
  for (let k = 0; k < 30; k++) {
    await page.waitForTimeout(100)
    const st = await page.evaluate((i) => { const c = document.querySelectorAll('.hand .card-view')[i]; return { t: getComputedStyle(c).transform, busy: c.getAnimations().some((a) => a.playState !== 'finished') } }, i)
    if (!st.busy && prev === st.t && st.t !== 'matrix(1, 0, 0, 1, 0, 0)') break
    prev = st.t
  }
}

async function one(vp) {
  const god = args.god ?? 'taiyo'
  const key = `${side}-${vp}${god === 'taiyo' ? '' : '-' + god}`
  const file = `${OUT}/runs/${key}.json`
  if (existsSync(file) && !args.force) return
  const { mem, result } = await withBrowser(async (browser) => {
    const { page, errors } = await startBattle(browser, BASE, vp, { god, enemy: 'ryujin', seed: 'd266-hand' })
    const steps = []
    for (let round = 1; round <= 4; round++) {
      await page.mouse.move(2, 2)
      await page.waitForTimeout(300)
      const s = await page.evaluate(STATIC)
      steps.push({ round, ...s })
      log(`${key} hand=${s.n} arena=${s.arena?.h} step=${s.per[0]?.step} overlap=${s.per[0]?.overlap} name=${s.per.filter((p) => p.nameHit).length}/${s.n} cost=${s.per.filter((p) => p.costHit).length}/${s.n} center=${s.per.filter((p) => p.centerHit).length}/${s.n} clipped=${s.clipped.length}`)
      if (s.n >= 10 || round === 4) break
      await page.evaluate(() => document.querySelector('.end-round-button')?.click())
      await page.waitForFunction(() => document.querySelector('.end-round-button')?.disabled, null, { timeout: 8000 }).catch(() => {})
      await page.waitForFunction(() => { const b = document.querySelector('.end-round-button'); return b && !b.disabled }, null, { timeout: 30000 })
      await page.waitForTimeout(1800)
    }
    const n = steps.at(-1).n
    const short = vp.replace('pc', '').replace('x', '-') + (god === 'taiyo' ? '' : '-' + god)
    if (vp.endsWith('x660')) await page.screenshot({ path: `${OUT}/shots/${side}-${short}-hand${n}.jpg`, type: 'jpeg', quality: 62 })
    const rest = await page.evaluate(() => [...document.querySelectorAll('.hand .card-view')].map((c) => Math.round(c.getBoundingClientRect().top * 10) / 10))
    // hover（マウス）
    const hover = []
    for (let i = 0; i < n; i++) {
      const c = page.locator('.hand .card-view').nth(i)
      const b = await c.boundingBox()
      // 覆われていない左端寄り（名前の帯）にマウスを載せる＝実際のプレイヤーの指し方
      // 前のカード（hover 中は前面）の右端より右＝このカードの見えている帯にマウスを載せる（実際のプレイヤーの指し方）
      const prevRight = i > 0 ? await page.evaluate((i) => document.querySelectorAll('.hand .card-view')[i - 1].getBoundingClientRect().right, i) : b.x
      await page.mouse.move(Math.min(b.x + b.width - 6, Math.max(b.x + 20, prevRight + 8)), b.y + b.height * 0.75)
      await settle(page, i)
      const r = await page.evaluate(LIFTED, i)
      hover.push({ ...r, lift: Math.round((rest[i] - r.top) * 10) / 10 })
      if (i === 4 && vp.endsWith('x660')) await page.screenshot({ path: `${OUT}/shots/${side}-${short}-hand${n}-hover4.jpg`, type: 'jpeg', quality: 62 })
    }
    await page.mouse.move(2, 2)
    await page.waitForTimeout(300)
    // focus-visible（キーボード）：Tab でキーボード操作扱いにしてから各カードへ focus
    const focus = []
    await page.keyboard.press('Tab')
    for (let i = 0; i < n; i++) {
      await page.evaluate((i) => document.querySelectorAll('.hand .card-view')[i].focus(), i)
      await settle(page, i)
      const r = await page.evaluate(LIFTED, i)
      focus.push({ ...r, lift: Math.round((rest[i] - r.top) * 10) / 10 })
      if (i === 4 && vp.endsWith('x660')) await page.screenshot({ path: `${OUT}/shots/${side}-${short}-hand${n}-focus4.jpg`, type: 'jpeg', quality: 62 })
    }
    await page.evaluate(() => document.activeElement?.blur())
    // AC2：出せるカードを実 click
    let click = null
    const idx = await page.evaluate(() => [...document.querySelectorAll('.hand .card-view')].findIndex((c) => !c.disabled))
    if (idx >= 0) {
      const before = n
      await page.locator('.hand .card-view').nth(idx).click({ timeout: 5000 })
      await page.waitForFunction((n) => document.querySelectorAll('.hand .card-view').length < n, before, { timeout: 8000 }).catch(() => {})
      const after = await page.evaluate(() => document.querySelectorAll('.hand .card-view').length)
      click = { idx, before, after, reacted: after < before }
    }
    return { steps, hover, focus, click, errors: [...errors] }
  }, log)
  writeFileSync(file, JSON.stringify({ key, side, vp, mem, ...result }, null, 1))
  const h = result.hover, f = result.focus
  log(`done ${key} hoverFull=${h.filter((x) => x.full).length}/${h.length} hoverInVp=${h.filter((x) => x.inViewport).length} lift=${Math.min(...h.map((x) => x.lift))}..${Math.max(...h.map((x) => x.lift))} focusFull=${f.filter((x) => x.full && x.focusVisible).length}/${f.length} focusInVp=${f.filter((x) => x.inViewport).length} click=${JSON.stringify(result.click)} errors=${result.errors.length}`)
}
for (const vp of VPN) {
  try { await one(vp) } catch (e) { log(`FAIL ${side}-${vp} ${String(e).slice(0, 300)}`) }
}
log('polish-probe finished')

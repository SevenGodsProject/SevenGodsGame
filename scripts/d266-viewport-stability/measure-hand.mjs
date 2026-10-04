// 決定266 Battle Viewport Stability — 手札枚数（5／7／9／10）ごとの戦場・立ち絵 ink・HP・予告・共鳴ゲージの実測（AC1〜AC7）。
// 手札は engine を触らず「カードを出さずにラウンドを終える」だけで自然に増やす（RULES.deck initialHand 5・drawPerRound 2・handLimit 10）。
// 1 browser／1 context／1 run 直列（6GB 機）。
// node scripts/d266-viewport-stability/measure-hand.mjs [only=before|after] [vp=pc660,sp844] [force=1]
import { withBrowser, startBattle, MEASURE, BASES, logger } from './lib.mjs'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
const OUT = 'docs/evidence/decision266/hand'
mkdirSync(`${OUT}/runs`, { recursive: true })
mkdirSync(`${OUT}/shots`, { recursive: true })
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')))
const SIDES = args.only ? args.only.split(',') : ['before', 'after']
const VPN = args.vp ? args.vp.split(',') : ['pc660', 'pc800', 'sp844', 'sp660']
const COMBO = { god: args.god ?? 'taiyo', enemy: args.enemy ?? 'ryujin', seed: args.seed ?? 'd266-hand' }
const log = logger(`${OUT}/measure-hand.log.txt`)

/** ページ内：AC1〜AC7 の実寸 */
const PROBE = async () => {
  const r = (e) => { if (!e || getComputedStyle(e).display === 'none') return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10, w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10 } }
  const q = (s) => document.querySelector(s)
  const intentEl = q('.enemy-plate .intent')
  const hand = q('.hand')
  const cs = hand ? getComputedStyle(hand) : null
  return {
    arena: r(q('.battle-main')), battle: r(q('.battle')), topbar: r(q('.battle-topbar')), dock: r(q('.battle-dock')), hand: r(hand),
    handScroll: hand ? { sw: hand.scrollWidth, cw: hand.clientWidth, sh: hand.scrollHeight, ch: hand.clientHeight, ox: cs.overflowX, wrap: cs.flexWrap } : null,
    handCount: hand?.dataset.handCount ?? null,
    enemyHp: r(q('.enemy-plate .hp-bar')), godHp: r(q('.player-plate .hp-bar')),
    intent: r(intentEl), intentFont: intentEl ? getComputedStyle(intentEl).fontSize : null, intentText: intentEl?.textContent.trim().slice(0, 40) ?? null,
    reso: r(q('.resonance-gauge')),
    enemyAvatar: r(q('.enemy-avatar')), godAvatar: r(q('.player-avatar')),
    cardBoxes: [...document.querySelectorAll('.hand .card-view')].map((c) => r(c)),
  }
}

/** AC6：各カードの中心が elementFromPoint で自分自身に当たるか（横スクロールなら scrollIntoView 後） */
const HITTEST = async () => {
  const out = []
  const cards = [...document.querySelectorAll('.hand .card-view')]
  for (const [i, c] of cards.entries()) {
    const hand = c.closest('.hand')
    const scrollable = hand && hand.scrollWidth > hand.clientWidth + 1
    if (scrollable) { c.scrollIntoView({ block: 'nearest', inline: 'nearest' }); await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))) }
    const b = c.getBoundingClientRect()
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2
    const h = document.elementFromPoint(cx, cy)
    const inView = cx >= 0 && cx <= innerWidth && cy >= 0 && cy <= innerHeight
    out.push({ i, hit: !!h && c.contains(h), inView, scrolled: !!scrollable, disabled: c.disabled, w: Math.round(b.width), x: Math.round(b.x) })
  }
  const hand = document.querySelector('.hand')
  if (hand) hand.scrollLeft = 0
  return out
}

async function waitPlayerTurn(page) {
  await page.waitForFunction(() => { const b = document.querySelector('.end-round-button'); return b && b.disabled }, null, { timeout: 8000 }).catch(() => {})
  await page.waitForFunction(() => { const b = document.querySelector('.end-round-button'); return b && !b.disabled }, null, { timeout: 30000 })
  await page.waitForTimeout(1800) // 配札・敵演出の settle
}

async function one(side, vp) {
  const key = `${side}-${vp}`
  const file = `${OUT}/runs/${key}.json`
  if (existsSync(file) && !args.force) return JSON.parse(readFileSync(file, 'utf8'))
  const { mem, result } = await withBrowser(async (browser) => {
    const { page, errors } = await startBattle(browser, BASES[side], vp, COMBO)
    const steps = []
    for (let round = 1; round <= 4; round++) {
      const n = await page.evaluate(() => document.querySelectorAll('.hand .card-view').length)
      const m = await page.evaluate(MEASURE)
      const p = await page.evaluate(PROBE)
      await page.screenshot({ path: `${OUT}/shots/${key}-hand${n}.jpg`, type: 'jpeg', quality: 60 })
      const hits = await page.evaluate(HITTEST)
      steps.push({ round, n, p, ink: { enemy: m.enemyInk, god: m.godInk }, clipped: m.clipped.filter((c) => c.root !== 'card-view' || c.over || c.overY), hScroll: m.hScroll || m.bodyHScroll, hits, status: await page.evaluate(() => document.querySelector('.battle-topbar')?.textContent.trim().slice(0, 30)) })
      log(`${key} R${round} hand=${n} arena=${p.arena?.h} dock=${p.dock?.h} enemyInkH=${m.enemyInk?.h} godInkH=${m.godInk?.h} hpE=${p.enemyHp?.w} intent=${p.intent?.h}/${p.intentFont} reso=${p.reso?.w} hits=${hits.filter((h) => h.hit).length}/${hits.length}`)
      if (n >= 10 || round === 4) break
      await page.evaluate(() => document.querySelector('.end-round-button')?.click())
      await waitPlayerTurn(page)
    }
    // AC6 click：最後の手札で「出せる」カード 1 枚を実 click（Playwright のマウス）→ 手札枚数が減るか pending になるか
    let clickTest = null
    const idx = await page.evaluate(() => [...document.querySelectorAll('.hand .card-view')].findIndex((c) => !c.disabled && !c.className.includes('unaffordable')))
    if (idx >= 0) {
      const loc = page.locator('.hand .card-view').nth(idx)
      await loc.scrollIntoViewIfNeeded()
      const before = await page.evaluate(() => document.querySelectorAll('.hand .card-view').length)
      await loc.click({ timeout: 5000 })
      await page.waitForTimeout(1500)
      const after = await page.evaluate(() => document.querySelectorAll('.hand .card-view').length)
      clickTest = { idx, before, after, reacted: after < before }
    }
    return { steps, clickTest, errors: [...errors] }
  }, log)
  const rec = { key, side, vp, ...COMBO, mem, ...result }
  writeFileSync(file, JSON.stringify(rec, null, 1))
  log(`done ${key} click=${JSON.stringify(result.clickTest)} errors=${result.errors.length}`)
  return rec
}
for (const vp of VPN) for (const side of SIDES) {
  try { await one(side, vp) } catch (e) { log(`FAIL ${side}-${vp} ${String(e).slice(0, 300)}`) }
}
log('measure-hand finished')

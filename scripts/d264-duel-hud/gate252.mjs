// 決定264 Fast Gate G10′ — 敵の必殺カットイン（決定252）の timing／入力ロック（決定250 法：Before／After × PC／SP × N 回の中央値）
// 大耀 × 業斧の鬼将・ふつう・seed d257-qa1（R3 溜め → R4 業斧・断岩：決定257 で発生を機械確認済み）。
// R1〜R3 は「出せる札の先頭を最大 3 枚」→ ラウンドを終える（同 seed・同 action 列＝engine は決定論）。
// R4 の「ラウンドを終える」click を t0 に、enemy-cutin の mount／unmount・着弾（reaction の impactAt）・操作の再開（end-round の disabled 解除）を記録。
// node scripts/d264-duel-hud/gate252.mjs [runs=5]
import { withBrowser, logger, BASES } from './lib.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'
const OUT = 'docs/evidence/decision264/g10-enemy-ultimate'
mkdirSync(OUT, { recursive: true })
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')))
const RUNS = Number(args.runs ?? 5)
const VPS = { pc: { viewport: { width: 1508, height: 660 } }, sp: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
const log = logger(`${OUT}/gate252.log.txt`)

const INIT = () => {
  const log = []
  const t = () => Math.round(performance.now())
  window.__eu = { log, t0: null }
  const mark = (ev, extra) => log.push({ t: t(), ev, ...(extra ?? {}) })
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.addedNodes) if (n instanceof Element) {
        if (n.classList.contains('enemy-cutin')) mark('cutin+')
        if (n.classList.contains('enemy-reaction') && n.dataset.impactAt) mark('reaction+', { impactAt: Number(n.dataset.impactAt), stop: n.style.getPropertyValue('--stop') })
        if (n.classList.contains('resonance-cutin')) mark('godcutin+')
      }
      for (const n of m.removedNodes) if (n instanceof Element && n.classList.contains('enemy-cutin')) mark('cutin-')
      if (m.type === 'attributes' && m.target instanceof Element && m.target.classList.contains('end-round-button') && m.attributeName === 'disabled') mark(m.target.disabled ? 'lock' : 'unlock')
    }
  })
  const start = () => mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled'] })
  if (document.body) start(); else addEventListener('DOMContentLoaded', start)
}

async function one(side, vp, i) {
  const { mem, result } = await withBrowser(async (browser) => {
    const ctx = await browser.newContext({ ...VPS[vp], deviceScaleFactor: 1 })
    await ctx.addInitScript(INIT)
    const page = await ctx.newPage()
    const errors = []
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
    page.on('pageerror', (e) => errors.push('pageerror ' + String(e).slice(0, 200)))
    const url = `${BASES[side]}/?seed=d257-qa1&enemy=oni`
    await page.goto(url, { waitUntil: 'networkidle' }); await page.evaluate(() => { try { localStorage.clear() } catch {} }); await page.goto(url, { waitUntil: 'networkidle' })
    await page.click('[data-testid="home-start"]'); await page.locator('.god-select-card').nth(1).click(); await page.locator('.difficulty-select button').nth(1).click(); await page.click('.god-select-confirm')
    if (await page.locator('.enemy-select-card').count()) await page.locator('.enemy-select-card').nth(1).click()
    await page.getByRole('button', { name: 'この構成でバトル開始' }).click(); await page.waitForSelector('.divination-panel', { timeout: 15000 }); await page.waitForSelector('[data-testid="boss-entrance"]', { state: 'detached', timeout: 8000 }).catch(() => {}); await page.waitForTimeout(400)
    const intents = []
    for (let r = 1; r <= 4; r++) {
      await page.waitForFunction((rr) => { const m = document.body.innerText.match(/ラウンド\s*(\d)/); const b = document.querySelector('.end-round-button'); return m && m[1] === String(rr) && b && !b.disabled && !document.querySelector('.enemy-cutin, .resonance-cutin') }, r, { timeout: 15000 }).catch(() => {})
      await page.waitForTimeout(300)
      intents.push(await page.evaluate(() => document.querySelector('.intent')?.textContent.trim() ?? null))
      if (r < 4) {
        for (let k = 0; k < 3; k++) { await page.waitForFunction(() => !document.querySelector('.resonance-cutin, .enemy-cutin'), null, { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(150); const cards = page.locator('.card-view:not(:disabled)'); const n = await cards.count(); if (!n) break; await cards.first().click().catch(() => {}); await page.waitForTimeout(650); if ((await page.locator('.card-view').count()) === n) break }
        await page.waitForFunction(() => { const b = document.querySelector('.end-round-button'); return b && !b.disabled && !document.querySelector('.resonance-cutin, .enemy-cutin') }, null, { timeout: 15000 }).catch(() => {})
        await page.click('.end-round-button')
        await page.waitForTimeout(2500)
      }
    }
    // R4：カードは出さずにラウンドを終える（敵の必殺だけを測る）
    await page.evaluate(() => { window.__eu.t0 = Math.round(performance.now()); document.querySelector('.end-round-button').click() })
    await page.waitForFunction(() => { const l = window.__eu.log; const t0 = window.__eu.t0; return l.some((x) => x.ev === 'cutin-' && x.t >= t0) && (() => { const b = document.querySelector('.end-round-button'); return (b && !b.disabled) || document.querySelector('.game-over-overlay, .victory-stage') })() }, null, { timeout: 20000 }).catch(() => {})
    await page.waitForTimeout(300)
    const tl = await page.evaluate(() => { const t0 = window.__eu.t0; return window.__eu.log.filter((x) => x.t >= t0).map((x) => ({ ...x, rel: x.t - t0 })) })
    const state = await page.evaluate(() => { try { const s = JSON.parse(localStorage.getItem('sevengods.battleSave') || 'null'); const st = s?.state ?? s; return { round: st?.round, hp: st?.player?.hp, enemyHp: st?.enemy?.hp, status: st?.status, score: st?.score?.total } } catch { return null } })
    await ctx.close()
    return { tl, intents, state, errors }
  }, log)
  const ev = (n) => result.tl.find((x) => x.ev === n)?.rel ?? null
  const rec = { side, vp, i, mem, cutinIn: ev('cutin+'), cutinOut: ev('cutin-'), impactAt: result.tl.find((x) => x.ev === 'reaction+')?.impactAt ?? null, unlock: result.tl.filter((x) => x.ev === 'unlock' && x.rel > 0).map((x) => x.rel).pop() ?? null, intents: result.intents, state: result.state, errors: result.errors.length, tl: result.tl }
  log(`${side}/${vp}#${i} cutin+=${rec.cutinIn} cutin-=${rec.cutinOut} impactAt=${rec.impactAt} unlock=${rec.unlock} R4intent=${rec.intents[3]} state=${JSON.stringify(rec.state)} err=${rec.errors} mem=${mem}`)
  return rec
}

const recs = []
for (let i = 1; i <= RUNS; i++) for (const vp of ['pc', 'sp']) for (const side of ['before', 'after']) recs.push(await one(side, vp, i))
const med = (xs) => { const s = xs.filter((x) => x != null).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null }
const summary = {}
for (const vp of ['pc', 'sp']) for (const side of ['before', 'after']) {
  const v = recs.filter((r) => r.vp === vp && r.side === side)
  summary[`${vp}/${side}`] = { cutinIn: v.map((r) => r.cutinIn), cutinOut: v.map((r) => r.cutinOut), unlock: v.map((r) => r.unlock), medIn: med(v.map((r) => r.cutinIn)), medOut: med(v.map((r) => r.cutinOut)), medUnlock: med(v.map((r) => r.unlock)), impactAt: [...new Set(v.map((r) => r.impactAt))], states: [...new Set(v.map((r) => JSON.stringify(r.state)))], intentsR4: [...new Set(v.map((r) => r.intents[3]))], errors: v.reduce((s, r) => s + r.errors, 0) }
}
for (const vp of ['pc', 'sp']) { const b = summary[`${vp}/before`], a = summary[`${vp}/after`]; summary[`${vp}/delta`] = { in: a.medIn - b.medIn, out: a.medOut - b.medOut, unlock: a.medUnlock - b.medUnlock } }
writeFileSync(`${OUT}/gate252.json`, JSON.stringify({ summary, recs }, null, 1))
log(JSON.stringify(summary))

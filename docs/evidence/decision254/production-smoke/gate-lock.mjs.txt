// 決定254 Pilot — METRIC LOCK / 回帰 gate（決定253 gate-d253.mjs を流用・計測専用・commit しない）
// Checks: 3 names / 3 role labels / previews visible, overflow 0, hScroll 0, oracle selectable, remaining unchanged,
// 決定240 intent unchanged, 決定249 reaction unchanged, console error 0, and METRIC LOCK: same seed + same action sequence →
// saved GameState (localStorage sevengods.battleSave) identical each round, final result/score identical.
import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'node:fs'
const OUT = process.env.D254_OUT ?? 'docs/evidence/decision254/pilot'
const BASES = (process.env.D254_BASES ?? 'http://127.0.0.1:4271,http://127.0.0.1:4272').split(',')
const isBefore = (base) => base === BASES[0]
mkdirSync(OUT, { recursive: true })
const GOD_INDEX = { ebisu: 0, taiyo: 1 }
const ENEMY_INDEX = { trial: 0, oni: 1, onryo: 2, karakuri: 3, juuma: 4, ryujin: 5, doukeshi: 6 }
const CASES = [
  { id: 'taiyo-oni-normal', god: 'taiyo', enemy: 'oni', stake: 0, seed: 'd254-qa1', rounds: 7, oracle: { 1: 1, 4: 0, 6: 2 } }, // 導き R1 / 加護 R4 / 天啓 R6
  { id: 'ebisu-juuma-stake5', god: 'ebisu', enemy: 'juuma', stake: 5, seed: 'd254-qa2', rounds: 7, oracle: { 2: 1, 3: 0 } },
  { id: 'taiyo-doukeshi-normal', god: 'taiyo', enemy: 'doukeshi', stake: 0, seed: 'd254-qa3', rounds: 7, oracle: { 3: 0, 5: 2, 6: 1 } },
]
const VIEWPORTS = [{ name: 'pc', width: 1508, height: 660 }, { name: 'sp', width: 390, height: 844, mobile: true }, { name: 'sp660', width: 390, height: 660, mobile: true, only: ['taiyo-oni-normal'] }]

const CUTIN = () => { const c = document.querySelector('.resonance-cutin'); if (!c && !document.querySelector('[class*="god-strike"], .burst-banner')) return null; const v = c ? c.querySelector('video') : null; const img = c ? c.querySelector('img') : null; return { cls: c ? c.className : null, video: v ? (v.currentSrc || v.src || '').replace(location.origin, '') : null, poster: v && v.poster ? v.poster.replace(location.origin, '') : null, img: img ? img.src.replace(location.origin, '') : null, z: c ? getComputedStyle(c).zIndex : null, entrancePresent: !!document.querySelector('[data-testid="boss-entrance"], .battle-entrance') } }

async function snap(page) {
  return page.evaluate(() => {
    const cs = (el) => getComputedStyle(el)
    const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] }
    const vis = (el) => !!el && cs(el).display !== 'none' && el.getBoundingClientRect().width > 0
    const choices = [...document.querySelectorAll('.divination-choice')].map((b) => {
      const name = b.querySelector('.divination-choice-name'), main = b.querySelector('.divination-choice-name-main'), suf = b.querySelector('.divination-choice-name-suffix'), role = b.querySelector('.divination-choice-role'), prev = b.querySelector('.divination-choice-preview'), text = b.querySelector('.divination-choice-text')
      const overflowX = b.scrollWidth > b.clientWidth + 1; const bb = b.getBoundingClientRect(); const overflowY = [...b.querySelectorAll('.divination-choice-name, .divination-choice-role, .divination-choice-preview')].some((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.bottom > bb.bottom + 1 || r.right > bb.right + 1 || r.left < bb.left - 1) })
      return { box: box(b), nameText: name?.textContent ?? null, nameVisible: vis(name), mainVisible: vis(main), suffixVisible: vis(suf), role: role?.textContent ?? null, roleVisible: vis(role), roleColor: role ? cs(role).color : null, preview: prev?.textContent ?? null, previewVisible: vis(prev), previewBox: box(prev), previewClipped: prev ? prev.scrollWidth > prev.clientWidth + 1 : false, textVisible: vis(text), disabled: b.disabled, overflowX, overflowY }
    })
    const panel = document.querySelector('.divination-panel'), dock = document.querySelector('.battle-dock')
    return {
      round: (document.body.innerText.match(/ラウンド\s*(\d)\s*\/\s*7/) || [])[1] ?? null,
      remaining: (document.body.innerText.match(/託宣（残り(\d)回/) || [])[1] ?? null,
      panel: box(panel), dock: box(dock), choices,
      intentText: document.querySelector('.intent')?.textContent?.trim() ?? null, intentClass: document.querySelector('.intent')?.className ?? null, avatarClass: document.querySelector('.enemy-avatar')?.className ?? null, avatarScale: (() => { const a = document.querySelector('.enemy-avatar'); return a ? getComputedStyle(a).scale : null })(), entranceLeft: !!document.querySelector('[data-testid="boss-entrance"], .battle-entrance'),
      hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      save: (() => { try { const s = JSON.parse(localStorage.getItem('sevengods.battleSave') || 'null'); const st = s?.state ?? s; if (!st) return null; return { round: st.round, ap: st.ap, hp: st.player?.hp, block: st.player?.block, enemyHp: st.enemy?.hp, enemyBlock: st.enemy?.block, oracle: st.divination, resonance: st.resonance?.value, hand: st.hand?.map((c) => c.defId), deck: st.deck?.length, discard: st.discard?.length, score: st.score?.total, status: st.status, rngCursor: st.rngCursor, intent: st.enemy?.intent } } catch { return 'ERR' } })(),
    }
  })
}

async function run(browser, base, vp, c) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.mobile, hasTouch: !!vp.mobile, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('pageerror ' + String(e).slice(0, 200)))
  const url = `${base}/?seed=${c.seed}&enemy=${c.enemy}${c.stake ? `&stake=${c.stake}` : ''}`
  await page.goto(url, { waitUntil: 'networkidle' }); await page.evaluate(() => { try { localStorage.clear() } catch {} }); await page.goto(url, { waitUntil: 'networkidle' })
  await page.click('[data-testid="home-start"]'); await page.locator('.god-select-card').nth(GOD_INDEX[c.god]).click(); await page.locator('.difficulty-select button').nth(1).click(); await page.click('.god-select-confirm')
  if (await page.locator('.enemy-select-card').count()) await page.locator('.enemy-select-card').nth(ENEMY_INDEX[c.enemy]).click()
  await page.getByRole('button', { name: 'この構成でバトル開始' }).click(); await page.waitForSelector('.divination-panel', { timeout: 15000 }); await page.waitForSelector('[data-testid="boss-entrance"]', { state: 'detached', timeout: 8000 }).catch(() => {}); await page.waitForTimeout(400)
  const rounds = []; const reactions = new Set(); let ended = null; let godStrike = false; const cutins = new Set()
  for (let r = 1; r <= c.rounds; r++) {
    await page.waitForFunction((rr) => { const m = document.body.innerText.match(/ラウンド\s*(\d)/); return m && m[1] === String(rr) && !document.querySelector('.enemy-cutin') }, r, { timeout: 8000 }).catch(() => {})
    await page.waitForTimeout(400)
    if (!(await page.getByRole('button', { name: 'ラウンドを終える' }).isVisible().catch(() => false))) { ended = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 200)); break }
    const before = await snap(page)
    // action sequence: oracle first (by round plan), then play up to 3 affordable cards (first affordable each time)
    const plan = c.oracle[r]
    let chose = null
    if (plan !== undefined) { const btn = page.locator('.divination-choice').nth(plan); if (await btn.isEnabled()) { await btn.click(); chose = plan; await page.waitForTimeout(700) } }
    for (let i = 0; i < 3; i++) { await page.waitForFunction(() => !document.querySelector('.resonance-cutin, .enemy-cutin'), null, { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(150); const cards = page.locator('.card-view:not(:disabled)'); const n = await cards.count(); if (!n) break; const cnt0 = n; await cards.first().click().catch(() => {}); for (let k = 0; k < 6; k++) { await page.waitForTimeout(50); const rl = await page.evaluate(() => [...document.querySelectorAll('[class*="rl-"]')].flatMap((e) => [...e.classList].filter((x) => x.startsWith('rl-')))); rl.forEach((x) => reactions.add(x)); { const ci = await page.evaluate(CUTIN); if (ci) { godStrike = true; cutins.add(JSON.stringify(ci)) } } } await page.waitForTimeout(450); const n2 = await page.locator('.card-view').count(); if (n2 === cnt0) break }
    const afterPlay = await snap(page)
    await page.waitForFunction(() => !document.querySelector('.resonance-cutin, .enemy-cutin'), null, { timeout: 8000 }).catch(() => {}); await page.getByRole('button', { name: 'ラウンドを終える' }).click({ timeout: 8000 }).catch(() => {})
    for (let k = 0; k < 22; k++) { await page.waitForTimeout(100); { const ci = await page.evaluate(CUTIN); if (ci) { godStrike = true; cutins.add(JSON.stringify(ci)) } } }
    const afterEnemy = await snap(page)
    rounds.push({ round: r, chose, before, afterPlay, afterEnemy })
  }
  const final = await page.evaluate(() => ({ text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 400), save: (() => { try { return JSON.parse(localStorage.getItem('sevengods.battleSave') || 'null') } catch { return null } })() }))
  await ctx.close()
  return { rounds, errors, reactions: [...reactions].sort(), ended, godStrike, cutins: [...cutins].map((x) => JSON.parse(x)), finalText: final.text, finalScore: final.save?.state?.score?.total ?? final.save?.score?.total ?? null, finalStatus: final.save?.state?.status ?? final.save?.status ?? null }
}

const browser = await chromium.launch()
const out = {}
for (const vp of VIEWPORTS) for (const c of CASES) { if (vp.only && !vp.only.includes(c.id)) continue; for (const base of BASES) { const k = `${c.id}/${vp.name}/${isBefore(base) ? 'before' : 'after'}`; try { out[k] = await run(browser, base, vp, c); console.log('done', k, 'errors', out[k].errors.length) } catch (e) { out[k] = { error: String(e).slice(0, 300) }; console.log('FAIL', k, String(e).slice(0, 200)) } } }
await browser.close()
// ---- metric lock: compare Before/After saves per round ----
const lock = []
for (const k of Object.keys(out).filter((k) => k.endsWith('/before'))) {
  const a = out[k], b = out[k.replace('/before', '/after')]; if (!a?.rounds || !b?.rounds) { lock.push({ k, error: 'missing' }); continue }
  for (let i = 0; i < Math.max(a.rounds.length, b.rounds.length); i++) { const ra = a.rounds[i], rb = b.rounds[i]; for (const ph of ['before', 'afterPlay', 'afterEnemy']) { const sa = JSON.stringify(ra?.[ph]?.save ?? null), sb = JSON.stringify(rb?.[ph]?.save ?? null); lock.push({ k: k.replace('/before', ''), round: i + 1, phase: ph, same: sa === sb, a: sa.slice(0, 160), b: sb.slice(0, 160) }) } }
  lock.push({ k: k.replace('/before', ''), round: 'final', phase: 'final', same: a.finalScore === b.finalScore && a.finalStatus === b.finalStatus && JSON.stringify(a.rounds.map((r) => r.afterEnemy?.intentText)) === JSON.stringify(b.rounds.map((r) => r.afterEnemy?.intentText)), a: `${a.finalStatus} ${a.finalScore}`, b: `${b.finalStatus} ${b.finalScore}` })
}
const mismatches = lock.filter((l) => l.same === false)
writeFileSync(`${OUT}/gate-lock.json`, JSON.stringify({ out, lock }, null, 1))
console.log('metric lock rows', lock.length, 'mismatches', mismatches.length)
for (const m of mismatches.slice(0, 10)) console.log(' MISMATCH', m.k, m.round, m.phase, m.a, '|', m.b)
console.log('written')

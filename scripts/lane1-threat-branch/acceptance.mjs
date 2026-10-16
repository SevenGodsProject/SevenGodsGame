// Threat Branch Pilot v1：Pilot 専用経路（?pilot=threat）と、通常経路が変わらないことを PC／SP375 で実測する。
//   node scripts/lane1-threat-branch/acceptance.mjs <outJson> [baseUrl]
// 見るもの：通常 URL では敵 7 体のまま／Pilot URL では 8 体目「業斧の鬼将・軍略」＋印＋案内／選んで開戦 → 鬼将と同じ画像・舞台背景・
// R3 の予告「⚠ 傷が浅ければ次は断岩」→ R4 の予告が分岐先（カードを使わない＝HP 比 1.0 → else＝必殺「業斧・断岩」260）／
// 対局中も決着後も端末に記録が増えない／JS error 0。
// 忠次 Pilot（feat/shogunate-pilot-v0.3 scripts/shogunate-pilot/acceptance.mjs）の流れを本 Pilot 向けに書き換えたもの。
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const out = args[0]
const shotDir = out ? dirname(out) : 'docs/evidence/lane1-threat-branch/acceptance'
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:4190'
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const VIEWPORTS = [
  { id: 'pc', viewport: { width: 1508, height: 660 } },
  { id: 'sp375', viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true },
]
const RECORD_KEYS = ['sevengods.battleSave', 'sevengods.records', 'sevengods.matchups', 'sevengods.stakes', 'sevengods.otomoBond', 'sevengods.rewardBonuses', 'sevengods.runLog', 'sevengods.daily']
const CORE_NAMES = ['試練の影', '業斧の鬼将', '藍花の怨霊', '銀甲の機工師', '双牙の魔獣', '蒼海の龍神', '乱舞の道化']
const PILOT_NAME = '業斧の鬼将・軍略'

async function clickText(page, text, timeout = 8000) {
  await page.getByRole('button', { name: text }).first().click({ timeout })
}
async function maybeClick(page, text) {
  const l = page.getByRole('button', { name: text }).first()
  if (await l.isVisible().catch(() => false)) await l.click({ timeout: 3000 }).catch(() => {})
}
async function toEnemySelect(page) {
  await maybeClick(page, 'わかった')
  await clickText(page, '神を選ぶ')
  await maybeClick(page, '新しく始める')
  await clickText(page, '大耀')
  await clickText(page, 'この構成で始める')
  await page.getByText('挑む敵を選ぼう').first().waitFor({ timeout: 8000 })
}
const intentText = (page) => page.locator('.intent').first().innerText().catch(() => '')
const storageKeys = (page) => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('sevengods.')).sort())

mkdirSync(shotDir, { recursive: true })
const browser = await chromium.launch()
const results = []
for (const vp of VIEWPORTS) {
  for (const pilot of [false, true]) {
    const context = await browser.newContext(vp)
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
    const assets = {}
    page.on('response', (res) => { const u = res.url(); if (u.includes('/enemies/oni/') || u.includes('02-oni-castle')) assets[u.replace(base, '')] = res.status() })
    const url = pilot ? `${base}/?pilot=threat` : `${base}/`
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
    await page.goto(url, { waitUntil: 'networkidle' })
    const r = { viewport: vp.id, pilot, checks: [] }
    const check = (name, pass, detail) => r.checks.push({ name, pass: !!pass, ...(detail !== undefined ? { detail } : {}) })
    await toEnemySelect(page)
    const cards = await page.locator('.enemy-select-card').count()
    check(`enemy cards = ${pilot ? 9 : 8} (7 + entrust${pilot ? ' + pilot' : ''})`, cards === (pilot ? 9 : 8), cards)
    for (const n of CORE_NAMES) {
      // 「業斧の鬼将」は Pilot 名「業斧の鬼将・軍略」にも部分一致するので、Pilot 時だけ 2 件が正
      const expected = pilot && n === '業斧の鬼将' ? 2 : 1
      const cnt = await page.getByRole('button', { name: new RegExp(n) }).count()
      check(`core enemy listed: ${n}`, cnt === expected, cnt)
    }
    const pilotCard = page.getByRole('button', { name: new RegExp(PILOT_NAME) })
    check('pilot card ' + (pilot ? 'shown' : 'hidden'), (await pilotCard.count()) === (pilot ? 1 : 0))
    check('pilot chip ' + (pilot ? 'shown' : 'hidden'), (await page.getByTestId('enemy-pilot-chip').count()) === (pilot ? 1 : 0))
    check('pilot notice ' + (pilot ? 'shown' : 'hidden'), (await page.getByTestId('enemy-pilot-notice').count()) === (pilot ? 1 : 0))
    await page.screenshot({ path: `${shotDir}/enemy-select-${vp.id}-${pilot ? 'pilot' : 'normal'}.png`, fullPage: true })
    if (pilot) {
      const grid = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth }))
      check('no horizontal overflow on enemy select', grid.scrollWidth <= grid.innerWidth, grid)
      await pilotCard.click()
      await page.getByText(new RegExp(PILOT_NAME)).first().waitFor({ timeout: 8000 })
      await clickText(page, 'この構成でバトル開始')
      await page.getByRole('button', { name: 'ラウンドを終える' }).first().waitFor({ timeout: 20000 })
      check('battle started (round end button visible)', true)
      const keysBefore = await storageKeys(page)
      check('enemy name shown', (await page.getByText(PILOT_NAME).count()) >= 1)
      const avatar = await page.evaluate(() => {
        const el = document.querySelector('.enemy-avatar')
        return el ? getComputedStyle(el).backgroundImage : null
      })
      check('oni art reused as avatar', !!avatar && avatar.includes('/assets/enemies/oni/'), avatar)
      check('oni art served 200', Object.entries(assets).some(([u, s]) => u.includes('/enemies/oni/') && s === 200), assets)
      const keysDuring = await storageKeys(page)
      check('no battleSave while playing a pilot battle', !keysDuring.includes('sevengods.battleSave'), keysDuring)
      const intents = []
      for (let i = 0; i < 8; i++) {
        const t = await intentText(page)
        intents.push(t)
        if (i === 2) await page.screenshot({ path: `${shotDir}/battle-r3-${vp.id}.png` })
        if (i === 3) await page.screenshot({ path: `${shotDir}/battle-r4-${vp.id}.png` })
        const btn = page.getByRole('button', { name: 'ラウンドを終える' }).first()
        if (!(await btn.isVisible().catch(() => false))) break
        await btn.click({ timeout: 5000 }).catch(() => {})
        await page.waitForFunction((prev) => (document.querySelector('.intent')?.textContent ?? '') !== prev || !!document.querySelector('.game-over, .result-overlay'), t, { timeout: 15000 }).catch(() => {})
        await page.waitForTimeout(400)
        const over = await page.getByRole('button', { name: /もう一度|ホームへ/ }).first().isVisible().catch(() => false)
        if (over) break
      }
      check('R1 intent = ⚔ 50', /50/.test(intents[0] ?? ''), intents[0])
      check('R2 intent = ⚔ 90', /90/.test(intents[1] ?? ''), intents[1])
      check('R3 intent = charge「⚠ 傷が浅ければ次は断岩」', /傷が浅ければ次は断岩/.test(intents[2] ?? ''), intents[2])
      check('R4 intent = 業斧・断岩 260 (no damage dealt → else branch)', /業斧・断岩/.test(intents[3] ?? '') && /260/.test(intents[3] ?? ''), intents[3])
      const over = await page.getByRole('button', { name: /もう一度|ホームへ/ }).first().isVisible().catch(() => false)
      check('battle finished (result shown)', over)
      const keysAfter = await storageKeys(page)
      check('pilot battle wrote nothing (keys after = keys before)', JSON.stringify(keysAfter) === JSON.stringify(keysBefore), { keysBefore, keysAfter })
      check('no record keys after a pilot battle', RECORD_KEYS.every((k) => !keysAfter.includes(k) || keysBefore.includes(k)), keysAfter)
      await page.screenshot({ path: `${shotDir}/result-${vp.id}.png` })
      r.intents = intents
    }
    check('JS error 0', errors.length === 0, errors)
    results.push(r)
    await context.close()
  }
}
await browser.close()
const total = results.flatMap((r) => r.checks)
const summary = { base, generatedAt: new Date().toISOString(), pass: total.filter((c) => c.pass).length, total: total.length, results }
if (out) writeFileSync(out, JSON.stringify(summary, null, 2))
for (const r of results) for (const c of r.checks) console.log(`${c.pass ? 'PASS' : 'FAIL'} [${r.viewport}${r.pilot ? '/pilot' : ''}] ${c.name}${c.pass ? '' : ' :: ' + JSON.stringify(c.detail ?? '')}`)
console.log(`\n${summary.pass}/${summary.total} PASS`)
process.exit(summary.pass === summary.total ? 0 : 1)

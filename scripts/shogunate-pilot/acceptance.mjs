// 将軍家 Pilot v0.4（忠次 enemy_08・docs/SHOGUNATE_PILOT_V0_4.md）PM Gate G6(b)(c)：Pilot 専用経路と通常経路の不変を PC／SP375 で実測する。
//   node scripts/shogunate-pilot/acceptance.mjs <outJson> [baseUrl]
// v0.3（feat/shogunate-pilot-v0.3 @ 5a357f1 scripts/shogunate-pilot/acceptance.mjs）を v1.0.2 RC 追従版へ移植したもの：
//   - testid：案内＝ enemy-shogunate-notice（threat の enemy-pilot-notice とは別）／印＝ enemy-pilot-chip[data-pilot=shogunate]
//   - URL：`?pilot=shogunate`（忠次 1 体）・`?pilot=all`（忠次＋enemy_09 の 2 体＝9 体・委ねる込み 10 枚）・通常 URL（7 体）
// 見るもの：通常 URL では敵 7 体・印 0・案内 0／`?pilot=shogunate` では 8 体目「将軍四天王・忠次」＋印（幕府 Pilot）＋案内、threat の印・案内は 0／
//   `?pilot=all` では 9 体・印 2（threat 1・shogunate 1）・案内 2／忠次を選んで開戦 → 公式画像・舞台背景（08-shogunate-camp）・`.battle[data-enemy=enemy_08]`・
//   R1 ⚔50・R2 ⚔90・R3「⚠ 傷が浅ければ次は総攻め」＋ R3 の立ち絵が drop-shadow グロー（box-shadow none）・R4 は札を出さないので else＝「軍略・総攻め 240」／
//   対局中も決着後も端末に記録が増えない／横 overflow 0／JS error 0。
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const out = args[0]
const shotDir = out ? dirname(out) : 'docs/evidence/shogunate-pilot-v04/07-acceptance'
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:4183'
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const VIEWPORTS = [
  { id: 'pc', viewport: { width: 1508, height: 660 } },
  { id: 'sp375', viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true },
]
const MODES = ['normal', 'shogunate', 'all']
const RECORD_KEYS = ['sevengods.battleSave', 'sevengods.records', 'sevengods.matchups', 'sevengods.stakes', 'sevengods.otomoBond', 'sevengods.rewardBonuses', 'sevengods.rewardHistory', 'sevengods.pendingRuns', 'sevengods.runLog', 'sevengods.daily', 'sevengods.dailyRunLog']
const CORE_NAMES = ['試練の影', '業斧の鬼将', '藍花の怨霊', '銀甲の機工師', '双牙の魔獣', '蒼海の龍神', '乱舞の道化']
const TADATSUGU = '将軍四天王・忠次'
const THREAT_NAME = '業斧の鬼将・軍略'

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
  for (const mode of MODES) {
    const context = await browser.newContext(vp)
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
    const assets = {}
    page.on('response', (res) => { const u = res.url(); if (u.includes('tadatsugu/art.webp') || u.includes('08-shogunate-camp')) assets[u.replace(base, '')] = res.status() })
    const url = mode === 'normal' ? `${base}/` : `${base}/?pilot=${mode}`
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
    await page.goto(url, { waitUntil: 'networkidle' })
    const r = { viewport: vp.id, mode, checks: [] }
    const check = (name, pass, detail) => r.checks.push({ name, pass: !!pass, ...(detail !== undefined ? { detail } : {}) })
    await toEnemySelect(page)
    const expectCards = mode === 'normal' ? 8 : mode === 'shogunate' ? 9 : 10
    const cards = await page.locator('.enemy-select-card').count()
    check(`enemy cards = ${expectCards} (7 + entrust${mode === 'normal' ? '' : mode === 'shogunate' ? ' + tadatsugu' : ' + tadatsugu + threat'})`, cards === expectCards, cards)
    for (const n of CORE_NAMES) {
      const expected = mode === 'all' && n === '業斧の鬼将' ? 2 : 1
      const cnt = await page.getByRole('button', { name: new RegExp(n) }).count()
      check(`core enemy listed: ${n}`, cnt === expected, cnt)
    }
    const tadatsugu = page.getByRole('button', { name: new RegExp(TADATSUGU) })
    const showT = mode !== 'normal'
    const showThreat = mode === 'all'
    check(`tadatsugu card ${showT ? 'shown' : 'hidden'}`, (await tadatsugu.count()) === (showT ? 1 : 0))
    check(`threat card ${showThreat ? 'shown' : 'hidden'}`, (await page.getByRole('button', { name: new RegExp(THREAT_NAME) }).count()) === (showThreat ? 1 : 0))
    check(`shogunate chip (enemy-pilot-chip[data-pilot=shogunate]) ${showT ? 'shown 1' : 'hidden'}`, (await page.locator('[data-testid="enemy-pilot-chip"][data-pilot="shogunate"]').count()) === (showT ? 1 : 0))
    check(`threat chip (enemy-pilot-chip[data-pilot=threat]) ${showThreat ? 'shown 1' : 'hidden'}`, (await page.locator('[data-testid="enemy-pilot-chip"][data-pilot="threat"]').count()) === (showThreat ? 1 : 0))
    check(`shogunate notice (enemy-shogunate-notice) ${showT ? 'shown' : 'hidden'}`, (await page.getByTestId('enemy-shogunate-notice').count()) === (showT ? 1 : 0))
    check(`threat notice (enemy-pilot-notice) ${showThreat ? 'shown' : 'hidden'}`, (await page.getByTestId('enemy-pilot-notice').count()) === (showThreat ? 1 : 0))
    if (showT) {
      const chipText = await page.locator('[data-testid="enemy-pilot-chip"][data-pilot="shogunate"]').first().innerText().catch(() => '')
      check('shogunate chip text = 幕府 Pilot・記録に残らない', /幕府 Pilot/.test(chipText) && /記録に残らない/.test(chipText), chipText)
      const noticeText = await page.getByTestId('enemy-shogunate-notice').first().innerText().catch(() => '')
      check('shogunate notice mentions 将軍家 Pilot v0.4 ・ 忠次 ・ 残りません', /将軍家 Pilot v0\.4/.test(noticeText) && /忠次/.test(noticeText) && /残りません/.test(noticeText), noticeText)
      const grid = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth }))
      check('no horizontal overflow on enemy select', grid.scrollWidth <= grid.innerWidth, grid)
    }
    await page.screenshot({ path: `${shotDir}/enemy-select-${vp.id}-${mode}.png`, fullPage: true })
    if (mode === 'shogunate') {
      await tadatsugu.click()
      await page.getByText(new RegExp(TADATSUGU)).first().waitFor({ timeout: 8000 })
      check('deck builder shows tadatsugu as opponent', true)
      await clickText(page, 'この構成でバトル開始')
      await page.getByRole('button', { name: 'ラウンドを終える' }).first().waitFor({ timeout: 20000 })
      check('battle started (round end button visible)', true)
      const keysBefore = await storageKeys(page)
      check('enemy name shown', (await page.getByText(TADATSUGU).count()) >= 1)
      const dom = await page.evaluate(() => {
        const av = document.querySelector('.enemy-avatar')
        return {
          avatarBg: av ? getComputedStyle(av).backgroundImage : null,
          battleDataEnemy: document.querySelector('.battle')?.getAttribute('data-enemy') ?? null,
          panelDataEnemy: document.querySelector('.enemy-panel')?.getAttribute('data-enemy') ?? null,
          stage: !![...document.querySelectorAll('[style]')].find((el) => (el.getAttribute('style') ?? '').includes('08-shogunate-camp')),
        }
      })
      check('official art is the enemy avatar (.enemy-avatar background-image)', !!dom.avatarBg && dom.avatarBg.includes('/assets/enemies/tadatsugu/art.webp'), dom.avatarBg)
      check('official art served 200', assets['/assets/enemies/tadatsugu/art.webp'] === 200, assets)
      check('.battle[data-enemy=enemy_08] and .enemy-panel[data-enemy=enemy_08]', dom.battleDataEnemy === 'enemy_08' && dom.panelDataEnemy === 'enemy_08', dom)
      check('stage background injected (08-shogunate-camp)', dom.stage)
      check('stage background served 200', Object.entries(assets).some(([u, s]) => u.includes('08-shogunate-camp') && s === 200), assets)
      const keysDuring = await storageKeys(page)
      check('no battleSave while playing a pilot battle', !keysDuring.includes('sevengods.battleSave'), keysDuring)
      const intents = []
      let r3Glow = null
      for (let i = 0; i < 8; i++) {
        const t = await intentText(page)
        intents.push(t)
        if (i === 2) {
          await page.waitForTimeout(600)
          r3Glow = await page.evaluate(() => {
            const av = document.querySelector('.enemy-avatar')
            if (!av) return null
            const cs = getComputedStyle(av)
            return { className: av.className, boxShadow: cs.boxShadow, filter: cs.filter.slice(0, 200) }
          })
          await page.screenshot({ path: `${shotDir}/battle-r3-${vp.id}.png` })
        }
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
      check('R3 intent = charge「⚠ 傷が浅ければ次は総攻め」', /傷が浅ければ次は総攻め/.test(intents[2] ?? ''), intents[2])
      check('R3 avatar has enemy-avatar-charging-super (必殺充填)', !!r3Glow && /enemy-avatar-charging-super/.test(r3Glow.className), r3Glow)
      check('R3 glow is drop-shadow (box-shadow none・filter に drop-shadow)', !!r3Glow && r3Glow.boxShadow === 'none' && /drop-shadow/.test(r3Glow.filter), r3Glow)
      check('R4 intent = 軍略・総攻め 240 (no damage dealt → else branch)', /軍略・総攻め/.test(intents[3] ?? '') && /240/.test(intents[3] ?? ''), intents[3])
      const over = await page.getByRole('button', { name: /もう一度|ホームへ/ }).first().isVisible().catch(() => false)
      check('battle finished (result shown)', over)
      const keysAfter = await storageKeys(page)
      check('pilot battle wrote nothing (keys after = keys before)', JSON.stringify(keysAfter) === JSON.stringify(keysBefore), { keysBefore, keysAfter })
      check('no record keys after a pilot battle', RECORD_KEYS.every((k) => !keysAfter.includes(k) || keysBefore.includes(k)), keysAfter)
      await page.screenshot({ path: `${shotDir}/result-${vp.id}.png` })
      r.intents = intents
      r.r3Glow = r3Glow
    }
    check('JS error 0', errors.length === 0, errors)
    results.push(r)
    await context.close()
  }
}
// 500KB 超の PNG は WebP へ（既存 evidence の慣例）
{
  const { readdirSync, statSync, readFileSync, unlinkSync } = await import('node:fs')
  const page = await (await browser.newContext()).newPage()
  for (const f of readdirSync(shotDir)) {
    if (!f.endsWith('.png')) continue
    const p = `${shotDir}/${f}`
    if (statSync(p).size <= 500 * 1024) continue
    const dataUrl = 'data:image/png;base64,' + readFileSync(p).toString('base64')
    const webp = await page.evaluate(async (src) => {
      const img = new Image()
      img.src = src
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      c.getContext('2d').drawImage(img, 0, 0)
      return c.toDataURL('image/webp', 0.82)
    }, dataUrl)
    writeFileSync(p.replace(/\.png$/, '.webp'), Buffer.from(webp.split(',')[1], 'base64'))
    unlinkSync(p)
  }
}
await browser.close()
const total = results.flatMap((r) => r.checks)
const summary = { base, generatedAt: new Date().toISOString(), pass: total.filter((c) => c.pass).length, total: total.length, results }
if (out) writeFileSync(out, JSON.stringify(summary, null, 2))
for (const r of results) for (const c of r.checks) console.log(`${c.pass ? 'PASS' : 'FAIL'} [${r.viewport}/${r.mode}] ${c.name}${c.pass ? '' : ' :: ' + JSON.stringify(c.detail ?? '').slice(0, 300)}`)
console.log(`\n${summary.pass}/${summary.total} PASS`)
process.exit(summary.pass === summary.total ? 0 : 1)

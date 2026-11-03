// 決定287 W1（将軍家 第一陣 公開 v1）受入：忠次（enemy_08）が通常導線の 8 体目として並び、戦績・セーブに「残る」ことを PC／SP375 で実測する。
//   PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/shogunate-public-v1/acceptance.mjs <outJson> [baseUrl]
// 見るもの：
//   通常 URL：敵カード 9 枚（CORE 7 ＋ 忠次 ＋ 委ねる）・忠次カードに「攻略盤の対象外・戦績と報酬には残る」注記（enemy-shogunate-chip）・
//            Pilot の印（enemy-pilot-chip）0・Pilot 案内（enemy-pilot-notice／enemy-shogunate-notice）0・忠次の ★は 1
//   旧 ?pilot=shogunate：通常 URL と同じ（不明な値として無視）
//   ?pilot=threat：10 枚・鬼将・軍略の印 1・案内 1（Threat Pilot は隔離のまま）
//   忠次を選んで開戦（通常 URL）：R1 中に battleSave が書かれる → 再読込 → 「続きから」で忠次・同ラウンドに復元 → 札を出さず決着（R4 総攻め 240 で敗北）→
//            records が書かれ battleSave が消える・matchups に enemy_08 が入らない（49 盤の対象外）・結果画面が出る・JS error 0
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const out = args[0]
const shotDir = out ? dirname(out) : 'docs/evidence/shogunate-public-v1/acceptance'
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:4195'
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const VIEWPORTS = [
  { id: 'pc', viewport: { width: 1508, height: 660 } },
  { id: 'sp375', viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true },
]
const MODES = ['normal', 'legacy-shogunate', 'threat']
const CORE_NAMES = ['試練の影', '業斧の鬼将', '藍花の怨霊', '銀甲の機工師', '双牙の魔獣', '蒼海の龍神', '乱舞の道化']
const TADATSUGU = '将軍四天王・忠次'
// W5（決定288 v1.1）：将軍家は 10 体（忠次・岡っ引き・直政・康政・影・くノ一・鬼半蔵・忠勝・ドーマン・康虎）＝通常 18 枚（7 + 10 + 委ねる）・threat で 19 枚
const SHOGUNATE_NAMES = ['将軍四天王・忠次', '捕り方・岡っ引き', '将軍四天王・直政', '将軍四天王・康政', '忍者衆・影', '忍者衆・くノ一', '影の頭領・鬼半蔵', '将軍四天王・忠勝', '科学者・ドーマン', '十七代将軍・康虎']
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
const readJson = (page, key) => page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k) ?? 'null') } catch { return null } }, key)

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
    const url = mode === 'normal' ? `${base}/` : mode === 'legacy-shogunate' ? `${base}/?pilot=shogunate` : `${base}/?pilot=threat`
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
    await page.goto(url, { waitUntil: 'networkidle' })
    const r = { viewport: vp.id, mode, checks: [] }
    const check = (name, pass, detail) => r.checks.push({ name, pass: !!pass, ...(detail !== undefined ? { detail } : {}) })
    await toEnemySelect(page)
    const threat = mode === 'threat'
    const expectCards = threat ? 19 : 18
    const cards = await page.locator('.enemy-select-card').count()
    check(`enemy cards = ${expectCards} (7 + shogunate 10 + entrust${threat ? ' + threat' : ''})`, cards === expectCards, cards)
    for (const n of SHOGUNATE_NAMES) check(`shogunate enemy listed: ${n}`, (await page.getByRole('button', { name: new RegExp(n) }).count()) === 1)
    check('shogunate section heading shown once', (await page.getByTestId('enemy-section-shogunate').count()) === 1)
    for (const n of CORE_NAMES) {
      const expected = threat && n === '業斧の鬼将' ? 2 : 1
      const cnt = await page.getByRole('button', { name: new RegExp(n) }).count()
      check(`core enemy listed: ${n}`, cnt === expected, cnt)
    }
    const tadatsugu = page.getByRole('button', { name: new RegExp(TADATSUGU) })
    check('tadatsugu card shown (public roster)', (await tadatsugu.count()) === 1)
    check(`threat card ${threat ? 'shown' : 'hidden'}`, (await page.getByRole('button', { name: new RegExp(THREAT_NAME) }).count()) === (threat ? 1 : 0))
    check('shogunate chip (enemy-shogunate-chip) shown 10', (await page.getByTestId('enemy-shogunate-chip').count()) === 10)
    const chipText = await page.getByTestId('enemy-shogunate-chip').first().innerText().catch(() => '')
    check('shogunate chip text = 攻略盤の対象外・戦績は残る', /攻略盤の対象外/.test(chipText) && /戦績は残る/.test(chipText), chipText)
    // SP375 で chip がカード幅に収まる（nowrap・10px）：chip 右端 ≤ カード右端
    const chipFit = await page.evaluate(() => { const chips = [...document.querySelectorAll('[data-testid="enemy-shogunate-chip"]')]; const chip = chips[chips.length - 1]; const card = chip?.closest('.enemy-select-card'); if (!chip || !card) return null; const a = chip.getBoundingClientRect(), b = card.getBoundingClientRect(); return { chipRight: Math.round(a.right), cardRight: Math.round(b.right), chipLeft: Math.round(a.left), cardLeft: Math.round(b.left) } })
    check('shogunate chip fits inside the card', !!chipFit && chipFit.chipRight <= chipFit.cardRight && chipFit.chipLeft >= chipFit.cardLeft, chipFit)
    check(`pilot chip ${threat ? 'shown 1' : 'hidden'}`, (await page.getByTestId('enemy-pilot-chip').count()) === (threat ? 1 : 0))
    check(`threat notice ${threat ? 'shown' : 'hidden'}`, (await page.getByTestId('enemy-pilot-notice').count()) === (threat ? 1 : 0))
    check('no shogunate pilot notice', (await page.getByTestId('enemy-shogunate-notice').count()) === 0)
    check('no 「記録に残らない」 on tadatsugu card', !/記録に残らない/.test(await tadatsugu.innerText().catch(() => '')))
    const starLabel = await tadatsugu.locator('.threat-stars').getAttribute('aria-label').catch(() => '')
    check('tadatsugu ★ = 1 (measured)', starLabel === '脅威度 1 / 5', starLabel)
    const grid = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth }))
    check('no horizontal overflow on enemy select', grid.scrollWidth <= grid.innerWidth, grid)
    await page.screenshot({ path: `${shotDir}/enemy-select-${vp.id}-${mode}.png`, fullPage: true })

    if (mode === 'normal') {
      await tadatsugu.click()
      await page.getByText(new RegExp(TADATSUGU)).first().waitFor({ timeout: 8000 })
      await clickText(page, 'この構成でバトル開始')
      await page.getByRole('button', { name: 'ラウンドを終える' }).first().waitFor({ timeout: 20000 })
      check('battle started', true)
      check('enemy name shown', (await page.getByText(TADATSUGU).count()) >= 1)
      const dom = await page.evaluate(() => ({ battleDataEnemy: document.querySelector('.battle')?.getAttribute('data-enemy') ?? null }))
      check('.battle[data-enemy=enemy_08]', dom.battleDataEnemy === 'enemy_08', dom)
      const keysR1 = await storageKeys(page)
      check('battleSave written while playing (記録に残る)', keysR1.includes('sevengods.battleSave'), keysR1)
      const save = await readJson(page, 'sevengods.battleSave')
      check('battleSave is enemy_08 / version 9', !!save && save.version === 9 && (save.state?.enemy?.defId ?? save.enemy?.defId ?? JSON.stringify(save)).toString().includes('enemy_08'), save && { version: save.version })
      // 再読込 → 続きから → 復元
      await page.goto(`${base}/`, { waitUntil: 'networkidle' })
      await maybeClick(page, 'わかった')
      const resume = page.getByRole('button', { name: /続きから/ }).first()
      check('Home offers 続きから', await resume.isVisible().catch(() => false))
      await resume.click({ timeout: 8000 }).catch(() => {})
      await page.getByRole('button', { name: 'ラウンドを終える' }).first().waitFor({ timeout: 20000 })
      check('resumed battle shows tadatsugu', (await page.getByText(TADATSUGU).count()) >= 1)
      const roundText = await page.locator('.battle-topbar').first().innerText().catch(() => '')
      check('resumed at round 1', /ラウンド 1/.test(roundText), roundText)
      await page.screenshot({ path: `${shotDir}/resume-${vp.id}.png` })
      const intents = []
      for (let i = 0; i < 8; i++) {
        const t = await intentText(page)
        intents.push(t)
        const btn = page.getByRole('button', { name: 'ラウンドを終える' }).first()
        if (!(await btn.isVisible().catch(() => false))) break
        await btn.click({ timeout: 5000 }).catch(() => {})
        await page.waitForFunction((prev) => (document.querySelector('.intent')?.textContent ?? '') !== prev || !!document.querySelector('.game-over, .result-overlay'), t, { timeout: 15000 }).catch(() => {})
        await page.waitForTimeout(400)
        const over = await page.getByRole('button', { name: /もう一度|ホームへ/ }).first().isVisible().catch(() => false)
        if (over) break
      }
      check('R1 intent = ⚔ 50', /50/.test(intents[0] ?? ''), intents[0])
      check('R3 intent = charge「⚠ 傷が浅ければ次は総攻め」', /傷が浅ければ次は総攻め/.test(intents[2] ?? ''), intents[2])
      check('R4 intent = 軍略・総攻め 240 (else)', /軍略・総攻め/.test(intents[3] ?? '') && /240/.test(intents[3] ?? ''), intents[3])
      const over = await page.getByRole('button', { name: /もう一度|ホームへ/ }).first().isVisible().catch(() => false)
      check('battle finished (result shown)', over)
      const keysAfter = await storageKeys(page)
      check('records written after battle (戦績に残る)', keysAfter.includes('sevengods.records'), keysAfter)
      check('battleSave cleared after battle', !keysAfter.includes('sevengods.battleSave'), keysAfter)
      const matchups = await readJson(page, 'sevengods.matchups')
      check('matchups has no enemy_08 (49 盤の対象外)', !JSON.stringify(matchups ?? {}).includes('enemy_08'), matchups)
      await page.screenshot({ path: `${shotDir}/result-${vp.id}.png` })
      r.intents = intents
    }
    // W2：康政（legacy-shogunate モード）／直政（threat モード）を 1 戦ずつ。札を出さず R3 の「あと N」行と R4 の else 分岐を確認（決定論）
    if (mode === 'legacy-shogunate' || mode === 'threat') {
      const target = mode === 'legacy-shogunate' ? { name: '科学者・ドーマン', dataEnemy: 'enemy_17', armed: /共鳴あと4で|五重塔を止める/, r4: /逆さ五重塔/, r4Amount: /240/ } : { name: '十七代将軍・康虎', dataEnemy: 'enemy_18', armed: /将軍の威を止める/, r4: /将軍の威/, r4Amount: /320/ }
      await page.getByRole('button', { name: new RegExp(target.name) }).first().click()
      await page.getByText(new RegExp(target.name)).first().waitFor({ timeout: 8000 })
      await clickText(page, 'この構成でバトル開始')
      await page.getByRole('button', { name: 'ラウンドを終える' }).first().waitFor({ timeout: 20000 })
      const dom = await page.evaluate(() => ({ battleDataEnemy: document.querySelector('.battle')?.getAttribute('data-enemy') ?? null }))
      check(target.name + ' battle data-enemy', dom.battleDataEnemy === target.dataEnemy, dom)
      const intents = []
      let lineR3 = ''
      for (let i = 0; i < 4; i++) {
        const t = await intentText(page)
        intents.push(t)
        if (i === 2) lineR3 = await page.getByTestId('tactic-line').first().innerText().catch(() => '')
        const btn = page.getByRole('button', { name: 'ラウンドを終える' }).first()
        if (!(await btn.isVisible().catch(() => false))) break
        await btn.click({ timeout: 5000 }).catch(() => {})
        await page.waitForFunction((prev) => (document.querySelector('.intent')?.textContent ?? '') !== prev || !!document.querySelector('.game-over, .result-overlay'), t, { timeout: 15000 }).catch(() => {})
        await page.waitForTimeout(400)
      }
      check(target.name + ' R3 tactic line armed', target.armed.test(lineR3), lineR3)
      check(target.name + ' R4 intent = else（必殺）', target.r4.test(intents[3] ?? '') && target.r4Amount.test(intents[3] ?? ''), intents[3])
      await page.screenshot({ path: `${shotDir}/battle-${target.dataEnemy}-${vp.id}.png` })
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
for (const r of results) for (const c of r.checks) console.log(`${c.pass ? 'PASS' : 'FAIL'} [${r.viewport}/${r.mode}] ${c.name}${c.pass ? '' : ' :: ' + JSON.stringify(c.detail ?? '').slice(0, 300)}`)
console.log(`\n${summary.pass}/${summary.total} PASS`)
process.exit(summary.pass === summary.total ? 0 : 1)

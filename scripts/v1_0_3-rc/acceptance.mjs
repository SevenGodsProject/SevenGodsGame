// v1.0.3 RC（scripts/v1_0_1-rc/acceptance.mjs の複製・束 #1 の確定文言へ更新）：headless 受入（Playwright chromium・`vite preview` に対して実行。QA 用。ゲームコードではない）。
//   node scripts/v1_0_1-rc/acceptance.mjs <outJson> [baseUrl] [--sha <7hex>] [--version <x.y.z>]
// 見るもの（PC 1508×660／SP 375×667）：
//   Home：version ラベル `v<version> (<sha>)` が package.json・HEAD と一致（本 RC は version 不変＝1.0.0）
//   Brief（「初陣へ」）：3 行・② が確定文言（余った神力と防御は、…）・カード内で横 overflow 0
//   遊び方（「詳しい遊び方」）：② 本文が確定文言（⚡ 溜め→必殺・⚔ 連撃・防御はそのラウンドだけ）・コツ 6 本・③ が防御の消滅・横 overflow 0
//   敵選択：注記 1 文目が「実測の手強さ…」・★ 7 体が新 rank（龍神 4／怨霊 4／魔獣 3／鬼将 3／影 2／機工師 2／道化 1）・aria-label 一致・横 overflow 0
//   JS error 0（pageerror・console.error）・外部オリジンへの通信 0
// スクリーンショットは 500KB 超の PNG を同名 .webp（quality 0.82・Chromium canvas）へ変換して PNG を消す（docs/evidence ポリシー）。
import { mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const out = args[0]
if (!out) throw new Error('usage: acceptance.mjs <outJson> [baseUrl] [--sha <7hex>] [--version <x.y.z>]')
const shotDir = dirname(out)
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:4197'
const expectSha = args.includes('--sha') ? args[args.indexOf('--sha') + 1] : null
const expectVersion = args.includes('--version') ? args[args.indexOf('--version') + 1] : JSON.parse(readFileSync('package.json', 'utf8')).version
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const VIEWPORTS = [
  { id: 'pc', viewport: { width: 1508, height: 660 } },
  { id: 'sp375', viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true },
]
const EXPECTED_RANK = { 試練の影: 2, 業斧の鬼将: 3, 藍花の怨霊: 4, 銀甲の機工師: 2, 双牙の魔獣: 3, 蒼海の龍神: 4, 乱舞の道化: 1 }
const BRIEF_2 = 'カード左上の数字が必要な神力です。余った神力と防御は、次のラウンドへ持ち越せません。'
const TUTORIAL_2 = '毎ラウンド、敵は次の行動を事前に見せます。⚡「溜め」は次のラウンドに大技（必殺）が来る合図、連撃は複数回当たります。防御はそのラウンドだけ有効です。'
const TIP_3 = '防御（ブロック）は次のラウンドに残りません。大技が予告されたラウンドに合わせて出しましょう。'
const NOTE_1 = '★は脅威度（実測の手強さ：負けやすさ・受けるダメージ・倒すまでの長さ。最大5）。難易度の★とは別物です。'

async function clickText(page, text, timeout = 8000) {
  await page.getByRole('button', { name: text }).first().click({ timeout })
}
async function maybeClick(page, text) {
  const l = page.getByRole('button', { name: text }).first()
  if (await l.isVisible().catch(() => false)) { await l.click({ timeout: 3000 }).catch(() => {}); return true }
  return false
}
const overflow = (page) => page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth }))
/** 要素の横 overflow と行数（高さ ÷ line-height）を測る */
const measure = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const cs = getComputedStyle(el)
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5
    const r = el.getBoundingClientRect()
    return { text: el.textContent.trim(), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, width: Math.round(r.width), height: Math.round(r.height), lineHeight: Math.round(lh * 10) / 10, lines: Math.round(r.height / lh) }
  }, selector)

async function shot(page, name, fullPage) {
  const png = `${shotDir}/${name}.png`
  await page.screenshot({ path: png, fullPage })
  const size = statSync(png).size
  if (size <= 500 * 1024) return { file: `${name}.png`, bytes: size }
  // 500KB 超：Chromium の canvas で WebP へ（依存 0）
  const dataUrl = 'data:image/png;base64,' + readFileSync(png).toString('base64')
  const webp = await page.evaluate(async (src) => {
    const img = new Image()
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src })
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    c.getContext('2d').drawImage(img, 0, 0)
    return c.toDataURL('image/webp', 0.82)
  }, dataUrl)
  writeFileSync(`${shotDir}/${name}.webp`, Buffer.from(webp.split(',')[1], 'base64'))
  unlinkSync(png)
  return { file: `${name}.webp`, bytes: statSync(`${shotDir}/${name}.webp`).size, pngBytes: size }
}

mkdirSync(shotDir, { recursive: true })
const browser = await chromium.launch()
const results = []
for (const vp of VIEWPORTS) {
  const context = await browser.newContext(vp)
  const page = await context.newPage()
  const errors = []
  const external = []
  const origin = new URL(base).origin
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u) })
  const r = { viewport: vp.id, checks: [], shots: [], measures: {} }
  const check = (name, pass, detail) => r.checks.push({ name, pass: !!pass, ...(detail !== undefined ? { detail } : {}) })

  await page.goto(base + '/', { waitUntil: 'networkidle' })
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
  await page.goto(base + '/', { waitUntil: 'networkidle' })
  await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
  await page.waitForTimeout(700)

  // ---- Home：version ラベル ----
  const bodyText = await page.locator('body').innerText()
  const vm = bodyText.match(/v(\d+\.\d+\.\d+[^\s()]*)\s*\(([0-9a-f]{7}|local|dev)\)/)
  check(`Home version label = v${expectVersion} (${expectSha ?? 'any'})`, !!vm && vm[1] === expectVersion && (!expectSha || vm[2] === expectSha), vm ? vm[0] : null)
  r.shots.push(await shot(page, `home-${vp.id}`, false))

  // ---- Brief（初陣へ）----
  const hadFirst = await maybeClick(page, '初陣へ')
  check('Home shows 「初陣へ」 for a first-time player', hadFirst)
  await page.getByTestId('first-battle-brief-lines').waitFor({ timeout: 8000 })
  const briefLines = await page.locator('[data-testid="first-battle-brief-lines"] li').allInnerTexts()
  check('Brief has 3 lines', briefLines.length === 3, briefLines)
  check('Brief ② = 「余った神力と防御は、次のラウンドへ持ち越せません。」', briefLines[1] === BRIEF_2, briefLines[1])
  const briefCard = await page.evaluate(() => { const el = document.querySelector('.first-battle-brief'); return el ? { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth } : null })
  check('Brief card has no horizontal overflow', !!briefCard && briefCard.scrollWidth <= briefCard.clientWidth, briefCard)
  r.measures.brief2 = await measure(page, '[data-testid="first-battle-brief-lines"] li:nth-child(2)')
  r.shots.push(await shot(page, `brief-${vp.id}`, false))

  // ---- 遊び方（詳しい遊び方）----
  await clickText(page, '詳しい遊び方')
  await page.locator('.tutorial-overlay[aria-label="遊び方"]').waitFor({ timeout: 8000 })
  const dds = await page.locator('.tutorial-overlay[aria-label="遊び方"] .tutorial-sections dd').allInnerTexts()
  check('Tutorial ② body = 確定文言（v1.0.3 束 #1：⚔ 絵文字なし・74 字）', dds[1] === TUTORIAL_2, dds[1])
  const tips = await page.locator('.tutorial-overlay[aria-label="遊び方"] .tutorial-tips-list li').allInnerTexts()
  check('Tutorial tips = 7（v1.0.3 束 #1：強打・特大のコツを追加）', tips.length === 7, tips.length)
  check('Tutorial tip ③ = 防御（ブロック）は次のラウンドに残りません…（v1.0.3 束 #1・46 字）', tips[2] === TIP_3, tips[2])
  const tutCard = await page.evaluate(() => { const el = document.querySelector('.tutorial-overlay[aria-label="遊び方"] .tutorial-card'); return el ? { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth } : null })
  check('Tutorial card has no horizontal overflow', !!tutCard && tutCard.scrollWidth <= tutCard.clientWidth, tutCard)
  r.measures.tutorial2 = await measure(page, '.tutorial-overlay[aria-label="遊び方"] .tutorial-section:nth-child(2) dd')
  await page.locator('.tutorial-overlay[aria-label="遊び方"] .tutorial-section:nth-child(2)').scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
  r.shots.push(await shot(page, `tutorial-2-${vp.id}`, false))
  await page.locator('.tutorial-overlay[aria-label="遊び方"] .tutorial-tips').scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
  r.shots.push(await shot(page, `tutorial-tips-${vp.id}`, false))
  await page.locator('.tutorial-overlay[aria-label="遊び方"] .tutorial-close').click()
  await clickText(page, 'もどる')

  // ---- 敵選択 ----
  await maybeClick(page, 'わかった')
  await clickText(page, '神を選ぶ')
  await maybeClick(page, '新しく始める')
  await clickText(page, '大耀')
  await clickText(page, 'この構成で始める')
  await page.getByText('挑む敵を選ぼう').first().waitFor({ timeout: 8000 })
  const note = await page.locator('.setup-subtitle').first().innerText()
  const noteFlat = note.replace(/\s+/g, '')
  check('Enemy select note ① = 実測の手強さ…', noteFlat.startsWith(NOTE_1.replace(/\s+/g, '')), note)
  check('Enemy select note ② unchanged', noteFlat.includes('迷ったら「神に委ねる」で、神々があなたの相手を選びます。'))
  r.measures.note = await measure(page, '.setup-subtitle')
  const cards = await page.evaluate(() =>
    [...document.querySelectorAll('.enemy-select-card')].map((c) => ({
      name: c.querySelector('.enemy-select-name')?.textContent.trim() ?? '',
      aria: c.querySelector('.threat-stars')?.getAttribute('aria-label') ?? null,
      filled: c.querySelectorAll('.threat-stars .star-filled').length,
      total: c.querySelectorAll('.threat-stars > span').length,
    })),
  )
  check('enemy cards = 8 (7 + entrust)', cards.length === 8, cards.length)
  for (const [name, rank] of Object.entries(EXPECTED_RANK)) {
    const c = cards.find((x) => x.name === name)
    check(`★ ${name} = ${rank}`, !!c && c.filled === rank && c.total === 5 && c.aria === `脅威度 ${rank} / 5`, c)
  }
  const ov = await overflow(page)
  check('Enemy select has no horizontal page overflow', ov.scrollWidth <= ov.innerWidth, ov)
  r.shots.push(await shot(page, `enemy-select-${vp.id}`, true))

  check('JS error 0', errors.length === 0, errors)
  check('external requests 0', external.length === 0, external)
  results.push(r)
  await context.close()
}
await browser.close()
const total = results.flatMap((r) => r.checks)
const summary = { base, expectVersion, expectSha, generatedAt: new Date().toISOString(), pass: total.filter((c) => c.pass).length, total: total.length, results }
writeFileSync(out, JSON.stringify(summary, null, 2) + '\n')
for (const r of results) for (const c of r.checks) console.log(`${c.pass ? 'PASS' : 'FAIL'} [${r.viewport}] ${c.name}${c.pass ? '' : ' :: ' + JSON.stringify(c.detail ?? '')}`)
for (const r of results) console.log(`[${r.viewport}] measures`, JSON.stringify(r.measures))
console.log(`\n${summary.pass}/${summary.total} PASS`)
process.exit(summary.pass === summary.total ? 0 : 1)

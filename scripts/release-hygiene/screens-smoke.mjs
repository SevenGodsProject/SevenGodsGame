// Release Hygiene Gate：原素材を配信対象から外したあと、全画面で画像が欠けていないかの確認。
//   PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/release-hygiene/screens-smoke.mjs [baseUrl] [--shots <dir>]
//
// 404・失敗リクエスト・壊れた <img>（naturalWidth 0）・JS エラーを画面ごとに数える。
// 「ゲーム実行に必要な asset を誤って除外していないこと」を機械で担保するのが目的。
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:5173'
const shots = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null
if (shots) mkdirSync(shots, { recursive: true })
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const BROKEN = `() => {
  const imgs = [...document.querySelectorAll('img')]
  const broken = imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src'))
  const bg = [...document.querySelectorAll('*')]
    .map((e) => getComputedStyle(e).backgroundImage)
    .filter((v) => v && v !== 'none' && v.includes('/assets/'))
  return { imgs: imgs.length, broken, bgRefs: [...new Set(bg.flatMap((v) => (v.match(/\\/assets\\/[^"')]+/g) ?? [])))] }
}`

const browser = await chromium.launch()
const summary = []
for (const [id, viewport, mobile] of [
  ['pc', { width: 1508, height: 660 }, false],
  ['sp', { width: 390, height: 760 }, true],
]) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile })
  const page = await ctx.newPage()
  const errors = []
  const notFound = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()))
  page.on('response', (r) => {
    if (r.status() >= 400) notFound.push(`${r.status()} ${r.url().replace(base, '')}`)
  })
  page.on('requestfailed', (r) => notFound.push(`FAILED ${r.url().replace(base, '')}`))
  const click = async (t) => {
    const l = page.locator('button', { hasText: t }).first()
    if ((await l.count()) === 0) return false
    await l.click({ timeout: 8000 }).catch(() => {})
    return true
  }
  const check = async (label) => {
    const r = await page.evaluate(`(${BROKEN})()`)
    if (shots) await page.screenshot({ path: join(shots, `${id}-${label}.png`) })
    summary.push({ vp: id, label, imgs: r.imgs, broken: r.broken, bgRefs: r.bgRefs.length })
    return r
  }

  await page.goto(`${base}/?enemy=oni&seed=hygiene-smoke`, { waitUntil: 'load' })
  await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
  await page.waitForTimeout(1200)
  await click('わかった')
  await page.waitForTimeout(400)
  await check('home')
  // OTOMO との絆
  await click('OTOMOとの絆を見る')
  await page.waitForTimeout(1200)
  await check('otomo')
  await page.goBack().catch(() => {})
  await page.waitForTimeout(600)
  if (!(await page.locator('.home-cta-primary').count())) {
    await page.goto(`${base}/?enemy=oni&seed=hygiene-smoke`, { waitUntil: 'load' })
    await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
    await click('わかった')
    await page.waitForTimeout(400)
  }
  // 戦績
  await click('戦績を見る')
  await page.waitForTimeout(900)
  await check('record')
  await click('ホームへ戻る')
  await page.waitForTimeout(600)
  // Daily
  await click('今日の神域挑戦')
  await page.waitForTimeout(1500)
  await check('daily')
  await page.goto(`${base}/?enemy=oni&seed=hygiene-smoke`, { waitUntil: 'load' })
  await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
  await click('わかった')
  await page.waitForTimeout(300)
  // 神選択 → 難易度 → 敵選択 → デッキ → 戦闘
  await click('神を選ぶ')
  await page.waitForTimeout(1500)
  await check('god-select')
  await click('新しく始める')
  await page.waitForTimeout(300)
  await click('大耀')
  await page.waitForTimeout(500)
  await check('difficulty')
  await click('この構成で始める')
  await page.waitForTimeout(900)
  await check('enemy-select')
  await click('業斧の鬼将')
  await page.waitForTimeout(1200)
  await check('deck')
  await click('この構成でバトル開始')
  await page.waitForSelector('.hand .card-view', { timeout: 15000 })
  await page.waitForFunction(() => { const e = document.querySelector('.end-round-button'); return e && !e.disabled }, null, { timeout: 20000 })
  await page.waitForTimeout(900)
  await check('battle')

  console.log(`[${id}] 404/失敗リクエスト: ${notFound.length ? notFound.join(', ') : 'なし'} / JS エラー: ${errors.length ? errors.join(' | ') : 'なし'}`)
  await ctx.close()
}
await browser.close()
let broken = 0
for (const s of summary) {
  broken += s.broken.length
  console.log(`${s.vp} ${s.label.padEnd(12)} img ${String(s.imgs).padStart(3)} 壊れ ${s.broken.length}${s.broken.length ? ' ' + s.broken.join(',') : ''} 背景画像参照 ${s.bgRefs}`)
}
console.log('壊れた画像 合計:', broken)

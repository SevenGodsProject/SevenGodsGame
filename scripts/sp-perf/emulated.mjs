// PF-01（Lane 2）：SP **エミュレーション**での性能実測（PC の Chromium で iPhone 相当の viewport／UA／CPU 4× 減速／Fast 3G）。
//   PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/sp-perf/emulated.mjs <outJson> [baseUrl] [--runs 2]
// これは実 iPhone（Safari・A 系 SoC・実回線）の代わりにはならない。実機の確認手順は docs/SP_PERF_EVIDENCE_V1.md §4。
// 測るもの：①Home 初回表示（TTFB／DCL／load／FCP／LCP／転送量／長タスク／JS heap）②戦闘開始（降臨の間の終了＝操作可能まで）
// ③1 ラウンド（カード 1 枚 → ラウンドを終える → 次の操作可能まで）④各区間の長タスク（>50ms）数と最大。
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const out = args[0]
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:4177'
const runs = args.includes('--runs') ? +args[args.indexOf('--runs') + 1] : 2
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

/** iPhone 13 相当の viewport／UA。CPU 4×・Fast 3G は Lighthouse mobile の既定に合わせる */
const DEVICE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
}
const CPU_RATE = 4
const NET = { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 } // Fast 3G

const OBSERVE = `(() => {
  window.__perf = { fcp: null, lcp: null, longTasks: [], marks: {} }
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__perf.fcp = e.startTime }).observe({ type: 'paint', buffered: true }) } catch {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__perf.lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true }) } catch {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__perf.longTasks.push({ t: Math.round(e.startTime), d: Math.round(e.duration) }) }).observe({ type: 'longtask', buffered: true }) } catch {}
})()`

const longTasksBetween = (lt, a, b) => { const xs = lt.filter((x) => x.t >= a && x.t <= b); return { n: xs.length, max: xs.length ? Math.max(...xs.map((x) => x.d)) : 0, total: xs.reduce((s, x) => s + x.d, 0) } }
async function clickText(page, text, timeout = 15000) { await page.getByRole('button', { name: text }).first().click({ timeout }) }
async function maybeClick(page, text) { const l = page.getByRole('button', { name: text }).first(); if (await l.isVisible().catch(() => false)) await l.click({ timeout: 3000 }).catch(() => {}) }
const now = (page) => page.evaluate(() => performance.now())

const browser = await chromium.launch()
const results = []
for (let run = 1; run <= runs; run++) {
  const context = await browser.newContext(DEVICE) // 新しい context＝キャッシュなし（cold）
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', NET)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_RATE })
  await page.addInitScript({ content: OBSERVE })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  const transfer = { bytes: 0, count: 0, byType: {} }
  cdp.on('Network.loadingFinished', (e) => { transfer.bytes += e.encodedDataLength; transfer.count++ })
  page.on('response', (r) => { const t = (r.headers()['content-type'] || '').split(';')[0]; transfer.byType[t] = (transfer.byType[t] || 0) + 1 })

  // ① Home
  const t0 = Date.now()
  await page.goto(base, { waitUntil: 'load' })
  await page.waitForSelector('[data-testid="home-screen"]', { timeout: 30000 })
  await page.waitForTimeout(3000) // LCP の確定・遅延画像
  const nav = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return n ? { ttfb: Math.round(n.responseStart), dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) } : null })
  const home = await page.evaluate(() => ({ fcp: window.__perf.fcp && Math.round(window.__perf.fcp), lcp: window.__perf.lcp && Math.round(window.__perf.lcp), longTasks: window.__perf.longTasks }))
  const heapHome = (await cdp.send('Runtime.getHeapUsage').catch(() => ({}))).usedSize
  const homeBytes = transfer.bytes, homeCount = transfer.count
  await maybeClick(page, 'わかった')

  // ② 戦闘開始（神を選ぶ → 大耀 → この構成で始める → 鬼将 → バトル開始 → 操作可能）
  await clickText(page, '神を選ぶ'); await maybeClick(page, '新しく始める'); await clickText(page, '大耀'); await clickText(page, 'この構成で始める')
  const tEnemySel = await now(page)
  await page.waitForSelector('.enemy-select-card, [data-testid="enemy-select"], button:has-text("業斧の鬼将")', { timeout: 20000 })
  await clickText(page, '業斧の鬼将')
  await page.waitForSelector('.deck-builder-card-stepper button', { timeout: 20000 })
  const tDeckReady = await now(page)
  const tStart = await now(page)
  await clickText(page, 'この構成でバトル開始')
  await page.waitForFunction(() => { const e = document.querySelector('.end-round-button'); return e && !e.disabled }, null, { timeout: 40000 })
  const tPlayable = await now(page)
  const heapBattle = (await cdp.send('Runtime.getHeapUsage').catch(() => ({}))).usedSize
  const battleBytes = transfer.bytes

  // ③ 1 ラウンド：カード 1 枚 → ラウンドを終える → 敵の行動 → 次の操作可能
  const tCard = await now(page)
  await page.evaluate(() => { const c = [...document.querySelectorAll('.hand .card-view')].find((c) => !c.disabled); c?.click() })
  await page.waitForTimeout(300)
  const tEnd = await now(page)
  await page.evaluate(() => document.querySelector('.end-round-button')?.click())
  await page.waitForFunction(() => { const e = document.querySelector('.end-round-button'); return e && e.disabled }, null, { timeout: 5000 }).catch(() => {})
  await page.waitForFunction(() => { const e = document.querySelector('.end-round-button'); return e && !e.disabled }, null, { timeout: 30000 })
  const tNext = await now(page)
  const lt = await page.evaluate(() => window.__perf.longTasks)

  results.push({
    run,
    home: { ...nav, fcp: home.fcp, lcp: home.lcp, transferBytes: homeBytes, requests: homeCount, heapMB: heapHome ? +(heapHome / 1048576).toFixed(1) : null, longTasks: longTasksBetween(home.longTasks, 0, 10000), wallMs: Date.now() - t0 },
    enemySelectToDeckMs: Math.round(tDeckReady - tEnemySel),
    battleStart: { toPlayableMs: Math.round(tPlayable - tStart), longTasks: longTasksBetween(lt, tStart, tPlayable), transferBytesSinceHome: battleBytes - homeBytes, heapMB: heapBattle ? +(heapBattle / 1048576).toFixed(1) : null },
    round: { cardToEndMs: Math.round(tEnd - tCard), endToNextPlayableMs: Math.round(tNext - tEnd), longTasks: longTasksBetween(lt, tCard, tNext) },
    errors,
    byType: transfer.byType,
  })
  await context.close()
}
await browser.close()
const med = (xs) => { const a = xs.filter((x) => typeof x === 'number').sort((p, q) => p - q); return a.length ? a[Math.floor((a.length - 1) / 2)] : null }
const summary = {
  base, at: new Date().toISOString(), emulation: { device: 'iPhone 13 相当（390×844・DPR3・touch・iOS UA）', cpuThrottle: `${CPU_RATE}x`, network: 'Fast 3G（1.6Mbps↓／750kbps↑／RTT 150ms）', engine: 'Chromium headless（Playwright）＝実 iPhone Safari ではない' },
  runs: results,
  median: {
    homeLcpMs: med(results.map((r) => r.home.lcp)), homeFcpMs: med(results.map((r) => r.home.fcp)), homeLoadMs: med(results.map((r) => r.home.load)), homeTransferKB: med(results.map((r) => Math.round(r.home.transferBytes / 1024))),
    battleStartToPlayableMs: med(results.map((r) => r.battleStart.toPlayableMs)), roundEndToNextMs: med(results.map((r) => r.round.endToNextPlayableMs)),
    homeLongTaskMax: med(results.map((r) => r.home.longTasks.max)), battleLongTaskMax: med(results.map((r) => r.battleStart.longTasks.max)),
    heapBattleMB: med(results.map((r) => r.battleStart.heapMB)),
  },
}
if (out) writeFileSync(out, JSON.stringify(summary, null, 2))
console.log(JSON.stringify(summary.median, null, 1))
console.log('errors:', results.map((r) => r.errors.length))

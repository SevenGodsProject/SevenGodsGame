// Phase 6 Commercial Benchmark Audit v2：ブラウザゲームとしての性能・First 10 Minutes の計測（監査用）。
//
//   node scripts/phase6-commercial-benchmark/perf.mjs <outJson> [baseUrl]
//
// 計測：
//   - 初回ロード：転送バイト（種別ごと）、リクエスト数、DOMContentLoaded、LCP 相当（最大画像の描画）
//   - ホーム→戦闘開始までに追加で読む資産（画像・BGM）、戦闘中の JS ヒープ
//   - CLS（layout-shift の累積）、戦闘中のフレーム安定性（rAF 間隔の p95）
//   - First 10 Minutes：各セットアップ画面の文字数・ボタン数・必要クリック数、チュートリアルの文字数
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const out = args[0]
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:5173'
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const VIEWPORTS = [
  { id: 'pc', viewport: { width: 1508, height: 660 }, isMobile: false },
  { id: 'sp', viewport: { width: 390, height: 760 }, isMobile: true },
]

const TEXT_STATS = `() => {
  const main = document.querySelector('main') || document.body
  const text = main.innerText || ''
  const overlay = document.querySelector('.tutorial-card, .tutorial-overlay')
  return {
    chars: text.replace(/\\s+/g, '').length,
    buttons: document.querySelectorAll('main button').length,
    overlayChars: overlay ? (overlay.innerText || '').replace(/\\s+/g, '').length : 0,
    h1: document.querySelector('h1')?.textContent?.trim() ?? null,
    smallTapTargets: [...document.querySelectorAll('button, a, [role="radio"]')].filter((el) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44)
    }).length,
    tapTargets: [...document.querySelectorAll('button, a, [role="radio"]')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 }).length,
    hasHScroll: document.scrollingElement.scrollWidth > document.scrollingElement.clientWidth,
    pageH: document.scrollingElement.scrollHeight,
  }
}`

const browser = await chromium.launch({ headless: true })
const results = []

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: vp.viewport, isMobile: vp.isMobile, hasTouch: vp.isMobile })
  const page = await ctx.newPage()
  const resources = []
  page.on('response', async (res) => {
    try {
      const req = res.request()
      const headers = res.headers()
      const len = Number(headers['content-length'] ?? 0)
      resources.push({ url: res.url(), type: req.resourceType(), status: res.status(), bytes: len, t: Date.now() })
    } catch {}
  })
  const click = (t) =>
    page.evaluate((text) => {
      const el = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(text))
      if (!el) return false
      el.click()
      return true
    }, t)

  // CLS / LCP 観測
  await page.addInitScript(() => {
    window.__cls = 0
    window.__lcp = 0
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value }).observe({ type: 'layout-shift', buffered: true })
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
    } catch {}
  })

  const t0 = Date.now()
  await page.goto(base + '/?enemy=oni&seed=cb-perf', { waitUntil: 'domcontentloaded' })
  const tDcl = Date.now() - t0
  await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
  const tInteractive = Date.now() - t0
  await page.waitForTimeout(1500)
  const nav = await page.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0]
    return { domContentLoaded: Math.round(n?.domContentLoadedEventEnd ?? 0), loadEvent: Math.round(n?.loadEventEnd ?? 0), lcp: Math.round(window.__lcp), cls: +window.__cls.toFixed(4) }
  })
  const homeText = await page.evaluate(`(${TEXT_STATS})()`)
  const homeRes = resources.slice()
  const sumBy = (list) => {
    const byType = {}
    for (const r of list) {
      const k = r.type
      byType[k] = byType[k] || { n: 0, bytes: 0 }
      byType[k].n++
      byType[k].bytes += r.bytes
    }
    return { total: list.reduce((a, r) => a + r.bytes, 0), n: list.length, byType }
  }

  // First 10 minutes：クリック数と各画面の文字量
  const screens = []
  const snap = async (name) => screens.push({ name, ...(await page.evaluate(`(${TEXT_STATS})()`)) })
  await snap('home(+tutorial overlay)')
  await click('わかった')
  await page.waitForTimeout(200)
  await snap('home')
  await click('神を選ぶ')
  await page.waitForTimeout(300)
  await snap('godSelect')
  await click('大耀')
  await page.waitForTimeout(250)
  await snap('difficulty')
  await click('この構成で始める')
  await page.waitForTimeout(250)
  await snap('enemySelect')
  await click('業斧の鬼将')
  await page.waitForTimeout(400)
  await snap('deckBuilder')
  const nBefore = resources.length
  const tBattle0 = Date.now()
  await click('この構成でバトル開始')
  await page.waitForSelector('.hand .card-view', { timeout: 10000 })
  await page.waitForFunction(() => { const c = document.querySelector('.hand .card-view'); return c && !c.disabled }, null, { timeout: 15000 })
  const tBattlePlayable = Date.now() - tBattle0
  await page.waitForTimeout(800)
  await snap('battle')
  const battleRes = resources.slice(nBefore)

  // 戦闘中のフレーム安定性：カードを1枚使った直後の 1.2 秒間の rAF 間隔
  const frame = await page.evaluate(async () => {
    const c = [...document.querySelectorAll('.hand .card-view')].find((x) => !x.disabled && /⚔/.test(x.textContent))
    const gaps = []
    let last = performance.now()
    let stop = false
    const loop = (t) => { gaps.push(t - last); last = t; if (!stop) requestAnimationFrame(loop) }
    requestAnimationFrame(loop)
    c?.click()
    await new Promise((r) => setTimeout(r, 1200))
    stop = true
    gaps.sort((a, b) => a - b)
    const p = (q) => gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * q))]
    return { frames: gaps.length, p50: +p(0.5).toFixed(1), p95: +p(0.95).toFixed(1), max: +gaps[gaps.length - 1].toFixed(1), over50ms: gaps.filter((g) => g > 50).length }
  })
  await page.waitForTimeout(600)
  const mem = await page.evaluate(() => {
    const m = performance.memory
    return m ? { usedMB: +(m.usedJSHeapSize / 1048576).toFixed(1), totalMB: +(m.totalJSHeapSize / 1048576).toFixed(1) } : null
  })
  const clsEnd = await page.evaluate(() => +window.__cls.toFixed(4))
  const decoded = await page.evaluate(() => {
    const imgs = [...document.images].filter((i) => i.naturalWidth > 0)
    const bg = [...document.querySelectorAll('*')].map((e) => getComputedStyle(e).backgroundImage).filter((v) => v && v.startsWith('url(')).length
    return { imgs: imgs.length, decodedMB: +(imgs.reduce((a, i) => a + i.naturalWidth * i.naturalHeight * 4, 0) / 1048576).toFixed(1), bgImages: bg }
  })
  const bigAssets = resources.filter((r) => r.bytes > 300000).map((r) => ({ url: r.url.replace(base, ''), kb: Math.round(r.bytes / 1024), type: r.type }))
  const r = { viewport: vp.id, size: vp.viewport, tDclMs: tDcl, tInteractiveMs: tInteractive, nav, home: sumBy(homeRes), battleExtra: sumBy(battleRes), tBattlePlayableMs: tBattlePlayable, frame, memory: mem, clsTotal: clsEnd, decoded, bigAssets, screens }
  results.push(r)
  console.log(`${vp.id}: DCL=${tDcl}ms interactive=${tInteractive}ms LCP=${nav.lcp} CLS=${clsEnd} home=${Math.round(r.home.total / 1024)}KB/${r.home.n}req battle+=${Math.round(r.battleExtra.total / 1024)}KB/${r.battleExtra.n}req playable=${tBattlePlayable}ms frames p95=${frame.p95}ms max=${frame.max} >50ms=${frame.over50ms} mem=${mem?.usedMB}MB decoded=${decoded.decodedMB}MB`)
  for (const s of screens) console.log(`   ${s.name}: chars=${s.chars} overlay=${s.overlayChars} buttons=${s.buttons} smallTap=${s.smallTapTargets}/${s.tapTargets} hScroll=${s.hasHScroll} pageH=${s.pageH}`)
  console.log('   big assets: ' + bigAssets.map((a) => `${a.url}(${a.kb}KB)`).join(', '))
  await ctx.close()
}
await browser.close()
if (out) writeFileSync(out, JSON.stringify(results, null, 1))

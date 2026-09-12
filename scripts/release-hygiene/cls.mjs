// Release Hygiene Gate：CLS（Cumulative Layout Shift）と 44px タップ領域の計測。
//   PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/release-hygiene/cls.mjs <outJson> [baseUrl] [--tag before|after]
//
// CLS は「どの要素がどれだけ動いたか」まで記録して原因を特定できるようにする。
// 画面はホーム → 神選択 → 難易度 → 敵選択 → デッキ → 戦闘 まで通し、
// PC（1508×660）と Mobile（390×760）の両方で測る。
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const out = args[0]
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:5173'
const tag = args.includes('--tag') ? args[args.indexOf('--tag') + 1] : 'after'
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const VIEWPORTS = [
  { id: 'pc', viewport: { width: 1508, height: 660 }, isMobile: false },
  { id: 'sp', viewport: { width: 390, height: 760 }, isMobile: true },
]

/** layout-shift を、動いた要素の情報つきで貯める */
const OBSERVE = `() => {
  window.__cls = { total: 0, rawTotal: 0, entries: [] }
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      window.__cls.rawTotal += e.value
      // Chrome の CLS は「直前 500ms 以内にユーザー入力があった変化」を除外する。
      // 画面遷移で中身が入れ替わる分は体験上の問題ではないので同じ基準で数える
      if (!e.hadRecentInput) window.__cls.total += e.value
      const sources = (e.sources || []).map((s) => {
        const n = s.node
        const tag = n && n.nodeType === 1 ? n.tagName.toLowerCase() : String(n && n.nodeName)
        const cls = n && n.nodeType === 1 ? (n.className || '').toString().split(' ').slice(0, 2).join('.') : ''
        const src = n && n.tagName === 'IMG' ? n.getAttribute('src') : null
        return { tag, cls, src, prev: s.previousRect, cur: s.currentRect }
      })
      window.__cls.entries.push({ value: +e.value.toFixed(4), at: Math.round(e.startTime), recentInput: e.hadRecentInput, sources })
    }
  }).observe({ type: 'layout-shift', buffered: true })
  return true
}`

/** 44px 未満の操作要素を、画面ごとに記録する */
const TAPS = `(label) => {
  const els = [...document.querySelectorAll('button, a[href], [role="button"], [role="radio"], input, select')]
  const small = []
  for (const el of els) {
    const r = el.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) continue
    if (getComputedStyle(el).visibility === 'hidden') continue
    // 見た目が 44px 未満でも、::after で判定を広げていれば実際には押せる。
    // ①擬似要素の実寸を見る（画面外の要素でも判定できる）
    const af = getComputedStyle(el, '::after')
    const pseudo =
      af.content !== 'none' &&
      af.position === 'absolute' &&
      af.pointerEvents !== 'none' &&
      parseFloat(af.width) >= 44 &&
      parseFloat(af.height) >= 44
    // ②画面内にある要素は、実際に中心から ±21px の4点が自分に当たるかも確かめる
    const inViewport = r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth
    const hit = (dx, dy) => {
      const el2 = document.elementFromPoint(Math.round(r.left + r.width / 2 + dx), Math.round(r.top + r.height / 2 + dy))
      return !!el2 && (el2 === el || el.contains(el2) || el2.contains(el))
    }
    const probed = inViewport ? hit(-21, 0) && hit(21, 0) && hit(0, -21) && hit(0, 21) : null
    const effective = pseudo || probed === true
    if ((r.width < 44 || r.height < 44) && !effective) {
      small.push({
        label,
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().split(' ').slice(0, 3).join('.'),
        text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 18),
        w: Math.round(r.width),
        h: Math.round(r.height),
        disabled: !!el.disabled,
        pseudoHit: pseudo,
        probedHit: probed,
      })
    }
  }
  return { label, total: els.length, small }
}`

const results = []
const browser = await chromium.launch({ headless: true })
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: vp.viewport, isMobile: vp.isMobile, hasTouch: vp.isMobile })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()))
  await page.addInitScript(`(${OBSERVE})()`)
  // 実ユーザーと同じ「信頼できる入力」でクリックする。JS からの el.click() では
  // layout-shift の hadRecentInput が立たず、画面遷移に伴う入れ替わりまで CLS に
  // 数えてしまい、実際のユーザー体験とかけ離れた値になる
  const click = async (t) => {
    const target = page.locator('button', { hasText: t }).first()
    if ((await target.count()) === 0) return false
    await target.click({ timeout: 8000 }).catch(() => {})
    return true
  }
  const taps = []
  const snapTaps = async (label) => taps.push(await page.evaluate(`(${TAPS})(${JSON.stringify(label)})`))

  await page.goto(`${base}/?enemy=oni&seed=hygiene-cls`, { waitUntil: 'load' })
  await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
  await page.waitForTimeout(1500)
  const clsHome = await page.evaluate(() => window.__cls.total)
  await snapTaps('home-tutorial')
  await click('わかった')
  await page.waitForTimeout(600)
  await snapTaps('home')
  await click('神を選ぶ')
  await page.waitForTimeout(2500)
  await snapTaps('god-select')
  if (await click('新しく始める')) await page.waitForTimeout(400)
  await click('大耀')
  await page.waitForTimeout(500)
  await snapTaps('difficulty')
  await click('この構成で始める')
  await page.waitForTimeout(700)
  await snapTaps('enemy-select')
  await click('業斧の鬼将')
  await page.waitForTimeout(800)
  await snapTaps('deck')
  await click('この構成でバトル開始')
  await page.waitForSelector('.hand .card-view', { timeout: 15000 })
  await page.waitForFunction(() => { const e = document.querySelector('.end-round-button'); return e && !e.disabled }, null, { timeout: 20000 })
  await page.waitForTimeout(900)
  await snapTaps('battle')
  // 結果画面も見る（報酬ボタン・もう一度）
  await page.evaluate(() => {
    const c = [...document.querySelectorAll('.hand .card-view')].filter((x) => !x.disabled)[0]
    if (c) c.click()
  })
  await page.waitForTimeout(1200)
  const cls = await page.evaluate(() => window.__cls)
  results.push({
    tag,
    vp: vp.id,
    clsHome: +clsHome.toFixed(4),
    clsTotal: +cls.total.toFixed(4),
    clsRaw: +cls.rawTotal.toFixed(4),
    worst: cls.entries.sort((a, b) => b.value - a.value).slice(0, 6),
    shiftCount: cls.entries.length,
    taps,
    smallTapTargets: taps.flatMap((t) => t.small),
    errors,
  })
  await ctx.close()
}
await browser.close()
if (out) writeFileSync(out, JSON.stringify(results, null, 1))
for (const r of results) {
  console.log(`[${r.tag}] ${r.vp}: CLS ${r.clsTotal} (raw incl. input-driven ${r.clsRaw}) (home only ${r.clsHome}), shifts ${r.shiftCount}, <44px ${r.smallTapTargets.length}, errors ${r.errors.length}`)
  for (const w of r.worst.slice(0, 4)) {
    console.log(`   ${w.value}${w.recentInput ? " (input-driven)" : ""} @${w.at}ms  ${w.sources.map((s) => `${s.tag}.${s.cls}${s.src ? `(${s.src.split('/').pop()})` : ''}`).join(' | ')}`)
  }
  const uniq = new Map()
  for (const s of r.smallTapTargets) uniq.set(`${s.cls}|${s.text}`, s)
  for (const s of uniq.values()) console.log(`   <44px  ${s.w}x${s.h}  .${s.cls}  "${s.text}"  [${s.label}]`)
}

// Phase 6-D Visual Patch v1：神の一撃カットイン中のフレーム落ち計測（QA用。ゲームコードではない）。
//   PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/phase6d-visual-audit/perf.mjs <outJson> [baseUrl] [--tag before|after] [--cpu 4]
//
// ■ 方法
// ヘッドレス Chromium は描画要求が無いとフレームを作らず rAF も進まないため、
// CDP の Page.startScreencast で連続描画させたうえで rAF の間隔を実測する。
// 共鳴7/7 の到達は seed とプレイ順に左右されて不安定なので、**実際の戦闘画面の上に
// カットインと同一の markup（同じクラス＝同じ製品CSS）を差し込んで**、その 900ms を測る。
// 差し込む DOM は BattleResonanceCutin.tsx の出力と同じ構造で、CSS も製品のものを
// そのまま使うため、描画コストは本物と同じ。直前の 1.5 秒（通常のバトル画面）を
// 対照区間として同じ条件で測り、カットインが特別に重くないかを比べる。
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const out = args[0]
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:5173'
const tag = args.includes('--tag') ? args[args.indexOf('--tag') + 1] : 'after'
const cpu = args.includes('--cpu') ? Number(args[args.indexOf('--cpu') + 1]) : 1
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

/** rAF の間隔を記録する */
const SAMPLER = `() => {
  window.__fps = { frames: [], marks: {} }
  let last = performance.now()
  const tick = (t) => { window.__fps.frames.push([Math.round(t), Math.round((t - last) * 100) / 100]); last = t; requestAnimationFrame(tick) }
  requestAnimationFrame(tick)
  return true
}`

/** 製品と同じ markup／CSS のカットインを差し込む（after＝6-D の舞台、before＝旧カード） */
const INJECT = (variant) => `() => {
  const old = document.querySelector('.resonance-cutin')
  if (old) old.remove()
  const img = '/assets/gods/taiyo/keyvisual.webp'
  const el = document.createElement('div')
  el.className = 'resonance-cutin'
  el.setAttribute('data-perf', '1')
  el.style.setProperty('--god-accent', '#e8b33d')
  el.style.setProperty('--god-keyvisual-pos', 'center 30%')
  el.innerHTML = ${variant === 'after'
    ? "`<div class=\"resonance-cutin-rays\"></div><div class=\"resonance-cutin-band\"></div><div class=\"resonance-cutin-group\"><div class=\"resonance-cutin-portrait\"><img class=\"resonance-cutin-image\" src=\"${img}\" data-god=\"taiyo\"><span class=\"resonance-cutin-ring\"></span></div><div class=\"resonance-cutin-caption\"><div class=\"resonance-cutin-god\">大耀</div><div class=\"resonance-cutin-title\">神の一撃</div><div class=\"resonance-cutin-sub\">共鳴発動</div></div></div>`"
    : "`<div class=\"resonance-cutin-group\"><img class=\"resonance-cutin-image\" src=\"${img}\" data-god=\"taiyo\"><div class=\"resonance-cutin-text\">大耀、共鳴発動！</div></div>`"}
  document.body.appendChild(el)
  window.__fps.marks.cutinStart = performance.now()
  return true
}`
const REMOVE = `() => { document.querySelector('[data-perf]')?.remove(); window.__fps.marks.cutinEnd = performance.now(); return true }`

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 390, height: 760 }, isMobile: true, hasTouch: true })
const page = await ctx.newPage()
const cdp = await ctx.newCDPSession(page)
await cdp.send('Page.enable')
cdp.on('Page.screencastFrame', async (f) => {
  try {
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId })
  } catch { /* 終了後のackは無視 */ }
})
const click = (t) =>
  page.evaluate((text) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(text))
    if (!b) return false
    b.click()
    return true
  }, t)

await page.goto(`${base}/?enemy=oni&seed=p6d-perf`)
await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
await click('わかった')
await page.waitForTimeout(150)
await click('神を選ぶ')
await page.waitForTimeout(300)
if (await click('新しく始める')) await page.waitForTimeout(300)
await click('大耀')
await page.waitForTimeout(250)
await click('この構成で始める')
await page.waitForTimeout(250)
await click('業斧の鬼将')
await page.waitForTimeout(400)
await click('この構成でバトル開始')
await page.waitForSelector('.hand .card-view', { timeout: 10000 })
await page.waitForFunction(() => { const e = document.querySelector('.end-round-button'); return e && !e.disabled }, null, { timeout: 15000 })
await page.waitForTimeout(400)

if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 20, everyNthFrame: 1 })
await page.evaluate(`(${SAMPLER})()`)

// 対照区間：通常のバトル画面（カードを1枚出して演出を走らせる）
await page.evaluate(() => {
  const c = [...document.querySelectorAll('.hand .card-view')].filter((x) => !x.disabled)[0]
  if (c) c.click()
})
await page.waitForTimeout(1600)
const controlEnd = await page.evaluate(() => performance.now())
await page.waitForTimeout(200)

// 本番区間：カットイン 900ms
await page.evaluate(`(${INJECT(tag === 'before' ? 'before' : 'after')})()`)
await page.waitForTimeout(950)
await page.evaluate(`(${REMOVE})()`)
await page.waitForTimeout(200)

const data = await page.evaluate(() => window.__fps)
await cdp.send('Page.stopScreencast').catch(() => {})
await browser.close()

const stat = (frames) => {
  if (frames.length < 3) return null
  const d = frames.map((f) => f[1]).slice(1)
  const sorted = [...d].sort((a, b) => a - b)
  return {
    frames: d.length,
    avgMs: +(d.reduce((a, b) => a + b, 0) / d.length).toFixed(1),
    medianMs: +sorted[Math.floor(sorted.length / 2)].toFixed(1),
    p95Ms: +sorted[Math.floor(sorted.length * 0.95)].toFixed(1),
    maxMs: +Math.max(...d).toFixed(1),
    over33: d.filter((x) => x > 33).length,
    over50: d.filter((x) => x > 50).length,
  }
}
const { cutinStart, cutinEnd } = data.marks
const inRange = (a, b) => data.frames.filter((f) => f[0] >= a && f[0] <= b)
const result = {
  tag,
  cpuThrottle: cpu,
  viewport: '390x760',
  cutinMs: cutinStart && cutinEnd ? Math.round(cutinEnd - cutinStart) : null,
  cutin: cutinStart && cutinEnd ? stat(inRange(cutinStart, cutinEnd)) : null,
  control: stat(inRange(controlEnd - 1500, controlEnd)),
  all: stat(data.frames),
}
if (out) writeFileSync(out, JSON.stringify({ result, frames: data.frames }, null, 1))
console.log(JSON.stringify(result, null, 1))

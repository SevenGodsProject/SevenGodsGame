// Official Voice Pilot v1：大耀「あいさつ」が入口の終わりで 1 回だけ鳴り、ミュート時は鳴らないことを PC／SP で実測する。
//   PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/official-voice-pilot/acceptance.mjs <outJson> [baseUrl]
// 計測方法：AudioBufferSourceNode.start を包んで「5 秒より長い buffer の start」をボイスとして数える（SE は全て ≤1.0s）。
// BGM duck は AudioParam.linearRampToValueAtTime の呼び出し（値と時刻）を記録して、ボイス開始の直後に 1 未満へ下がり、
// 終了後に 1 へ戻る予約があることを見る。音は出さない（headless）。
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const out = args[0]
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:4173'
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const VIEWPORTS = [
  { id: 'pc', viewport: { width: 1508, height: 660 }, isMobile: false },
  { id: 'sp', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
]

const HOOK = `() => {
  window.__audio = { starts: [], ramps: [], ctxCreated: 0, t0: performance.now() }
  const OrigCtx = window.AudioContext
  window.AudioContext = class extends OrigCtx { constructor(...a) { super(...a); window.__audio.ctxCreated++ } }
  const start = AudioBufferSourceNode.prototype.start
  AudioBufferSourceNode.prototype.start = function (...a) {
    const d = this.buffer ? this.buffer.duration : 0
    window.__audio.starts.push({ duration: +d.toFixed(3), atMs: Math.round(performance.now() - window.__audio.t0), rate: this.playbackRate.value })
    return start.apply(this, a)
  }
  const ramp = AudioParam.prototype.linearRampToValueAtTime
  AudioParam.prototype.linearRampToValueAtTime = function (v, t) {
    window.__audio.ramps.push({ value: +v.toFixed(3), atMs: Math.round(performance.now() - window.__audio.t0) })
    return ramp.call(this, v, t)
  }
}`

async function clickText(page, text, timeout = 6000) {
  const l = page.getByRole('button', { name: text }).first()
  await l.click({ timeout })
}
async function maybeClick(page, text) {
  const l = page.getByRole('button', { name: text }).first()
  if (await l.isVisible().catch(() => false)) await l.click({ timeout: 3000 }).catch(() => {})
}

async function startBattle(page) {
  await maybeClick(page, 'わかった')
  await clickText(page, '神を選ぶ')
  await maybeClick(page, '新しく始める')
  await clickText(page, '大耀')
  await clickText(page, 'この構成で始める')
  await clickText(page, '業斧の鬼将')
  await clickText(page, 'この構成でバトル開始')
}

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
const results = []
for (const vp of VIEWPORTS) {
  for (const muted of [false, true]) {
    const context = await browser.newContext({ viewport: vp.viewport, isMobile: vp.isMobile, hasTouch: !!vp.hasTouch, reducedMotion: 'no-preference' })
    const page = await context.newPage()
    const errors = []
    const voiceRequests = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
    page.on('request', (r) => { if (r.url().includes('/assets/voice/')) voiceRequests.push({ url: r.url().replace(base, ''), atMs: Date.now() }) })
    await page.addInitScript({ content: `(${HOOK})()` })
    await page.goto(base, { waitUntil: 'networkidle' })
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
    await page.goto(base, { waitUntil: 'networkidle' })
    await maybeClick(page, 'わかった')
    if (muted) await page.getByRole('button', { name: 'ミュート' }).first().click()
    const tStart = Date.now()
    await startBattle(page)
    // 入口 Full 2,800ms（セッション最初の 1 戦）の終わりでボイスが始まる。始まるまで最大 9 秒待ち、さらに 1 秒見て 2 本目が無いことを確認
    await page.waitForFunction(() => window.__audio.starts.some((s) => s.duration > 5), null, { timeout: 9000 }).catch(() => {})
    await page.waitForTimeout(1000)
    const audio = await page.evaluate(() => window.__audio)
    const voiceStarts = audio.starts.filter((s) => s.duration > 5)
    const seStarts = audio.starts.filter((s) => s.duration <= 5)
    const firstVoice = voiceStarts[0]
    const rampsAfterVoice = firstVoice ? audio.ramps.filter((r) => r.atMs >= firstVoice.atMs - 50) : []
    const duckDown = rampsAfterVoice.find((r) => r.value < 1)
    const duckUp = rampsAfterVoice.find((r) => r.value === 1)
    const inBattle = await page.getByRole('button', { name: 'ラウンドを終える' }).first().isVisible().catch(() => false)
    // 連続再生防止：もう一度「あいさつ」を鳴らす経路は無い（入口は新規開始でのみ）。ここでは 4.5 秒以内に 2 本目が無いことを見る
    results.push({
      viewport: vp.id,
      muted,
      inBattle,
      voiceRequests: voiceRequests.map((r) => ({ url: r.url, afterStartMs: r.atMs - tStart })),
      voiceStarts,
      seStartsCount: seStarts.length,
      duck: firstVoice ? { down: duckDown ?? null, up: duckUp ?? null } : null,
      errors,
      pass: muted
        ? voiceStarts.length === 0 && voiceRequests.length === 0 && errors.length === 0 && inBattle
        : voiceStarts.length === 1 && Math.abs(voiceStarts[0].duration - 11.783) < 0.1 && voiceRequests.length === 1 && !!duckDown && !!duckUp && errors.length === 0 && inBattle,
    })
    await context.close()
  }
}
await browser.close()
const summary = { base, at: new Date().toISOString(), allPass: results.every((r) => r.pass), results }
if (out) writeFileSync(out, JSON.stringify(summary, null, 2))
console.log(JSON.stringify(summary, null, 2))
process.exit(summary.allPass ? 0 : 1)

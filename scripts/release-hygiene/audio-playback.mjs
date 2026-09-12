// Release Hygiene Gate：BGM が実際に鳴るか・ループ・音量・ジングルの確認。
//   PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/release-hygiene/audio-playback.mjs [baseUrl]
//
// 再エンコード（Opus/WebM 主・MP3 フォールバック）で「音が出ない」「ループが切れる」
// 「音量が変わった」が起きていないことを、実際のページで確かめる。
// 自動再生はユーザー操作が要るので、信頼できるクリックを1回入れてから調べる。
import { pathToFileURL } from 'node:url'

const base = process.argv.find((a) => a.startsWith('http')) ?? 'http://localhost:5173'
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
const ctx = await browser.newContext({ viewport: { width: 1508, height: 660 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()))
const failed = []
page.on('requestfailed', (r) => failed.push(`${r.url()} ${r.failure()?.errorText ?? ''}`))

// bgm.ts は new Audio() を使い DOM に挿さないので、生成を捕まえてから読み込む
await page.addInitScript(`(() => {
  const Native = window.Audio
  window.__audios = []
  window.Audio = function (...args) {
    const a = new Native(...args)
    window.__audios.push(a)
    return a
  }
  window.Audio.prototype = Native.prototype
})()`)
await page.goto(`${base}/?enemy=oni&seed=hygiene-audio`)
await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
await page.waitForTimeout(500)
// ユーザー操作を1回（自動再生の再試行を起こす）
await page.locator('button', { hasText: 'わかった' }).first().click({ timeout: 8000 }).catch(() => {})
await page.waitForTimeout(2500)

const state = await page.evaluate(async () => {
  const els = window.__audios ?? []
  const probe = document.createElement('audio')
  const info = els.map((a) => ({
    src: a.currentSrc || a.src,
    loop: a.loop,
    volume: a.volume,
    muted: a.muted,
    paused: a.paused,
    readyState: a.readyState,
    duration: Number.isFinite(a.duration) ? +a.duration.toFixed(2) : null,
    currentTime: +a.currentTime.toFixed(2),
    error: a.error ? a.error.code : null,
  }))
  return {
    canPlay: {
      webmOpus: probe.canPlayType('audio/webm; codecs="opus"'),
      mp3: probe.canPlayType('audio/mpeg'),
    },
    audios: info,
  }
})
await page.waitForTimeout(1500)
const after = await page.evaluate(() =>
  (window.__audios ?? []).map((a) => ({ src: (a.currentSrc || a.src).split('/').pop(), t: +a.currentTime.toFixed(2), paused: a.paused })),
)

console.log('canPlayType:', JSON.stringify(state.canPlay))
for (const a of state.audios) {
  console.log(`audio ${a.src.split('/').pop()} loop=${a.loop} volume=${a.volume} muted=${a.muted} paused=${a.paused} readyState=${a.readyState} duration=${a.duration}s t=${a.currentTime}s error=${a.error}`)
}
console.log('1.5s 後:', JSON.stringify(after))
console.log('advanced (再生が進んでいる):', after.some((a, i) => a.t > (state.audios[i]?.currentTime ?? 0)))
console.log('failed requests:', failed.length ? failed : 'none')
console.log('js errors:', errors.length ? errors : 'none')
// フォールバック経路：WebM/Opus を再生できない環境（Safari 17.4 未満相当）を作り、
// MP3 が選ばれて鳴ることを確かめる
const ctx2 = await browser.newContext({ viewport: { width: 1508, height: 660 } })
const page2 = await ctx2.newPage()
const errors2 = []
page2.on('pageerror', (e) => errors2.push(String(e)))
await page2.addInitScript(`(() => {
  const Native = window.Audio
  window.__audios = []
  window.Audio = function (...args) { const a = new Native(...args); window.__audios.push(a); return a }
  window.Audio.prototype = Native.prototype
  const origin = HTMLMediaElement.prototype.canPlayType
  HTMLMediaElement.prototype.canPlayType = function (t) { return /webm/i.test(t) ? '' : origin.call(this, t) }
})()`)
await page2.goto(`${base}/?enemy=oni&seed=hygiene-audio-fallback`)
await page2.waitForSelector('.home-cta-primary', { timeout: 30000 })
await page2.waitForTimeout(500)
await page2.locator('button', { hasText: 'わかった' }).first().click({ timeout: 8000 }).catch(() => {})
await page2.waitForTimeout(2500)
const fb = await page2.evaluate(() => (window.__audios ?? []).map((a) => ({ src: (a.currentSrc || a.src).split('/').pop(), loop: a.loop, volume: a.volume, paused: a.paused, duration: Number.isFinite(a.duration) ? +a.duration.toFixed(2) : null, error: a.error ? a.error.code : null })))
console.log('fallback（WebM を再生できない環境）:', JSON.stringify(fb), 'errors', errors2.length)
await browser.close()

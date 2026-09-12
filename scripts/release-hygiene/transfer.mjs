// Release Hygiene Gate：実際に転送されるバイト数の計測（Before/After 比較用）。
//   PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/release-hygiene/transfer.mjs <outJson> [baseUrl] [--tag before|after]
//
// ①初回ロード（ホームが出るまで）②戦闘開始まで の2区間で、種別ごとの転送量を数える。
// 音声は「どの形式が選ばれたか」も記録する（Opus/WebM を選べない環境では MP3 になる）。
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const out = args[0]
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:5173'
const tag = args.includes('--tag') ? args[args.indexOf('--tag') + 1] : 'after'
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const kind = (url) => {
  if (/\.(mp3|webm|wav|m4a|ogg)(\?|$)/.test(url)) return 'audio'
  if (/\.(png|jpe?g|webp|gif|svg|avif)(\?|$)/.test(url)) return 'image'
  if (/\.css(\?|$)/.test(url)) return 'css'
  if (/\.(js|mjs|ts|tsx)(\?|$)/.test(url)) return 'js'
  if (/\/$|\.html(\?|$)/.test(url)) return 'html'
  return 'other'
}

const browser = await chromium.launch()
const rows = []
for (const [id, viewport, mobile] of [
  ['pc', { width: 1508, height: 660 }, false],
  ['sp', { width: 390, height: 760 }, true],
]) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile })
  const page = await ctx.newPage()
  const seen = []
  page.on('response', async (res) => {
    const url = res.url()
    if (!url.startsWith(base)) return
    let size = 0
    try {
      const h = res.headers()
      size = Number(h['content-length'] ?? 0)
      if (!size) size = (await res.body().catch(() => Buffer.alloc(0))).length
    } catch {
      /* 取得できないものは 0 として扱う */
    }
    seen.push({ url: url.replace(base, ''), kind: kind(url), size, at: Date.now() })
  })
  const t0 = Date.now()
  await page.goto(`${base}/?enemy=oni&seed=hygiene-transfer`, { waitUntil: 'load' })
  await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
  await page.waitForTimeout(2500)
  const loadMs = Date.now() - t0
  const afterHome = seen.length
  const click = async (t) => {
    const l = page.locator('button', { hasText: t }).first()
    if (await l.count()) await l.click({ timeout: 8000 }).catch(() => {})
  }
  await click('わかった')
  await page.waitForTimeout(300)
  await click('神を選ぶ')
  await page.waitForTimeout(900)
  await click('新しく始める')
  await page.waitForTimeout(300)
  await click('大耀')
  await page.waitForTimeout(400)
  await click('この構成で始める')
  await page.waitForTimeout(600)
  await click('業斧の鬼将')
  await page.waitForTimeout(700)
  await click('この構成でバトル開始')
  await page.waitForSelector('.hand .card-view', { timeout: 15000 })
  await page.waitForTimeout(3000)
  const battleMs = Date.now() - t0

  const sum = (list) => list.reduce((a, r) => a + r.size, 0)
  const byKind = (list) => {
    const o = {}
    for (const r of list) o[r.kind] = (o[r.kind] ?? 0) + r.size
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, +(v / 1048576).toFixed(3)]))
  }
  const initial = seen.slice(0, afterHome)
  rows.push({
    tag,
    vp: id,
    loadMs,
    battleMs,
    initialMb: +(sum(initial) / 1048576).toFixed(3),
    initialByKind: byKind(initial),
    initialRequests: initial.length,
    toBattleMb: +(sum(seen) / 1048576).toFixed(3),
    toBattleByKind: byKind(seen),
    toBattleRequests: seen.length,
    audioFiles: seen.filter((r) => r.kind === 'audio').map((r) => `${r.url} ${(r.size / 1048576).toFixed(2)}MB`),
  })
  await ctx.close()
}
await browser.close()
if (out) writeFileSync(out, JSON.stringify(rows, null, 1))
for (const r of rows) {
  console.log(
    `[${r.tag}] ${r.vp}: initial ${r.initialMb}MB (${r.initialRequests} req, ${JSON.stringify(r.initialByKind)}) / to battle ${r.toBattleMb}MB (${r.toBattleRequests} req, ${JSON.stringify(r.toBattleByKind)}) load ${r.loadMs}ms battle ${r.battleMs}ms`,
  )
  console.log('   audio:', r.audioFiles.join(' | ') || '(none)')
}

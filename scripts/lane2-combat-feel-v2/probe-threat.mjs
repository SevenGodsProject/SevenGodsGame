// Lane2 Enemy Break v1 × Lane1 Threat Branch Pilot v1（軍略・enemy_09）の組み合わせ実測プローブ（Playwright headless）。
//   node scripts/lane2-combat-feel-v2/probe-threat.mjs <outDir> <baseUrl>
//   env: CF2_VIEWPORTS=pc,sp375  CF2T_SEEDS=cf2-threat-01,cf2-threat-02,...  CF2T_MAX_ROUNDS=4
// 大耀 × 業斧の鬼将・軍略（?pilot=threat&seed=…・決定論）を「使える札を左から使う→ラウンドを終える」で R4 開始まで進め、
// 各カードの着弾ごとに rAF で DOM を標本化する：
//   ・Enemy Break（cf2-* animation）の開始時刻・長さ、同時に走っている予告の呼吸グロー（arena-glow-breathe）
//   ・崩れの間の予告文言（.intent）の不変・矩形の viewport 内・名札との位置関係
//   ・操作ロック：カードを押してから「ラウンドを終える」ボタンが再び押せるまでの時刻（崩れの再生中に操作が戻るか）
//   ・帯が R3 でまたがれた手では、ボタンが戻った瞬間にラウンドを終え、R4 の予告へ切り替わる時刻と崩れの残り（最悪ケース＝即操作）
// 評価はしない（数値と撮影のみ）。JS error も記録する。docs/LANE2_ENEMY_BREAK_X_THREAT_AUDIT.md の証跡用。
import { mkdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const outDir = args[0] ?? 'docs/evidence/combat-feel-v2/threat-combo'
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:4197'
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const ONLY = (process.env.CF2_VIEWPORTS ?? 'pc,sp375').split(',')
const SEEDS = (process.env.CF2T_SEEDS ?? 'cf2-threat-01,cf2-threat-02,cf2-threat-03').split(',')
const MAX_ROUNDS = Number(process.env.CF2T_MAX_ROUNDS ?? 4)
const VIEWPORTS = [
  { id: 'pc', viewport: { width: 1508, height: 660 } },
  { id: 'sp375', viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
].filter((v) => ONLY.includes(v.id))
const PILOT_NAME = '業斧の鬼将・軍略'

async function clickText(page, text, timeout = 8000) {
  await page.getByRole('button', { name: text }).first().click({ timeout })
}
async function maybeClick(page, text) {
  const l = page.getByRole('button', { name: text }).first()
  if (await l.isVisible().catch(() => false)) await l.click({ timeout: 3000 }).catch(() => {})
}

/** ページ内の標本化（rAF）。cf2 animation・予告・ロック状態を毎フレーム記録する */
const SAMPLER = () => {
  const rect = (el) => {
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }
  }
  const state = { frames: [], t0: performance.now(), running: true }
  window.__cf2t = state
  const loop = () => {
    if (!state.running) return
    const t = Math.round(performance.now() - state.t0)
    const panel = document.querySelector('.enemy-panel')
    const intent = document.querySelector('.enemy-plate .intent')
    const plate = document.querySelector('.enemy-plate')
    const collapse = document.querySelector('.enemy-collapse')
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('ラウンドを終える'))
    const anims = document.getAnimations().map((a) => ({
      name: a.animationName ?? '',
      pseudo: a.effect?.pseudoElement ?? null,
      target: a.effect?.target?.className?.toString?.().slice(0, 40) ?? '',
      state: a.playState,
    }))
    const cf2 = anims.filter((a) => a.name.startsWith('cf2-') && a.state === 'running').map((a) => a.name)
    const paused = anims.some((a) => a.state === 'paused')
    const breathe = anims.filter((a) => a.name === 'arena-glow-breathe' && a.state === 'running' && a.target.includes('intent')).length
    state.frames.push({
      t,
      band: panel ? (panel.className.match(/enemy-band-(\w+)/) || [])[1] ?? null : null,
      breakClass: panel ? (panel.className.match(/cf2-break-(\w+)/) || [])[1] ?? null : null,
      cf2,
      paused,
      breathe,
      intentText: intent?.textContent?.trim() ?? '',
      intentClass: intent?.className ?? '',
      intentRect: rect(intent),
      plateRect: rect(plate),
      plateAfterOpacity: plate ? Number(getComputedStyle(plate, '::after').opacity) : null,
      collapseTransform: collapse ? getComputedStyle(collapse).transform : null,
      btnDisabled: btn ? btn.disabled : null,
      enabledCards: document.querySelectorAll('.hand .card-view:not([disabled])').length,
      handPointer: document.querySelector('.hand') ? getComputedStyle(document.querySelector('.hand')).pointerEvents : null,
      hp: document.querySelector('.enemy-plate .hp-bar')?.textContent?.trim().slice(0, 16) ?? '',
      vw: innerWidth,
      vh: innerHeight,
      scrollW: document.documentElement.scrollWidth,
    })
    if (state.frames.length > 400) state.frames.shift()
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}
const stopSampler = (page) =>
  page.evaluate(() => {
    const s = window.__cf2t
    s.running = false
    return s.frames
  })

const roundOf = (page) => page.evaluate(() => Number((document.body.innerText.match(/ラウンド\s*(\d)/) || [])[1] ?? 0))
const intentOf = (page) => page.locator('.enemy-plate .intent').first().innerText().catch(() => '')
const bandOf = (page) => page.evaluate(() => (document.querySelector('.enemy-panel')?.className.match(/enemy-band-(\w+)/) || [])[1] ?? null)
const hpOf = (page) => page.locator('.enemy-plate .hp-bar').first().innerText().catch(() => '')

/** 崩れの最深部（名札 12%・体 20%）で全 animation を止めて撮影し、再開する */
async function shotAtBreak(page, path) {
  const ok = await page
    .waitForFunction(() => document.getAnimations().some((a) => (a.animationName ?? '').startsWith('cf2-')), null, { timeout: 2600 })
    .then(() => true)
    .catch(() => false)
  if (!ok) return null
  const info = await page.evaluate(() => {
    const names = []
    for (const a of document.getAnimations()) {
      const name = a.animationName ?? ''
      if (name.startsWith('cf2-')) {
        const dur = Number(a.effect?.getComputedTiming().duration ?? 0)
        a.currentTime = dur * (name.startsWith('cf2-plate') ? 0.12 : 0.2)
        names.push(name + '@' + dur)
      }
      a.pause()
    }
    const plate = document.querySelector('.enemy-plate')
    const intent = document.querySelector('.enemy-plate .intent')
    const cs = intent ? getComputedStyle(intent) : null
    return {
      cf2Animations: names,
      plateAfterOpacity: plate ? getComputedStyle(plate, '::after').opacity : null,
      plateAfterBg: plate ? getComputedStyle(plate, '::after').backgroundImage.slice(0, 120) : null,
      intentText: intent?.textContent?.trim() ?? '',
      intentColor: cs?.color ?? null,
      intentFontSize: cs?.fontSize ?? null,
      intentGlowOpacity: intent ? getComputedStyle(intent, '::after').opacity : null,
      collapseTransform: getComputedStyle(document.querySelector('.enemy-collapse')).transform,
    }
  })
  await page.screenshot({ path })
  await page.evaluate(() => { for (const a of document.getAnimations()) a.play() })
  return info
}

/** 1 手ぶんの標本から時刻を集計する */
function summarize(frames) {
  const first = (pred) => frames.find(pred)
  const breakStart = first((f) => f.cf2.length > 0)
  const breakEnd = breakStart ? [...frames].reverse().find((f) => f.cf2.length > 0) : null
  const unlock = first((f) => f.btnDisabled === false && f.t > 30)
  const unlockCards = first((f) => f.enabledCards > 0 && f.t > 30)
  const breakFrames = frames.filter((f) => f.cf2.length > 0)
  // 撮影（shotAtBreak）で全 animation を一時停止している区間は崩れの長さに数えない
  const pausedFrames = frames.filter((f) => f.paused)
  const pausedSpanMs = pausedFrames.length > 0 ? pausedFrames.at(-1).t - pausedFrames[0].t : 0
  const breakActiveMs = breakStart && breakEnd ? breakEnd.t - breakStart.t - pausedSpanMs : null
  const intentTexts = [...new Set(breakFrames.map((f) => f.intentText))]
  const peakPlate = Math.max(0, ...breakFrames.map((f) => f.plateAfterOpacity ?? 0))
  const intentOff = breakFrames.filter((f) => f.intentRect && !(f.intentRect.x >= 0 && f.intentRect.y >= 0 && f.intentRect.x + f.intentRect.w <= f.vw && f.intentRect.y + f.intentRect.h <= f.vh)).length
  const bothGlow = breakFrames.filter((f) => f.breathe > 0 && f.cf2.some((n) => n.startsWith('cf2-plate'))).length
  const scrollOver = frames.filter((f) => f.scrollW > f.vw).length
  const handPointerNone = breakFrames.filter((f) => f.handPointer === 'none').length
  return {
    frames: frames.length,
    breakStartMs: breakStart?.t ?? null,
    breakEndMs: breakEnd?.t ?? null,
    pausedSpanMs,
    breakActiveMs,
    breakNames: [...new Set(breakFrames.flatMap((f) => f.cf2))],
    unlockBtnMs: unlock?.t ?? null,
    unlockCardsMs: unlockCards?.t ?? null,
    unlockedBeforeBreakEnd: breakEnd && unlock ? unlock.t < breakEnd.t : null,
    intentTextsDuringBreak: intentTexts,
    intentChargeDuringBreak: breakFrames.some((f) => f.intentClass.includes('intent-tier-charge')),
    chargeGlowAndFlashSameFrames: bothGlow,
    peakPlateAfterOpacity: peakPlate,
    intentOffViewportFrames: intentOff,
    handPointerNoneFramesDuringBreak: handPointerNone,
    horizontalScrollFrames: scrollOver,
    bandAtEnd: frames.at(-1)?.band ?? null,
  }
}

mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch()
const results = []
for (const vp of VIEWPORTS) {
  for (const seed of SEEDS) {
    const context = await browser.newContext(vp)
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
    const url = `${base}/?pilot=threat&seed=${seed}`
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
    await page.goto(url, { waitUntil: 'networkidle' })
    await maybeClick(page, 'わかった')
    await clickText(page, '神を選ぶ')
    await maybeClick(page, '新しく始める')
    await clickText(page, '大耀')
    await clickText(page, 'この構成で始める')
    await page.getByText('挑む敵を選ぼう').first().waitFor({ timeout: 8000 })
    await page.getByRole('button', { name: new RegExp(PILOT_NAME) }).first().click({ timeout: 8000 })
    await clickText(page, 'この構成でバトル開始')
    await page.waitForTimeout(600)
    await page.keyboard.press('Escape').catch(() => {})
    await page.getByRole('button', { name: 'ラウンドを終える' }).first().waitFor({ timeout: 25000 })
    await page.waitForTimeout(1200)
    const enemyName = await page.locator('.enemy-panel .panel-title').first().innerText().catch(() => '')
    const rounds = []
    const plays = []
    let finished = false
    let immediateEnd = null
    for (let guard = 0; guard < 40 && !finished; guard++) {
      const round = await roundOf(page)
      if (round > MAX_ROUNDS || round === 0) break
      if (!rounds.some((r) => r.round === round)) {
        rounds.push({ round, intent: await intentOf(page), band: await bandOf(page), hp: await hpOf(page) })
        if (round === 3 || round === 4) await page.screenshot({ path: `${outDir}/${vp.id}-${seed}-r${round}-start.png` })
      }
      const card = page.locator('.hand .card-view:not([disabled])').first()
      const hasCard = await card.isVisible().catch(() => false)
      if (hasCard) {
        const name = (await card.locator('.card-view-name').innerText().catch(() => '')).trim()
        const bandBefore = await bandOf(page)
        await page.evaluate(SAMPLER)
        await card.click({ timeout: 5000, force: true })
        let shot = null
        if (bandBefore !== 'quarter') shot = await shotAtBreak(page, `${outDir}/${vp.id}-${seed}-r${round}-break.png`)
        const crossed = (await bandOf(page)) !== bandBefore
        if (crossed && round === 3 && immediateEnd === null) {
          // 最悪ケース：帯をまたいだ直後、ボタンが戻った瞬間にラウンドを終える → R4 予告への切替時刻と崩れの残りを測る
          await page.waitForFunction(() => {
            const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.includes('ラウンドを終える'))
            return b && !b.disabled
          }, null, { timeout: 3000 }).catch(() => {})
          const tClick = await page.evaluate(() => Math.round(performance.now() - window.__cf2t.t0))
          const intentBefore = await intentOf(page)
          await page.getByRole('button', { name: 'ラウンドを終える' }).first().click({ timeout: 3000 }).catch(() => {})
          await page.waitForFunction((prev) => (document.querySelector('.enemy-plate .intent')?.textContent ?? '') !== prev, intentBefore, { timeout: 6000 }).catch(() => {})
          await page.waitForTimeout(300)
          const frames = await stopSampler(page)
          const change = frames.find((f) => f.t > tClick && f.intentText !== intentBefore)
          const lastBreak = [...frames].reverse().find((f) => f.cf2.length > 0)
          immediateEnd = {
            round,
            card: name,
            endClickMs: tClick,
            intentBefore,
            intentChangeMs: change?.t ?? null,
            intentAfter: change?.intentText ?? null,
            breakEndMs: lastBreak?.t ?? null,
            breakStillRunningAtIntentChange: change && lastBreak ? lastBreak.t > change.t : false,
            breakRunningAtClick: frames.some((f) => f.t >= tClick && f.t <= tClick + 50 && f.cf2.length > 0),
            r4Intent: await intentOf(page),
            r4Band: await bandOf(page),
          }
          plays.push({ round, card: name, bandBefore, bandAfter: immediateEnd.r4Band, shot, ...summarize(frames), immediateEnd: true })
          await page.waitForTimeout(2200)
          continue
        }
        await page.waitForTimeout(1600)
        const frames = await stopSampler(page)
        plays.push({ round, card: name, bandBefore, bandAfter: await bandOf(page), shot, ...summarize(frames) })
      } else {
        const btn = page.getByRole('button', { name: 'ラウンドを終える' }).first()
        if (!(await btn.isVisible().catch(() => false))) break
        await btn.click({ timeout: 5000 }).catch(() => {})
        await page.waitForTimeout(2600)
      }
      const over = await page.getByRole('button', { name: /もう一度|ホームへ|結果へ進む/ }).first().isVisible().catch(() => false)
      if (over) finished = true
    }
    if (!rounds.some((r) => r.round === 4)) {
      const round = await roundOf(page)
      if (round === 4) rounds.push({ round, intent: await intentOf(page), band: await bandOf(page), hp: await hpOf(page) })
    }
    await page.screenshot({ path: `${outDir}/${vp.id}-${seed}-end.png` })
    results.push({ viewport: vp.id, seed, enemyName, rounds, plays, immediateEnd, finished, errors })
    await context.close()
  }
}
// 500KB 超の撮影は WebP へ（Chromium の canvas で変換・PNG は削除）。既存 evidence の慣例に合わせる
{
  const { readdirSync, statSync, readFileSync, unlinkSync } = await import('node:fs')
  const page = await (await browser.newContext()).newPage()
  for (const f of readdirSync(outDir)) {
    if (!f.endsWith('.png')) continue
    const p = `${outDir}/${f}`
    if (statSync(p).size <= 500 * 1024) continue
    const dataUrl = 'data:image/png;base64,' + readFileSync(p).toString('base64')
    const webp = await page.evaluate(async (src) => {
      const img = new Image()
      img.src = src
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      c.getContext('2d').drawImage(img, 0, 0)
      return c.toDataURL('image/webp', 0.82)
    }, dataUrl)
    writeFileSync(p.replace(/\.png$/, '.webp'), Buffer.from(webp.split(',')[1], 'base64'))
    unlinkSync(p)
  }
}
await browser.close()

const summary = {
  base,
  generatedAt: new Date().toISOString(),
  runs: results.map((r) => {
    const breaks = r.plays.filter((p) => p.breakStartMs !== null)
    return {
      viewport: r.viewport,
      seed: r.seed,
      enemyName: r.enemyName,
      rounds: r.rounds,
      r3Intent: r.rounds.find((x) => x.round === 3)?.intent ?? null,
      r4Intent: r.rounds.find((x) => x.round === 4)?.intent ?? null,
      r4Branch: /断岩/.test(r.rounds.find((x) => x.round === 4)?.intent ?? '') ? 'else' : r.rounds.some((x) => x.round === 4) ? 'then' : null,
      breaks: breaks.map((p) => ({
        round: p.round,
        card: p.card,
        band: `${p.bandBefore}->${p.bandAfter}`,
        names: p.breakNames,
        breakStartMs: p.breakStartMs,
        breakEndMs: p.breakEndMs,
        pausedSpanMs: p.pausedSpanMs,
        breakActiveMs: p.breakActiveMs,
        unlockBtnMs: p.unlockBtnMs,
        unlockCardsMs: p.unlockCardsMs,
        unlockedBeforeBreakEnd: p.unlockedBeforeBreakEnd,
        intentTextsDuringBreak: p.intentTextsDuringBreak,
        intentChargeDuringBreak: p.intentChargeDuringBreak,
        chargeGlowAndFlashSameFrames: p.chargeGlowAndFlashSameFrames,
        peakPlateAfterOpacity: p.peakPlateAfterOpacity,
        intentOffViewportFrames: p.intentOffViewportFrames,
        handPointerNoneFramesDuringBreak: p.handPointerNoneFramesDuringBreak,
        horizontalScrollFrames: p.horizontalScrollFrames,
        shot: p.shot,
      })),
      immediateEnd: r.immediateEnd,
      plays: r.plays.length,
      errors: r.errors.length,
    }
  }),
}
writeFileSync(`${outDir}/probe-threat.json`, JSON.stringify({ summary, results }, null, 2))
writeFileSync(`${outDir}/summary-threat.json`, JSON.stringify(summary, null, 2))
for (const s of summary.runs) {
  console.log(`[${s.viewport}/${s.seed}] ${s.enemyName} R3="${s.r3Intent}" R4="${s.r4Intent}" (${s.r4Branch}) breaks=${JSON.stringify(s.breaks.map((b) => ({ r: b.round, band: b.band, start: b.breakStartMs, end: b.breakEndMs, unlock: b.unlockBtnMs, charge: b.intentChargeDuringBreak, both: b.chargeGlowAndFlashSameFrames })))} immediateEnd=${JSON.stringify(s.immediateEnd)} errors=${s.errors}`)
}

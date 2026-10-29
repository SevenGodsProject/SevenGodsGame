// 将軍家 Pilot v0.4（忠次 enemy_08）× Enemy Break v1 の組み合わせ実測プローブ（Playwright headless）。PM Gate G6(d) 用。
//   node scripts/shogunate-pilot/probe.mjs <outDir> <baseUrl>
//   env: CF2_VIEWPORTS=pc,sp375  SG_SEEDS=sg-v04-01,sg-v04-02,...  SG_MAX_ROUNDS=4
// scripts/lane2-combat-feel-v2/probe-threat.mjs（enemy_09）を enemy_08 向けに複製し、v0.4 固有の観測を足したもの：
//   ・R3 開始時：立ち絵に enemy-avatar-charging-super（必殺充填）が付き、enemy_08 だけ box-shadow none ＋ filter に drop-shadow（赤い輪・v0.3）
//   ・R3 で表示 HP が 50% 帯をまたいだ瞬間：Enemy Break の cf2-break-half 付与と charging-super 除去（予告が then＝⚔ へ切替）が
//     **同じ rAF フレーム**か（halfStartMs ＝ superOffMs）。崩れ中の予告文言の不変・JS error 0・rAF 間隔 p95（SP375 ≤ 33ms の目安）
//   ・R4 の予告：then（⚔120）／else（🔥 軍略・総攻め 240）のどちらに分岐したか（seed で決定論）
// 大耀 × 将軍四天王・忠次（?pilot=shogunate&seed=…）を「使える札を左から使う→ラウンドを終える」で R4 開始まで進める。評価はしない（数値と撮影のみ）。
import { mkdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const outDir = args[0] ?? 'docs/evidence/shogunate-pilot-v04/08-probe'
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:4183'
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const ONLY = (process.env.CF2_VIEWPORTS ?? 'pc,sp375').split(',')
const SEEDS = (process.env.SG_SEEDS ?? 'sg-v04-01,sg-v04-02,sg-v04-03').split(',')
const MAX_ROUNDS = Number(process.env.SG_MAX_ROUNDS ?? 4)
const STRATEGY = process.env.SG_STRATEGY ?? 'damage'
// v0.6：SG_DIFFICULTY=hard で「むずかしい」を選ぶ（既定は従来どおり normal＝v0.5 と同じ進行）
const DIFFICULTY = process.env.SG_DIFFICULTY ?? 'normal'
const DIFFICULTY_LABEL = { easy: 'かんたん', normal: 'ふつう', hard: 'むずかしい' }[DIFFICULTY]
const VIEWPORTS = [
  { id: 'pc', viewport: { width: 1508, height: 660 } },
  { id: 'sp375', viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  // v0.6 W2 修正の確認用（CF2_VIEWPORTS で明示したときだけ）：iPhone SE 級の 320 と iPhone 12〜15 級の 390
  { id: 'sp320', viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { id: 'sp360', viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { id: 'sp390', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
].filter((v) => ONLY.includes(v.id))
const PILOT_NAME = '将軍四天王・忠次'

async function clickText(page, text, timeout = 8000) {
  await page.getByRole('button', { name: text }).first().click({ timeout })
}
async function maybeClick(page, text) {
  const l = page.getByRole('button', { name: text }).first()
  if (await l.isVisible().catch(() => false)) await l.click({ timeout: 3000 }).catch(() => {})
}

/** ページ内の標本化（rAF）。cf2 animation・予告・必殺充填グロー・ロック状態を毎フレーム記録する */
const SAMPLER = () => {
  const rect = (el) => {
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }
  }
  const state = { frames: [], t0: performance.now(), running: true }
  window.__sg = state
  const loop = () => {
    if (!state.running) return
    const t = Math.round(performance.now() - state.t0)
    const panel = document.querySelector('.enemy-panel')
    const intent = document.querySelector('.enemy-plate .intent')
    const plate = document.querySelector('.enemy-plate')
    const collapse = document.querySelector('.enemy-collapse')
    const avatar = document.querySelector('.enemy-avatar')
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('ラウンドを終える'))
    const anims = document.getAnimations().map((a) => ({
      name: a.animationName ?? '',
      target: a.effect?.target?.className?.toString?.().slice(0, 40) ?? '',
      state: a.playState,
    }))
    const cf2 = anims.filter((a) => a.name.startsWith('cf2-') && a.state === 'running').map((a) => a.name)
    const paused = anims.some((a) => a.state === 'paused')
    const breathe = anims.filter((a) => a.name === 'arena-glow-breathe' && a.state === 'running' && a.target.includes('intent')).length
    const avCs = avatar ? getComputedStyle(avatar) : null
    // v0.6：「あと N で総攻めを止める」行（data-state armed／cleared）
    const tl = document.querySelector('[data-testid="tactic-line"]')
    state.frames.push({
      tlState: tl?.getAttribute('data-state') ?? null,
      tlText: tl?.textContent?.trim() ?? null,
      t,
      band: panel ? (panel.className.match(/enemy-band-(\w+)/) || [])[1] ?? null : null,
      breakClass: panel ? (panel.className.match(/cf2-break-(\w+)/) || [])[1] ?? null : null,
      cf2,
      paused,
      breathe,
      chargingSuper: !!avatar && avatar.classList.contains('enemy-avatar-charging-super'),
      charging: !!avatar && avatar.classList.contains('enemy-avatar-charging'),
      avatarBoxShadow: avCs ? avCs.boxShadow.slice(0, 40) : null,
      avatarHasDropShadow: avCs ? /drop-shadow/.test(avCs.filter) : null,
      intentText: intent?.textContent?.trim() ?? '',
      intentClass: intent?.className ?? '',
      intentRect: rect(intent),
      plateAfterOpacity: plate ? Number(getComputedStyle(plate, '::after').opacity) : null,
      collapseTransform: collapse ? getComputedStyle(collapse).transform : null,
      btnDisabled: btn ? btn.disabled : null,
      enabledCards: document.querySelectorAll('.hand .card-view:not([disabled])').length,
      hp: document.querySelector('.enemy-plate .hp-bar')?.textContent?.trim().slice(0, 16) ?? '',
      vw: innerWidth,
      vh: innerHeight,
      scrollW: document.documentElement.scrollWidth,
    })
    if (state.frames.length > 600) state.frames.shift()
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}
const stopSampler = (page) =>
  page.evaluate(() => {
    const s = window.__sg
    s.running = false
    return s.frames
  })

const roundOf = (page) => page.evaluate(() => Number((document.body.innerText.match(/ラウンド\s*(\d)/) || [])[1] ?? 0))
const intentOf = (page) => page.locator('.enemy-plate .intent').first().innerText().catch(() => '')
const bandOf = (page) => page.evaluate(() => (document.querySelector('.enemy-panel')?.className.match(/enemy-band-(\w+)/) || [])[1] ?? null)
const hpOf = (page) => page.locator('.enemy-plate .hp-bar').first().innerText().catch(() => '')
/** v0.6：あと N 行の有無・文言・欠け（名札・viewport の内側か・横の溢れ・行数）を測る */
const tacticLineOf = (page) =>
  page.evaluate(() => {
    const el = document.querySelector('[data-testid="tactic-line"]')
    if (!el) return null
    const r = el.getBoundingClientRect()
    const p = document.querySelector('.enemy-plate')?.getBoundingClientRect()
    const cs = getComputedStyle(el)
    const lh = parseFloat(cs.lineHeight) || 0
    return {
      state: el.getAttribute('data-state'),
      text: el.textContent?.trim() ?? '',
      rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
      insidePlate: !!p && r.left >= p.left - 0.5 && r.right <= p.right + 0.5 && r.top >= p.top - 0.5 && r.bottom <= p.bottom + 0.5,
      insideViewport: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
      overflowX: el.scrollWidth > el.clientWidth + 1,
      lines: lh > 0 ? Math.round((r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 2) / lh) : null,
      fontSize: parseFloat(cs.fontSize),
      visible: cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0 && r.width > 0 && r.height > 0,
      pageScrollW: document.documentElement.scrollWidth,
      vw: innerWidth,
    }
  })
/** v0.6 W2：名札の下端と立ち絵（img の箱／不透明な最初の行＝兜の飾りの先）の上端の重なり量（CSS px・正なら重なり） */
const plateOverlapOf = (page) =>
  page.evaluate(async () => {
    const plate = document.querySelector('.enemy-plate')
    const av = document.querySelector('.enemy-avatar')
    if (!plate || !av) return null
    const p = plate.getBoundingClientRect()
    const r = av.getBoundingClientRect()
    const cs = getComputedStyle(av)
    // 立ち絵は div の background-image（contain・center／center bottom）。同じ当てはめで描いて不透明な最初の行を探す
    let visibleTop = null
    try {
      const url = (cs.backgroundImage.match(/url\("?([^")]+)"?\)/) || [])[1]
      if (url) {
        const im = new Image()
        im.src = url
        await im.decode()
        const w = Math.max(1, Math.round(r.width))
        const h = Math.max(1, Math.round(r.height))
        const scale = Math.min(w / im.naturalWidth, h / im.naturalHeight)
        const dw = im.naturalWidth * scale
        const dh = im.naturalHeight * scale
        const pos = cs.backgroundPosition.split(' ').map((v) => parseFloat(v) / 100)
        const dx = (w - dw) * (Number.isFinite(pos[0]) ? pos[0] : 0.5)
        const dy = (h - dh) * (Number.isFinite(pos[1]) ? pos[1] : 0.5)
        const c = document.createElement('canvas')
        c.width = w
        c.height = h
        const ctx = c.getContext('2d')
        ctx.drawImage(im, dx, dy, dw, dh)
        const data = ctx.getImageData(0, 0, w, h).data
        for (let y = 0; y < h && visibleTop === null; y++) {
          for (let x = 0; x < w; x++) {
            if (data[(y * w + x) * 4 + 3] > 24) { visibleTop = r.top + y; break }
          }
        }
      }
    } catch { visibleTop = null }
    const round1 = (v) => (v === null ? null : Math.round(v * 10) / 10)
    return {
      plateBottom: round1(p.bottom),
      plateH: round1(p.height),
      avatarTop: round1(r.top),
      visibleTop: round1(visibleTop),
      overlapBoxPx: round1(p.bottom - r.top),
      overlapVisiblePx: visibleTop === null ? null : round1(p.bottom - visibleTop),
    }
  })
const glowOf = (page) =>
  page.evaluate(() => {
    const av = document.querySelector('.enemy-avatar')
    if (!av) return null
    const cs = getComputedStyle(av)
    return {
      chargingSuper: av.classList.contains('enemy-avatar-charging-super'),
      charging: av.classList.contains('enemy-avatar-charging'),
      boxShadow: cs.boxShadow.slice(0, 60),
      filter: cs.filter.slice(0, 220),
      dropShadowCount: (cs.filter.match(/drop-shadow\(/g) ?? []).length,
      dataEnemy: document.querySelector('.enemy-panel')?.getAttribute('data-enemy') ?? null,
    }
  })

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
    const av = document.querySelector('.enemy-avatar')
    const cs = intent ? getComputedStyle(intent) : null
    return {
      cf2Animations: names,
      plateAfterOpacity: plate ? getComputedStyle(plate, '::after').opacity : null,
      intentText: intent?.textContent?.trim() ?? '',
      intentColor: cs?.color ?? null,
      chargingSuper: !!av && av.classList.contains('enemy-avatar-charging-super'),
      avatarFilter: av ? getComputedStyle(av).filter.slice(0, 160) : null,
      collapseTransform: getComputedStyle(document.querySelector('.enemy-collapse')).transform,
    }
  })
  await page.screenshot({ path })
  await page.evaluate(() => { for (const a of document.getAnimations()) a.play() })
  return info
}

const p95 = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] }

/** 1 手ぶんの標本から時刻を集計する */
function summarize(frames) {
  const first = (pred) => frames.find(pred)
  const breakStart = first((f) => f.cf2.length > 0)
  const breakEnd = breakStart ? [...frames].reverse().find((f) => f.cf2.length > 0) : null
  const unlock = first((f) => f.btnDisabled === false && f.t > 30)
  const breakFrames = frames.filter((f) => f.cf2.length > 0)
  const pausedFrames = frames.filter((f) => f.paused)
  const pausedSpanMs = pausedFrames.length > 0 ? pausedFrames.at(-1).t - pausedFrames[0].t : 0
  const breakActiveMs = breakStart && breakEnd ? breakEnd.t - breakStart.t - pausedSpanMs : null
  const intentTexts = [...new Set(breakFrames.map((f) => f.intentText))]
  const intentOff = breakFrames.filter((f) => f.intentRect && !(f.intentRect.x >= 0 && f.intentRect.y >= 0 && f.intentRect.x + f.intentRect.w <= f.vw && f.intentRect.y + f.intentRect.h <= f.vh)).length
  const scrollOver = frames.filter((f) => f.scrollW > f.vw).length
  // v0.4 固有：帯 high→half の最初のフレームと、必殺充填（charging-super）が外れた最初のフレーム
  const halfIdx = frames.findIndex((f, i) => f.breakClass === 'half' && (i === 0 || frames[i - 1].breakClass !== 'half'))
  const superOffIdx = frames.findIndex((f, i) => i > 0 && frames[i - 1].chargingSuper && !f.chargingSuper)
  const superOnAtStart = frames[0]?.chargingSuper ?? null
  // v0.6：あと N 行が armed→cleared に変わった最初のフレーム（赤い輪の消失と同フレームか）
  const tlClearIdx = frames.findIndex((f, i) => i > 0 && frames[i - 1].tlState === 'armed' && f.tlState === 'cleared')
  const tlTexts = [...new Set(frames.map((f) => f.tlText).filter((x) => x !== null))]
  const deltas = frames.slice(1).map((f, i) => f.t - frames[i].t).filter((d) => d >= 0)
  // 撮影で animation を止めた区間（paused）は rAF 間隔の統計から外す
  const deltasLive = frames.slice(1).map((f, i) => (f.paused || frames[i].paused ? null : f.t - frames[i].t)).filter((d) => d !== null && d >= 0)
  return {
    frames: frames.length,
    breakStartMs: breakStart?.t ?? null,
    breakEndMs: breakEnd?.t ?? null,
    pausedSpanMs,
    breakActiveMs,
    breakNames: [...new Set(breakFrames.flatMap((f) => f.cf2))],
    unlockBtnMs: unlock?.t ?? null,
    intentTextsDuringBreak: intentTexts,
    intentChargeDuringBreak: breakFrames.some((f) => f.intentClass.includes('intent-tier-charge')),
    intentOffViewportFrames: intentOff,
    horizontalScrollFrames: scrollOver,
    bandAtEnd: frames.at(-1)?.band ?? null,
    superOnAtStart,
    halfStartMs: halfIdx >= 0 ? frames[halfIdx].t : null,
    halfStartFrame: halfIdx >= 0 ? halfIdx : null,
    superOffMs: superOffIdx >= 0 ? frames[superOffIdx].t : null,
    superOffFrame: superOffIdx >= 0 ? superOffIdx : null,
    halfAndSuperOffSameFrame: halfIdx >= 0 && superOffIdx >= 0 ? halfIdx === superOffIdx : null,
    superOffMinusHalfMs: halfIdx >= 0 && superOffIdx >= 0 ? frames[superOffIdx].t - frames[halfIdx].t : null,
    tacticLineTexts: tlTexts,
    tacticLineClearMs: tlClearIdx >= 0 ? frames[tlClearIdx].t : null,
    tacticLineClearAndSuperOffSameFrame: tlClearIdx >= 0 && superOffIdx >= 0 ? tlClearIdx === superOffIdx : null,
    tacticLineClearAndHalfSameFrame: tlClearIdx >= 0 && halfIdx >= 0 ? tlClearIdx === halfIdx : null,
    dropShadowAtStart: frames[0]?.avatarHasDropShadow ?? null,
    boxShadowAtStart: frames[0]?.avatarBoxShadow ?? null,
    rafP95Ms: p95(deltas),
    rafP95LiveMs: p95(deltasLive),
    rafMaxLiveMs: deltasLive.length ? Math.max(...deltasLive) : null,
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
    const url = `${base}/?pilot=shogunate&seed=${seed}`
    const rounds = []
    const plays = []
    let enemyName = ''
    let finished = false
    let immediateEnd = null
    let crashed = null
    try {
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
    await page.goto(url, { waitUntil: 'networkidle' })
    await maybeClick(page, 'わかった')
    await clickText(page, '神を選ぶ')
    await maybeClick(page, '新しく始める')
    await clickText(page, '大耀')
    // 難易度は role="radio" のボタン（GodSelectScreen）
    if (DIFFICULTY !== 'normal') await page.getByRole('radio', { name: new RegExp(DIFFICULTY_LABEL) }).first().click({ timeout: 5000 })
    await clickText(page, 'この構成で始める')
    await page.getByText('挑む敵を選ぼう').first().waitFor({ timeout: 8000 })
    await page.getByRole('button', { name: new RegExp(PILOT_NAME) }).first().click({ timeout: 8000 })
    await clickText(page, 'この構成でバトル開始')
    await page.waitForTimeout(600)
    await page.keyboard.press('Escape').catch(() => {})
    await page.getByRole('button', { name: 'ラウンドを終える' }).first().waitFor({ timeout: 25000 })
    await page.waitForTimeout(1200)
    enemyName = await page.locator('.enemy-panel .panel-title').first().innerText().catch(() => '')
    for (let guard = 0; guard < 40 && !finished; guard++) {
      const round = await roundOf(page)
      if (round > MAX_ROUNDS || round === 0) break
      if (!rounds.some((r) => r.round === round)) {
        if (round === 3) await page.waitForTimeout(500)
        rounds.push({ round, intent: await intentOf(page), band: await bandOf(page), hp: await hpOf(page), glow: await glowOf(page), tacticLine: await tacticLineOf(page), plateOverlap: await plateOverlapOf(page) })
        if (round === 3 || round === 4) await page.screenshot({ path: `${outDir}/${vp.id}-${seed}-r${round}-start.png` })
      }
      // 札の選び方（SG_STRATEGY）：damage＝使える札のうち「敵に N ダメージ」の N が最大の札（R3 までに 50% 帯をまたぐ経路を作る）／
      // first＝左から（probe-threat.mjs と同じ）。どちらも決定論（seed 固定・同じ手順なら同じ進行）
      const pickIdx = await page.evaluate((strategy) => {
        const cards = [...document.querySelectorAll('.hand .card-view:not([disabled])')]
        if (cards.length === 0) return -1
        if (strategy !== 'damage') return 0
        let best = 0
        let bestDmg = -1
        cards.forEach((c, i) => {
          const m = (c.textContent ?? '').match(/敵に\s*([\d,]+)\s*ダメージ/)
          const dmg = m ? Number(m[1].replace(/,/g, '')) : 0
          if (dmg > bestDmg) { bestDmg = dmg; best = i }
        })
        return best
      }, STRATEGY)
      const card = page.locator('.hand .card-view:not([disabled])').nth(Math.max(0, pickIdx))
      const hasCard = pickIdx >= 0 && (await card.isVisible().catch(() => false))
      if (hasCard) {
        const name = (await card.locator('.card-view-name').innerText().catch(() => '')).trim()
        const bandBefore = await bandOf(page)
        await page.evaluate(SAMPLER)
        // headless shell で click 後の「scheduled navigations」待ちが稀に 5s を超えるため、待たずに次の観測へ進む
        await card.click({ timeout: 5000, force: true, noWaitAfter: true }).catch((e) => errors.push('card click: ' + String(e).split('\n')[0]))
        let shot = null
        if (bandBefore !== 'quarter') shot = await shotAtBreak(page, `${outDir}/${vp.id}-${seed}-r${round}-break.png`)
        const crossed = (await bandOf(page)) !== bandBefore
        if (crossed && round === 3 && immediateEnd === null) {
          await page.waitForFunction(() => {
            const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.includes('ラウンドを終える'))
            return b && !b.disabled
          }, null, { timeout: 3000 }).catch(() => {})
          const tClick = await page.evaluate(() => Math.round(performance.now() - window.__sg.t0))
          const intentBefore = await intentOf(page)
          const glowBeforeEnd = await glowOf(page)
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
            glowBeforeEnd,
            intentChangeMs: change?.t ?? null,
            intentAfter: change?.intentText ?? null,
            breakEndMs: lastBreak?.t ?? null,
            breakStillRunningAtIntentChange: change && lastBreak ? lastBreak.t > change.t : false,
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
      if (round === 4) rounds.push({ round, intent: await intentOf(page), band: await bandOf(page), hp: await hpOf(page), glow: await glowOf(page), tacticLine: await tacticLineOf(page) })
    }
    await page.screenshot({ path: `${outDir}/${vp.id}-${seed}-end.png` })
    } catch (e) {
      // 1 run の例外で全体を落とさない（部分結果を残す）。原因は errors と crashed に記録する
      crashed = String(e).split('\n')[0]
      errors.push('run crashed: ' + crashed)
      await page.screenshot({ path: `${outDir}/${vp.id}-${seed}-crash.png` }).catch(() => {})
    }
    results.push({ viewport: vp.id, seed, strategy: STRATEGY, enemyName, rounds, plays, immediateEnd, finished, crashed, errors })
    await context.close().catch(() => {})
  }
}
// 500KB 超の撮影は WebP へ（Chromium の canvas で変換・PNG は削除）
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
    const r3 = r.rounds.find((x) => x.round === 3)
    const r4 = r.rounds.find((x) => x.round === 4)
    const r3Plays = r.plays.filter((p) => p.round === 3)
    const liveP95 = r.plays.map((p) => p.rafP95LiveMs).filter((x) => x !== null)
    return {
      viewport: r.viewport,
      seed: r.seed,
      enemyName: r.enemyName,
      rounds: r.rounds,
      r3Intent: r3?.intent ?? null,
      r3Glow: r3?.glow ?? null,
      r4Intent: r4?.intent ?? null,
      r4Branch: /総攻め/.test(r4?.intent ?? '') ? 'else' : r4 ? 'then' : null,
      r3HalfCrossing: r3Plays.find((p) => p.halfStartMs !== null) ?? null,
      breaks: breaks.map((p) => ({
        round: p.round,
        card: p.card,
        band: `${p.bandBefore}->${p.bandAfter}`,
        names: p.breakNames,
        breakStartMs: p.breakStartMs,
        breakEndMs: p.breakEndMs,
        breakActiveMs: p.breakActiveMs,
        unlockBtnMs: p.unlockBtnMs,
        intentTextsDuringBreak: p.intentTextsDuringBreak,
        intentChargeDuringBreak: p.intentChargeDuringBreak,
        intentOffViewportFrames: p.intentOffViewportFrames,
        horizontalScrollFrames: p.horizontalScrollFrames,
        superOnAtStart: p.superOnAtStart,
        halfStartMs: p.halfStartMs,
        superOffMs: p.superOffMs,
        halfAndSuperOffSameFrame: p.halfAndSuperOffSameFrame,
        superOffMinusHalfMs: p.superOffMinusHalfMs,
        shot: p.shot,
      })),
      difficulty: DIFFICULTY,
      // v0.6：ラウンド開始時の「あと N」行（R3 だけに出るか・欠けないか）と、armed→cleared の同フレーム性
      tacticLineByRound: r.rounds.map((x) => ({ round: x.round, line: x.tacticLine ?? null })),
      // v0.6 W2：ラウンドごとの名札↔立ち絵の重なり（R1・R2＝行なしの基準、R3＝「あと N」あり）
      plateOverlapByRound: r.rounds.map((x) => ({ round: x.round, ...(x.plateOverlap ?? {}) })),
      tacticLineClears: r.plays.filter((p) => p.tacticLineClearMs !== null).map((p) => ({ round: p.round, card: p.card, clearMs: p.tacticLineClearMs, superOffMs: p.superOffMs, halfStartMs: p.halfStartMs, sameFrameAsSuperOff: p.tacticLineClearAndSuperOffSameFrame, sameFrameAsHalf: p.tacticLineClearAndHalfSameFrame, texts: p.tacticLineTexts })),
      tacticLineTextsR3: [...new Set(r.plays.filter((p) => p.round === 3).flatMap((p) => p.tacticLineTexts))],
      rafP95LiveMsMax: liveP95.length ? Math.max(...liveP95) : null,
      immediateEnd: r.immediateEnd,
      plays: r.plays.length,
      finished: r.finished,
      errors: r.errors.length,
    }
  }),
}
writeFileSync(`${outDir}/probe.json`, JSON.stringify({ summary, results }, null, 2))
writeFileSync(`${outDir}/summary.json`, JSON.stringify(summary, null, 2))
for (const s of summary.runs) {
  console.log(`[${s.viewport}/${s.seed}] ${s.enemyName} R3="${s.r3Intent}" glow=${JSON.stringify(s.r3Glow)} R4="${s.r4Intent}" (${s.r4Branch}) breaks=${JSON.stringify(s.breaks.map((b) => ({ r: b.round, band: b.band, start: b.breakStartMs, half: b.halfStartMs, superOff: b.superOffMs, same: b.halfAndSuperOffSameFrame, charge: b.intentChargeDuringBreak })))} rafP95=${s.rafP95LiveMsMax} errors=${s.errors}`)
}

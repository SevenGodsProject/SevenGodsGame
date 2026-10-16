// Combat Feel Premium v2（Lane 2）：着弾・被弾演出の SP375／PC 実測プローブ（Playwright headless）。
//   node scripts/lane2-combat-feel-v2/probe.mjs <outDir> <baseUrl> [maxActions]
// 大耀 × 蒼海の龍神（?enemy=ryujin&seed=cf2-pilot-01・決定論）を素朴な方策（使える札を左から使う→ラウンドを終える）で
// 1 戦通し、各手ごとに rAF で DOM を標本化する：
//   ・着弾 FX（ダメージ数字・斬撃・金リング・被弾リング）の矩形が viewport 内に収まるか
//   ・FX が名札（.enemy-plate）・吹き出し（.enemy-speech-bubble）・手札ドック（.battle-dock）に隠れていないか（重なり面積）
//   ・FX の中心が敵の絵（.enemy-avatar）の中にあるか
//   ・HP 帯（enemy-band-high/half/quarter）の遷移時刻と、Combat Feel v2 の追加クラス（cf2-*）の出現
// 評価はしない（数値と撮影のみ）。JS error も記録する。lane1 の acceptance.mjs と同じ起動手順。
import { mkdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const outDir = args[0] ?? 'docs/evidence/combat-feel-v2/probe'
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:4195'
const maxActions = Number(args.find((a) => /^\d+$/.test(a)) ?? 48)
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

// CF2_REDUCED=1 で prefers-reduced-motion: reduce の context にする（動きが止まり閃きだけ残ることの確認）。CF2_VIEWPORTS=pc,sp375 で絞る
const REDUCED = process.env.CF2_REDUCED === '1'
const ONLY = (process.env.CF2_VIEWPORTS ?? 'pc,sp375').split(',')
const VIEWPORTS = [
  { id: 'pc', viewport: { width: 1508, height: 660 } },
  { id: 'sp375', viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
]
  .filter((v) => ONLY.includes(v.id))
  .map((v) => (REDUCED ? { ...v, reducedMotion: 'reduce' } : v))
const URL_Q = '/?enemy=ryujin&seed=cf2-pilot-01'

async function clickText(page, text, timeout = 8000) {
  await page.getByRole('button', { name: text }).first().click({ timeout })
}
async function maybeClick(page, text) {
  const l = page.getByRole('button', { name: text }).first()
  if (await l.isVisible().catch(() => false)) await l.click({ timeout: 3000 }).catch(() => {})
}

/** ページ内の標本化（rAF）。FX 要素が存在するフレームだけを保存する */
const SAMPLER = () => {
  const rect = (el) => {
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }
  }
  const one = (sel) => {
    const el = document.querySelector(sel)
    return el ? rect(el) : null
  }
  const state = { frames: [], t0: performance.now(), running: true, bands: [], lastBand: null, cf2: [] }
  window.__cf2 = state
  const loop = () => {
    if (!state.running) return
    const t = Math.round(performance.now() - state.t0)
    const panel = document.querySelector('.enemy-panel')
    const band = panel ? (panel.className.match(/enemy-band-(\w+)/) || [])[1] ?? null : null
    if (band !== state.lastBand) {
      state.bands.push({ t, band })
      state.lastBand = band
    }
    const cf2Els = [...document.querySelectorAll('[class*="cf2-"]')]
    for (const el of cf2Els) {
      const cls = [...el.classList].filter((c) => c.startsWith('cf2-')).join(' ')
      const key = cls + '@' + el.tagName
      if (!state.cf2.some((c) => c.key === key && t - c.t < 1500)) state.cf2.push({ key, t, rect: rect(el), opacity: getComputedStyle(el).opacity })
    }
    const fx = []
    for (const sel of ['.enemy-hit-layer .floating-number', '.player-hit-layer .floating-number', '.enemy-hit-layer .slash-fx', '.enemy-hit-layer .impact-ring', '.player-hit-layer .impact-ring', '.player-panel .floating-number']) {
      for (const el of document.querySelectorAll(sel)) {
        const cs = getComputedStyle(el)
        const r = rect(el)
        if (r.w === 0 && r.h === 0) continue
        fx.push({ sel, text: el.textContent?.slice(0, 12) ?? '', ...r, opacity: Number(cs.opacity) })
      }
    }
    const reaction = document.querySelector('.enemy-reaction')
    if (fx.length > 0 || reaction || cf2Els.length > 0) {
      state.frames.push({
        t,
        fx,
        reaction: reaction ? getComputedStyle(reaction).transform : null,
        avatar: one('.enemy-avatar'),
        plate: one('.enemy-plate'),
        bubble: one('.enemy-speech-bubble'),
        dock: one('.battle-dock'),
        godAvatar: one('.player-avatar'),
        heavy: !!document.querySelector('.god-strike-heavy'),
        cutin: !!document.querySelector('.resonance-cutin'),
        vw: innerWidth,
        vh: innerHeight,
      })
      if (state.frames.length > 900) state.frames.shift()
    }
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}

function overlapArea(a, b) {
  if (!a || !b) return 0
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
  return x * y
}
function inside(a, vw, vh) {
  return a.x >= 0 && a.y >= 0 && a.x + a.w <= vw && a.y + a.h <= vh
}
function centerIn(a, b) {
  if (!a || !b) return false
  const cx = a.x + a.w / 2
  const cy = a.y + a.h / 2
  return cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h
}

/** 1 手ぶんの標本から FX ごとの判定を集計する（opacity>0.05 のフレームのみ） */
function summarizeFrames(frames) {
  const byFx = new Map()
  for (const f of frames) {
    for (const fx of f.fx) {
      if (fx.opacity <= 0.05) continue
      const key = `${fx.sel}|${fx.text}`
      const cur = byFx.get(key) ?? { sel: fx.sel, text: fx.text, frames: 0, offViewport: 0, overPlate: 0, overBubble: 0, overDock: 0, centerInAvatar: 0, minY: Infinity, maxY: -Infinity, minX: Infinity, maxX: -Infinity, area: 0 }
      cur.frames += 1
      const vw = f.vw
      const vh = f.vh
      if (!inside(fx, vw, vh)) cur.offViewport += 1
      const area = fx.w * fx.h || 1
      cur.area = area
      // 名札・吹き出し・ドックに FX 面積の 30% 超が隠れたフレームを数える（FX は z-index 9 だが、名札は z2・吹き出し z3 で絵より前。
      // 画面上で同じ場所に出ているかの実測として記録。手札ドックは別 grid 行なので重なれば本当に隠れる）
      const target = fx.sel.includes('.player') ? f.godAvatar : f.avatar
      if (overlapArea(fx, f.plate) / area > 0.3) cur.overPlate += 1
      if (overlapArea(fx, f.bubble) / area > 0.3) cur.overBubble += 1
      if (overlapArea(fx, f.dock) / area > 0.3) cur.overDock += 1
      if (centerIn(fx, target)) cur.centerInAvatar += 1
      cur.minY = Math.min(cur.minY, fx.y)
      cur.maxY = Math.max(cur.maxY, fx.y + fx.h)
      cur.minX = Math.min(cur.minX, fx.x)
      cur.maxX = Math.max(cur.maxX, fx.x + fx.w)
      byFx.set(key, cur)
    }
  }
  return [...byFx.values()]
}

/** 帯の遷移の瞬間を撮る：遷移を待ち、全 animation を一時停止（cf2-* は 20% 地点＝崩しの最深部へ）して撮影し、再開する。
 *  Before（cf2 無し）でも同じ待ち方で撮るので、同じ時刻の比較になる */
async function shotAtBandChange(page, nextBand, path) {
  const ok = await page
    .waitForFunction((b) => !!document.querySelector('.enemy-panel.enemy-band-' + b), nextBand, { timeout: 2600 })
    .then(() => true)
    .catch(() => false)
  if (!ok) return null
  const info = await page.evaluate(() => {
    const anims = document.getAnimations()
    const names = []
    for (const a of anims) {
      const name = a.animationName ?? ''
      if (name.startsWith('cf2-')) {
        const dur = Number(a.effect?.getComputedTiming().duration ?? 0)
        a.currentTime = dur * 0.2
        names.push(name + '@' + dur)
      }
      a.pause()
    }
    const collapse = document.querySelector('.enemy-collapse')
    const plateAfter = document.querySelector('.enemy-plate')
    return {
      cf2Animations: names,
      collapseTransform: collapse ? getComputedStyle(collapse).transform : null,
      collapseFilter: collapse ? getComputedStyle(collapse).filter : null,
      plateAfterOpacity: plateAfter ? getComputedStyle(plateAfter, '::after').opacity : null,
      woundOpacity: document.querySelector('.enemy-wound') ? getComputedStyle(document.querySelector('.enemy-wound')).opacity : null,
      woundScale: document.querySelector('.enemy-wound') ? getComputedStyle(document.querySelector('.enemy-wound')).scale : null,
    }
  })
  await page.screenshot({ path })
  await page.evaluate(() => { for (const a of document.getAnimations()) a.play() })
  return info
}

mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch()
const results = []
for (const vp of VIEWPORTS) {
  const context = await browser.newContext(vp)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto(base + URL_Q, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {}
  })
  await page.goto(base + URL_Q, { waitUntil: 'networkidle' })
  await maybeClick(page, 'わかった')
  await clickText(page, '神を選ぶ')
  await maybeClick(page, '新しく始める')
  await clickText(page, '大耀')
  await clickText(page, 'この構成で始める')
  if (await page.getByText('挑む敵を選ぼう').first().isVisible({ timeout: 4000 }).catch(() => false)) {
    await page.getByRole('button', { name: /蒼海の龍神/ }).first().click({ timeout: 8000 })
    await clickText(page, 'この構成でバトル開始')
  }
  // 降臨の間（決定254）：Escape で skip できる。HUD が操作可能になるまで待つ
  await page.waitForTimeout(600)
  await page.keyboard.press('Escape').catch(() => {})
  await page.getByRole('button', { name: 'ラウンドを終える' }).first().waitFor({ timeout: 25000 })
  await page.waitForTimeout(1200)
  const enemyName = await page.locator('.enemy-panel .panel-title').first().innerText().catch(() => '')
  await page.screenshot({ path: `${outDir}/${vp.id}-00-calm.png` })
  const layout = await page.evaluate(() => {
    const r = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const b = el.getBoundingClientRect()
      return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }
    }
    return {
      vw: innerWidth,
      vh: innerHeight,
      scrollW: document.documentElement.scrollWidth,
      enemyAvatar: r('.enemy-avatar'),
      enemyStage: r('.enemy-stage'),
      enemyPlate: r('.enemy-plate'),
      bubble: r('.enemy-speech-bubble'),
      godAvatar: r('.player-avatar'),
      dock: r('.battle-dock'),
      hand: r('.hand'),
      hitLayer: r('.enemy-hit-layer'),
    }
  })

  const turns = []
  let shotsTaken = 0
  let finished = false
  for (let i = 0; i < maxActions && !finished; i++) {
    const card = page.locator('.hand .card-view:not([disabled])').first()
    const hasCard = await card.isVisible().catch(() => false)
    const bandBefore = await page.evaluate(() => (document.querySelector('.enemy-panel')?.className.match(/enemy-band-(\w+)/) || [])[1] ?? null)
    await page.evaluate(SAMPLER)
    let action
    if (hasCard) {
      action = { kind: 'card', name: (await card.locator('.card-view-name').innerText().catch(() => '')).trim() }
      await card.click({ timeout: 5000, force: true })
      if (bandBefore === 'high' || bandBefore === 'half') {
        const nb = bandBefore === 'high' ? 'half' : 'quarter'
        action.breakShot = await shotAtBandChange(page, nb, `${outDir}/${vp.id}-${String(i + 1).padStart(2, '0')}-break-${nb}.png`)
        // high→quarter を一撃でまたぐ場合も拾う
        if (!action.breakShot && bandBefore === 'high') action.breakShot = await shotAtBandChange(page, 'quarter', `${outDir}/${vp.id}-${String(i + 1).padStart(2, '0')}-break-quarter.png`)
      }
      // 着弾 +90／+150（commit 280 後）→ 数字 0.9〜1.3s。撮影は最初の 3 手と帯の遷移時だけ
      if (shotsTaken < 3) {
        await page.waitForTimeout(400)
        await page.screenshot({ path: `${outDir}/${vp.id}-${String(i + 1).padStart(2, '0')}-impact.png` })
        shotsTaken += 1
        await page.waitForTimeout(1400)
      } else {
        await page.waitForTimeout(1800)
      }
    } else {
      action = { kind: 'endRound' }
      const btn = page.getByRole('button', { name: 'ラウンドを終える' }).first()
      if (!(await btn.isVisible().catch(() => false))) break
      await btn.click({ timeout: 5000 }).catch(() => {})
      await page.waitForTimeout(2600)
    }
    const bandAfter = await page.evaluate(() => (document.querySelector('.enemy-panel')?.className.match(/enemy-band-(\w+)/) || [])[1] ?? null)
    if (bandAfter !== bandBefore && bandAfter) {
      await page.screenshot({ path: `${outDir}/${vp.id}-${String(i + 1).padStart(2, '0')}-band-${bandAfter}.png` })
    }
    const cutin = await page.locator('.resonance-cutin, .burst-banner').first().isVisible().catch(() => false)
    if (cutin) {
      await page.screenshot({ path: `${outDir}/${vp.id}-${String(i + 1).padStart(2, '0')}-godstrike.png` })
      await page.waitForTimeout(2600)
    }
    const sample = await page.evaluate(() => {
      const s = window.__cf2
      s.running = false
      return { frames: s.frames, bands: s.bands, cf2: s.cf2 }
    })
    const heavy = sample.frames.some((f) => f.heavy)
    turns.push({ i: i + 1, action, bandBefore, bandAfter, heavy, bands: sample.bands, cf2: sample.cf2, fx: summarizeFrames(sample.frames), frames: sample.frames.length })
    const over = await page.getByRole('button', { name: /もう一度|ホームへ|結果へ進む|報酬カードを選ぶ|デッキを調整/ }).first().isVisible().catch(() => false)
    if (over) finished = true
  }
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${outDir}/${vp.id}-99-end.png` })
  results.push({ viewport: vp.id, enemyName, layout, turns, finished, errors })
  await context.close()
}
await browser.close()

// 集計
const summary = { base, reducedMotion: REDUCED, generatedAt: new Date().toISOString(), viewports: [] }
for (const r of results) {
  const allFx = r.turns.flatMap((t) => t.fx)
  const agg = (pred) => allFx.filter(pred).length
  const s = {
    viewport: r.viewport,
    enemyName: r.enemyName,
    turns: r.turns.length,
    cardPlays: r.turns.filter((t) => t.action.kind === 'card').length,
    heavyStrikes: r.turns.filter((t) => t.heavy).length,
    fxTotal: allFx.length,
    fxOffViewport: agg((f) => f.offViewport > 0),
    fxOverPlate: agg((f) => f.overPlate > 0),
    fxOverBubble: agg((f) => f.overBubble > 0),
    fxOverDock: agg((f) => f.overDock > 0),
    enemyFxCenterInAvatar: `${agg((f) => f.sel.startsWith('.enemy') && f.centerInAvatar > 0)}/${agg((f) => f.sel.startsWith('.enemy'))}`,
    bandTransitions: r.turns.flatMap((t) => t.bands.filter((b) => b.band !== t.bandBefore).map((b) => ({ turn: t.i, ...b }))),
    cf2Seen: [...new Set(r.turns.flatMap((t) => t.cf2.map((c) => c.key)))],
    finished: r.finished,
    errors: r.errors.length,
    layout: r.layout,
  }
  summary.viewports.push(s)
}
writeFileSync(`${outDir}/probe.json`, JSON.stringify({ summary, results }, null, 2))
writeFileSync(`${outDir}/summary.json`, JSON.stringify(summary, null, 2))
for (const s of summary.viewports) {
  console.log(`[${s.viewport}] ${s.enemyName} turns=${s.turns} plays=${s.cardPlays} heavy=${s.heavyStrikes} fx=${s.fxTotal} offViewport=${s.fxOffViewport} overPlate=${s.fxOverPlate} overBubble=${s.fxOverBubble} overDock=${s.fxOverDock} centerInAvatar=${s.enemyFxCenterInAvatar} bands=${JSON.stringify(s.bandTransitions)} cf2=${JSON.stringify(s.cf2Seen)} finished=${s.finished} errors=${s.errors}`)
}

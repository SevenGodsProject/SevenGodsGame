// Phase 7 Entrance E1（決定193）— Browser Acceptance（監査用。ゲームコードではない）。
//
//   node scripts/entrance-e1/acceptance.mjs <outDir> <url> [--only sp844,pc1508]
//
// すべて Playwright の独立コンテキストに fixture を注入して行う（実ユーザーの storage・Production のデータには触れない）。
// 仕様：docs/PHASE7_ENTRANCE_E1_MINIMAL_SPEC.md §24（AC1〜AC26）。ここでは browser で判定できるものを自己判定し、
// entrance-acceptance.json に書く。AC16〜AC18（P1／P2／Hardening）は既存 acceptance の再実行で判定する。
import { mkdirSync, writeFileSync } from 'node:fs'
import { loadChromium, VIEWPORTS, watch, playToEnd, dumpStorage, clickText } from '../release-audit/_lib.mjs'

const args = process.argv.slice(2)
const [out, base] = args
const onlyIdx = args.indexOf('--only')
const vps = onlyIdx >= 0 ? args[onlyIdx + 1].split(',') : Object.keys(VIEWPORTS)
mkdirSync(out, { recursive: true })

const jst = (daysAgo = 0) => new Date(Date.now() + 9 * 3600e3 - daysAgo * 86400e3).toISOString().slice(0, 10)
const battleState = (godId, enemyId) => ({
  version: 9, seed: 'e1-seed', rngCursor: 0, round: 2, phase: 'playerTurn', status: 'playing', ap: { current: 3, max: 6 },
  player: { hp: 25, maxHp: 30, block: 0, buffs: [] }, enemy: { defId: enemyId, name: '?', maxHp: 100, hp: 88, block: 0, buffs: [], intent: null },
  otomo: { defId: 'kozuchi', form: 'spirit' }, godId, difficulty: 'normal', otomoGrowthPath: 'guardian',
  resonance: { value: 0, max: 7 }, divination: { remaining: 3, usedThisRound: false }, deck: [], hand: [], discard: [], exhausted: [],
  score: { damage: 0, combo: 0, victory: 0, tempo: 0, survival: 0, difficultyBonus: 0, legacy: 0, total: 0 },
  mastery: {}, cardsPlayedThisRound: 0, totalApGranted: 0, totalApSpent: 0,
})
const RECORDS = JSON.stringify({ version: 1, records: { taiyo: { bestScore: 0, bestScoreDifficulty: null, bestBattleScore: 1094, bestBattleScoreDifficulty: 'hard', wins: 14, losses: 3, finished: 1, fastestWinRound: 3 } } })
const deckPref = (godId) => JSON.stringify({ version: 9, godId, deck: [] })
const dailyUsed = (n) => JSON.stringify({ version: 1, days: { [jst()]: { dateKey: jst(), enemyId: 'enemy_05', seed: `daily-${jst()}-enemy_05`, attemptsUsed: n, results: [], bestScore: 0, bestGodId: null, bestByGod: {} } } })

const FIXTURES = {
  new: {},
  returning: { 'sevengods.records': RECORDS, 'sevengods.deckPreference': deckPref('taiyo'), 'sevengods.daily': dailyUsed(1) },
  resume: { 'sevengods.battleSave': JSON.stringify({ version: 9, state: battleState('taiyo', 'enemy_02') }), 'sevengods.records': RECORDS, 'sevengods.deckPreference': deckPref('sobi') },
  invalidResume: { 'sevengods.battleSave': JSON.stringify({ version: 9, state: battleState('taiyo', 'enemy_does_not_exist') }), 'sevengods.deckPreference': deckPref('saika') },
  dailyUntouched: { 'sevengods.records': RECORDS, 'sevengods.deckPreference': deckPref('juraku') },
  dailyOnce: { 'sevengods.records': RECORDS, 'sevengods.deckPreference': deckPref('fukuei'), 'sevengods.daily': dailyUsed(1) },
  dailyExhausted: { 'sevengods.records': RECORDS, 'sevengods.deckPreference': deckPref('shouren'), 'sevengods.daily': dailyUsed(3) },
  unknownGodPref: { 'sevengods.records': RECORDS, 'sevengods.deckPreference': deckPref('not_a_god'), 'sevengods.daily': dailyUsed(1) },
}
const EXPECT = {
  new: { primary: 'firstBattle', god: 'ebisu', label: '初陣へ' },
  returning: { primary: 'normal', god: 'taiyo', label: '神を選ぶ' },
  resume: { primary: 'resume', god: 'taiyo', label: '続きから' },
  invalidResume: { primary: 'daily', god: 'saika', label: '神域へ挑む' },
  dailyUntouched: { primary: 'daily', god: 'juraku', label: '神域へ挑む' },
  dailyOnce: { primary: 'normal', god: 'fukuei', label: '神を選ぶ' },
  dailyExhausted: { primary: 'normal', god: 'shouren', label: '神を選ぶ' },
  unknownGodPref: { primary: 'normal', god: 'ebisu', label: '神を選ぶ' },
}

const chromium = await loadChromium()
const browser = await chromium.launch({ headless: true })
const R = { base, vps, startedAt: new Date().toISOString(), home: {}, flows: {} }

async function newPage(vpName, seed) {
  const vp = VIEWPORTS[vpName]
  const ctx = await browser.newContext({ viewport: vp.viewport, isMobile: vp.isMobile, hasTouch: vp.isMobile, deviceScaleFactor: vp.isMobile ? 2 : 1 })
  await ctx.addInitScript((s) => {
    if (sessionStorage.getItem('__e1_seeded')) return
    for (const k in s) localStorage.setItem(k, s[k])
    sessionStorage.setItem('__e1_seeded', '1')
    window.__cls = 0
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value }).observe({ type: 'layout-shift', buffered: true }) } catch { /* noop */ }
  }, seed)
  const page = await ctx.newPage()
  const rec = watch(page, base)
  return { ctx, page, rec }
}

/** Home の初期表示を実測する（ページ内評価） */
const HOME_METRICS = () => {
  const vw = innerWidth, vh = innerHeight
  const rect = (el) => {
    if (!el) return null
    const b = el.getBoundingClientRect()
    return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), inView: b.width > 0 && b.height > 0 && b.top >= -0.5 && b.bottom <= vh + 0.5 && b.left >= -0.5 && b.right <= vw + 0.5 }
  }
  const visArea = (el) => { const b = el.getBoundingClientRect(); return Math.max(0, Math.min(b.bottom, vh) - Math.max(b.top, 0)) * Math.max(0, Math.min(b.right, vw) - Math.max(b.left, 0)) }
  const screen = document.querySelector('.home-screen')
  const hero = document.querySelector('[data-testid="home-hero-god"]')
  const heroImg = hero?.querySelector('img')
  const gold = [...document.querySelectorAll('.home-screen button')].filter((b) => { const cs = getComputedStyle(b); return /255, 209, 102|255, 230, 163/.test(cs.backgroundImage) })
  const primaries = [...document.querySelectorAll('.home-screen .home-cta-primary')]
  const interactive = [...document.querySelectorAll('.home-screen button, .home-screen a[href]')].filter((b) => b.offsetParent !== null)
  const areas = interactive.map((b) => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim().slice(0, 16), a: Math.round(r.width * r.height), h: Math.round(r.height) } })
  const primaryArea = primaries[0] ? primaries[0].getBoundingClientRect().width * primaries[0].getBoundingClientRect().height : 0
  const enemyArt = document.querySelector('[data-testid="home-today-enemy-art"]')
  const progress = document.querySelector('[data-testid="home-progress"]')
  const chips = progress ? [...progress.querySelectorAll('li')].filter((li) => li.offsetParent !== null) : []
  const chipTops = [...new Set(chips.map((c) => Math.round(c.getBoundingClientRect().top)))]
  const hero3 = document.querySelector('.home-hero-name')
  const textInView = (() => {
    let n = 0
    const walker = document.createTreeWalker(screen, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const node = walker.currentNode
      const el = node.parentElement
      if (!el || el.offsetParent === null) continue
      const r = el.getBoundingClientRect()
      if (r.bottom <= 0 || r.top >= vh) continue
      n += node.textContent.replace(/\s+/g, '').length
    }
    return n
  })()
  const broken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src'))
  return {
    modal: !!document.querySelector('.tutorial-overlay'),
    primaryState: screen?.dataset.primary ?? null,
    heroGod: hero?.dataset.god ?? null,
    heroPct: hero ? +((100 * visArea(hero)) / (vw * vh)).toFixed(1) : 0,
    heroLoaded: !!heroImg && heroImg.complete && heroImg.naturalWidth > 0,
    heroName: rect(hero3),
    title: rect(document.querySelector('.home-screen h1')),
    titleText: document.querySelector('.home-screen h1')?.textContent.trim() ?? null,
    primary: primaries.map((b) => ({ text: b.textContent.trim(), testid: b.dataset.testid ?? null, ...rect(b) })),
    goldCount: gold.length,
    primaryIsLargest: primaries.length === 1 && areas.every((x) => x.a <= primaryArea + 0.5),
    interactiveCount: interactive.length,
    minButtonHeight: Math.min(...areas.map((x) => x.h)),
    areas,
    todayEnemy: document.querySelector('[data-testid="home-today-enemy"] strong')?.textContent.trim() ?? null,
    todayEnemyInView: rect(document.querySelector('[data-testid="home-today-enemy"]'))?.inView ?? false,
    enemyArtInView: rect(enemyArt)?.inView ?? false,
    enemyArtLoaded: !!enemyArt && enemyArt.complete && enemyArt.naturalWidth > 0,
    attempts: document.querySelector('[data-testid="home-today-attempts"]')?.textContent.trim() ?? null,
    attemptsInView: rect(document.querySelector('[data-testid="home-today-attempts"]'))?.inView ?? false,
    countdownInView: document.querySelector('[data-testid="home-today-countdown"]') ? rect(document.querySelector('[data-testid="home-today-countdown"]')).inView : null,
    todayCta: [...document.querySelectorAll('[data-testid="home-today-cta"]')].map((b) => b.textContent.trim()),
    startButton: rect(document.querySelector('[data-testid="home-start"]')),
    startClass: document.querySelector('[data-testid="home-start"]')?.className ?? null,
    links: [...document.querySelectorAll('.home-links button')].map((b) => ({ text: b.textContent.trim(), ...rect(b) })),
    progressChips: chips.map((c) => c.textContent.trim()),
    progressLines: chipTops.length,
    scrollY: Math.max(0, document.scrollingElement.scrollHeight - vh),
    scrollX: Math.max(0, document.scrollingElement.scrollWidth - vw),
    textInView,
    cls: +(window.__cls ?? 0).toFixed(4),
    headerIcons: [...document.querySelectorAll('.app-header .app-icon-button')].map((b) => b.getAttribute('aria-label')),
    brokenImages: broken,
    heroCaptionContrastBg: getComputedStyle(document.querySelector('.home-hero-art'), '::after').backgroundImage.slice(0, 60),
  }
}

async function openHome(page) {
  await page.goto(base + '/', { waitUntil: 'load' })
  await page.waitForSelector('.home-screen', { timeout: 30000 })
  await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 20000 }).catch(() => {})
  // 今日の敵の絵は Hero 画像の読み込み後に読み込む（LCP 対策）ので、出てくるまで待つ
  await page.waitForFunction(() => { const i = document.querySelector('[data-testid="home-today-enemy-art"]'); return !!i && i.complete }, null, { timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(700)
}

async function realClick(page, locator, label, steps, t0) {
  const el = locator.first()
  await el.waitFor({ state: 'visible', timeout: 20000 })
  const inView = await el.evaluate((n) => { const r = n.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth })
  await el.click()
  steps.push({ click: label, atMs: Date.now() - t0, scrollNeeded: !inView })
}

async function battleReady(page) {
  await page.waitForSelector('.hand .card-view', { timeout: 30000 })
  await page.waitForFunction(() => {
    const b = document.querySelector('.end-round-button')
    return b && !b.disabled && [...document.querySelectorAll('.hand .card-view')].some((c) => !c.disabled)
  }, null, { timeout: 30000 })
}

const saveOf = async (page) => { const s = await dumpStorage(page); try { return JSON.parse(s['sevengods.battleSave'] ?? 'null')?.state ?? null } catch { return null } }
const dailyOf = (s) => { try { return JSON.parse(s['sevengods.daily'] ?? 'null') } catch { return null } }

// ---------------- Home の初期表示（8 状態 × viewport） ----------------
for (const vp of vps) {
  R.home[vp] = {}
  for (const [name, seed] of Object.entries(FIXTURES)) {
    const { ctx, page, rec } = await newPage(vp, seed)
    await openHome(page)
    const m = await page.evaluate(HOME_METRICS)
    const storageAfter = await dumpStorage(page)
    m.storageUnchanged = Object.keys(seed).every((k) => storageAfter[k] === seed[k]) && Object.keys(storageAfter).every((k) => k in seed)
    m.storageKeysAfter = Object.keys(storageAfter)
    m.errors = rec.errors
    m.failed = rec.failed
    m.api = rec.api
    m.external = rec.external
    await page.screenshot({ path: `${out}/home-${name}-${vp}.png` })
    R.home[vp][name] = m
    await ctx.close()
  }
  console.log(`[${vp}] home states done`)
}

// ---------------- 1 新規：初陣（URL → 最初のカード） ----------------
for (const vp of vps) {
  const f = (R.flows[vp] = {})
  const { ctx, page, rec } = await newPage(vp, FIXTURES.new)
  const t0 = Date.now()
  await page.goto(base + '/', { waitUntil: 'load' })
  await page.waitForSelector('.home-screen', { timeout: 30000 })
  const homeAt = Date.now() - t0
  const steps = []
  const homeText = await page.evaluate(HOME_METRICS).then((m) => m.textInView)
  await realClick(page, page.locator('[data-testid="home-first-battle"]'), '初陣へ', steps, t0)
  await page.waitForSelector('[data-testid="first-battle-brief"]', { timeout: 10000 })
  await page.waitForTimeout(300)
  const brief = await page.evaluate(() => {
    const card = document.querySelector('.first-battle-brief')
    const inView = (el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth }
    const lines = [...document.querySelectorAll('[data-testid="first-battle-brief-lines"] li')].map((li) => li.textContent.trim())
    const buttons = [...card.querySelectorAll('button')].map((b) => ({ text: b.textContent.trim(), inView: inView(b), h: Math.round(b.getBoundingClientRect().height) }))
    return { lines, linesChars: lines.join('').length, totalChars: card.innerText.replace(/\s+/g, '').length, buttons, cardScrolls: card.scrollHeight > card.clientHeight + 1, scrollX: document.scrollingElement.scrollWidth > innerWidth + 1 }
  })
  await page.screenshot({ path: `${out}/flow-brief-${vp}.png` })
  const storageBeforeStart = await dumpStorage(page)
  await realClick(page, page.getByRole('button', { name: '出陣する' }), '出陣する', steps, t0)
  await battleReady(page)
  const battleAt = Date.now() - t0
  await page.screenshot({ path: `${out}/flow-battle-${vp}.png` })
  const playedBefore = (await saveOf(page))?.cardsPlayedThisRound ?? 0
  await realClick(page, page.locator('.hand .card-view:not([disabled])'), '手札のカード', steps, t0)
  let playedAfter = playedBefore
  for (let i = 0; i < 20 && playedAfter <= playedBefore; i++) { await page.waitForTimeout(150); playedAfter = (await saveOf(page))?.cardsPlayedThisRound ?? 0 }
  const firstCardAt = steps.at(-1).atMs
  const storageAfterCard = await dumpStorage(page)
  const save = await saveOf(page)
  const battleScrollX = await page.evaluate(() => document.scrollingElement.scrollWidth > innerWidth + 1)
  f.firstBattle = {
    clicks: steps.length, steps, scrollNeeded: steps.filter((s) => s.scrollNeeded).map((s) => s.click),
    transitions: 1, modals: 1, homeAtMs: homeAt, battleReadyAtMs: battleAt, firstCardAtMs: firstCardAt,
    cardPlayed: playedAfter > playedBefore, playedBefore, playedAfter, homeTextInView: homeText, brief,
    textExposure: homeText + brief.totalChars,
    humanEstimateSec: Math.round((firstCardAt + (homeText + brief.totalChars) / 9 * 1000 + 3 * 2000) / 1000),
    storageBeforeStart: Object.keys(storageBeforeStart),
    tutorialSeenAfterStart: storageAfterCard['sevengods.tutorialSeen'] === 'true',
    dailyAfterCard: storageAfterCard['sevengods.daily'] ?? null,
    deckPreferenceAfterCard: storageAfterCard['sevengods.deckPreference'] ?? null,
    preset: save ? { godId: save.godId, enemyId: save.enemy?.defId, difficulty: save.difficulty, mode: save.mode ?? 'normal', stake: save.stake ?? 0, otomoGrowthPath: save.otomoGrowthPath } : null,
    battleScrollX, errors: rec.errors, failed: rec.failed,
  }
  console.log(`[${vp}] first battle: clicks=${steps.length} card=${f.firstBattle.cardPlayed} at ${firstCardAt}ms`)
  await ctx.close()

  // 詳しい遊び方・もどる・ヘッダーの本のアイコン（完全版を手動で開ける）
  {
    const { ctx: c2, page: p2, rec: r2 } = await newPage(vp, FIXTURES.new)
    await openHome(p2)
    await p2.locator('[data-testid="home-first-battle"]').click()
    await p2.waitForSelector('[data-testid="first-battle-brief"]')
    await p2.getByRole('button', { name: 'もどる' }).click()
    await p2.waitForTimeout(300)
    const backHome = await p2.evaluate(() => !document.querySelector('[data-testid="first-battle-brief"]') && !!document.querySelector('.home-screen') && !document.querySelector('.hand'))
    await p2.getByRole('button', { name: '遊び方を見る' }).click()
    await p2.waitForSelector('.tutorial-overlay', { timeout: 5000 }).catch(() => {})
    const manual = await p2.evaluate(() => ({ open: !!document.querySelector('.tutorial-overlay'), sections: document.querySelectorAll('.tutorial-section').length, title: document.querySelector('.tutorial-title')?.textContent.trim() ?? null }))
    await p2.getByRole('button', { name: 'わかった' }).click().catch(() => {})
    await p2.waitForTimeout(300)
    const closed = await p2.evaluate(() => !document.querySelector('.tutorial-overlay'))
    await p2.locator('[data-testid="home-first-battle"]').click()
    await p2.waitForSelector('[data-testid="first-battle-brief"]')
    await p2.getByRole('button', { name: '詳しい遊び方' }).click()
    await p2.waitForTimeout(300)
    const moreOpens = await p2.evaluate(() => !!document.querySelector('.tutorial-overlay'))
    f.tutorial = { backHome, manual, closed, moreOpens, errors: r2.errors }
    await c2.close()
  }
}

// ---------------- 3 Resume 1 クリック／5 Daily 回数（Home 表示 +0・開始時 +1） ----------------
for (const vp of vps) {
  const f = R.flows[vp]
  {
    const { ctx, page, rec } = await newPage(vp, FIXTURES.resume)
    await openHome(page)
    const t0 = Date.now()
    const steps = []
    await realClick(page, page.locator('[data-testid="home-resume"]'), '続きから', steps, t0)
    await page.waitForFunction(() => { const b = document.querySelector('.end-round-button'); return b && !b.disabled }, null, { timeout: 30000 })
    f.resume = { clicks: steps.length, battleReadyMs: Date.now() - t0, scrollNeeded: steps.filter((s) => s.scrollNeeded).length, round: await page.evaluate(() => (document.body.textContent.match(/ラウンド\s*(\d)/) ?? [])[1] ?? null), errors: rec.errors }
    await ctx.close()
  }
  {
    const { ctx, page, rec } = await newPage(vp, FIXTURES.dailyUntouched)
    await openHome(page)
    const before = await dumpStorage(page)
    await page.locator('.home-screen [data-testid="home-today-cta"]').click()
    await page.waitForTimeout(600)
    const onDaily = await page.evaluate(() => document.querySelector('.setup-title')?.textContent.trim() ?? null)
    const afterOpen = await dumpStorage(page)
    await clickText(page, '挑戦開始')
    await page.waitForTimeout(500)
    await clickText(page, '大耀')
    await page.waitForTimeout(600)
    const beforeStart = await dumpStorage(page)
    await clickText(page, 'この構成でバトル開始')
    await page.waitForFunction(() => { const b = document.querySelector('.end-round-button'); return b && !b.disabled }, null, { timeout: 30000 })
    const afterStart = await dumpStorage(page)
    const used = (s) => { const d = dailyOf(s); return d?.days?.[jst()]?.attemptsUsed ?? 0 }
    f.daily = { onDaily, usedBefore: used(before), usedAfterOpen: used(afterOpen), usedBeforeStart: used(beforeStart), usedAfterStart: used(afterStart), mode: (await saveOf(page))?.mode ?? null, errors: rec.errors }
    await ctx.close()
  }
}

// ---------------- 8 初陣の勝利・12 報酬・11 P2 初撃破・結果の出口／9 初陣の敗北・デッキを調整／10 通常戦 ----------------
const battleVps = vps.filter((v) => v === 'sp844' || v === 'pc1508')
for (const vp of battleVps) {
  const f = R.flows[vp]
  {
    const { ctx, page, rec } = await newPage(vp, FIXTURES.new)
    await openHome(page)
    await page.locator('[data-testid="home-first-battle"]').click()
    await page.getByRole('button', { name: '出陣する' }).click()
    await battleReady(page)
    const seen = await playToEnd(page, { pumpPath: `${out}/pump.png`, timeoutMs: 300000 })
    const result = await page.evaluate(() => ({ status: document.querySelector('.game-over-status')?.textContent.trim() ?? null, rewardPending: !!document.querySelector('[data-testid="open-reward"]'), matchupClear: document.querySelector('[data-testid="matchup-clear"]')?.textContent.trim() ?? null, buttons: [...document.querySelectorAll('.game-over-overlay button')].map((b) => b.textContent.trim()) }))
    await page.screenshot({ path: `${out}/flow-win-result-${vp}.png` })
    let rewardFlow = null
    if (result.rewardPending) {
      await page.locator('[data-testid="open-reward"]').click()
      await page.waitForSelector('.reward-overlay', { timeout: 10000 })
      await page.locator('.reward-card').first().click()
      await page.waitForTimeout(1500)
      await page.waitForSelector('[data-testid="result-hub"]', { timeout: 15000 }).catch(() => {})
      rewardFlow = await page.evaluate(() => ({ hub: !!document.querySelector('[data-testid="result-hub"]'), goal: document.querySelector('[data-testid="next-goal"]')?.textContent.trim() ?? null, primary: document.querySelector('[data-testid="result-primary"]')?.textContent.trim() ?? null, secondary: [...document.querySelectorAll('[data-testid="result-secondary"]')].map((b) => b.textContent.trim()) }))
    }
    const s = await dumpStorage(page)
    const rec1 = JSON.parse(s['sevengods.records'] ?? '{}')?.records?.ebisu ?? null
    const matchups = JSON.parse(s['sevengods.matchups'] ?? 'null')
    // 結果 →「もう一度」で同じ神・同じ敵・ふつう
    let rematch = null
    const rematchBtn = page.locator('[data-testid="result-primary"], [data-testid="result-secondary"]').filter({ hasText: 'もう一度' })
    if (await rematchBtn.count()) {
      await rematchBtn.first().click()
      await battleReady(page)
      const st = await saveOf(page)
      rematch = { godId: st?.godId ?? null, enemyId: st?.enemy?.defId ?? null, difficulty: st?.difficulty ?? null, mode: st?.mode ?? 'normal' }
    }
    f.firstWin = { status: result.status, seenRounds: seen.rounds, timedOut: seen.timedOut, rewardPending: result.rewardPending, rewardFlow, matchupClear: result.matchupClear, ebisuRecord: rec1, matchupsEbisu: matchups?.cleared?.ebisu ?? null, rematch, dailyKey: s['sevengods.daily'] ?? null, deckPreference: s['sevengods.deckPreference'] ?? null, errors: rec.errors }
    await ctx.close()
    console.log(`[${vp}] first win: ${result.status} reward=${result.rewardPending} matchup=${!!result.matchupClear} rematch=${JSON.stringify(rematch)}`)
  }
  {
    const { ctx, page, rec } = await newPage(vp, FIXTURES.new)
    await openHome(page)
    await page.locator('[data-testid="home-first-battle"]').click()
    await page.getByRole('button', { name: '出陣する' }).click()
    await battleReady(page)
    const seen = await playToEnd(page, { noCards: true, pumpPath: `${out}/pump.png`, timeoutMs: 300000 })
    const result = await page.evaluate(() => ({ status: document.querySelector('.game-over-status')?.textContent.trim() ?? null, buttons: [...document.querySelectorAll('.game-over-overlay button')].map((b) => b.textContent.trim()) }))
    let adjust = null
    const adjustBtn = page.locator('[data-testid="result-primary"], [data-testid="result-secondary"], [data-testid="result-tertiary-link"]').filter({ hasText: 'デッキを調整' })
    if (await adjustBtn.count()) {
      await adjustBtn.first().click()
      await page.waitForTimeout(800)
      adjust = await page.evaluate(() => ({ title: document.querySelector('.setup-title')?.textContent.trim() ?? null, enemyShown: document.body.textContent.includes('試練の影') }))
    }
    let home = null
    if (adjust) {
      await clickText(page, '敵を選び直す')
      await page.waitForTimeout(500)
    }
    await page.goto(base + '/', { waitUntil: 'load' })
    await page.waitForSelector('.home-screen')
    await page.waitForTimeout(500)
    home = await page.evaluate(() => ({ primary: document.querySelector('.home-screen')?.dataset.primary ?? null, god: document.querySelector('[data-testid="home-hero-god"]')?.dataset.god ?? null }))
    const s = await dumpStorage(page)
    f.firstLoss = { status: result.status, rounds: seen.rounds, timedOut: seen.timedOut, buttons: result.buttons, adjust, homeAfter: home, ebisuRecord: JSON.parse(s['sevengods.records'] ?? '{}')?.records?.ebisu ?? null, errors: rec.errors }
    await ctx.close()
    console.log(`[${vp}] first loss: ${result.status} adjust=${JSON.stringify(adjust)} home=${JSON.stringify(home)}`)
  }
  {
    const { ctx, page, rec } = await newPage(vp, FIXTURES.returning)
    await openHome(page)
    await page.locator('[data-testid="home-start"]').click()
    await page.waitForTimeout(500)
    await clickText(page, '大耀')
    await page.waitForTimeout(400)
    await clickText(page, 'この構成で始める')
    await page.waitForTimeout(600)
    const enemySelect = await page.evaluate(() => document.querySelector('.setup-title')?.textContent.trim() ?? null)
    await clickText(page, '業斧の鬼将')
    await page.waitForTimeout(600)
    const deckTitle = await page.evaluate(() => document.querySelector('.setup-title')?.textContent.trim() ?? null)
    // fixture の deckPreference は神の読み取り用で中身が空のため、実プレイと同じく「おすすめデッキに戻す」で埋めてから始める
    await clickText(page, 'おすすめデッキに戻す')
    await page.waitForTimeout(300)
    await clickText(page, 'この構成でバトル開始')
    await battleReady(page)
    const st = await saveOf(page)
    const s = await dumpStorage(page)
    await page.goto(base + '/', { waitUntil: 'load' })
    await page.waitForSelector('.home-screen')
    await page.waitForTimeout(500)
    const home = await page.evaluate(() => ({ primary: document.querySelector('.home-screen')?.dataset.primary ?? null, god: document.querySelector('[data-testid="home-hero-god"]')?.dataset.god ?? null }))
    f.normal = { enemySelect, deckTitle, godId: st?.godId ?? null, enemyId: st?.enemy?.defId ?? null, deckPreferenceGod: JSON.parse(s['sevengods.deckPreference'] ?? '{}').godId ?? null, homeAfterReload: home, errors: rec.errors }
    await ctx.close()
  }
}

// ---------------- 7 柱すべての Hero 画像が読み込める（寸法が HOME_HERO_ART と一致） ----------------
{
  const HERO = {
    ebisu: ['/assets/gods/ebisu/keyvisual-hero.webp', 1086, 1448],
    taiyo: ['/assets/gods/taiyo/keyvisual-home.webp', 1086, 1448],
    sobi: ['/assets/gods/sobi/keyvisual-home.webp', 1086, 1448],
    saika: ['/assets/gods/saika/keyvisual-home.webp', 1086, 1448],
    juraku: ['/assets/gods/juraku/keyvisual-home.webp', 1086, 1448],
    fukuei: ['/assets/gods/fukuei/keyvisual-home.webp', 1086, 1357],
    shouren: ['/assets/gods/shouren/keyvisual.webp', 900, 900],
  }
  const { ctx, page } = await newPage(vps[0], {})
  await openHome(page)
  R.heroImages = {}
  for (const [god, [src, w, h]] of Object.entries(HERO)) {
    R.heroImages[god] = await page.evaluate(async ([u]) => {
      const res = await fetch(u)
      const blob = await res.blob()
      const bmp = await createImageBitmap(blob)
      return { status: res.status, bytes: blob.size, w: bmp.width, h: bmp.height }
    }, [src])
    R.heroImages[god].expect = [w, h]
  }
  await ctx.close()
}

// ---------------- 判定 ----------------
const J = []
const add = (id, title, checks) => { const pass = checks.length > 0 && checks.every((c) => c.ok); J.push({ id, title, pass, n: checks.length, failed: checks.filter((c) => !c.ok) }) }
const ck = (name, ok, detail) => ({ name, ok: !!ok, detail })
const homes = vps.flatMap((vp) => Object.entries(R.home[vp]).map(([name, m]) => ({ vp, name, m })))
const pc = (vp) => vp.startsWith('pc')

add('AC1', '初回（storage 空）の起動時に説明モーダルが無い', vps.map((vp) => ck(vp, R.home[vp].new.modal === false)))
add('AC2', 'タイトル・Hero God・Primary が初期 viewport 内（全状態）', homes.map(({ vp, name, m }) => ck(`${vp}/${name}`, m.title?.inView && m.titleText?.includes('SEVEN') && m.heroName?.inView && m.heroLoaded && m.primary.length === 1 && m.primary[0].inView, { title: m.title, heroName: m.heroName, primary: m.primary })))
add('AC3', 'Hero God の viewport 占有率 35% 以上（PC・SP）', homes.map(({ vp, name, m }) => ck(`${vp}/${name}`, m.heroPct >= 35, m.heroPct)))
add('AC3b', 'Hero God＝続きの神／最後にデッキを確定した神／恵比寿（未知 ID は恵比寿）', homes.map(({ vp, name, m }) => ck(`${vp}/${name}`, m.heroGod === EXPECT[name].god, m.heroGod)))
add('AC4', '金色の Primary はちょうど 1 個・最大・PC 320×64 以上／SP 幅いっぱい×60 以上', homes.map(({ vp, name, m }) => {
  const p = m.primary[0]
  const size = p && (pc(vp) ? p.w >= 320 && p.h >= 64 : p.w >= 340 && p.h >= 60)
  return ck(`${vp}/${name}`, m.primary.length === 1 && m.goldCount === 1 && m.primaryIsLargest && size, { primary: p, gold: m.goldCount, areas: m.areas })
}))
add('AC4b', '状態機械：続きから／初陣へ／神域へ挑む／神を選ぶ が条件どおり', homes.map(({ vp, name, m }) => ck(`${vp}/${name}`, m.primaryState === EXPECT[name].primary && m.primary[0]?.text.startsWith(EXPECT[name].label), { state: m.primaryState, text: m.primary[0]?.text })))
add('AC5', '今日の敵の名前と絵が初期 viewport 内（絵は読み込み済み）', homes.map(({ vp, name, m }) => ck(`${vp}/${name}`, m.todayEnemy && m.todayEnemyInView && m.enemyArtInView && m.enemyArtLoaded, { enemy: m.todayEnemy })))
add('AC6', 'Daily の状態（残り N/3 または 今日の3回は終了＋次の敵まで）が初期 viewport 内', homes.map(({ vp, name, m }) => ck(`${vp}/${name}`, m.attemptsInView && (/^残り \d\/3$/.test(m.attempts) || (m.attempts === '今日の3回は終了' && m.countdownInView === true)), m.attempts)))
add('AC7', '新規：URL → 最初のカードの使用まで 3 クリック以下', vps.map((vp) => ck(vp, R.flows[vp].firstBattle.clicks <= 3 && R.flows[vp].firstBattle.cardPlayed, R.flows[vp].firstBattle.steps.map((s) => s.click))))
add('AC8', '新規：その経路でスクロールが必要なクリック 0／Home の縦スクロール 0', vps.map((vp) => ck(vp, R.flows[vp].firstBattle.scrollNeeded.length === 0 && Object.values(R.home[vp]).every((m) => m.scrollY === 0), { scrollNeeded: R.flows[vp].firstBattle.scrollNeeded, scrollY: Object.fromEntries(Object.entries(R.home[vp]).map(([k, m]) => [k, m.scrollY])) })))
add('AC9', '新規：自動操作 15 秒以内・短い説明は 3 行 120 字以下でボタンがスクロールなしで見える（人の目標 60 秒）', vps.map((vp) => {
  const fb = R.flows[vp].firstBattle
  return ck(vp, fb.firstCardAtMs <= 15000 && fb.brief.lines.length === 3 && fb.brief.linesChars <= 120 && fb.brief.buttons.every((b) => b.inView) && !fb.brief.cardScrolls && fb.humanEstimateSec <= 60, { ms: fb.firstCardAtMs, lines: fb.brief.linesChars, humanEstimateSec: fb.humanEstimateSec })
}))
add('AC10', '続きから 1 クリックで戦闘に戻る／未知の敵を含む保存では続きからを出さない', vps.flatMap((vp) => [
  ck(`${vp}/resume`, R.flows[vp].resume.clicks === 1 && R.flows[vp].resume.scrollNeeded === 0 && R.flows[vp].resume.round === '2', R.flows[vp].resume),
  ck(`${vp}/invalid`, R.home[vp].invalidResume.primary.every((p) => !p.text.startsWith('続きから')) && R.home[vp].invalidResume.startButton?.inView, R.home[vp].invalidResume.primary),
]))
add('AC11', 'PC：操作要素 5 個以下・すべて viewport 内・下位リンク 2 本', homes.filter((h) => pc(h.vp)).map(({ vp, name, m }) => ck(`${vp}/${name}`, m.interactiveCount <= 5 && m.links.length === 2 && m.links.every((l) => l.inView) && m.startButton?.inView, { n: m.interactiveCount, links: m.links })))
add('AC12', 'SP：操作要素 5 個以下・ボタン 44px 以上・進行は 1 行 3 個以下・リンク 2 本', homes.filter((h) => !pc(h.vp)).map(({ vp, name, m }) => ck(`${vp}/${name}`, m.interactiveCount <= 5 && m.minButtonHeight >= 44 && m.progressLines <= 1 && m.progressChips.length <= 3 && m.links.length === 2 && m.links.every((l) => l.inView), { n: m.interactiveCount, minH: m.minButtonHeight, chips: m.progressChips })))
add('AC13', 'scrollX = 0（Home・短い説明・戦闘開始直後）', vps.flatMap((vp) => [ck(`${vp}/home`, Object.values(R.home[vp]).every((m) => m.scrollX === 0)), ck(`${vp}/brief`, !R.flows[vp].firstBattle.brief.scrollX), ck(`${vp}/battle`, !R.flows[vp].firstBattle.battleScrollX)]))
add('AC15', 'Home の CLS ≤ 0.1', homes.map(({ vp, name, m }) => ck(`${vp}/${name}`, m.cls <= 0.1, m.cls)))
add('AC19', 'Daily：Home の CTA を押しても回数は減らず、戦闘開始で +1／初陣は Daily に触れない', vps.flatMap((vp) => {
  const d = R.flows[vp].daily
  return [
    ck(`${vp}/homeCta`, d.onDaily === '今日の神域挑戦' && d.usedBefore === 0 && d.usedAfterOpen === 0 && d.usedBeforeStart === 0 && d.usedAfterStart === 1 && d.mode === 'daily', d),
    ck(`${vp}/firstBattle`, R.flows[vp].firstBattle.dailyAfterCard === null && R.flows[vp].firstBattle.preset?.mode !== 'daily', R.flows[vp].firstBattle.dailyAfterCard),
  ]
}))
add('AC20', 'Home の表示だけで storage が 1 バイトも変わらない（全状態）', homes.map(({ vp, name, m }) => ck(`${vp}/${name}`, m.storageUnchanged, m.storageKeysAfter)))
add('AC21', '初陣：恵比寿・おすすめデッキ・試練の影・ふつうで始まり、勝利で戦績・報酬・初撃破が記録され、もう一度／デッキを調整が動く', [
  ...vps.map((vp) => ck(`${vp}/preset`, JSON.stringify(R.flows[vp].firstBattle.preset) === JSON.stringify({ godId: 'ebisu', enemyId: 'enemy_01', difficulty: 'normal', mode: 'normal', stake: 0, otomoGrowthPath: 'guardian' }) && R.flows[vp].firstBattle.deckPreferenceAfterCard === null, R.flows[vp].firstBattle.preset)),
  ...battleVps.flatMap((vp) => {
    const w = R.flows[vp].firstWin
    const l = R.flows[vp].firstLoss
    return [
      ck(`${vp}/win`, w.status?.includes('勝利') && !w.timedOut, w.status),
      ck(`${vp}/reward`, w.rewardPending && w.rewardFlow?.hub && !!w.rewardFlow?.goal, w.rewardFlow),
      ck(`${vp}/record`, w.ebisuRecord?.wins === 1, w.ebisuRecord),
      ck(`${vp}/p2FirstClear`, !!w.matchupClear && Array.isArray(w.matchupsEbisu) && w.matchupsEbisu.includes('enemy_01'), { clear: w.matchupClear, cleared: w.matchupsEbisu }),
      ck(`${vp}/rematch`, JSON.stringify(w.rematch) === JSON.stringify({ godId: 'ebisu', enemyId: 'enemy_01', difficulty: 'normal', mode: 'normal' }), w.rematch),
      ck(`${vp}/winDailyUntouched`, w.dailyKey === null && w.deckPreference === null, { daily: w.dailyKey, deck: w.deckPreference }),
      ck(`${vp}/loss`, !!l.status && !l.status.includes('勝利') && !l.timedOut, l.status),
      ck(`${vp}/adjustDeck`, l.adjust?.title?.includes('恵比寿') && l.adjust?.enemyShown, l.adjust),
      ck(`${vp}/homeAfterFirstBattle`, l.homeAfter?.primary !== 'firstBattle' && l.homeAfter?.god === 'ebisu', l.homeAfter),
    ]
  }),
])
add('AC22', '既存プレイヤーに「初陣へ」を出さない／「神を選ぶ」は全状態で初期 viewport 内', homes.map(({ vp, name, m }) => ck(`${vp}/${name}`, (name === 'new' || m.primaryState !== 'firstBattle') && m.startButton?.inView, { state: m.primaryState })))
add('AC23', '既存機能へ Home から 1 クリック（通常戦・神域挑戦・戦績・OTOMO・遊び方・ミュート・感想）', vps.map((vp) => {
  const m = R.home[vp].dailyOnce
  return ck(vp, m.startButton?.inView && m.todayCta.length === 1 && m.links.map((l) => l.text).join('|') === '戦績を見る|OTOMOとの絆を見る' && ['ミュート', '遊び方を見る', '感想・不具合を送る'].every((l) => m.headerIcons.includes(l)) && R.flows[vp].tutorial.manual.open && R.flows[vp].tutorial.manual.sections === 6 && R.flows[vp].tutorial.closed && R.flows[vp].tutorial.moreOpens && R.flows[vp].tutorial.backHome, { links: m.links.map((l) => l.text), icons: m.headerIcons, tutorial: R.flows[vp].tutorial })
}))
add('AC25b', '7 柱すべての Hero 画像が 200 で読み込め、寸法が一致し、520KB 以下', Object.entries(R.heroImages).map(([god, r]) => ck(god, r.status === 200 && r.w === r.expect[0] && r.h === r.expect[1] && r.bytes <= 520 * 1024, r)))
add('AC25', 'JS error 0・壊れた画像 0・API／外部通信 0（全シナリオ）', [
  ...homes.map(({ vp, name, m }) => ck(`${vp}/${name}`, m.errors.length === 0 && m.brokenImages.length === 0 && m.failed.length === 0 && m.api.length === 0 && m.external.length === 0, { errors: m.errors, broken: m.brokenImages, failed: m.failed })),
  ...vps.map((vp) => ck(`${vp}/flows`, [R.flows[vp].firstBattle, R.flows[vp].resume, R.flows[vp].daily, R.flows[vp].tutorial, R.flows[vp].firstWin, R.flows[vp].firstLoss, R.flows[vp].normal].filter(Boolean).every((x) => x.errors.length === 0) && R.flows[vp].firstBattle.failed.length === 0, 'errors')),
])
add('EXTRA-1', '通常戦（神を選ぶ → 神 → 敵 → デッキ）は従来どおりで、最後にデッキを確定した神が次の Home の Hero になる', battleVps.map((vp) => {
  const n = R.flows[vp].normal
  return ck(vp, n.enemySelect === '挑む敵を選ぼう' && n.deckTitle?.includes('大耀') && n.godId === 'taiyo' && n.enemyId === 'enemy_02' && n.deckPreferenceGod === 'taiyo' && n.homeAfterReload.primary === 'resume' && n.homeAfterReload.god === 'taiyo', n)
}))

R.judgments = J
R.allPass = J.every((j) => j.pass)
writeFileSync(`${out}/entrance-acceptance.json`, JSON.stringify(R, null, 1))
await browser.close()
for (const j of J) console.log(`${j.pass ? 'PASS' : 'FAIL'}  ${j.id.padEnd(7)} ${j.title}  (${j.n - j.failed.length}/${j.n})${j.pass ? '' : '\n      ' + JSON.stringify(j.failed.slice(0, 3)).slice(0, 900)}`)
console.log(R.allPass ? 'ALL PASS' : 'SOME FAIL')
process.exit(R.allPass ? 0 : 1)

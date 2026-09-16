// Phase 7 P1（決定187）：Result Hub ＋ Home Today ＋ Daily Difference の受け入れ試験（QA 用。ゲームコードではない）。
//
//   node scripts/phase7-p1/acceptance.mjs <outDir> <baseUrl> [--baseline <baselineUrl>] [--only pc1508,sp844,...]
//
// 仕様 docs/PHASE7_P1_RESULT_HOME_SPEC.md §16 の AC を実画面で機械測定し、<outDir>/acceptance.json と
// スクリーンショットを出す。--baseline を渡すと、変更前ビルドと戦闘画面のレイアウト（offset 系の箱）を
// 比較する（AC6）。localStorage はブラウザコンテキストごとに空から始まる（実ユーザーの保存には触れない）。
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadChromium, VIEWPORTS } from '../release-audit/_lib.mjs'

const args = process.argv.slice(2)
const outDir = args[0]
const base = args.find((a, i) => i > 0 && a.startsWith('http') && args[i - 1] !== '--baseline') ?? 'http://localhost:4173'
const baselineUrl = args.includes('--baseline') ? args[args.indexOf('--baseline') + 1] : null
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null
/** --layout-only：AC6（戦闘レイアウト比較）だけを実行する */
const layoutOnly = args.includes('--layout-only')
/** --scenarios normalWin,dailyLoseFirst：指定したシナリオだけを実行する（部分的な再計測用） */
const scenarioFilter = args.includes('--scenarios') ? args[args.indexOf('--scenarios') + 1].split(',') : null
if (!outDir) {
  console.error('usage: node scripts/phase7-p1/acceptance.mjs <outDir> <baseUrl> [--baseline <url>] [--only pc1508,sp844]')
  process.exit(2)
}
mkdirSync(outDir, { recursive: true })

const chromium = await loadChromium()
const browser = await chromium.launch({ headless: true })
const report = { base, baselineUrl, startedAt: new Date().toISOString(), viewports: {}, layout: null, errors: [] }

// ---------- ブラウザ内で評価する計測関数 ----------
const HOME_METRICS = () => {
  const vh = window.innerHeight
  const vw = window.innerWidth
  const inView = (el) => {
    if (!el) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= vh && r.left >= 0 && r.right <= vw
  }
  const rect = (el) => {
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), width: Math.round(r.width) }
  }
  const primary = document.querySelector('.home-screen .home-cta-primary')
  const today = document.querySelector('[data-testid="home-today"]')
  const links = [...document.querySelectorAll('.home-links .home-howto-button')]
  const buttons = [...document.querySelectorAll('.home-screen button')].map((b) => ({ text: b.textContent.trim().replace(/\s+/g, ' ').slice(0, 40), height: Math.round(b.getBoundingClientRect().height) }))
  return {
    vw,
    vh,
    scrollX: window.scrollX,
    overflowX: document.documentElement.scrollWidth > vw + 1,
    primaryText: primary?.textContent.trim().replace(/\s+/g, '') ?? null,
    primaryRect: rect(primary),
    resume: !!document.querySelector('[data-testid="home-resume"]'),
    resumeText: document.querySelector('[data-testid="home-resume"]')?.textContent.trim().replace(/\s+/g, ' ') ?? null,
    todayRect: rect(today),
    todayEnemy: document.querySelector('[data-testid="home-today-enemy"]')?.textContent.trim() ?? null,
    todayEnemyInView: inView(document.querySelector('[data-testid="home-today-enemy"]')),
    todayAttempts: document.querySelector('[data-testid="home-today-attempts"]')?.textContent.trim() ?? null,
    todayAttemptsInView: inView(document.querySelector('[data-testid="home-today-attempts"]')),
    todayBest: document.querySelector('[data-testid="home-today-best"]')?.textContent.trim() ?? null,
    todayCta: document.querySelector('[data-testid="home-today-cta"]')?.textContent.trim() ?? null,
    todayCtaInView: inView(document.querySelector('[data-testid="home-today-cta"]')),
    countdown: document.querySelector('[data-testid="home-today-countdown"]')?.textContent.trim() ?? null,
    progress: [...document.querySelectorAll('[data-testid="home-progress"] li')].map((li) => li.textContent.trim()),
    primaryAboveToday: primary && today ? primary.getBoundingClientRect().bottom <= today.getBoundingClientRect().top : null,
    primaryInView: inView(primary),
    linksInView: links.map(inView),
    linkRects: links.map(rect),
    buttons,
    minButtonHeight: Math.min(...buttons.map((b) => b.height)),
    hasOldDailyButton: !!document.querySelector('.home-cta-daily'),
  }
}

const RESULT_METRICS = () => {
  const vh = window.innerHeight
  const vw = window.innerWidth
  const card = document.querySelector('.game-over-card')
  if (!card) return null
  const inView = (el) => {
    if (!el) return false
    const r = el.getBoundingClientRect()
    const c = card.getBoundingClientRect()
    return r.width > 0 && r.height > 0 && r.top >= Math.max(0, c.top) && r.bottom <= Math.min(vh, c.bottom) && r.left >= 0 && r.right <= vw
  }
  const btn = (b) => {
    const r = b.getBoundingClientRect()
    return { text: b.textContent.trim(), exit: b.dataset.exit ?? null, testid: b.dataset.testid ?? null, top: Math.round(r.top), height: Math.round(r.height), width: Math.round(r.width), area: Math.round(r.width * r.height), inView: inView(b), disabled: b.disabled }
  }
  const goal = document.querySelector('[data-testid="next-goal"]')
  const goalText = goal?.querySelector('.result-next-goal-text')
  const goalLineHeight = goalText ? parseFloat(getComputedStyle(goalText).lineHeight) : 0
  const primary = document.querySelector('[data-testid="result-primary"]')
  const share = document.querySelector('[data-testid="result-share"]')
  const all = [...card.querySelectorAll('button')]
  const indexOf = (el) => (el ? all.indexOf(el) : -1)
  const daily = document.querySelector('[data-testid="daily-diff"]')
  return {
    vw,
    vh,
    status: document.querySelector('.game-over-status')?.textContent.trim() ?? null,
    score: document.querySelector('.game-over-score')?.textContent.trim() ?? null,
    rewardPending: !!document.querySelector('[data-testid="open-reward"]'),
    goal: goal ? { id: goal.dataset.goalId, text: goalText?.textContent.trim() ?? '', textHeight: Math.round(goalText?.getBoundingClientRect().height ?? 0), lineHeight: goalLineHeight, lines: goalLineHeight ? Math.round((goalText?.getBoundingClientRect().height ?? 0) / goalLineHeight) : null, inView: inView(goal) } : null,
    primary: primary ? btn(primary) : null,
    secondary: [...document.querySelectorAll('[data-testid="result-secondary"]')].map(btn),
    tertiary: [...document.querySelectorAll('[data-testid="result-tertiary"] button')].map(btn),
    share: share ? btn(share) : null,
    shareAfterPrimary: share && primary ? indexOf(share) > indexOf(primary) : null,
    buttonsInView: all.filter(inView).map((b) => ({ text: b.textContent.trim(), exit: b.dataset.exit ?? null })),
    dailyDiff: daily ? [...daily.querySelectorAll('p')].map((p) => p.textContent.trim()) : null,
    breakdownOpen: document.querySelector('.game-over-breakdown')?.open ?? null,
    scoreInView: inView(document.querySelector('.game-over-score')),
    card: { scrollHeight: card.scrollHeight, clientHeight: card.clientHeight, overflowX: card.scrollWidth > card.clientWidth + 1 },
    pageOverflowX: document.documentElement.scrollWidth > vw + 1,
    scrollX: window.scrollX,
  }
}

const BATTLE_LAYOUT = () => {
  const root = document.querySelector('.battle')
  if (!root) return null
  const out = {}
  const box = (el) => {
    let x = 0
    let y = 0
    let e = el
    while (e) {
      x += e.offsetLeft
      y += e.offsetTop
      e = e.offsetParent
    }
    return [x, y, el.offsetWidth, el.offsetHeight]
  }
  const walk = (el, path, depth) => {
    if (depth > 5) return
    ;[...el.children].forEach((c, i) => {
      if (!(c instanceof HTMLElement)) return
      const cls = (c.getAttribute('class') ?? '').split(/\s+/).filter((k) => k && !/(active|flash|tier|shake|pop|anim|glow|ready|pulse|hit|burst|cutin|callout|toast|float|enter|leave|show)/i.test(k)).slice(0, 2).join('.')
      const key = `${path}/${c.tagName.toLowerCase()}${cls ? '.' + cls : ''}[${i}]`
      out[key] = box(c)
      walk(c, key, depth + 1)
    })
  }
  walk(root, 'battle', 0)
  return { vw: window.innerWidth, vh: window.innerHeight, scrollY: window.scrollY, boxes: out }
}

const STORAGE = () => {
  const j = (k) => {
    try {
      return JSON.parse(localStorage.getItem(k) ?? 'null')
    } catch {
      return null
    }
  }
  const daily = j('sevengods.daily')
  const save = j('sevengods.battleSave')
  return {
    daily: daily ? Object.values(daily.days).map((d) => ({ dateKey: d.dateKey, enemyId: d.enemyId, seed: d.seed, attemptsUsed: d.attemptsUsed, results: d.results.map((r) => [r.score, r.status, r.round]), bestScore: d.bestScore })) : null,
    save: save ? { version: save.version, mode: save.state?.mode ?? null, dailyKey: save.state?.dailyKey ?? null, seed: save.state?.seed ?? null, enemy: save.state?.enemy?.defId ?? null, stake: save.state?.stake ?? 0, round: save.state?.round ?? null, status: save.state?.status ?? null } : null,
  }
}

// ---------- 操作ヘルパー ----------
async function openPage(vpName, url = base) {
  const vp = VIEWPORTS[vpName]
  const ctx = await browser.newContext({ viewport: vp.viewport, isMobile: vp.isMobile, hasTouch: vp.isMobile })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()))
  await page.addInitScript(() => {
    window.__cls = 0
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value
      }).observe({ type: 'layout-shift', buffered: true })
    } catch {
      // ignore
    }
  })
  return { ctx, page, errors, url }
}

const clickText = (page, text) =>
  page.evaluate((t) => {
    const el = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(t) && !x.disabled)
    if (!el) return false
    el.click()
    return true
  }, text)

const clickSel = (page, sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s)
    if (!el || el.disabled) return false
    el.click()
    return true
  }, sel)

async function gotoHome(p, query = '') {
  await p.page.goto(p.url + '/' + query)
  await p.page.waitForSelector('.home-screen .home-cta-primary', { timeout: 30000 })
  await p.page.waitForTimeout(400)
  if (await clickText(p.page, 'わかった')) await p.page.waitForTimeout(400)
}

async function waitHome(page) {
  await page.waitForSelector('.home-screen .home-cta-primary', { timeout: 15000 })
  await page.waitForTimeout(500)
}

async function waitBattleReady(page) {
  await page.waitForSelector('.hand .card-view', { timeout: 20000 })
  await page.waitForFunction(() => {
    const b = document.querySelector('.end-round-button')
    return b && !b.disabled
  }, null, { timeout: 20000 })
}

async function startNormal(page, { god = '大耀', enemy = '業斧の鬼将' } = {}) {
  // P1 以前のビルド（--baseline）には data-testid が無いので文言で押す
  if (!(await clickSel(page, '[data-testid="home-start"]'))) await clickText(page, '神を選ぶ')
  await page.waitForTimeout(400)
  if (await clickText(page, '新しく始める')) await page.waitForTimeout(400)
  await clickText(page, god)
  await page.waitForTimeout(300)
  await clickText(page, 'この構成で始める')
  await page.waitForTimeout(300)
  await clickText(page, enemy)
  await page.waitForTimeout(400)
  await clickText(page, 'この構成でバトル開始')
  await waitBattleReady(page)
}

async function startDailyFromHome(page, { god = '大耀' } = {}) {
  await clickSel(page, '[data-testid="home-today-cta"]')
  await page.waitForSelector('.daily-screen', { timeout: 10000 })
  await page.waitForTimeout(400)
  await clickText(page, '挑戦開始')
  await page.waitForTimeout(400)
  if (await clickText(page, '新しく始める')) await page.waitForTimeout(400)
  await clickText(page, god)
  await page.waitForTimeout(300)
  await clickText(page, 'この構成で始める')
  await page.waitForTimeout(400)
  await clickText(page, 'この構成でバトル開始')
  await waitBattleReady(page)
}

const overlayUp = (page) => page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay'))

async function playToEnd(page, strategy) {
  for (let round = 1; round <= 8; round++) {
    if (await overlayUp(page)) break
    if (strategy !== 'lose') {
      for (let k = 0; k < 8; k++) {
        const picked = await page.evaluate((s) => {
          const cards = [...document.querySelectorAll('.hand .card-view')].filter((c) => !c.disabled)
          if (!cards.length) return false
          const name = (c) => c.querySelector('.card-view-name')?.textContent ?? ''
          const score = (c) =>
            s === 'win2'
              ? (c.querySelector('.card-view-bonus-ready') ? 3 : 0) + (/⚔|🌟|💀/.test(name(c)) ? 2 : 0) + (/🛡|🌿/.test(name(c)) ? 1 : 0)
              : (/⚔|🌟|💀/.test(name(c)) ? 3 : 0) + (c.querySelector('.card-view-bonus-ready') ? 1.5 : 0)
          cards.sort((x, y) => score(y) - score(x))
          cards[0].click()
          return true
        }, strategy)
        if (!picked) break
        await page.waitForTimeout(850)
        if (await page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay, .enemy-defeat'))) break
      }
      if (await page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay, .enemy-defeat'))) break
      await page.evaluate((s) => document.querySelectorAll('.divination-choice')[s === 'win2' ? 0 : 2]?.click(), strategy)
      await page.waitForTimeout(400)
    }
    await clickSel(page, '.end-round-button')
    await page.waitForTimeout(3300)
  }
  await page.waitForFunction(() => !!document.querySelector('.reward-overlay, .game-over-overlay'), null, { timeout: 25000 })
  await page.waitForTimeout(700)
}

/** 決着後：報酬が未確定ならその状態を測ってから 1 枚選び、結果画面が落ち着くまで待って測る */
async function settleResult(page, shot) {
  let pending = null
  if (await page.evaluate(() => !!document.querySelector('[data-testid="open-reward"]'))) {
    await page.waitForTimeout(2600)
    pending = await page.evaluate(RESULT_METRICS)
    await shot('reward-pending')
    await clickSel(page, '[data-testid="open-reward"]')
    await page.waitForSelector('.reward-overlay .reward-card', { timeout: 10000 })
    await page.waitForTimeout(400)
    await clickSel(page, '.reward-overlay .reward-card')
    await page.waitForSelector('.game-over-overlay', { timeout: 10000 })
  }
  await page.waitForTimeout(2600) // 勝利のステージング（最大 1.9s 遅延＋0.5s）を待った「settled」状態
  const metrics = await page.evaluate(RESULT_METRICS)
  await shot('result')
  await page.evaluate(() => {
    const c = document.querySelector('.game-over-card')
    if (c) c.scrollTop = c.scrollHeight
  })
  await page.waitForTimeout(250)
  await shot('result-scrolled')
  await page.evaluate(() => {
    const c = document.querySelector('.game-over-card')
    if (c) c.scrollTop = 0
  })
  return { pending, metrics }
}

const shooter = (vpName, scenario, page) => (name) => page.screenshot({ path: join(outDir, `${vpName}-${scenario}-${name}.png`) })

// ---------- シナリオ ----------
async function scenarioHomeNoResume(vpName) {
  const p = await openPage(vpName)
  await p.page.goto(p.url + '/')
  await p.page.waitForSelector('.home-screen .home-cta-primary', { timeout: 30000 })
  await p.page.waitForTimeout(3000)
  const clsLoad = await p.page.evaluate(() => window.__cls)
  // 実入力で閉じる（hadRecentInput の扱いを実ユーザーと同じにする）
  const ok = await p.page.getByRole('button', { name: 'わかった' }).click({ timeout: 3000 }).then(() => true).catch(() => false)
  await p.page.waitForTimeout(1500)
  const clsAfter = await p.page.evaluate(() => window.__cls)
  const metrics = await p.page.evaluate(HOME_METRICS)
  await shooter(vpName, 'home-noresume', p.page)('home')
  await p.page.screenshot({ path: join(outDir, `${vpName}-home-noresume-full.png`), fullPage: true })
  await p.ctx.close()
  return { metrics, clsLoad, clsAfterTutorial: clsAfter, tutorialClosed: ok, errors: p.errors }
}

async function scenarioNormalWin(vpName) {
  const p = await openPage(vpName)
  const shot = shooter(vpName, 'normal-win', p.page)
  await gotoHome(p, '?enemy=oni&seed=p7spec-result-normal-win')
  await startNormal(p.page)
  await playToEnd(p.page, 'win')
  const r = await settleResult(p.page, shot)
  // 既存の再戦経路（同じ構成でもう一度）が P1 の再配置後も同じ敵・通常モードで始まる
  const clicked = await clickSel(p.page, '.game-over-card [data-exit="rematch"]')
  await waitBattleReady(p.page)
  const rematch = { clicked, storage: await p.page.evaluate(STORAGE) }
  await p.ctx.close()
  return { ...r, rematch, errors: p.errors }
}

/** 通常敗北 → デッキを調整（敵・神階の引き継ぎ）→ 途中でリロード → ホームの「続きから」→ 敗北 → ホームへ（幽霊の続きが無い） */
async function scenarioNormalLoseChain(vpName) {
  const p = await openPage(vpName)
  const shot = shooter(vpName, 'normal-lose', p.page)
  await gotoHome(p, '?seed=p7acc-normal-lose')
  await startNormal(p.page)
  await playToEnd(p.page, 'lose')
  const lose = await settleResult(p.page, shot)

  // デッキを調整
  const adjustClicked = await clickSel(p.page, '[data-testid="result-secondary"][data-exit="adjustDeck"]')
  await p.page.waitForSelector('.deck-builder, .deck-builder-screen, [class*="deck-builder"]', { timeout: 10000 }).catch(() => {})
  await p.page.waitForTimeout(500)
  const onDeckScreen = await p.page.evaluate(() => [...document.querySelectorAll('button')].some((b) => b.textContent.includes('この構成でバトル開始')))
  await shot('adjust-deck')
  await clickText(p.page, 'この構成でバトル開始')
  await waitBattleReady(p.page)
  const afterAdjust = await p.page.evaluate(STORAGE)
  await clickSel(p.page, '.end-round-button')
  await p.page.waitForTimeout(3300)

  // リロード → ホーム（続きあり）
  await p.page.goto(p.url + '/')
  await waitHome(p.page)
  if (await clickText(p.page, 'わかった')) await p.page.waitForTimeout(400)
  const homeResume = await p.page.evaluate(HOME_METRICS)
  await shooter(vpName, 'home-resume', p.page)('home')

  // 続きから → 敗北 → Tertiary「ホームへ」
  await clickSel(p.page, '[data-testid="home-resume"]')
  await waitBattleReady(p.page)
  await playToEnd(p.page, 'lose')
  const resumed = await settleResult(p.page, shooter(vpName, 'resumed-lose', p.page))
  const homeClicked = await clickSel(p.page, '[data-exit="home"]')
  await waitHome(p.page)
  const homeAfter = await p.page.evaluate(HOME_METRICS)
  const storageAfter = await p.page.evaluate(STORAGE)
  await shooter(vpName, 'home-after-resumed-result', p.page)('home')
  await p.ctx.close()
  return { lose, adjustClicked, onDeckScreen, afterAdjust, homeResume, resumed, homeClicked, homeAfter, storageAfter, errors: p.errors }
}

/** 神域挑戦 3 回：Home 経由 → もう一度挑戦 → デッキを調整経由。回数・seed・結果画面を毎回測る */
async function scenarioDailySequence(vpName) {
  const p = await openPage(vpName)
  await gotoHome(p)
  const homeBefore = await p.page.evaluate(HOME_METRICS)
  const steps = []
  const snapshot = async (label) => ({ label, storage: await p.page.evaluate(STORAGE) })

  // 1 回目：Home Today 経由
  steps.push(await snapshot('before-1'))
  await startDailyFromHome(p.page, { god: '大耀' })
  steps.push(await snapshot('battle-1-started'))
  await playToEnd(p.page, 'win')
  const r1 = await settleResult(p.page, shooter(vpName, 'daily-1', p.page))
  steps.push(await snapshot('result-1'))

  // 2 回目：Primary「もう一度挑戦」
  const primary1 = r1.metrics?.primary?.exit
  await clickSel(p.page, '[data-testid="result-primary"]')
  await waitBattleReady(p.page)
  steps.push(await snapshot('battle-2-started'))
  await playToEnd(p.page, 'win2')
  const r2 = await settleResult(p.page, shooter(vpName, 'daily-2', p.page))
  steps.push(await snapshot('result-2'))

  // 3 回目：Secondary「デッキを調整」→ デッキ画面（ここではまだ消費しない）→ 開始
  await clickSel(p.page, '[data-testid="result-secondary"][data-exit="adjustDeck"]')
  await p.page.waitForTimeout(800)
  const onDeckScreen = await p.page.evaluate(() => [...document.querySelectorAll('button')].some((b) => b.textContent.includes('この構成でバトル開始')))
  steps.push(await snapshot('deck-before-3'))
  await clickText(p.page, 'この構成でバトル開始')
  await waitBattleReady(p.page)
  steps.push(await snapshot('battle-3-started'))
  await playToEnd(p.page, 'lose')
  const r3 = await settleResult(p.page, shooter(vpName, 'daily-3', p.page))
  steps.push(await snapshot('result-3'))

  // 残り 0 → Primary「ホームへ」→ Home Today は終了＋次の敵まで
  const homeClicked = await clickSel(p.page, '[data-testid="result-primary"][data-exit="home"]')
  await waitHome(p.page)
  const homeAfter = await p.page.evaluate(HOME_METRICS)
  steps.push(await snapshot('home-after'))
  await shooter(vpName, 'daily-exhausted', p.page)('home')
  // 神域挑戦画面でも開始できない
  await clickSel(p.page, '[data-testid="home-today-cta"]')
  await p.page.waitForTimeout(600)
  const startDisabled = await p.page.evaluate(() => {
    const b = [...document.querySelectorAll('.daily-actions button')].find((x) => x.textContent.includes('今日の挑戦は終了'))
    return b ? b.disabled : null
  })
  await p.ctx.close()
  return { homeBefore, r1, r2, r3, primary1, onDeckScreen, homeClicked, homeAfter, startDisabled, steps, errors: p.errors }
}

async function scenarioDailyLoseFirst(vpName) {
  const p = await openPage(vpName)
  await gotoHome(p)
  await startDailyFromHome(p.page, { god: '大耀' })
  await playToEnd(p.page, 'lose')
  const r = await settleResult(p.page, shooter(vpName, 'daily-lose-first', p.page))
  const storage = await p.page.evaluate(STORAGE)
  await p.ctx.close()
  return { ...r, storage, errors: p.errors }
}

async function captureBattleLayout(url, vpName) {
  const p = await openPage(vpName, url)
  await gotoHome(p, '?enemy=oni&seed=p7acc-layout')
  await startNormal(p.page)
  await p.page.waitForTimeout(1500)
  const layout = await p.page.evaluate(BATTLE_LAYOUT)
  await p.page.screenshot({ path: join(outDir, `${vpName}-layout-${url === base ? 'rc' : 'baseline'}.png`) })
  await p.ctx.close()
  return { layout, errors: p.errors }
}

// ---------- 実行 ----------
const FULL = ['pc1508', 'sp844']
const LIGHT = ['pc1366', 'sp760']
const run = async (name, fn) => {
  if (scenarioFilter && !scenarioFilter.some((s) => name.includes(s))) return undefined
  const t = Date.now()
  try {
    const r = await fn()
    console.log(`  ✓ ${name} (${Math.round((Date.now() - t) / 1000)}s)`)
    return r
  } catch (e) {
    console.log(`  ✗ ${name}: ${String(e).slice(0, 200)}`)
    report.errors.push({ name, error: String(e) })
    return { error: String(e) }
  }
}

for (const vp of FULL) {
  if (layoutOnly || (only && !only.includes(vp))) continue
  console.log(vp)
  report.viewports[vp] = {
    homeNoResume: await run(`${vp} home-noresume`, () => scenarioHomeNoResume(vp)),
    normalWin: await run(`${vp} normal-win`, () => scenarioNormalWin(vp)),
    normalLoseChain: await run(`${vp} normal-lose → adjust → resume → home`, () => scenarioNormalLoseChain(vp)),
    dailySequence: await run(`${vp} daily ×3 (home → rematch → adjust)`, () => scenarioDailySequence(vp)),
    dailyLoseFirst: await run(`${vp} daily lose (best 未記録)`, () => scenarioDailyLoseFirst(vp)),
  }
}
for (const vp of LIGHT) {
  if (layoutOnly || (only && !only.includes(vp))) continue
  console.log(vp)
  report.viewports[vp] = {
    homeNoResume: await run(`${vp} home-noresume`, () => scenarioHomeNoResume(vp)),
    normalWin: await run(`${vp} normal-win`, () => scenarioNormalWin(vp)),
    dailyLoseFirst: await run(`${vp} daily lose (best 未記録)`, () => scenarioDailyLoseFirst(vp)),
  }
}
if (baselineUrl) {
  report.layout = {}
  for (const vp of ['pc1508', 'sp844']) {
    if (only && !only.includes(vp)) continue
    const before = await run(`${vp} battle layout (baseline)`, () => captureBattleLayout(baselineUrl, vp))
    const after = await run(`${vp} battle layout (rc)`, () => captureBattleLayout(base, vp))
    const a = before.layout?.boxes ?? {}
    const b = after.layout?.boxes ?? {}
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    const diffs = []
    for (const k of keys) {
      if (!a[k] || !b[k]) diffs.push({ key: k, before: a[k] ?? null, after: b[k] ?? null })
      else if (a[k].some((v, i) => v !== b[k][i])) diffs.push({ key: k, before: a[k], after: b[k] })
    }
    report.layout[vp] = { elements: keys.size, diffs, errors: [...(before.errors ?? []), ...(after.errors ?? [])] }
  }
}

report.finishedAt = new Date().toISOString()
writeFileSync(join(outDir, 'acceptance.json'), JSON.stringify(report, null, 2))
await browser.close()
console.log('wrote', join(outDir, 'acceptance.json'))

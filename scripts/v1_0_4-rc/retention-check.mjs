// v1.0.4 Retention 束 Preview Gate：headless 受入（Playwright chromium・vite preview に対して実行。QA 用。ゲームコードではない）。
//
//   node scripts/v1_0_4-rc/retention-check.mjs <outDir> <baseUrl> [--only pc1508,sp844]
//
// 既存 phase7-p1／entrance-e1 受入では測れない v1.0.4 固有の 2 点だけを測る（計測関数・操作ヘルパーは
// scripts/phase7-p1/acceptance.mjs の複製。判定は summarize 側ではなく本スクリプト内で行う）。
//   G4b：通常戦の初撃破で NM1 → 同じ構成でもう一度 → 2 勝目は NM1 が出ない
//   G3w：神域挑戦で勝利したとき、結果画面の 1 行目が「今日の問い：解けた（R{n} 撃破）」、Home に同じ verdict
// localStorage はブラウザコンテキストごとに空から始まる（実ユーザーの保存には触れない）。
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadChromium, VIEWPORTS } from '../release-audit/_lib.mjs'

const args = process.argv.slice(2)
const outDir = args[0]
const base = args.find((a, i) => i > 0 && a.startsWith('http')) ?? 'http://localhost:4173'
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null
/** --daily-god 恵比寿 --daily-strategy win2：神域挑戦（日替わりの敵）で勝てる組み合わせを探すための指定（既定 大耀・win） */
const DAILY_GOD = args.includes('--daily-god') ? args[args.indexOf('--daily-god') + 1] : '大耀'
const DAILY_STRATEGY = args.includes('--daily-strategy') ? args[args.indexOf('--daily-strategy') + 1] : 'win'
/** --scenarios daily：G3w だけ（G4b を飛ばす） */
const scenarios = args.includes('--scenarios') ? args[args.indexOf('--scenarios') + 1].split(',') : ['secondWin', 'daily', 'firstBattle']
if (!outDir) {
  console.error('usage: node scripts/v1_0_4-rc/retention-check.mjs <outDir> <baseUrl> [--only pc1508,sp844]')
  process.exit(2)
}
mkdirSync(outDir, { recursive: true })

const chromium = await loadChromium()
const browser = await chromium.launch({ headless: true })
const report = { base, startedAt: new Date().toISOString(), viewports: {}, errors: [] }

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

// ---------- シナリオ（v1.0.4） ----------
/** G4b：初撃破 → NM1、同じ構成でもう一度 → 2 勝目は NM1 なし */
async function scenarioSecondWin(vpName) {
  const p = await openPage(vpName)
  const shot1 = shooter(vpName, 'g4b-win1', p.page)
  const shot2 = shooter(vpName, 'g4b-win2', p.page)
  await gotoHome(p, '?enemy=oni&seed=p7spec-result-normal-win')
  await startNormal(p.page)
  await playToEnd(p.page, 'win')
  const win1 = await settleResult(p.page, shot1)
  const rematchClicked = await clickSel(p.page, '.game-over-card [data-exit="rematch"]')
  await waitBattleReady(p.page)
  await playToEnd(p.page, 'win')
  const win2 = await settleResult(p.page, shot2)
  const matchups = await p.page.evaluate(() => localStorage.getItem('sevengods.matchups'))
  await p.ctx.close()
  return { win1: win1.metrics, win2: win2.metrics, rematchClicked, matchups, errors: p.errors }
}

/** G4c：新規プレイヤーの初陣（恵比寿×試練の影×ふつう）に勝つ → 初撃破でもあるが、次の目標は NR1（決定206）が NM1 より優先 */
async function scenarioFirstBattle(vpName) {
  const p = await openPage(vpName)
  const shot = shooter(vpName, 'g4c-first', p.page)
  await p.page.goto(p.url + '/')
  await p.page.waitForSelector('[data-testid="home-first-battle"]', { timeout: 30000 })
  await clickSel(p.page, '[data-testid="home-first-battle"]')
  await p.page.waitForSelector('[data-testid="first-battle-brief"]', { timeout: 10000 })
  await clickText(p.page, '出陣する')
  await waitBattleReady(p.page)
  await playToEnd(p.page, 'win')
  const r = await settleResult(p.page, shot)
  const matchupClear = await p.page.evaluate(() => document.querySelector('[data-testid="matchup-clear"]')?.textContent.trim() ?? null)
  await p.ctx.close()
  return { result: r.metrics, matchupClear, errors: p.errors }
}

/** G3w：Home（未着手）→ 神域挑戦 1 回目を勝ちに行く → 結果の verdict → ホームへ → Home の verdict */
async function scenarioDailyWin(vpName) {
  const p = await openPage(vpName)
  const shot = shooter(vpName, 'g3w-daily', p.page)
  await gotoHome(p)
  const homeBefore = await p.page.evaluate(() => document.querySelector('[data-testid="home-today-verdict"]')?.textContent.trim() ?? null)
  await startDailyFromHome(p.page, { god: DAILY_GOD })
  await playToEnd(p.page, DAILY_STRATEGY)
  const r = await settleResult(p.page, shot)
  const exitHome = (await clickSel(p.page, '.game-over-card [data-exit="home"]')) || (await clickText(p.page, 'ホームへ'))
  await waitHome(p.page)
  const homeAfter = await p.page.evaluate(() => ({
    verdict: document.querySelector('[data-testid="home-today-verdict"]')?.textContent.trim() ?? null,
    countdown: document.querySelector('[data-testid="home-today-countdown"]')?.textContent.trim() ?? null,
  }))
  await shooter(vpName, 'g3w-daily', p.page)('home-after')
  const storage = await p.page.evaluate(STORAGE)
  await p.ctx.close()
  return { homeBefore, result: r.metrics, exitHome, homeAfter, storage, errors: p.errors }
}

// ---------- 実行 ----------
const checks = []
const check = (id, name, ok, detail) => checks.push({ id, name, ok: !!ok, detail })
const run = async (name, fn) => {
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

for (const vp of ['pc1508', 'sp844']) {
  if (only && !only.includes(vp)) continue
  console.log(vp)
  const sw = scenarios.includes('secondWin') ? await run(`${vp} G4b second win`, () => scenarioSecondWin(vp)) : null
  const dw = scenarios.includes('daily') ? await run(`${vp} G3w daily win（${DAILY_GOD}・${DAILY_STRATEGY}）`, () => scenarioDailyWin(vp)) : null
  const fb = scenarios.includes('firstBattle') ? await run(`${vp} G4c first battle`, () => scenarioFirstBattle(vp)) : null
  report.viewports[vp] = { secondWin: sw, dailyWin: dw, firstBattle: fb, dailyGod: DAILY_GOD, dailyStrategy: DAILY_STRATEGY }

  if (fb) {
    check('G4c', `${vp}/初陣：勝利`, fb.result?.status === '勝利', { status: fb.result?.status })
    check('G4c', `${vp}/初陣：初撃破の 1 行が出る（初撃破の経路を通った）`, !!fb.matchupClear, fb.matchupClear)
    check('G4c', `${vp}/初陣：次の目標は NR1（NM1 ではない）`, fb.result?.goal?.id === 'NR1', fb.result?.goal)
    check('G4c', `${vp}/JS error 0`, (fb.errors ?? ['?']).length === 0, fb.errors)
  }

  if (sw) {
  check('G4b', `${vp}/1 勝目：勝利かつ NM1`, sw.win1?.status === '勝利' && sw.win1?.goal?.id === 'NM1', { status: sw.win1?.status, goal: sw.win1?.goal })
  check('G4b', `${vp}/もう一度が押せた`, sw.rematchClicked, sw.rematchClicked)
  check('G4b', `${vp}/2 勝目：勝利かつ NM1 なし`, sw.win2?.status === '勝利' && sw.win2?.goal?.id !== 'NM1', { status: sw.win2?.status, goal: sw.win2?.goal })
  check('G4b', `${vp}/JS error 0`, (sw.errors ?? ['?']).length === 0, sw.errors)
  }
  if (!dw) continue

  const lines = dw.result?.dailyDiff ?? []
  const st = dw.result?.status
  const expectVerdict = st === '勝利' ? /^今日の問い：解けた（R\d 撃破）$/ : /^今日の問い：未解（(R\d 敗北|7R 未撃破)）$/
  // 勝利経路の verdict を見るのが目的。敗北なら INFO として残し、PASS 数には数えない（--daily-god／--daily-strategy を変えて再実行）
  if (st !== '勝利') console.log(`INFO  G3w  ${vp}：勝利せず（${st}・${dw.result?.score}）＝勝利経路は未確認`)
  check('G3w', `${vp}/勝利経路を通った`, st === '勝利', { status: st, score: dw.result?.score })
  check('G3w', `${vp}/Home 未挑戦：今日の問い：未着手`, dw.homeBefore === '今日の問い：未着手', dw.homeBefore)
  check('G3w', `${vp}/結果画面 1 行目が status と一致する verdict（${st}）`, expectVerdict.test(lines[0] ?? ''), lines)
  check('G3w', `${vp}/verdict の下にベスト行が残る`, (lines[1] ?? '').includes('今日のベスト'), lines)
  check('G3w', `${vp}/Home の verdict が結果画面と同じ`, dw.homeAfter?.verdict === lines[0], { home: dw.homeAfter?.verdict, result: lines[0] })
  check('G3w', `${vp}/残り 2 回の Home に countdown なし`, dw.homeAfter?.countdown === null, dw.homeAfter?.countdown)
  check('G3w', `${vp}/JS error 0`, (dw.errors ?? ['?']).length === 0, dw.errors)
}

report.checks = checks
report.pass = checks.filter((c) => c.ok).length
report.total = checks.length
report.finishedAt = new Date().toISOString()
writeFileSync(join(outDir, 'retention-check.json'), JSON.stringify(report, null, 2))
await browser.close()
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.id}  ${c.name}${c.ok ? '' : '  ' + JSON.stringify(c.detail).slice(0, 300)}`)
console.log(`${report.pass}/${report.total} → ${join(outDir, 'retention-check.json')}`)
process.exit(report.pass === report.total ? 0 : 1)

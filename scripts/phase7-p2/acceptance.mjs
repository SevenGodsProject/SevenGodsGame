// Phase 7 P2（決定189）：神×敵の攻略記録の受け入れ試験（QA 用。ゲームコードではない）。
//
//   node scripts/phase7-p2/acceptance.mjs <outDir> <p2Url> --p1 <p1BuildUrl> [--only sp844,pc1508]
//
// 仕様 docs/PHASE7_P2_49_MATRIX_SPEC.md §18 の AC を実画面で機械測定し、<outDir>/p2-acceptance.json と
// スクリーンショットを出す。--p1 には変更前（Phase 7 P1 LIVE）のビルドを渡す（ロールバック互換と Home の同一性に使う）。
// localStorage はブラウザコンテキストごとに空から始まる（実ユーザーの保存には触れない）。
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadChromium, VIEWPORTS } from '../release-audit/_lib.mjs'

const args = process.argv.slice(2)
const outDir = args[0]
const p2 = args.find((a, i) => i > 0 && a.startsWith('http') && args[i - 1] !== '--p1')
const p1 = args.includes('--p1') ? args[args.indexOf('--p1') + 1] : null
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null
/** --scenarios fixture,homeParity：指定したシナリオだけ（部分的な再計測用） */
const scenarioFilter = args.includes('--scenarios') ? args[args.indexOf('--scenarios') + 1].split(',') : null
if (!outDir || !p2 || !p1) {
  console.error('usage: node scripts/phase7-p2/acceptance.mjs <outDir> <p2Url> --p1 <p1BuildUrl> [--only sp844,pc1508]')
  process.exit(2)
}
mkdirSync(outDir, { recursive: true })
const chromium = await loadChromium()
const browser = await chromium.launch({ headless: true })
const report = { p2, p1, startedAt: new Date().toISOString(), scenarios: {}, errors: [] }

// ---------- fixture：既存プレイヤー（通常戦を多く遊び、神域挑戦も 31 日分ある） ----------
const pad = (n) => String(n).padStart(2, '0')
const jstKey = (msAgoDays) => {
  const d = new Date(Date.now() + 9 * 3600e3 - msAgoDays * 86400e3)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}
function fixture() {
  const days = {}
  const put = (key, enemyId, results) => {
    days[key] = { dateKey: key, enemyId, seed: `daily-${key}-${enemyId}`, attemptsUsed: results.length, results: results.map((r, i) => ({ score: r.status === 'won' ? 800 : 0, round: 5, at: i + 1, ...r })), bestScore: 800, bestGodId: null, bestByGod: {} }
  }
  // 最新から数えて 31 日分（保存期間 30 件）。最も古い日（範囲外）の勝利は取り込まれない
  for (let i = 30; i >= 1; i--) put(jstKey(i), 'enemy_04', [{ godId: 'juraku', status: 'lost' }])
  put(jstKey(31), 'enemy_03', [{ godId: 'sobi', status: 'won' }])
  // 範囲内：勝利（大耀×鬼将は 2 日で重複）・敗北のみ（恵比寿×龍神）・勝利（才華×道化）
  put(jstKey(5), 'enemy_02', [{ godId: 'taiyo', status: 'won' }, { godId: 'taiyo', status: 'won' }])
  put(jstKey(4), 'enemy_02', [{ godId: 'taiyo', status: 'won' }])
  put(jstKey(3), 'enemy_06', [{ godId: 'ebisu', status: 'lost' }, { godId: 'ebisu', status: 'finished' }])
  put(jstKey(2), 'enemy_07', [{ godId: 'saika', status: 'won' }])
  // 不正データ（無視される）。※存在しない敵 ID の日は入れない：戦績画面の神域挑戦表（既存・P1 以前から）が
  // getEnemyDef の例外で描画できなくなるため（P2 の範囲外の既知事項。取り込み側の無視は単体テストで検証）
  days['bad-key'] = { dateKey: 'bad-key', enemyId: 'enemy_01', results: [{ godId: 'shouren', status: 'won' }] }
  return {
    'sevengods.tutorialSeen': 'true',
    // 通常戦の勝利数だけがある神（推測で点灯させてはいけない）
    'sevengods.records': JSON.stringify({ version: 1, records: { taiyo: { bestScore: 0, bestScoreDifficulty: null, bestBattleScore: 1094, bestBattleScoreDifficulty: 'hard', wins: 14, losses: 3, finished: 1, fastestWinRound: 3 }, sobi: { bestScore: 0, bestScoreDifficulty: null, bestBattleScore: 902, bestBattleScoreDifficulty: 'normal', wins: 5, losses: 1, finished: 0, fastestWinRound: 5 } } }),
    'sevengods.stakes': JSON.stringify({ version: 1, byGod: { taiyo: { hardCleared: true, maxCleared: 7, bestByStake: { 1: 1180 } } } }),
    'sevengods.otomoBond': JSON.stringify({ version: 1, records: { taiyo: { battlesPlayed: 18, resonanceCount: 9, dojiReached: 0 } } }),
    'sevengods.daily': JSON.stringify({ version: 1, days }),
  }
}
const EXPECTED_FIXTURE_CLEARED = ['taiyo:enemy_02', 'saika:enemy_07']

// ---------- ブラウザ内の計測 ----------
const RECORDS_METRICS = () => {
  const vw = window.innerWidth
  const board = document.querySelector('[data-testid="matchup-board"]')
  const chips = [...document.querySelectorAll('[data-testid="matchup-chip"]')]
  const rows = [...document.querySelectorAll('[data-testid="matchup-row"]')]
  const fs = (el) => (el ? parseFloat(getComputedStyle(el).fontSize) : 0)
  return {
    vw,
    vh: window.innerHeight,
    docScrollWidth: document.documentElement.scrollWidth,
    overflowX: document.documentElement.scrollWidth > vw + 1,
    scrollX: window.scrollX,
    board: !!board,
    boardTop: board ? Math.round(board.getBoundingClientRect().top + window.scrollY) : null,
    dailyTop: document.querySelector('.record-daily') ? Math.round(document.querySelector('.record-daily').getBoundingClientRect().top + window.scrollY) : null,
    total: document.querySelector('[data-testid="matchup-total"]')?.textContent.trim() ?? null,
    rule: document.querySelector('[data-testid="matchup-rule"]')?.textContent.trim() ?? null,
    seededNote: document.querySelector('[data-testid="matchup-seeded-note"]')?.textContent.trim() ?? null,
    note: document.querySelector('.matchup-board-note')?.textContent.trim() ?? null,
    rows: rows.length,
    chips: chips.length,
    cleared: chips.filter((c) => c.dataset.cleared === 'true').map((c) => `${c.dataset.god}:${c.closest('[data-testid="matchup-row"]').dataset.enemy}`),
    checksOnCleared: chips.filter((c) => c.dataset.cleared === 'true').every((c) => !!c.querySelector('[data-testid="matchup-check"]')),
    checksOnOpen: chips.filter((c) => c.dataset.cleared === 'false').some((c) => !!c.querySelector('[data-testid="matchup-check"]')),
    openBorderStyle: (() => { const c = chips.find((x) => x.dataset.cleared === 'false'); return c ? getComputedStyle(c.querySelector('img')).borderTopStyle : null })(),
    clearedBorderStyle: (() => { const c = chips.find((x) => x.dataset.cleared === 'true'); return c ? getComputedStyle(c.querySelector('img')).borderTopStyle : null })(),
    openFilter: (() => { const c = chips.find((x) => x.dataset.cleared === 'false'); return c ? getComputedStyle(c.querySelector('img')).filter : null })(),
    enemyNameFont: Math.min(...rows.map((r) => fs(r.querySelector('.matchup-enemy-name')))),
    godNameFont: Math.min(...chips.map((c) => fs(c.querySelector('.matchup-chip-name')))),
    chipMinHeight: Math.min(...chips.map((c) => Math.round(c.getBoundingClientRect().height))),
    chipMinWidth: Math.min(...chips.map((c) => Math.round(c.getBoundingClientRect().width))),
    chipsInteractive: chips.some((c) => c.tagName === 'BUTTON' || c.querySelector('button, a') || getComputedStyle(c).cursor === 'pointer'),
    ariaLabels: chips.slice(0, 2).map((c) => c.getAttribute('aria-label')),
    dailyTableWrapScroll: (() => { const w = document.querySelector('.record-daily-table')?.parentElement; return w ? { client: w.clientWidth, scroll: w.scrollWidth } : null })(),
  }
}

const STORAGE_DUMP = () => {
  const o = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    o[k] = localStorage.getItem(k)
  }
  return o
}

const RESULT_METRICS = () => {
  const vh = window.innerHeight
  const card = document.querySelector('.game-over-card')
  if (!card) return null
  const inView = (el) => {
    if (!el) return false
    const r = el.getBoundingClientRect()
    const c = card.getBoundingClientRect()
    return r.height > 0 && r.top >= Math.max(0, c.top) && r.bottom <= Math.min(vh, c.bottom)
  }
  const primary = document.querySelector('[data-testid="result-primary"]')
  const buttons = [...card.querySelectorAll('button')]
  return {
    status: document.querySelector('.game-over-status')?.textContent.trim() ?? null,
    rewardPending: !!document.querySelector('[data-testid="open-reward"]'),
    matchupLine: document.querySelector('[data-testid="matchup-clear"]')?.textContent.trim() ?? null,
    goal: document.querySelector('[data-testid="next-goal"]')?.textContent.trim() ?? null,
    goalId: document.querySelector('[data-testid="next-goal"]')?.dataset.goalId ?? null,
    primary: primary ? { text: primary.textContent.trim(), exit: primary.dataset.exit, top: Math.round(primary.getBoundingClientRect().top), inView: inView(primary) } : null,
    secondaryInView: [...document.querySelectorAll('[data-testid="result-secondary"]')].filter(inView).length,
    otherActivityInView: buttons.filter(inView).filter((b) => b.dataset.exit && b.dataset.exit !== 'rematch' && b.dataset.exit !== 'share').length,
    dailyDiff: document.querySelector('[data-testid="daily-diff"]')?.textContent.trim() ?? null,
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
  }
}

// ---------- 操作 ----------
async function open(vpName, url, { seed = null, initScript = null } = {}) {
  const vp = VIEWPORTS[vpName]
  const ctx = await browser.newContext({ viewport: vp.viewport, isMobile: vp.isMobile, hasTouch: vp.isMobile })
  if (seed) {
    await ctx.addInitScript((s) => {
      if (sessionStorage.getItem('__p2seeded')) return
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v)
      sessionStorage.setItem('__p2seeded', '1')
    }, seed)
  }
  if (initScript) await ctx.addInitScript(initScript)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()))
  return { ctx, page, errors, url }
}
const click = (page, text) => page.evaluate((t) => { const el = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(t) && !x.disabled); if (!el) return false; el.click(); return true }, text)
const clickSel = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); if (!el || el.disabled) return false; el.click(); return true }, sel)
async function home(p, query = '') {
  await p.page.goto(p.url + '/' + query)
  await p.page.waitForSelector('.home-screen .home-cta-primary', { timeout: 30000 })
  await p.page.waitForTimeout(400)
  if (await click(p.page, 'わかった')) await p.page.waitForTimeout(400)
}
async function battleReady(page) {
  await page.waitForSelector('.hand .card-view', { timeout: 20000 })
  await page.waitForFunction(() => { const b = document.querySelector('.end-round-button'); return b && !b.disabled }, null, { timeout: 20000 })
}
async function startNormal(page, { god = '大耀', enemy = '業斧の鬼将' } = {}) {
  if (!(await clickSel(page, '[data-testid="home-start"]'))) await click(page, '神を選ぶ')
  await page.waitForTimeout(400)
  if (await click(page, '新しく始める')) await page.waitForTimeout(400)
  await click(page, god)
  await page.waitForTimeout(300)
  await click(page, 'この構成で始める')
  await page.waitForTimeout(400)
  await click(page, enemy)
  await page.waitForTimeout(400)
  await click(page, 'この構成でバトル開始')
  await battleReady(page)
}
async function playToEnd(page, strategy) {
  for (let round = 1; round <= 8; round++) {
    if (await page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay'))) break
    if (strategy !== 'lose') {
      for (let k = 0; k < 8; k++) {
        const picked = await page.evaluate((s) => {
          const cards = [...document.querySelectorAll('.hand .card-view')].filter((c) => !c.disabled)
          if (!cards.length) return false
          const name = (c) => c.querySelector('.card-view-name')?.textContent ?? ''
          const score = (c) => (s === 'win2' ? (c.querySelector('.card-view-bonus-ready') ? 3 : 0) + (/⚔|🌟|💀/.test(name(c)) ? 2 : 0) + (/🛡|🌿/.test(name(c)) ? 1 : 0) : (/⚔|🌟|💀/.test(name(c)) ? 3 : 0) + (c.querySelector('.card-view-bonus-ready') ? 1.5 : 0))
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
/** 報酬未確定なら測ってから 1 枚選び、落ち着いた結果画面を測る */
async function settle(page, shot) {
  let pending = null
  if (await page.evaluate(() => !!document.querySelector('[data-testid="open-reward"]'))) {
    await page.waitForTimeout(2600)
    pending = await page.evaluate(RESULT_METRICS)
    await clickSel(page, '[data-testid="open-reward"]')
    await page.waitForSelector('.reward-overlay .reward-card', { timeout: 10000 })
    await page.waitForTimeout(400)
    await clickSel(page, '.reward-overlay .reward-card')
    await page.waitForSelector('.game-over-overlay', { timeout: 10000 })
  }
  await page.waitForTimeout(2600)
  const metrics = await page.evaluate(RESULT_METRICS)
  if (shot) await page.screenshot({ path: join(outDir, `${shot}.png`) })
  return { pending, metrics }
}
async function openRecords(page) {
  await click(page, '戦績を見る')
  await page.waitForSelector('[data-testid="matchup-board"]', { timeout: 10000 })
  await page.waitForTimeout(600)
}
async function godSelectCounts(page) {
  if (!(await clickSel(page, '[data-testid="home-start"]'))) await click(page, '神を選ぶ')
  await page.waitForTimeout(400)
  if (await click(page, '新しく始める')) await page.waitForTimeout(400)
  await page.waitForTimeout(400)
  return page.evaluate(() => [...document.querySelectorAll('.god-select-card')].map((c) => ({ name: c.querySelector('.god-select-name, h3, strong')?.textContent?.trim() ?? c.textContent.slice(0, 12), count: c.querySelector('[data-testid="god-matchup-count"]')?.textContent.trim() ?? null })))
}
async function enemyBadges(page, god = '大耀') {
  await click(page, god)
  await page.waitForTimeout(300)
  await click(page, 'この構成で始める')
  await page.waitForSelector('.enemy-select-grid', { timeout: 10000 })
  await page.waitForTimeout(500)
  return page.evaluate(() => ({
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    badges: [...document.querySelectorAll('.enemy-select-card')].map((c) => ({ name: c.querySelector('.enemy-select-name')?.textContent.trim(), badge: c.querySelector('[data-testid="enemy-matchup"]')?.textContent.trim() ?? null, cleared: c.querySelector('[data-testid="enemy-matchup"]')?.dataset.cleared ?? null, fontSize: c.querySelector('[data-testid="enemy-matchup"]') ? parseFloat(getComputedStyle(c.querySelector('[data-testid="enemy-matchup"]')).fontSize) : null })),
  }))
}

// ---------- シナリオ ----------
async function scenarioFixture(vp) {
  const p = await open(vp, p2, { seed: fixture() })
  await home(p)
  const before = await p.page.evaluate(STORAGE_DUMP)
  await openRecords(p.page)
  const records = await p.page.evaluate(RECORDS_METRICS)
  await p.page.screenshot({ path: join(outDir, `${vp}-records.png`) })
  await p.page.screenshot({ path: join(outDir, `${vp}-records-full.png`), fullPage: true })
  const after = await p.page.evaluate(STORAGE_DUMP)
  const unchanged = Object.keys(before).filter((k) => k !== 'sevengods.matchups').every((k) => before[k] === after[k])
  const matchups = JSON.parse(after['sevengods.matchups'] ?? 'null')
  await home(p)
  const gods = await godSelectCounts(p.page)
  await p.page.screenshot({ path: join(outDir, `${vp}-godselect.png`) })
  const enemies = await enemyBadges(p.page)
  await p.page.screenshot({ path: join(outDir, `${vp}-enemyselect.png`) })
  await p.ctx.close()
  return { records, storageUnchangedExceptMatchups: unchanged, matchups, gods, enemies, errors: p.errors }
}

async function scenarioFirstClear(vp) {
  const p = await open(vp, p2)
  await home(p, '?enemy=oni&seed=p7spec-result-normal-win')
  await startNormal(p.page)
  await playToEnd(p.page, 'win')
  const first = await settle(p.page, `${vp}-first-clear`)
  const storage1 = JSON.parse((await p.page.evaluate(STORAGE_DUMP))['sevengods.matchups'] ?? 'null')
  // 同じ組み合わせで 2 勝目（既存の再戦経路）
  await clickSel(p.page, '.game-over-card [data-exit="rematch"]')
  await battleReady(p.page)
  await playToEnd(p.page, 'win')
  const second = await settle(p.page, `${vp}-second-win`)
  const storage2 = JSON.parse((await p.page.evaluate(STORAGE_DUMP))['sevengods.matchups'] ?? 'null')
  // ホームへ → 戦績で即反映 → 神選択・敵選択の印
  await clickSel(p.page, '.game-over-card [data-exit="home"]')
  await p.page.waitForSelector('.home-screen', { timeout: 10000 })
  await p.page.waitForTimeout(400)
  await openRecords(p.page)
  const records = await p.page.evaluate(RECORDS_METRICS)
  await home(p)
  const gods = await godSelectCounts(p.page)
  const enemies = await enemyBadges(p.page)
  await p.page.screenshot({ path: join(outDir, `${vp}-enemyselect-after-clear.png`) })
  await p.ctx.close()
  return { first, second, storage1, storage2, records, gods, enemies, errors: p.errors }
}

async function scenarioLossAbandon(vp) {
  const p = await open(vp, p2)
  await home(p, '?seed=p7acc-normal-lose')
  await startNormal(p.page)
  await playToEnd(p.page, 'lose')
  const lose = await settle(p.page, `${vp}-loss`)
  const afterLoss = JSON.parse((await p.page.evaluate(STORAGE_DUMP))['sevengods.matchups'] ?? 'null')
  // 途中放棄：別の敵で始めて 1 ラウンドだけ進め、リロードして放棄
  await clickSel(p.page, '.game-over-card [data-exit="home"]')
  await p.page.waitForSelector('.home-screen', { timeout: 10000 })
  await startNormal(p.page, { god: '蒼毘', enemy: '試練の影' })
  await clickSel(p.page, '.end-round-button')
  await p.page.waitForTimeout(3300)
  await p.page.goto(p.url + '/')
  await p.page.waitForSelector('.home-screen', { timeout: 30000 })
  await p.page.waitForTimeout(400)
  await openRecords(p.page)
  const records = await p.page.evaluate(RECORDS_METRICS)
  const afterAbandon = await p.page.evaluate(STORAGE_DUMP)
  await p.ctx.close()
  return { lose, afterLoss, records, afterAbandon: { matchups: JSON.parse(afterAbandon['sevengods.matchups'] ?? 'null'), hasSave: !!afterAbandon['sevengods.battleSave'] }, errors: p.errors }
}

async function scenarioDaily(vp) {
  const p = await open(vp, p2)
  await home(p)
  await clickSel(p.page, '[data-testid="home-today-cta"]')
  await p.page.waitForSelector('.daily-screen', { timeout: 10000 })
  await p.page.waitForTimeout(400)
  await click(p.page, '挑戦開始')
  await p.page.waitForTimeout(400)
  await click(p.page, '大耀')
  await p.page.waitForTimeout(300)
  await click(p.page, 'この構成で始める')
  await p.page.waitForTimeout(400)
  await click(p.page, 'この構成でバトル開始')
  await battleReady(p.page)
  const attempts = []
  let won = null
  for (const strategy of ['win', 'win2']) {
    await playToEnd(p.page, strategy)
    const r = await settle(p.page, `${vp}-daily-${strategy}`)
    const dump = await p.page.evaluate(STORAGE_DUMP)
    const day = Object.values(JSON.parse(dump['sevengods.daily']).days)[0]
    attempts.push({ strategy, status: r.metrics.status, matchupLine: r.metrics.matchupLine, dailyDiff: r.metrics.dailyDiff, attemptsUsed: day.attemptsUsed, seed: day.seed, matchups: JSON.parse(dump['sevengods.matchups'] ?? 'null') })
    if (r.metrics.status === '勝利') { won = { strategy, enemyId: day.enemyId }; break }
    await clickSel(p.page, '[data-testid="result-primary"][data-exit="rematch"]')
    await battleReady(p.page)
  }
  await p.ctx.close()
  return { attempts, won, errors: p.errors }
}

async function scenarioFaults(vp) {
  // a) 壊れた JSON
  const a = await open(vp, p2, { seed: { 'sevengods.tutorialSeen': 'true', 'sevengods.matchups': '{broken json' } })
  await home(a, '?enemy=oni&seed=p7spec-result-normal-win')
  await startNormal(a.page)
  await playToEnd(a.page, 'win')
  const corruptResult = await settle(a.page, `${vp}-corrupt-result`)
  await clickSel(a.page, '.game-over-card [data-exit="home"]')
  await a.page.waitForSelector('.home-screen', { timeout: 10000 })
  await openRecords(a.page)
  const corruptRecords = await a.page.evaluate(RECORDS_METRICS)
  await a.ctx.close()
  // b) localStorage で sevengods.matchups だけ読み書きが例外になる環境
  const b = await open(vp, p2, {
    seed: { 'sevengods.tutorialSeen': 'true' },
    initScript: () => {
      const g = Storage.prototype.getItem
      const s = Storage.prototype.setItem
      Storage.prototype.getItem = function (k) { if (k === 'sevengods.matchups') throw new Error('denied'); return g.call(this, k) }
      Storage.prototype.setItem = function (k, v) { if (k === 'sevengods.matchups') throw new Error('denied'); return s.call(this, k, v) }
    },
  })
  await home(b, '?enemy=oni&seed=p7spec-result-normal-win')
  await startNormal(b.page)
  await playToEnd(b.page, 'win')
  const unavailableResult = await settle(b.page, `${vp}-unavailable-result`)
  await clickSel(b.page, '.game-over-card [data-exit="home"]')
  await b.page.waitForSelector('.home-screen', { timeout: 10000 })
  await openRecords(b.page)
  const unavailableRecords = await b.page.evaluate(RECORDS_METRICS)
  await home(b)
  const gods = await godSelectCounts(b.page)
  const enemies = await enemyBadges(b.page)
  await b.ctx.close()
  return { corruptResult, corruptRecords, corruptErrors: a.errors, unavailableResult, unavailableRecords, gods, enemies, unavailableErrors: b.errors }
}

/** P2 で記録と続きのセーブを作り、そのまま P1 ビルドで開く（ロールバック） */
async function scenarioRollback(vp) {
  const p = await open(vp, p2)
  await home(p, '?enemy=oni&seed=p7spec-result-normal-win')
  await startNormal(p.page)
  await playToEnd(p.page, 'win')
  await settle(p.page, null)
  await clickSel(p.page, '.game-over-card [data-exit="home"]')
  await p.page.waitForSelector('.home-screen', { timeout: 10000 })
  await startNormal(p.page, { god: '恵比寿', enemy: '試練の影' })
  await clickSel(p.page, '.end-round-button')
  await p.page.waitForTimeout(3300)
  const dump = await p.page.evaluate(STORAGE_DUMP)
  await p.ctx.close()

  const q = await open(vp, p1, { seed: dump })
  await q.page.goto(p1 + '/')
  await q.page.waitForSelector('.home-screen', { timeout: 30000 })
  await q.page.waitForTimeout(500)
  const resumeText = await q.page.evaluate(() => [...document.querySelectorAll('.home-screen button')].find((b) => b.textContent.trim().startsWith('続きから'))?.textContent.trim() ?? null)
  await q.page.evaluate(() => [...document.querySelectorAll('.home-screen button')].find((b) => b.textContent.trim().startsWith('続きから'))?.click())
  let resumed = false
  try {
    await battleReady(q.page)
    resumed = true
  } catch {
    resumed = false
  }
  await q.page.goto(p1 + '/')
  await q.page.waitForSelector('.home-screen', { timeout: 30000 })
  await click(q.page, '戦績を見る')
  await q.page.waitForTimeout(800)
  const recordsOk = await q.page.evaluate(() => !!document.querySelector('.record-grid') && document.querySelectorAll('.record-card').length === 7)
  const after = await q.page.evaluate(STORAGE_DUMP)
  await q.page.screenshot({ path: join(outDir, `${vp}-rollback-p1-records.png`) })
  await q.ctx.close()
  return { resumeText, resumed, recordsOk, matchupsUntouchedByP1: after['sevengods.matchups'] === dump['sevengods.matchups'], errors: q.errors }
}

/** 同じ保存で P1 ビルドと P2 ビルドの Home を比べる（Home Today・進行チップ・CTA が同一） */
async function scenarioHomeParity(vp) {
  const texts = {}
  for (const [name, url] of [['p1', p1], ['p2', p2]]) {
    const p = await open(vp, url, { seed: fixture() })
    await p.page.goto(url + '/')
    await p.page.waitForSelector('.home-screen', { timeout: 30000 })
    await p.page.waitForTimeout(600)
    texts[name] = await p.page.evaluate(() => {
      const t = (sel) => document.querySelector(sel)?.textContent.replace(/\s+/g, ' ').trim() ?? null
      return {
        text: document.querySelector('.home-screen').innerText.replace(/\s+/g, ' ').trim(),
        buttons: [...document.querySelectorAll('.home-screen button')].map((b) => b.textContent.trim()),
        // Phase 7 Entrance E1（決定193・仕様 §16）：Home の構図が変わっても、Home Today と進行チップの「値」と入口は同じであること
        values: {
          todayEnemy: t('[data-testid="home-today-enemy"] strong'),
          attempts: t('[data-testid="home-today-attempts"]'),
          best: t('[data-testid="home-today-best"]'),
          chips: [...document.querySelectorAll('[data-testid="home-progress"] li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim()).sort(),
          hasStart: !!document.querySelector('[data-testid="home-start"]'),
          hasTodayCta: document.querySelectorAll('[data-testid="home-today-cta"]').length === 1,
          hasResume: !!document.querySelector('[data-testid="home-resume"]'),
        },
      }
    })
    texts[`${name}Errors`] = p.errors
    await p.ctx.close()
  }
  return texts
}

const run = async (name, fn, key) => {
  if (scenarioFilter && !scenarioFilter.includes(key)) return undefined
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

for (const vp of ['sp844', 'pc1508', 'sp760', 'pc1366']) {
  if (only && !only.includes(vp)) continue
  console.log(vp)
  const s = (report.scenarios[vp] = {})
  s.fixture = await run(`${vp} fixture（既存プレイヤー・取り込み・戦績・選択画面）`, () => scenarioFixture(vp), 'fixture')
  s.homeParity = await run(`${vp} Home 同一性（P1 ビルド vs P2 ビルド）`, () => scenarioHomeParity(vp), 'homeParity')
  if (vp === 'sp844' || vp === 'pc1508') {
    s.firstClear = await run(`${vp} 初撃破 → 2 勝目 → 戦績・選択画面`, () => scenarioFirstClear(vp), 'firstClear')
    s.lossAbandon = await run(`${vp} 敗北・途中放棄`, () => scenarioLossAbandon(vp), 'lossAbandon')
  }
  if (vp === 'sp844') {
    s.daily = await run(`${vp} 神域挑戦の勝利`, () => scenarioDaily(vp), 'daily')
    s.faults = await run(`${vp} 壊れた保存・storage 不可`, () => scenarioFaults(vp), 'faults')
    s.rollback = await run(`${vp} P1 ビルドへのロールバック`, () => scenarioRollback(vp), 'rollback')
  }
}

// ---------- 判定 ----------
const results = []
const add = (id, title, build) => {
  let checks
  try {
    checks = build()
  } catch (e) {
    checks = [{ name: 'judge', ok: false, detail: String(e).slice(0, 200) }]
  }
  results.push({ id, title, pass: checks.length > 0 && checks.every((c) => c.ok), checks })
}
const ck = (name, ok, detail = null) => ({ name, ok: !!ok, detail })
const S = report.scenarios
const vps = Object.keys(S)
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())

add('AC1', '1 マスの条件が UI から分かる', () => vps.map((vp) => ck(vp, /その神でその敵に1回勝つ/.test(S[vp].fixture?.records?.rule ?? ''), S[vp].fixture?.records?.rule)))
add('AC2', '神と敵の対応が判別できる（敵名 ≥15px・神名 ≥11px・7 行×7 チップ・aria-label）', () => vps.map((vp) => { const r = S[vp].fixture?.records; return ck(vp, r && r.rows === 7 && r.chips === 49 && r.enemyNameFont >= 15 && r.godNameFont >= 11 && r.ariaLabels.every((a) => /：(撃破済み|未撃破)$/.test(a ?? '')), r && { rows: r.rows, chips: r.chips, enemyNameFont: r.enemyNameFont, godNameFont: r.godNameFont, aria: r.ariaLabels }) }))
add('AC3', '撃破済み／未撃破を色以外でも区別（✓ の有無・実線／点線・グレースケール）', () => vps.map((vp) => { const r = S[vp].fixture?.records; return ck(vp, r && r.checksOnCleared && !r.checksOnOpen && r.clearedBorderStyle === 'solid' && r.openBorderStyle === 'dashed' && /grayscale/.test(r.openFilter ?? ''), r && { cleared: r.clearedBorderStyle, open: r.openBorderStyle, filter: r.openFilter }) }))
add('AC4', '既存 Records を破壊しない（matchups 以外の保存は読み込み・表示で 1 バイトも変わらない）', () => vps.map((vp) => ck(vp, S[vp].fixture?.storageUnchangedExceptMatchups === true)))
add('AC10', '初撃破が結果・戦績・神選択・敵選択へ即時反映', () => ['sp844', 'pc1508'].filter((vp) => S[vp]?.firstClear).map((vp) => { const f = S[vp].firstClear; const oni = f.enemies?.badges?.find((b) => b.name === '業斧の鬼将'); const taiyo = f.gods?.find((g) => /大耀/.test(g.name)); return ck(vp, /初撃破：大耀 × 業斧の鬼将（この敵 1\/7 神）/.test(f.first?.metrics?.matchupLine ?? '') && f.records?.cleared?.includes('taiyo:enemy_02') && oni?.cleared === 'true' && /撃破 1\/7 敵/.test(taiyo?.count ?? ''), { line: f.first?.metrics?.matchupLine, cleared: f.records?.cleared, oni, taiyo }) }))
add('AC11', '既存プレイヤーの取り込みが仕様どおり（神域挑戦の保存期間内の勝利だけ・推測なし）', () => vps.map((vp) => { const f = S[vp].fixture; return ck(vp, f && same(f.records.cleared, EXPECTED_FIXTURE_CLEARED) && f.records.total === `${EXPECTED_FIXTURE_CLEARED.length} / 49` && f.matchups?.seeded?.source === 'daily' && /以降の勝利と、神域挑戦の直近の勝利から記録/.test(f.records.seededNote ?? ''), f && { cleared: f.records.cleared, total: f.records.total, seeded: f.matchups?.seeded }) }))
add('AC12', 'JS error・横はみ出し・scrollX 0（戦績・神選択・敵選択・結果）', () => [
  ...vps.map((vp) => { const f = S[vp].fixture; return ck(`${vp}/fixture`, f && !f.records.overflowX && f.records.scrollX === 0 && !f.enemies.overflowX && f.errors.length === 0, f && { overflow: f.records.overflowX, enemy: f.enemies.overflowX, errors: f.errors.slice(0, 2) }) }),
  ...vps.filter((vp) => S[vp].firstClear).map((vp) => ck(`${vp}/firstClear`, S[vp].firstClear.errors?.length === 0 && !S[vp].firstClear.first?.metrics?.overflowX, S[vp].firstClear.errors?.slice(0, 2))),
  ...vps.filter((vp) => S[vp].lossAbandon).map((vp) => ck(`${vp}/lossAbandon`, S[vp].lossAbandon.errors?.length === 0, S[vp].lossAbandon.errors?.slice(0, 2))),
  ...vps.filter((vp) => S[vp].daily).map((vp) => ck(`${vp}/daily`, S[vp].daily.errors?.length === 0, S[vp].daily.errors?.slice(0, 2))),
  ...vps.map((vp) => ck(`${vp}/homeParity`, (S[vp].homeParity?.p2Errors ?? ['missing']).length === 0)),
])
add('AC13', '同じ組み合わせの 2 勝目で祝い 0・保存の重複 0', () => ['sp844', 'pc1508'].filter((vp) => S[vp]?.firstClear).map((vp) => { const f = S[vp].firstClear; return ck(vp, f.second?.metrics?.status === '勝利' && f.second?.metrics?.matchupLine === null && JSON.stringify(f.storage1?.cleared) === JSON.stringify(f.storage2?.cleared) && f.storage2?.cleared?.taiyo?.length === 1, { second: f.second?.metrics?.matchupLine, cleared: f.storage2?.cleared }) }))
add('AC14', '敗北・途中放棄では点灯しない', () => ['sp844', 'pc1508'].filter((vp) => S[vp]?.lossAbandon).map((vp) => { const l = S[vp].lossAbandon; return ck(vp, l.lose?.metrics?.status === '敗北' && l.lose?.metrics?.matchupLine === null && (l.afterLoss === null || Object.keys(l.afterLoss.cleared ?? {}).length === 0) && l.records?.cleared?.length === 0 && l.afterAbandon?.hasSave === true, { afterLoss: l.afterLoss, cleared: l.records?.cleared, save: l.afterAbandon?.hasSave }) }))
add('AC15', '初撃破の 1 行を足しても P1 の Primary・別アクティビティ CTA≥2 が初期表示内', () => ['sp844', 'pc1508'].filter((vp) => S[vp]?.firstClear).map((vp) => { const m = S[vp].firstClear.first?.metrics; return ck(vp, m && m.matchupLine && m.primary?.inView && m.secondaryInView === 2 && m.otherActivityInView >= 2 && m.goal, m && { primaryTop: m.primary?.top, secondary: m.secondaryInView, other: m.otherActivityInView, goalId: m.goalId }) }))
add('AC16', '戦績画面の横はみ出し修正（390px でページ幅＝ビューポート・神域挑戦の表は表の中でスクロール）', () => vps.filter((vp) => vp.startsWith('sp')).map((vp) => { const r = S[vp].fixture?.records; return ck(vp, r && r.docScrollWidth <= r.vw && r.vw === 390 && (r.vh === 844 || r.vh === 760) && r.dailyTableWrapScroll && r.dailyTableWrapScroll.client <= 390, r && { docScrollWidth: r.docScrollWidth, vw: r.vw, vh: r.vh, table: r.dailyTableWrapScroll }) }))
add('AC17', 'P1 ビルドへ戻しても続きから・戦績が動き、matchups を書き換えない', () => vps.filter((vp) => S[vp].rollback).map((vp) => { const r = S[vp].rollback; return ck(vp, r.resumeText?.startsWith('続きから') && r.resumed && r.recordsOk && r.matchupsUntouchedByP1 && r.errors.length === 0, r) }))
add('AC18', '壊れた保存・storage 不可でもゲームが進行する', () => vps.filter((vp) => S[vp].faults).flatMap((vp) => { const f = S[vp].faults; return [
  ck(`${vp}/corrupt`, f.corruptResult?.metrics?.status === '勝利' && f.corruptResult?.metrics?.primary && f.corruptRecords?.board && f.corruptErrors.length === 0, { line: f.corruptResult?.metrics?.matchupLine, errors: f.corruptErrors.slice(0, 2) }),
  ck(`${vp}/unavailable`, f.unavailableResult?.metrics?.status === '勝利' && f.unavailableResult?.metrics?.primary && f.unavailableResult?.metrics?.matchupLine === null && /保存できない/.test(f.unavailableRecords?.note ?? '') && f.gods.every((g) => g.count === null) && f.enemies.badges.every((b) => b.badge === null) && f.unavailableErrors.length === 0, { note: f.unavailableRecords?.note, errors: f.unavailableErrors.slice(0, 2) }),
] }))
// Phase 7 Entrance E1（決定193・仕様 §16）で Home の構図と文言の並びを変えたため、文字列の完全一致ではなく
// Home Today（今日の敵・残り回数・今日のベスト）と進行チップの値、入口（神を選ぶ・神域挑戦・続きから）が前ビルドと同じことを判定する
add('AC19', 'Home Today・進行チップの値と入口が前ビルドと同一（E1 で文字列一致から値の一致に置き換え）', () => vps.map((vp) => { const h = S[vp].homeParity; return ck(vp, h && h.p1?.values && h.p2?.values && JSON.stringify(h.p1.values) === JSON.stringify(h.p2.values), h && { p1: h.p1?.values, p2: h.p2?.values }) }))
add('EXTRA-1', '神域挑戦の勝利も点灯し、回数・seed は既存どおり（開始ごとに +1）', () => vps.filter((vp) => S[vp].daily).map((vp) => { const d = S[vp].daily; const last = d.attempts[d.attempts.length - 1]; return ck(vp, d.won && /初撃破：大耀 × /.test(last?.matchupLine ?? '') && (last?.matchups?.cleared?.taiyo ?? []).includes(d.won.enemyId) && d.attempts.every((a, i) => a.attemptsUsed === i + 1 && a.seed === d.attempts[0].seed), d.attempts.map((a) => ({ s: a.strategy, status: a.status, line: a.matchupLine, used: a.attemptsUsed }))) }))
add('EXTRA-2', 'チップは操作要素に見せない（button・リンク・pointer なし）／チップ 44×44px 以上', () => vps.map((vp) => { const r = S[vp].fixture?.records; return ck(vp, r && !r.chipsInteractive && r.chipMinHeight >= 44 && r.chipMinWidth >= 44, r && { interactive: r.chipsInteractive, minH: r.chipMinHeight, minW: r.chipMinWidth }) }))
add('EXTRA-3', '選択画面の印（神選択「撃破 k/7 敵」・敵選択「撃破済み／未撃破」）が fixture どおり', () => vps.map((vp) => { const f = S[vp].fixture; const oni = f?.enemies?.badges?.find((b) => b.name === '業斧の鬼将'); const others = f?.enemies?.badges?.filter((b) => b.name && b.name !== '業斧の鬼将' && b.name !== '神に委ねる'); const taiyo = f?.gods?.find((g) => /大耀/.test(g.name)); const saika = f?.gods?.find((g) => /才華/.test(g.name)); const sobi = f?.gods?.find((g) => /蒼毘/.test(g.name)); return ck(vp, f && oni?.cleared === 'true' && /撃破済み/.test(oni.badge ?? '') && others.every((b) => b.cleared === 'false' && /未撃破/.test(b.badge ?? '')) && /撃破 1\/7 敵/.test(taiyo?.count ?? '') && /撃破 1\/7 敵/.test(saika?.count ?? '') && /撃破 0\/7 敵/.test(sobi?.count ?? ''), f && { oni, taiyo: taiyo?.count, saika: saika?.count, sobi: sobi?.count }) }))

report.results = results
report.pass = results.every((r) => r.pass)
report.finishedAt = new Date().toISOString()
writeFileSync(join(outDir, 'p2-acceptance.json'), JSON.stringify(report, null, 2))
await browser.close()
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.id.padEnd(8)} ${r.title}  (${r.checks.filter((c) => c.ok).length}/${r.checks.length})`)
  for (const c of r.checks.filter((x) => !x.ok)) console.log(`        ✗ ${c.name} ${JSON.stringify(c.detail)?.slice(0, 400) ?? ''}`)
}
console.log(report.pass ? 'ALL PASS' : 'SOME FAILED')
process.exit(report.pass ? 0 : 1)

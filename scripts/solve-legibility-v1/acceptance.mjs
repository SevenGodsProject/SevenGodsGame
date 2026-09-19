// 決定206（Solve Legibility v1）受け入れテスト。
//
//   node scripts/solve-legibility-v1/acceptance.mjs <outDir> <url>
//
// 確かめること（CEO 指定の自動 QA 項目）：
//   A-1 NR1 成立：新規 → 初陣へ → 勝利 → 「次の目標」が NR1（魔獣・予告を読む戦い）、Primary「魔獣に挑む（神を選ぶ）」、初撃破の行と両立
//   A-2 NR1 → 神を選ぶ → 敵選択で魔獣カードにだけ「予告を読む戦い」chip → 魔獣戦が新しい seed で始まる（神固定なし・デッキ画面を通る）
//   A-3 NR1 非成立：初陣の 2 勝目（通算 2）は NR1 でない
//   A-4 初陣未勝利（敗北）：N1・Primary「同じ盤面でもう一度」（Solve Loop 不変）、recap 1 行目は M=0 の事実文
//   A-5 魔獣既撃破（fixture）：初陣に勝っても NR1 でない
//   A-6 Save/Resume：初陣を 1R 打って再読込 → 続きから → 勝利 → NR1 は出る／recap は回数を主張しない（ログ不完全）
//   A-7 Daily：神域挑戦の決着は D* のみ・回数消費 1・NR1 なし
//   A-8 神階（?stake=1）：恵比寿×試練の影×神階Ⅰ の勝利は NR1 でない
//   A-9 direct seed（?seed=）：初陣勝利で NR1 は出る（seed に依存しない）
//   A-10 old save（既存プレイヤー：戦績に恵比寿 3 勝）：恵比寿×試練の影に勝っても NR1 でない
//   B-1 victory：recap 1 行目「予告された攻撃 N回のうち、M回を無傷で受け切りました」（M ≤ N）
//   B-2 defeat（無操作）：「無傷で受け切った攻撃はありませんでした」（M=0 を評価しない）
//   B-3 7R 未撃破（守りのみ）：事実行 ＋「あと N で撃破でした」
//   B-4 魔獣で「読まない→負け」→ 同じ盤面で「守る」→ M が増える（seed 同一）
//   C-1 49 progression：初陣勝利で matchups に ebisu×enemy_01 が記録され、魔獣カードには「未撃破」chip と「予告を読む戦い」chip が両方ある
//   C-2 コンソールエラー 0／API 呼び出し 0
//
// `0 予告`（R1 撃破）はブラウザで再現できないため vitest（battleRecap.test）で固定している。
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const outDir = process.argv[2] ?? 'scripts/solve-legibility-v1/out'
const base = (process.argv[3] ?? 'http://localhost:4181').replace(/\/$/, '')
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch()

const RECORDS_RETURNING = JSON.stringify({
  version: 1,
  records: {
    ebisu: { bestScore: 0, bestScoreDifficulty: null, bestBattleScore: 620, bestBattleScoreDifficulty: 'normal', wins: 3, losses: 1, finished: 0, fastestWinRound: 4 },
  },
})
const MATCHUPS_JUUMA_CLEARED = JSON.stringify({ version: 1, cleared: { taiyo: ['enemy_05'] }, seeded: { at: 0, source: 'daily' } })

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

const SAVE = () => {
  try {
    const save = JSON.parse(localStorage.getItem('sevengods.battleSave') ?? 'null')
    const st = save?.state
    return st ? { seed: st.seed ?? null, mode: st.mode ?? 'normal', godId: st.godId ?? null, enemyId: st.enemy?.defId ?? null, difficulty: st.difficulty ?? null, stake: st.stake ?? 0 } : null
  } catch {
    return null
  }
}

const RESULT = () => {
  const lines = [...document.querySelectorAll('[data-testid="battle-recap"] li')].map((li) => li.textContent.trim())
  return {
    status: document.querySelector('.game-over-status')?.textContent.trim() ?? null,
    goalId: document.querySelector('[data-testid="next-goal"]')?.getAttribute('data-goal-id') ?? null,
    goalText: document.querySelector('[data-testid="next-goal"] .result-next-goal-text')?.textContent.trim() ?? null,
    primaryExit: document.querySelector('[data-testid="result-primary"]')?.getAttribute('data-exit') ?? null,
    primaryLabel: document.querySelector('[data-testid="result-primary"]')?.textContent.trim() ?? null,
    matchupClear: document.querySelector('[data-testid="matchup-clear"]')?.textContent.trim() ?? null,
    recap: lines,
    exits: [...document.querySelectorAll('[data-exit]')].map((b) => b.getAttribute('data-exit')),
  }
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
  return {
    keys: Object.keys(localStorage).sort(),
    records: j('sevengods.records')?.records ?? null,
    matchups: j('sevengods.matchups')?.cleared ?? null,
    daily: daily ? Object.values(daily.days).map((d) => ({ dateKey: d.dateKey, enemyId: d.enemyId, attemptsUsed: d.attemptsUsed })) : null,
  }
}

const ENEMY_SELECT = () => ({
  title: document.querySelector('.setup-title')?.textContent.trim() ?? null,
  cards: [...document.querySelectorAll('.enemy-select-card')].map((c) => ({
    name: c.querySelector('.enemy-select-name')?.textContent.trim() ?? null,
    readChip: c.querySelector('[data-testid="enemy-read-chip"]')?.textContent.trim() ?? null,
    matchup: c.querySelector('[data-testid="enemy-matchup"]')?.textContent.trim() ?? null,
  })),
})

/** recap 1 行目から N・M を取り出す（文言契約） */
function parseAnnounced(line) {
  if (!line) return null
  let m = line.match(/^予告された攻撃(\d+)回のうち、(\d+)回を無傷で受け切りました（盾で防いだ量 ([\d,]+)(?:・封じ(\d+)回)?）$/)
  if (m) return { n: Number(m[1]), m: Number(m[2]), blocked: Number(m[3].replace(/,/g, '')), zero: false }
  m = line.match(/^予告された攻撃(\d+)回のうち、無傷で受け切った攻撃はありませんでした（盾で防いだ量 ([\d,]+)(?:・封じ(\d+)回)?）$/)
  if (m) return { n: Number(m[1]), m: 0, blocked: Number(m[2].replace(/,/g, '')), zero: true }
  return null
}

async function openPage(fixture = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript((s) => {
    if (sessionStorage.getItem('__sl_seeded')) return
    for (const k in s) localStorage.setItem(k, s[k])
    sessionStorage.setItem('__sl_seeded', '1')
  }, fixture)
  const page = await ctx.newPage()
  const errors = []
  const api = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()))
  page.on('request', (r) => {
    const u = r.url()
    if (!u.startsWith(base) || /\/api\//.test(u)) api.push(u)
  })
  return { ctx, page, errors, api }
}

async function gotoHome(p, query = '') {
  await p.page.goto(base + '/' + query)
  await p.page.waitForSelector('.home-screen .home-cta-primary', { timeout: 30000 })
  await p.page.waitForTimeout(400)
  if (await clickText(p.page, 'わかった')) await p.page.waitForTimeout(400)
}

async function waitBattleReady(page) {
  await page.waitForSelector('.hand .card-view', { timeout: 20000 })
  await page.waitForFunction(
    () => {
      const b = document.querySelector('.end-round-button')
      return b && !b.disabled
    },
    null,
    { timeout: 20000 },
  )
  await page.waitForTimeout(400)
}

async function startFirstBattle(page) {
  await clickSel(page, '[data-testid="home-first-battle"]')
  await page.waitForSelector('[data-testid="first-battle-brief"]', { timeout: 10000 })
  await clickText(page, '出陣する')
  await waitBattleReady(page)
}

async function startNormal(page, { god = '恵比寿', enemy = '試練の影' } = {}) {
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

/** strategy: 'lose'（何も打たずラウンドを流す） / 'win'（攻撃優先） / 'guard'（防御札を優先し、余りで攻撃） / 'stall'（防御だけ） */
async function playToEnd(page, strategy, maxRounds = 8) {
  for (let round = 1; round <= maxRounds; round++) {
    if (await overlayUp(page)) break
    if (strategy === 'win' || strategy === 'guard') {
      for (let k = 0; k < 8; k++) {
        const picked = await page.evaluate((mode) => {
          const cards = [...document.querySelectorAll('.hand .card-view')].filter((c) => !c.disabled)
          if (!cards.length) return false
          const name = (c) => c.querySelector('.card-view-name')?.textContent ?? ''
          const score = (c) => {
            const atk = /⚔|🌟|💀/.test(name(c)) ? 3 : 0
            const def = /🛡|🌿/.test(name(c)) ? 3 : 0
            const bonus = c.querySelector('.card-view-bonus-ready') ? 1.5 : 0
            return (mode === 'guard' ? def * 2 + atk : atk) + bonus
          }
          cards.sort((x, y) => score(y) - score(x))
          cards[0].click()
          return true
        }, strategy)
        if (!picked) break
        await page.waitForTimeout(850)
        if (await page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay, .enemy-defeat'))) break
      }
      if (await page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay, .enemy-defeat'))) break
      // 託宣：win＝天啓（3 番目）／guard＝加護（1 番目）
      await page.evaluate((mode) => document.querySelectorAll('.divination-choice')[mode === 'guard' ? 0 : 2]?.click(), strategy)
      await page.waitForTimeout(400)
    } else if (strategy === 'stall') {
      for (let k = 0; k < 8; k++) {
        const picked = await page.evaluate(() => {
          const cards = [...document.querySelectorAll('.hand .card-view')].filter((c) => !c.disabled)
          const def = cards.filter((c) => /🛡|🌿/.test(c.querySelector('.card-view-name')?.textContent ?? ''))
          if (!def.length) return false
          def[0].click()
          return true
        })
        if (!picked) break
        await page.waitForTimeout(700)
      }
      await page.evaluate(() => document.querySelectorAll('.divination-choice')[0]?.click())
      await page.waitForTimeout(400)
    }
    await clickSel(page, '.end-round-button')
    await page.waitForTimeout(3300)
  }
  await page.waitForFunction(() => !!document.querySelector('.reward-overlay, .game-over-overlay'), null, { timeout: 25000 })
  await page.waitForTimeout(700)
}

/** 勝利時は報酬を1枚選んでから結果画面へ */
async function settleResult(page) {
  if (await page.evaluate(() => !!document.querySelector('[data-testid="open-reward"]'))) {
    await page.waitForTimeout(2600)
    await clickSel(page, '[data-testid="open-reward"]')
    await page.waitForSelector('.reward-overlay .reward-card', { timeout: 10000 })
    await page.waitForTimeout(400)
    await clickSel(page, '.reward-overlay .reward-card')
    await page.waitForSelector('.game-over-overlay', { timeout: 10000 })
  }
  await page.waitForSelector('[data-testid="result-hub"]', { timeout: 15000 })
  await page.waitForTimeout(1200)
  return page.evaluate(RESULT)
}

/** 初陣で勝つ（負けたら最大 3 回やり直し：bot の揺れを吸収。製品の判定には影響しない） */
async function winFirstBattle(page, viaFirstBattleCta = true, query = '') {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (viaFirstBattleCta && attempt === 0) await startFirstBattle(page)
    else if (attempt === 0) await startNormal(page)
    const save = await page.evaluate(SAVE)
    await playToEnd(page, 'win')
    const result = await settleResult(page)
    if (result.status === '勝利' || result.goalId !== 'N1') return { save, result, attempts: attempt + 1 }
    // 敗北 → 同じ盤面でもう一度（Solve Loop）で再挑戦
    await clickSel(page, '[data-testid="result-primary"]')
    await waitBattleReady(page)
  }
  throw new Error('winFirstBattle: could not win in 3 attempts')
}

// ---------- シナリオ ----------

/** A-1/A-2/B-1/C-1：新規 → 初陣勝利 → NR1 → 神を選ぶ → 魔獣 chip → 魔獣戦 */
async function scenarioEarlyRead() {
  const p = await openPage()
  await gotoHome(p)
  const first = await winFirstBattle(p.page)
  await p.page.screenshot({ path: join(outDir, 'a1-first-win-result.png') })
  const storageAfterWin = await p.page.evaluate(STORAGE)

  // Primary（reselect）→ 神選択
  const clicked = await clickSel(p.page, '[data-testid="result-primary"]')
  await p.page.waitForTimeout(900)
  const godScreen = await p.page.evaluate(() => ({
    title: document.querySelector('.setup-title')?.textContent.trim() ?? null,
    gods: [...document.querySelectorAll('.god-card, .god-select-card')].length,
  }))
  // 神は自由：恵比寿のまま進む
  await clickText(p.page, '恵比寿')
  await p.page.waitForTimeout(300)
  await clickText(p.page, 'この構成で始める')
  await p.page.waitForTimeout(500)
  const enemySelect = await p.page.evaluate(ENEMY_SELECT)
  await p.page.screenshot({ path: join(outDir, 'a2-enemy-select.png') })
  await clickText(p.page, '双牙の魔獣')
  await p.page.waitForTimeout(500)
  const deckScreen = await p.page.evaluate(() => ({ title: document.querySelector('.setup-title')?.textContent.trim() ?? null, hasStart: !!document.querySelector('button') }))
  await clickText(p.page, 'この構成でバトル開始')
  await waitBattleReady(p.page)
  const juumaSave = await p.page.evaluate(SAVE)
  await p.page.screenshot({ path: join(outDir, 'a2-juuma-battle.png') })
  await p.ctx.close()
  return { first, storageAfterWin, clicked, godScreen, enemySelect, deckScreen, juumaSave, errors: p.errors, api: p.api }
}

/** A-3：初陣に 2 回勝つ → 2 回目は NR1 でない */
async function scenarioSecondWin() {
  const p = await openPage()
  await gotoHome(p)
  const first = await winFirstBattle(p.page)
  // 「同じ構成でもう一度」（勝利後は rematch が secondary にある）
  const clicked = await clickSel(p.page, '[data-exit="rematch"]')
  await waitBattleReady(p.page)
  let second = null
  for (let attempt = 0; attempt < 3; attempt++) {
    await playToEnd(p.page, 'win')
    second = await settleResult(p.page)
    if (second.status === '勝利') break
    await clickSel(p.page, '[data-testid="result-primary"]')
    await waitBattleReady(p.page)
  }
  const storage = await p.page.evaluate(STORAGE)
  await p.page.screenshot({ path: join(outDir, 'a3-second-win.png') })
  await p.ctx.close()
  return { first, clicked, second, storage, errors: p.errors, api: p.api }
}

/** A-4/B-2：初陣で無操作 → 敗北 → N1・同じ盤面・M=0 の事実文 */
async function scenarioFirstLoss() {
  const p = await openPage()
  await gotoHome(p)
  await startFirstBattle(p.page)
  const before = await p.page.evaluate(SAVE)
  await playToEnd(p.page, 'lose')
  const result = await settleResult(p.page)
  await p.page.screenshot({ path: join(outDir, 'a4-first-loss.png') })
  const clicked = await clickSel(p.page, '[data-testid="result-primary"]')
  await waitBattleReady(p.page)
  const after = await p.page.evaluate(SAVE)
  await p.ctx.close()
  return { before, result, clicked, after, errors: p.errors, api: p.api }
}

/** A-5：魔獣を大耀で既に撃破している fixture → 初陣に勝っても NR1 でない */
async function scenarioJuumaCleared() {
  const p = await openPage({ 'sevengods.matchups': MATCHUPS_JUUMA_CLEARED })
  await gotoHome(p)
  const first = await winFirstBattle(p.page)
  const storage = await p.page.evaluate(STORAGE)
  await p.ctx.close()
  return { first, storage, errors: p.errors, api: p.api }
}

/** A-6：初陣を 1R 打って再読込 → 続きから → 勝利 → NR1 は出る／recap は回数を主張しない */
async function scenarioResume() {
  const p = await openPage()
  await gotoHome(p)
  await startFirstBattle(p.page)
  // 1 ラウンドだけ攻撃して流す
  await p.page.evaluate(() => [...document.querySelectorAll('.hand .card-view')].find((c) => !c.disabled)?.click())
  await p.page.waitForTimeout(900)
  await clickSel(p.page, '.end-round-button')
  await p.page.waitForTimeout(3300)
  const saveBefore = await p.page.evaluate(SAVE)
  await p.page.reload()
  await p.page.waitForSelector('.home-screen .home-cta-primary', { timeout: 30000 })
  await p.page.waitForTimeout(400)
  const resumed = await clickText(p.page, '続きから')
  await waitBattleReady(p.page)
  const saveAfter = await p.page.evaluate(SAVE)
  let result = null
  for (let attempt = 0; attempt < 3; attempt++) {
    await playToEnd(p.page, 'win')
    result = await settleResult(p.page)
    if (result.status === '勝利') break
    await clickSel(p.page, '[data-testid="result-primary"]')
    await waitBattleReady(p.page)
  }
  await p.page.screenshot({ path: join(outDir, 'a6-resume-result.png') })
  await p.ctx.close()
  return { saveBefore, resumed, saveAfter, result, errors: p.errors, api: p.api }
}

/** A-7：神域挑戦 → D*・回数 1・NR1 なし */
async function scenarioDaily() {
  const p = await openPage()
  await gotoHome(p)
  await startDailyFromHome(p.page)
  const save = await p.page.evaluate(SAVE)
  await playToEnd(p.page, 'lose')
  const result = await settleResult(p.page)
  const storage = await p.page.evaluate(STORAGE)
  await p.page.screenshot({ path: join(outDir, 'a7-daily.png') })
  await p.ctx.close()
  return { save, result, storage, errors: p.errors, api: p.api }
}

/** A-8：?stake=1 で恵比寿×試練の影 → 勝っても NR1 でない */
async function scenarioStake() {
  const p = await openPage({ 'sevengods.records': RECORDS_RETURNING })
  await gotoHome(p, '?stake=1')
  await startNormal(p.page)
  const save = await p.page.evaluate(SAVE)
  let result = null
  for (let attempt = 0; attempt < 3; attempt++) {
    await playToEnd(p.page, 'win')
    result = await settleResult(p.page)
    if (result.status === '勝利') break
    await clickSel(p.page, '[data-testid="result-primary"]')
    await waitBattleReady(p.page)
  }
  await p.ctx.close()
  return { save, result, errors: p.errors, api: p.api }
}

/** A-9：?seed= 固定でも初陣勝利で NR1 は出る */
async function scenarioDirectSeed() {
  const p = await openPage()
  await gotoHome(p, '?seed=sl206-direct')
  const first = await winFirstBattle(p.page)
  await p.ctx.close()
  return { first, errors: p.errors, api: p.api }
}

/** A-10：既存プレイヤー（恵比寿 3 勝）→ 恵比寿×試練の影 に勝っても NR1 でない */
async function scenarioReturning() {
  const p = await openPage({ 'sevengods.records': RECORDS_RETURNING })
  await gotoHome(p)
  const homePrimary = await p.page.evaluate(() => document.querySelector('.home-screen .home-cta-primary')?.textContent.trim() ?? null)
  const first = await winFirstBattle(p.page, false)
  const storage = await p.page.evaluate(STORAGE)
  await p.ctx.close()
  return { homePrimary, first, storage, errors: p.errors, api: p.api }
}

/** B-3：7R 未撃破（守りだけ・鬼将）→ 事実行 ＋ あと N */
async function scenarioFinished() {
  const p = await openPage({ 'sevengods.records': RECORDS_RETURNING })
  await gotoHome(p)
  await startNormal(p.page, { god: '大耀', enemy: '業斧の鬼将' })
  await playToEnd(p.page, 'stall')
  const result = await settleResult(p.page)
  await p.page.screenshot({ path: join(outDir, 'b3-finished.png') })
  await p.ctx.close()
  return { result, errors: p.errors, api: p.api }
}

/** B-4：魔獣で「読まない（無操作）」→ 負け → 同じ盤面で「守る」→ M が増える */
async function scenarioJuumaLoop() {
  const p = await openPage({ 'sevengods.records': RECORDS_RETURNING })
  await gotoHome(p)
  await startNormal(p.page, { god: '恵比寿', enemy: '双牙の魔獣' })
  const before = await p.page.evaluate(SAVE)
  await playToEnd(p.page, 'lose')
  const blind = await settleResult(p.page)
  await p.page.screenshot({ path: join(outDir, 'b4-juuma-blind.png') })
  const clicked = await clickSel(p.page, '[data-testid="result-primary"]')
  await waitBattleReady(p.page)
  const rematch = await p.page.evaluate(SAVE)
  await playToEnd(p.page, 'guard')
  const reader = await settleResult(p.page)
  await p.page.screenshot({ path: join(outDir, 'b4-juuma-guard.png') })
  await p.ctx.close()
  return { before, blind, clicked, rematch, reader, errors: p.errors, api: p.api }
}

// ---------- 実行 ----------
const out = {}
// SL_ONLY=a,b,c で一部のシナリオだけ実行（メモリが少ない環境で分割するため。判定はそのぶん skip になる）
const only = (process.env.SL_ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean)
const run = async (name, fn) => {
  if (only.length > 0 && !only.includes(name)) return
  const t0 = Date.now()
  try {
    out[name] = await fn()
    console.log(`  ok  ${name} (${Math.round((Date.now() - t0) / 1000)}s)`)
  } catch (e) {
    out[name] = { error: String(e) }
    console.log(`  NG  ${name}: ${e}`)
  }
}

console.log(`base = ${base}`)
await run('earlyRead', scenarioEarlyRead)
await run('secondWin', scenarioSecondWin)
await run('firstLoss', scenarioFirstLoss)
await run('juumaCleared', scenarioJuumaCleared)
await run('resume', scenarioResume)
await run('daily', scenarioDaily)
await run('stake', scenarioStake)
await run('directSeed', scenarioDirectSeed)
await run('returning', scenarioReturning)
await run('finished', scenarioFinished)
await run('juumaLoop', scenarioJuumaLoop)
await browser.close()

// ---------- 判定 ----------
const checks = []
const add = (id, desc, pass, detail) => checks.push({ id, desc, verdict: pass ? 'PASS' : 'FAIL', detail })
const NR1_TEXT = '次は連撃型「双牙の魔獣」に挑む — 予告を読む戦い'
const NR1_PRIMARY = '魔獣に挑む（神を選ぶ）'

const E = out.earlyRead ?? {}
const eR = E.first?.result
add('A1-1', '初陣の勝利で「次の目標」が NR1', eR?.goalId === 'NR1', { goalId: eR?.goalId, status: eR?.status })
add('A1-2', 'NR1 の文言', eR?.goalText === NR1_TEXT, eR?.goalText)
add('A1-3', 'Primary は reselect「魔獣に挑む（神を選ぶ）」', eR?.primaryExit === 'reselect' && eR?.primaryLabel === NR1_PRIMARY, { exit: eR?.primaryExit, label: eR?.primaryLabel })
add('A1-4', '初撃破（P2）の行と両立', !!eR?.matchupClear && /初撃破/.test(eR.matchupClear), eR?.matchupClear)
add('A1-5', '初陣は恵比寿×試練の影×ふつう×神階0（preset 不変）', E.first?.save?.godId === 'ebisu' && E.first?.save?.enemyId === 'enemy_01' && E.first?.save?.difficulty === 'normal' && E.first?.save?.stake === 0, E.first?.save)
add('A2-1', 'Primary → 神選択画面（神は固定しない）', E.clicked === true && /神/.test(E.godScreen?.title ?? ''), E.godScreen)
add('A2-2', '敵選択：魔獣カードにだけ「予告を読む戦い」chip', E.enemySelect?.cards?.filter((c) => c.readChip).map((c) => c.name).join() === '双牙の魔獣' && E.enemySelect?.cards?.find((c) => c.name === '双牙の魔獣')?.readChip === '予告を読む戦い', E.enemySelect?.cards?.map((c) => [c.name, c.readChip]))
add('A2-3', '魔獣 → デッキ画面を通る（デッキ変更可能）→ 戦闘', /デッキ|構成/.test(E.deckScreen?.title ?? '') && !!E.juumaSave, E.deckScreen)
add('A2-4', '魔獣戦は新しい seed（初陣と異なる）・通常モード・神階0', !!E.juumaSave?.seed && E.juumaSave.seed !== E.first?.save?.seed && E.juumaSave?.enemyId === 'enemy_05' && E.juumaSave?.mode === 'normal' && E.juumaSave?.stake === 0, { first: E.first?.save?.seed, juuma: E.juumaSave })
add('C1-1', '49 progression：初陣勝利で ebisu×enemy_01 が記録される', (E.storageAfterWin?.matchups?.ebisu ?? []).includes('enemy_01'), E.storageAfterWin?.matchups)
add('C1-2', '魔獣カードに「未撃破」chip と「予告を読む戦い」chip が両方ある', (() => { const c = E.enemySelect?.cards?.find((x) => x.name === '双牙の魔獣'); return !!c && /未撃破/.test(c.matchup ?? '') && c.readChip === '予告を読む戦い' })(), E.enemySelect?.cards?.find((x) => x.name === '双牙の魔獣'))
add('C1-3', '新規 storage key 0（sevengods.* 以外・決定206 由来の名前のキーが無い。ソース側の検査は release ゲートの secret/hygiene で行う）', (E.storageAfterWin?.keys ?? []).length > 0 && (E.storageAfterWin?.keys ?? []).every((k) => k.startsWith('sevengods.') && !/early|read|legib|nr1|announce/i.test(k)), E.storageAfterWin?.keys)
const eb = parseAnnounced(eR?.recap?.[0])
add('B1-1', 'victory：recap 1 行目が「予告された攻撃 N回のうち、M回を無傷で受け切りました」（M ≤ N）', !!eb && eb.m <= eb.n && eb.n >= 1, eR?.recap)
add('B1-2', 'recap に評価語・意図の推測が無い', (eR?.recap ?? []).every((l) => !/読め|読ん|理解|狙|正し|上手|惜し|成績|評価/.test(l)), eR?.recap)

const S = out.secondWin ?? {}
add('A3-1', '初陣の 1 勝目は NR1、2 勝目は NR1 でない（1 回だけ）', S.first?.result?.goalId === 'NR1' && S.second?.status === '勝利' && S.second?.goalId !== 'NR1', { first: S.first?.result?.goalId, second: S.second?.goalId, wins: S.storage?.records?.ebisu?.wins })
add('A3-2', '2 勝目の戦績 wins=2（新 state 無しで判定）', S.storage?.records?.ebisu?.wins === 2, S.storage?.records?.ebisu)

const L = out.firstLoss ?? {}
const lb = parseAnnounced(L.result?.recap?.[0])
add('A4-1', '初陣の敗北は N1・Primary「同じ盤面でもう一度」（Solve Loop 不変）', L.result?.goalId === 'N1' && L.result?.primaryLabel === '同じ盤面でもう一度', { goal: L.result?.goalId, primary: L.result?.primaryLabel })
add('A4-2', '同じ盤面：seed 同一', !!L.before?.seed && L.before?.seed === L.after?.seed, { before: L.before?.seed, after: L.after?.seed })
add('B2-1', 'defeat（無操作）：recap 1 行目「…無傷で受け切った攻撃はありませんでした」（M=0）', !!lb && lb.zero && lb.n >= 1, L.result?.recap)
add('B2-2', 'defeat の recap は 3 行以内で、事実行の後に助言（最大 1）', (L.result?.recap?.length ?? 9) <= 3, L.result?.recap)

const J = out.juumaCleared ?? {}
add('A5-1', '魔獣を既に撃破（fixture）→ 初陣に勝っても NR1 でない', J.first?.result?.status === '勝利' && J.first?.result?.goalId !== 'NR1', { goal: J.first?.result?.goalId, matchups: J.storage?.matchups })

const R = out.resume ?? {}
add('A6-1', 'Save/Resume：続きから → 同じ seed で再開', R.resumed === true && !!R.saveBefore?.seed && R.saveBefore?.seed === R.saveAfter?.seed, { before: R.saveBefore?.seed, after: R.saveAfter?.seed })
add('A6-2', '再開後の勝利でも NR1 は出る（記録から判定・保存に依存しない）', R.result?.status === '勝利' && R.result?.goalId === 'NR1', { goal: R.result?.goalId, status: R.result?.status })
add('A6-3', '再開後（ログ不完全）は recap で回数を主張しない', (R.result?.recap ?? []).every((l) => !/回/.test(l)), R.result?.recap)

const D = out.daily ?? {}
add('A7-1', 'Daily：目標は D*・NR1 なし・Primary はもう一度挑戦', /^D/.test(D.result?.goalId ?? '') && /^もう一度挑戦/.test(D.result?.primaryLabel ?? ''), { goal: D.result?.goalId, primary: D.result?.primaryLabel })
add('A7-2', 'Daily：回数消費 1・seed は daily-', D.storage?.daily?.[0]?.attemptsUsed === 1 && /^daily-/.test(D.save?.seed ?? ''), { daily: D.storage?.daily, seed: D.save?.seed })
const db = parseAnnounced(D.result?.recap?.[0])
add('B2-3', 'Daily の recap にも事実行（無操作→M=0）', !!db && db.zero, D.result?.recap)

const K = out.stake ?? {}
add('A8-1', '神階Ⅰ（?stake=1）の恵比寿×試練の影 勝利は NR1 でない', K.save?.stake === 1 && K.result?.status === '勝利' && K.result?.goalId !== 'NR1', { stake: K.save?.stake, goal: K.result?.goalId })

const X = out.directSeed ?? {}
add('A9-1', '?seed= 固定でも初陣勝利で NR1（seed 非依存）', X.first?.save?.seed === 'sl206-direct' && X.first?.result?.goalId === 'NR1', { seed: X.first?.save?.seed, goal: X.first?.result?.goalId })

const T = out.returning ?? {}
add('A10-1', '既存プレイヤー（old records・恵比寿 3 勝）は Home に「初陣へ」が出ず、恵比寿×試練の影に勝っても NR1 でない（通算 4 勝）', !/初陣/.test(T.homePrimary ?? '') && T.first?.result?.status === '勝利' && T.first?.result?.goalId !== 'NR1' && T.storage?.records?.ebisu?.wins === 4, { home: T.homePrimary, goal: T.first?.result?.goalId, wins: T.storage?.records?.ebisu?.wins })

const F = out.finished ?? {}
const fb = parseAnnounced(F.result?.recap?.[0])
add('B3-1', '7R 未撃破：事実行 ＋「あと N で撃破でした」', F.result?.status !== '勝利' && !!fb && (F.result?.recap ?? []).some((l) => /^あと.+で撃破でした$/.test(l)), F.result?.recap)

const Q = out.juumaLoop ?? {}
const qb = parseAnnounced(Q.blind?.recap?.[0])
const qr = parseAnnounced(Q.reader?.recap?.[0])
add('B4-1', '魔獣：読まない（無操作）→ 敗北・事実行 M=0', Q.blind?.status === '敗北' && !!qb && qb.m === 0, Q.blind?.recap)
add('B4-2', '同じ盤面でもう一度（seed 同一）', Q.clicked === true && !!Q.before?.seed && Q.before?.seed === Q.rematch?.seed, { before: Q.before?.seed, rematch: Q.rematch?.seed })
add('B4-3', '守る → 盾で防いだ量または無傷回数が増える（行動を変えると結果が変わる、が Result の事実行に出る）', !!qb && !!qr && (qr.blocked > qb.blocked || qr.m > qb.m), { blind: Q.blind?.recap?.[0], reader: Q.reader?.recap?.[0], readerStatus: Q.reader?.status })
add('B4-4', '読まない（無操作）の盾で防いだ量は 0', !!qb && qb.blocked === 0, Q.blind?.recap?.[0])

const allErrors = Object.values(out).flatMap((s) => s?.errors ?? [])
const allApi = Object.values(out).flatMap((s) => s?.api ?? [])
const scenarioErrors = Object.entries(out).filter(([, s]) => s?.error).map(([k, s]) => `${k}: ${s.error}`)
add('C2-1', 'コンソールエラー 0', allErrors.length === 0, allErrors.slice(0, 5))
add('C2-2', '外部／API リクエスト 0', allApi.length === 0, allApi.slice(0, 5))
add('C2-3', 'シナリオ実行エラー 0', scenarioErrors.length === 0, scenarioErrors)

const failed = checks.filter((c) => c.verdict === 'FAIL')
const report = { base, at: new Date().toISOString(), verdict: failed.length === 0 ? 'PASS' : 'FAIL', checks, raw: out }
writeFileSync(join(outDir, 'acceptance.json'), JSON.stringify(report, null, 2))

console.log('')
for (const c of checks) console.log(`${c.verdict === 'PASS' ? '✅' : '❌'} ${c.id} ${c.desc}${c.verdict === 'FAIL' ? ` — ${JSON.stringify(c.detail)}` : ''}`)
console.log(`\n${report.verdict}  (${checks.length - failed.length}/${checks.length})`)
process.exit(failed.length === 0 ? 0 : 1)

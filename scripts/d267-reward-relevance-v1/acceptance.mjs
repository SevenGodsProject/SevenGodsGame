// 決定267（Reward Relevance v1）受け入れテスト（Final Design §14・U1〜U6・1 browser 直列）。
//
//   node scripts/d267-reward-relevance-v1/acceptance.mjs <outDir> <url>
//
//   U1 PC 1508×660 通常勝利 → 報酬 3 択（役割チップ・枚数行・枠内・横スク 0）→ 1 枚選ぶ → トースト → storage（AC10・AC13・AC14）
//   U2 SP 390×844  同上
//   U3 PC 専用 4 種 bonus 済み fixture → 勝利 → 「神の個性」0・「次の構築」2（AC8）→ 見送り（AC11）→ 新 seed で再勝利 → 1 勝目の 3 枚が出ない（AC12）
//   U4 SP 同上 ＋ 見送りボタン本文・注記が枠内
//   U5 PC Daily 勝利 → open-reward 無し・result-hub 直接・daily-diff あり・rewardHistory 未作成（AC15）
//   U6 SP 同上
//
// `scripts/solve-legibility-v1/acceptance.mjs` の openPage／startNormal／startDailyFromHome／playToEnd を複製（勝利 bot は最大 3 回再挑戦）。
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const outDir = process.argv[2] ?? 'scripts/d267-reward-relevance-v1/out'
const base = (process.argv[3] ?? 'http://127.0.0.1:4305').replace(/\/$/, '')
mkdirSync(outDir, { recursive: true })

const PC = { width: 1508, height: 660 }
const SP = { width: 390, height: 844 }
const ROLE_RE = /^(即戦力|神の個性|次の構築|新しい選択肢)$/
const NOW_RE = /^いま \d+ 枚/
const LIMIT_RE = /^上限 \d+ → \d+$/
const TOAST_RE = /^次回の編成で『.+』を \d+ 枚まで積めます$/
const EBISU_EXCLUSIVES = ['card_ebisu_attack_01', 'card_ebisu_support_01', 'card_ebisu_attack_02', 'card_ebisu_support_02']

const browser = await chromium.launch()

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

const STORAGE = () => {
  const j = (k) => {
    try {
      return JSON.parse(localStorage.getItem(k) ?? 'null')
    } catch {
      return null
    }
  }
  return {
    keys: Object.keys(localStorage).sort(),
    rewardBonuses: j('sevengods.rewardBonuses')?.bonuses ?? null,
    rewardHistory: j('sevengods.rewardHistory')?.gods ?? null,
    hasHistoryKey: localStorage.getItem('sevengods.rewardHistory') !== null,
  }
}

const SAVE_SEED = () => {
  try {
    return JSON.parse(localStorage.getItem('sevengods.battleSave') ?? 'null')?.state?.seed ?? null
  } catch {
    return null
  }
}

/** 報酬 3 択の観察（AC13 の DOM 側） */
const REWARD = () => {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const inside = (r) => r.left >= -0.5 && r.top >= -0.5 && r.right <= vw + 0.5 && r.bottom <= vh + 0.5
  const within = (inner, outer) => inner.left >= outer.left - 0.5 && inner.right <= outer.right + 0.5 && inner.top >= outer.top - 0.5 && inner.bottom <= outer.bottom + 0.5
  const cards = [...document.querySelectorAll('.reward-overlay .reward-card')]
  const panel = document.querySelector('.reward-card-panel')?.getBoundingClientRect() ?? null
  const skip = document.querySelector('.reward-skip')
  const note = document.querySelector('.reward-skip-note')
  return {
    count: cards.length,
    cards: cards.map((c) => {
      const r = c.getBoundingClientRect()
      const chip = c.querySelector('.reward-role-chip')
      const now = c.querySelector('.reward-copies-now')
      const limit = c.querySelector('.reward-copies-limit')
      return {
        id: c.getAttribute('data-card-id'),
        role: c.getAttribute('data-role'),
        chip: chip?.textContent.trim() ?? null,
        now: now?.textContent.trim() ?? null,
        limit: limit?.textContent.trim() ?? null,
        hint: c.querySelector('.reward-copies-hint')?.textContent.trim() ?? null,
        god: !!c.querySelector('.reward-card-god'),
        insideViewport: inside(r),
        chipInside: chip ? within(chip.getBoundingClientRect(), r) : false,
        nowInside: now ? within(now.getBoundingClientRect(), r) : false,
        limitInside: limit ? within(limit.getBoundingClientRect(), r) : false,
      }
    }),
    skip: skip ? { text: skip.textContent.replace(/\s+/g, ' ').trim(), inside: panel ? within(skip.getBoundingClientRect(), panel) : false } : null,
    note: note ? { text: note.textContent.trim(), inside: panel ? within(note.getBoundingClientRect(), panel) : false } : null,
    hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    subtitle: document.querySelector('.reward-subtitle')?.textContent.trim() ?? null,
  }
}

async function openPage(viewport, fixture = {}) {
  const ctx = await browser.newContext({ viewport })
  await ctx.addInitScript((s) => {
    if (sessionStorage.getItem('__d267_seeded')) return
    for (const k in s) localStorage.setItem(k, s[k])
    sessionStorage.setItem('__d267_seeded', '1')
  }, fixture)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()))
  return { ctx, page, errors }
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

async function playToEnd(page, maxRounds = 8) {
  for (let round = 1; round <= maxRounds; round++) {
    if (await overlayUp(page)) break
    for (let k = 0; k < 8; k++) {
      const picked = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('.hand .card-view')].filter((c) => !c.disabled)
        if (!cards.length) return false
        const name = (c) => c.querySelector('.card-view-name')?.textContent ?? ''
        const score = (c) => (/⚔|🌟|💀/.test(name(c)) ? 3 : 0) + (c.querySelector('.card-view-bonus-ready') ? 1.5 : 0)
        cards.sort((x, y) => score(y) - score(x))
        cards[0].click()
        return true
      })
      if (!picked) break
      await page.waitForTimeout(850)
      if (await page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay, .enemy-defeat'))) break
    }
    if (await page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay, .enemy-defeat'))) break
    await page.evaluate(() => document.querySelectorAll('.divination-choice')[2]?.click())
    await page.waitForTimeout(400)
    await clickSel(page, '.end-round-button')
    await page.waitForTimeout(3300)
  }
  await page.waitForFunction(() => !!document.querySelector('.reward-overlay, .game-over-overlay'), null, { timeout: 25000 })
  await page.waitForTimeout(2600)
}

const resultStatus = (page) => page.evaluate(() => document.querySelector('.game-over-status')?.textContent.trim() ?? null)

/** 勝つまで最大 3 回（敗北時は「同じ盤面でもう一度」＝result-primary） */
async function winBattle(page, start) {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt === 0) await start()
    await playToEnd(page)
    const status = await resultStatus(page)
    if (status === '勝利') return { attempts: attempt + 1, seed: await page.evaluate(SAVE_SEED) }
    await page.waitForSelector('[data-testid="result-hub"]', { timeout: 15000 })
    await page.waitForTimeout(600)
    if (!(await clickSel(page, '[data-testid="result-primary"]'))) await clickSel(page, '[data-exit="rematch"]')
    await waitBattleReady(page)
  }
  throw new Error('winBattle: could not win in 3 attempts')
}

async function openReward(page) {
  await page.waitForSelector('[data-testid="open-reward"]', { timeout: 15000 })
  await page.waitForTimeout(400)
  await clickSel(page, '[data-testid="open-reward"]')
  await page.waitForSelector('.reward-overlay .reward-card', { timeout: 10000 })
  await page.waitForTimeout(500)
  return page.evaluate(REWARD)
}

const pass = (cond, label) => ({ label, pass: !!cond })

// ---------- U1／U2：通常勝利 → 3 役 → 選択 → トースト → storage ----------
async function scenarioPick(viewport, tag) {
  const p = await openPage(viewport)
  await gotoHome(p, `?seed=d267-${tag}`)
  const win = await winBattle(p.page, () => startNormal(p.page))
  const reward = await openReward(p.page)
  await p.page.screenshot({ path: join(outDir, `${tag}-reward.png`) })
  const offeredIds = reward.cards.map((c) => c.id)
  await clickSel(p.page, '.reward-overlay .reward-card')
  await p.page.waitForSelector('.reward-toast', { timeout: 3000 })
  const toast = await p.page.evaluate(() => document.querySelector('.reward-toast')?.textContent.trim() ?? null)
  await p.page.screenshot({ path: join(outDir, `${tag}-toast.png`) })
  await p.page.waitForSelector('[data-testid="result-hub"]', { timeout: 15000 })
  await p.page.waitForTimeout(500)
  const storage = await p.page.evaluate(STORAGE)
  await p.page.screenshot({ path: join(outDir, `${tag}-result.png`) })
  await p.ctx.close()
  const picked = offeredIds[0]
  const chips = reward.cards.map((c) => c.chip)
  const checks = [
    pass(reward.count === 3 && new Set(offeredIds).size === 3, 'AC1 3 枚・重複なし'),
    pass(chips.every((t) => ROLE_RE.test(t ?? '')), 'AC13 役割チップ 3 個・文言'),
    pass(reward.cards.every((c) => NOW_RE.test(c.now ?? '') && LIMIT_RE.test(c.limit ?? '')), 'AC13 枚数行の文言'),
    pass(reward.cards.every((c) => c.insideViewport && c.chipInside && c.nowInside && c.limitInside), 'AC13 カード・チップ・枚数行が枠内'),
    pass(!reward.hScroll, 'AC13 横スクロール 0'),
    pass(reward.cards[0].role === 'ready', '§1-4 先頭は即戦力'),
    pass(reward.cards.filter((c) => c.role === 'identity').length === 1 && reward.cards.find((c) => c.role === 'identity')?.god === true, 'AC5 神の個性 1 枚＝専用'),
    pass(TOAST_RE.test(toast ?? ''), 'AC14 トースト文言'),
    pass(storage.rewardBonuses?.ebisu?.[picked] === 1, 'AC10 rewardBonuses +1'),
    pass(JSON.stringify(storage.rewardHistory?.ebisu?.offered) === JSON.stringify(offeredIds), 'AC10 offered に 3 枚'),
    pass((storage.rewardHistory?.ebisu?.declined ?? []).length === 0, 'AC10 declined 不変'),
    pass(reward.subtitle === '選んだカードは、次回からこの神のデッキで1枚多く編成できます。', '§5 サブタイトル'),
    pass(p.errors.length === 0, 'console error 0'),
  ]
  return { tag, viewport, win, reward, toast, storage, errors: p.errors, checks }
}

// ---------- U3／U4：専用 bonus 済み → 神の個性 0 → 見送り → 新 seed で再勝利 → 除外 ----------
async function scenarioSkipAndExclude(viewport, tag) {
  const fixture = {
    'sevengods.rewardBonuses': JSON.stringify({ version: 1, bonuses: { ebisu: Object.fromEntries(EBISU_EXCLUSIVES.map((id) => [id, 1])) } }),
  }
  const p = await openPage(viewport, fixture)
  await gotoHome(p)
  const win1 = await winBattle(p.page, () => startNormal(p.page))
  const reward1 = await openReward(p.page)
  await p.page.screenshot({ path: join(outDir, `${tag}-reward1.png`) })
  const offered1 = reward1.cards.map((c) => c.id)
  await clickSel(p.page, '.reward-overlay .reward-skip')
  await p.page.waitForSelector('[data-testid="result-hub"]', { timeout: 15000 })
  await p.page.waitForTimeout(500)
  const storageAfterSkip = await p.page.evaluate(STORAGE)
  // 2 勝目：勝利後の「もう一度」は新 seed
  await clickSel(p.page, '[data-exit="rematch"]')
  await waitBattleReady(p.page)
  const seed2Start = await p.page.evaluate(SAVE_SEED)
  const win2 = await winBattle(p.page, async () => {})
  const reward2 = await openReward(p.page)
  await p.page.screenshot({ path: join(outDir, `${tag}-reward2.png`) })
  const offered2 = reward2.cards.map((c) => c.id)
  await clickSel(p.page, '.reward-overlay .reward-card')
  await p.page.waitForSelector('[data-testid="result-hub"]', { timeout: 15000 })
  await p.page.waitForTimeout(500)
  const storageEnd = await p.page.evaluate(STORAGE)
  await p.ctx.close()
  const bonusesUnchanged = (b) => EBISU_EXCLUSIVES.every((id) => b?.ebisu?.[id] === 1) && Object.keys(b?.ebisu ?? {}).length === 4
  const checks = [
    pass(reward1.cards.filter((c) => c.role === 'identity').length === 0, 'AC8 神の個性 0'),
    pass(reward1.cards.filter((c) => c.role === 'next').length === 2, 'AC8 次の構築 2'),
    pass(reward1.cards.every((c) => !c.god), 'AC8 専用札なし'),
    pass(bonusesUnchanged(storageAfterSkip.rewardBonuses), 'AC11 見送りで rewardBonuses 不変'),
    pass(JSON.stringify(storageAfterSkip.rewardHistory?.ebisu?.offered) === JSON.stringify(offered1), 'AC11 offered に 3 枚'),
    pass(JSON.stringify(storageAfterSkip.rewardHistory?.ebisu?.declined) === JSON.stringify(offered1), 'AC11 declined に同じ 3 枚'),
    pass(win1.seed !== seed2Start, 'AC12 2 勝目は別 seed'),
    pass(offered2.every((id) => !offered1.includes(id)), 'AC12 1 勝目の 3 枚が 2 勝目に出ない'),
    pass(reward2.count === 3 && new Set(offered2).size === 3, 'AC1 2 勝目も 3 枚'),
    pass(reward1.skip?.inside === true && reward1.note?.inside === true && reward1.note?.text === 'この 3 枚は次の 2 勝では出ません', '§5 見送りボタン本文・注記が枠内'),
    pass(!reward1.hScroll && !reward2.hScroll, 'AC13 横スクロール 0'),
    pass(storageEnd.rewardHistory?.ebisu?.offered?.length === 6, 'AC10 2 勝で offered 6'),
    pass(p.errors.length === 0, 'console error 0'),
  ]
  return { tag, viewport, win1, win2, seed2Start, reward1, reward2, storageAfterSkip, storageEnd, errors: p.errors, checks }
}

// ---------- U5／U6：Daily 勝利 → 報酬を出さない ----------
async function scenarioDaily(viewport, tag) {
  const p = await openPage(viewport)
  await gotoHome(p)
  let attempts = 0
  let status = null
  await startDailyFromHome(p.page)
  for (attempts = 1; attempts <= 3; attempts++) {
    await playToEnd(p.page)
    status = await resultStatus(p.page)
    if (status === '勝利') break
    await p.page.waitForSelector('[data-testid="result-hub"]', { timeout: 15000 })
    await p.page.waitForTimeout(600)
    if (!(await clickSel(p.page, '[data-exit="rematch"]')) && !(await clickSel(p.page, '[data-testid="result-primary"]'))) break
    await waitBattleReady(p.page)
  }
  await p.page.waitForTimeout(800)
  const dom = await p.page.evaluate(() => ({
    openReward: !!document.querySelector('[data-testid="open-reward"]'),
    resultHub: !!document.querySelector('[data-testid="result-hub"]'),
    dailyDiff: !!document.querySelector('[data-testid="daily-diff"]'),
    rewardOverlay: !!document.querySelector('.reward-overlay'),
  }))
  const storage = await p.page.evaluate(STORAGE)
  await p.page.screenshot({ path: join(outDir, `${tag}-daily-result.png`) })
  await p.ctx.close()
  const won = status === '勝利'
  const checks = [
    pass(won, 'Daily で勝利できた（前提）'),
    pass(!dom.openReward && !dom.rewardOverlay, 'AC15 open-reward 無し'),
    pass(dom.resultHub, 'AC15 result-hub 直接'),
    pass(dom.dailyDiff, 'AC15 daily-diff あり'),
    pass(!storage.hasHistoryKey, 'AC15 rewardHistory 未作成'),
    pass(p.errors.length === 0, 'console error 0'),
  ]
  return { tag, viewport, attempts, status, dom, storage, errors: p.errors, checks }
}

const runs = []
const safe = async (fn) => {
  try {
    runs.push(await fn())
  } catch (e) {
    runs.push({ tag: fn.name, error: String(e), checks: [pass(false, `実行エラー: ${String(e).slice(0, 120)}`)] })
  }
}

await safe(() => scenarioPick(PC, 'u1-pc'))
await safe(() => scenarioPick(SP, 'u2-sp'))
await safe(() => scenarioSkipAndExclude(PC, 'u3-pc'))
await safe(() => scenarioSkipAndExclude(SP, 'u4-sp'))
await safe(() => scenarioDaily(PC, 'u5-pc'))
await safe(() => scenarioDaily(SP, 'u6-sp'))

await browser.close()

const summary = runs.map((r) => ({ tag: r.tag, pass: r.checks.every((c) => c.pass), failed: r.checks.filter((c) => !c.pass).map((c) => c.label), errors: r.errors ?? [] }))
writeFileSync(join(outDir, 'summary.json'), JSON.stringify({ base, at: new Date().toISOString(), summary, runs }, null, 2))
for (const s of summary) console.log(`${s.pass ? 'PASS' : 'FAIL'} ${s.tag}${s.failed.length ? ' — ' + s.failed.join(' / ') : ''}`)
console.log(`RESULT: ${summary.filter((s) => s.pass).length}/${summary.length} PASS`)
process.exit(summary.every((s) => s.pass) ? 0 : 1)

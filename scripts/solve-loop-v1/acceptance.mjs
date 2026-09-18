// 決定196（Solve Loop v1）受け入れテスト。
//
//   node scripts/solve-loop-v1/acceptance.mjs <outDir> <url>
//
// 確かめること：
//   AC1 通常戦で敗北 → Primary が「同じ盤面でもう一度」で、押すと seed・初期手札・予告が一致する
//   AC2 通常戦で未撃破（7R）→ 同じく「同じ盤面でもう一度」
//   AC3 通常戦で勝利 → 文言は「同じ構成でもう一度」のままで、押すと seed が変わる
//   AC4 神域挑戦（Daily）は文言も seed 意味論も回数消費も従来どおり
//   AC5 敗北後の逃げ道（デッキを調整 → 開始）は新しい盤面になる
//   AC6 コンソールエラー 0
//
// `?seed=` は使わない（URLで固定すると検証にならないため）。
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const outDir = process.argv[2] ?? 'scripts/solve-loop-v1/out'
const base = (process.argv[3] ?? 'http://localhost:4181').replace(/\/$/, '')
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch()

const clickText = (page, text) =>
  page.evaluate((t) => {
    const el = [...document.querySelectorAll('button')].find(
      (x) => x.textContent.replace(/\s+/g, '').includes(t) && !x.disabled,
    )
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

/** 盤面の指紋：seed（保存データ）＋ 初期手札の並び ＋ 敵の予告 ＋ 敵HP */
const FINGERPRINT = () => {
  let seed = null
  let mode = null
  try {
    const save = JSON.parse(localStorage.getItem('sevengods.battleSave') ?? 'null')
    seed = save?.state?.seed ?? null
    mode = save?.state?.mode ?? null
  } catch {
    seed = null
  }
  return {
    seed,
    mode,
    hand: [...document.querySelectorAll('.hand .card-view')].map(
      (c) => c.querySelector('.card-view-name')?.textContent?.trim() ?? '?',
    ),
    intent: document.querySelector('.enemy-plate-status .intent')?.textContent?.trim() ?? null,
    enemyHp: document.querySelector('.enemy-plate .hp-bar-label')?.textContent?.trim() ?? null,
  }
}

/** 結果画面の「次の目標」と出口（rematch の文言をそのまま拾う） */
const RESULT = () => ({
  goal: document.querySelector('[data-testid="result-next-goal"], .result-next-goal')?.textContent?.trim() ?? null,
  primaryExit: document.querySelector('[data-testid="result-primary"]')?.getAttribute('data-exit') ?? null,
  primaryLabel: document.querySelector('[data-testid="result-primary"]')?.textContent?.trim() ?? null,
  rematchLabel:
    [...document.querySelectorAll('[data-exit="rematch"]')].map((b) => b.textContent.trim())[0] ?? null,
  exits: [...document.querySelectorAll('[data-exit]')].map((b) => b.getAttribute('data-exit')),
})

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
    daily: daily
      ? Object.values(daily.days).map((d) => ({
          dateKey: d.dateKey,
          enemyId: d.enemyId,
          seed: d.seed,
          attemptsUsed: d.attemptsUsed,
          results: (d.results ?? []).length,
        }))
      : null,
  }
}

async function openPage() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
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

async function startNormal(page, { god = '大耀', enemy = '業斧の鬼将' } = {}) {
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

/** strategy: 'lose'（何も打たずラウンドを流す） / 'win'（攻撃優先） / 'stall'（防御だけ打って7R到達を狙う） */
async function playToEnd(page, strategy) {
  for (let round = 1; round <= 8; round++) {
    if (await overlayUp(page)) break
    if (strategy === 'win') {
      for (let k = 0; k < 8; k++) {
        const picked = await page.evaluate(() => {
          const cards = [...document.querySelectorAll('.hand .card-view')].filter((c) => !c.disabled)
          if (!cards.length) return false
          const name = (c) => c.querySelector('.card-view-name')?.textContent ?? ''
          cards.sort(
            (x, y) =>
              (/⚔|🌟|💀/.test(name(y)) ? 3 : 0) +
              (y.querySelector('.card-view-bonus-ready') ? 1.5 : 0) -
              ((/⚔|🌟|💀/.test(name(x)) ? 3 : 0) + (x.querySelector('.card-view-bonus-ready') ? 1.5 : 0)),
          )
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
    } else if (strategy === 'stall') {
      // 守りだけ打って生き延び、7ラウンド終了（未撃破）を狙う
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
  await page.waitForTimeout(2600)
  return page.evaluate(RESULT)
}

// ---------- シナリオ ----------

/** 通常戦：敗北 or 未撃破 → 同じ盤面で再戦 */
async function scenarioSameBoard(strategy) {
  const p = await openPage()
  await gotoHome(p)
  await startNormal(p.page)
  const before = await p.page.evaluate(FINGERPRINT)
  await playToEnd(p.page, strategy)
  const result = await settleResult(p.page)
  await p.page.screenshot({ path: join(outDir, `normal-${strategy}-result.png`) })

  const clicked = await clickSel(p.page, '[data-testid="result-primary"]')
  await waitBattleReady(p.page)
  const after = await p.page.evaluate(FINGERPRINT)
  await p.page.screenshot({ path: join(outDir, `normal-${strategy}-rematch.png`) })
  await p.ctx.close()
  return { strategy, before, result, clicked, after, errors: p.errors }
}

/** 通常戦：勝利 → 新しい盤面のまま */
async function scenarioWinNewBoard() {
  const p = await openPage()
  await gotoHome(p)
  await startNormal(p.page)
  const before = await p.page.evaluate(FINGERPRINT)
  await playToEnd(p.page, 'win')
  const result = await settleResult(p.page)
  await p.page.screenshot({ path: join(outDir, 'normal-win-result.png') })

  const clicked = await clickSel(p.page, '[data-exit="rematch"]')
  await waitBattleReady(p.page)
  const after = await p.page.evaluate(FINGERPRINT)
  await p.ctx.close()
  return { before, result, clicked, after, errors: p.errors }
}

/** 神域挑戦：文言・seed・回数消費が従来どおり */
async function scenarioDaily() {
  const p = await openPage()
  await gotoHome(p)
  await startDailyFromHome(p.page)
  const before = await p.page.evaluate(FINGERPRINT)
  const storageAfterStart = await p.page.evaluate(STORAGE)
  await playToEnd(p.page, 'lose')
  const result = await settleResult(p.page)
  await p.page.screenshot({ path: join(outDir, 'daily-result.png') })

  const clicked = await clickSel(p.page, '[data-testid="result-primary"]')
  await waitBattleReady(p.page)
  const after = await p.page.evaluate(FINGERPRINT)
  const storageAfterRematch = await p.page.evaluate(STORAGE)
  await p.ctx.close()
  return { before, result, clicked, after, storageAfterStart, storageAfterRematch, errors: p.errors }
}

/** 敗北後の逃げ道：デッキを調整 → 開始 は新しい盤面 */
async function scenarioEscapeHatch() {
  const p = await openPage()
  await gotoHome(p)
  await startNormal(p.page)
  const before = await p.page.evaluate(FINGERPRINT)
  await playToEnd(p.page, 'lose')
  await settleResult(p.page)
  const clicked = await clickSel(p.page, '[data-exit="adjustDeck"]')
  await p.page.waitForTimeout(900)
  await clickText(p.page, 'この構成でバトル開始')
  await waitBattleReady(p.page)
  const after = await p.page.evaluate(FINGERPRINT)
  await p.ctx.close()
  return { before, clicked, after, errors: p.errors }
}

// ---------- 実行 ----------
const out = {}
const run = async (name, fn) => {
  try {
    out[name] = await fn()
    console.log(`  ok  ${name}`)
  } catch (e) {
    out[name] = { error: String(e) }
    console.log(`  NG  ${name}: ${e}`)
  }
}

console.log(`base = ${base}`)
await run('lose', () => scenarioSameBoard('lose'))
await run('stall', () => scenarioSameBoard('stall'))
await run('win', scenarioWinNewBoard)
await run('daily', scenarioDaily)
await run('escape', scenarioEscapeHatch)
await browser.close()

// ---------- 判定 ----------
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const checks = []
const add = (id, desc, pass, detail) => checks.push({ id, desc, verdict: pass ? 'PASS' : 'FAIL', detail })

const L = out.lose ?? {}
add('AC1-1', '敗北の Primary が「同じ盤面でもう一度」', L.result?.primaryLabel === '同じ盤面でもう一度', L.result?.primaryLabel)
add('AC1-2', '敗北の Primary の出口は rematch', L.result?.primaryExit === 'rematch', L.result?.primaryExit)
add('AC1-3', '再戦の seed が同じ', !!L.before?.seed && L.before?.seed === L.after?.seed, { before: L.before?.seed, after: L.after?.seed })
add('AC1-4', '再戦の初期手札が同じ', !!L.before?.hand?.length && eq(L.before?.hand, L.after?.hand), { before: L.before?.hand, after: L.after?.hand })
add('AC1-5', '再戦の敵の予告が同じ', !!L.before?.intent && eq(L.before?.intent, L.after?.intent), { before: L.before?.intent, after: L.after?.intent })
add('AC1-6', '再戦の敵HPが同じ（満タンから同じ問題）', !!L.before?.enemyHp && eq(L.before?.enemyHp, L.after?.enemyHp), { before: L.before?.enemyHp, after: L.after?.enemyHp })

const S = out.stall ?? {}
add('AC2-1', '未撃破(7R)の Primary が「同じ盤面でもう一度」', S.result?.primaryLabel === '同じ盤面でもう一度', S.result?.primaryLabel)
add('AC2-2', '未撃破の再戦 seed が同じ', !!S.before?.seed && S.before?.seed === S.after?.seed, { before: S.before?.seed, after: S.after?.seed })

const W = out.win ?? {}
add('AC3-1', '勝利の再戦文言は「同じ構成でもう一度」のまま', W.result?.rematchLabel === '同じ構成でもう一度', W.result?.rematchLabel)
add('AC3-2', '勝利の再戦は seed が変わる', !!W.before?.seed && !!W.after?.seed && W.before.seed !== W.after.seed, { before: W.before?.seed, after: W.after?.seed })

const D = out.daily ?? {}
add('AC4-1', 'Daily の再戦文言は「もう一度挑戦（残りN回）」のまま', /^もう一度挑戦（残り\d+回）$/.test(D.result?.rematchLabel ?? ''), D.result?.rematchLabel)
add('AC4-2', 'Daily は同日 seed のまま（再戦しても同じ）', !!D.before?.seed && D.before?.seed === D.after?.seed, { before: D.before?.seed, after: D.after?.seed })
add('AC4-3', 'Daily の seed は daily- 形式（通常戦の seed が混ざらない）', /^daily-/.test(D.before?.seed ?? ''), D.before?.seed)
add('AC4-4', 'Daily の mode が daily のまま', D.after?.mode === 'daily', { before: D.before?.mode, after: D.after?.mode })
add(
  'AC4-5',
  'Daily の回数消費は 1 回開始につき 1（再戦で 1 → 2）',
  (D.storageAfterStart?.daily?.[0]?.attemptsUsed ?? 0) === 1 && (D.storageAfterRematch?.daily?.[0]?.attemptsUsed ?? 0) === 2,
  { start: D.storageAfterStart?.daily, rematch: D.storageAfterRematch?.daily },
)

const E = out.escape ?? {}
add('AC5-1', '敗北後「デッキを調整」→開始 は新しい盤面（seed が変わる）', !!E.before?.seed && !!E.after?.seed && E.before.seed !== E.after.seed, { before: E.before?.seed, after: E.after?.seed })

const allErrors = Object.values(out).flatMap((s) => s?.errors ?? [])
add('AC6-1', 'コンソールエラー 0', allErrors.length === 0, allErrors.slice(0, 5))

const failed = checks.filter((c) => c.verdict === 'FAIL')
const report = { base, at: new Date().toISOString(), verdict: failed.length === 0 ? 'PASS' : 'FAIL', checks, raw: out }
writeFileSync(join(outDir, 'acceptance.json'), JSON.stringify(report, null, 2))

console.log('')
for (const c of checks) console.log(`${c.verdict === 'PASS' ? '✅' : '❌'} ${c.id} ${c.desc}${c.verdict === 'FAIL' ? ` — ${JSON.stringify(c.detail)}` : ''}`)
console.log(`\n${report.verdict}  (${checks.length - failed.length}/${checks.length})`)
process.exit(failed.length === 0 ? 0 : 1)

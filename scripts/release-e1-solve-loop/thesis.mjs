// 決定197：Release 仮説の反証シナリオ（監査用・ゲームコードではない）。
//   node scripts/release-e1-solve-loop/thesis.mjs <outDir> <url>
//
// 仮説：E1（初陣 3 click）× Solve Loop v1（敗北→同じ盤面）で
//   Entry → Battle → Failure → Think → Retry → Solve が Production 上で最初に繋がる。
// 反証対象：
//   ①初陣で負けたとき本当に「同じ盤面でもう一度」になるか（E1 の startFirstBattle が godId/deck を state に置き、
//     Solve Loop の再戦ハンドラがそれを拾えるか）
//   ②初陣で勝ったときは新しい盤面か
//   ③初陣は Daily 回数に触れないか
//   ④JS error 0
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const [outDir = 'scripts/release-e1-solve-loop/out/thesis', base = 'http://localhost:4181'] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch()

const clickText = (page, t) =>
  page.evaluate((t) => {
    const el = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(t) && !x.disabled)
    if (!el) return false
    el.click()
    return true
  }, t)
const clickSel = (page, s) =>
  page.evaluate((s) => {
    const el = document.querySelector(s)
    if (!el || el.disabled) return false
    el.click()
    return true
  }, s)

const FP = () => {
  let seed = null
  let mode = null
  let godId = null
  let enemyId = null
  try {
    const s = JSON.parse(localStorage.getItem('sevengods.battleSave') ?? 'null')
    seed = s?.state?.seed ?? null
    mode = s?.state?.mode ?? null
    godId = s?.state?.godId ?? null
    enemyId = s?.state?.enemy?.defId ?? null
  } catch {
    seed = null
  }
  return {
    seed,
    mode,
    godId,
    enemyId,
    hand: [...document.querySelectorAll('.hand .card-view')].map((c) => c.querySelector('.card-view-name')?.textContent?.trim() ?? '?'),
    intent: document.querySelector('.enemy-plate-status .intent')?.textContent?.trim() ?? null,
    daily: JSON.parse(localStorage.getItem('sevengods.daily') ?? 'null'),
  }
}
const RESULT = () => ({
  primaryExit: document.querySelector('[data-testid="result-primary"]')?.getAttribute('data-exit') ?? null,
  primaryLabel: document.querySelector('[data-testid="result-primary"]')?.textContent?.trim() ?? null,
  rematchLabel: [...document.querySelectorAll('[data-exit="rematch"]')].map((b) => b.textContent.trim())[0] ?? null,
  goal: document.querySelector('[data-testid="result-next-goal"], .result-next-goal')?.textContent?.trim() ?? null,
})

async function waitBattle(page) {
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
async function open(vp) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: vp.width < 500, hasTouch: vp.width < 500 })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()))
  await page.goto(base + '/')
  await page.waitForSelector('.home-screen .home-cta-primary', { timeout: 30000 })
  await page.waitForTimeout(500)
  return { ctx, page, errors }
}
async function firstBattle(page) {
  let clicks = 0
  if (!(await clickText(page, '初陣へ'))) throw new Error('初陣へ not found')
  clicks++
  await page.waitForTimeout(500)
  if (!(await clickText(page, '出陣する'))) throw new Error('出陣する not found')
  clicks++
  await waitBattle(page)
  return clicks
}
const overlay = (page) => page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay'))
async function playToEnd(page, strategy) {
  for (let r = 1; r <= 8; r++) {
    if (await overlay(page)) break
    if (strategy === 'win') {
      for (let k = 0; k < 8; k++) {
        const ok = await page.evaluate(() => {
          const cards = [...document.querySelectorAll('.hand .card-view')].filter((c) => !c.disabled)
          if (!cards.length) return false
          const nm = (c) => c.querySelector('.card-view-name')?.textContent ?? ''
          cards.sort((x, y) => (/⚔|🌟|💀/.test(nm(y)) ? 3 : 0) - (/⚔|🌟|💀/.test(nm(x)) ? 3 : 0))
          cards[0].click()
          return true
        })
        if (!ok) break
        await page.waitForTimeout(850)
        if (await page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay, .enemy-defeat'))) break
      }
      if (await page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay, .enemy-defeat'))) break
    }
    await clickSel(page, '.end-round-button')
    await page.waitForTimeout(3300)
  }
  await page.waitForFunction(() => !!document.querySelector('.reward-overlay, .game-over-overlay'), null, { timeout: 25000 })
  await page.waitForTimeout(700)
}
async function settle(page) {
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
async function scenario(vp, strategy) {
  const p = await open(vp)
  const clicks = await firstBattle(p.page)
  const before = await p.page.evaluate(FP)
  await playToEnd(p.page, strategy)
  const result = await settle(p.page)
  await p.page.screenshot({ path: join(outDir, `${vp.width}-first-${strategy}-result.png`) })
  const clicked = await clickSel(p.page, strategy === 'lose' ? '[data-testid="result-primary"]' : '[data-exit="rematch"]')
  await waitBattle(p.page)
  const after = await p.page.evaluate(FP)
  await p.page.screenshot({ path: join(outDir, `${vp.width}-first-${strategy}-rematch.png`) })
  await p.ctx.close()
  return { clicks, before, result, clicked, after, errors: p.errors }
}

const out = {}
for (const [name, vp] of Object.entries({ pc1508: { width: 1508, height: 660 }, sp844: { width: 390, height: 844 } })) {
  for (const s of ['lose', 'win']) {
    try {
      out[`${name}-${s}`] = await scenario(vp, s)
      console.log('  ok', name, s)
    } catch (e) {
      out[`${name}-${s}`] = { error: String(e) }
      console.log('  NG', name, s, e)
    }
  }
}
await browser.close()

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const checks = []
const add = (id, d, pass, detail) => checks.push({ id, d, verdict: pass ? 'PASS' : 'FAIL', detail })
for (const vp of ['pc1508', 'sp844']) {
  const L = out[`${vp}-lose`] ?? {}
  const W = out[`${vp}-win`] ?? {}
  add(`T1-${vp}`, '初陣は 2 click で開戦（3 click 目が最初のカード）', L.clicks === 2, L.clicks)
  add(`T2-${vp}`, '初陣＝恵比寿 vs 試練の影・通常モード', L.before?.godId === 'ebisu' && L.before?.enemyId === 'enemy_01' && (L.before?.mode ?? 'normal') === 'normal', { god: L.before?.godId, enemy: L.before?.enemyId, mode: L.before?.mode })
  add(`T3-${vp}`, '初陣で負けたとき Primary が「同じ盤面でもう一度」', L.result?.primaryLabel === '同じ盤面でもう一度' && L.result?.primaryExit === 'rematch', L.result)
  add(`T4-${vp}`, '初陣の敗北→再戦で seed・初期手札・予告が一致（E1 の state 設定と Solve Loop の接続）', !!L.before?.seed && L.before.seed === L.after?.seed && eq(L.before?.hand, L.after?.hand) && eq(L.before?.intent, L.after?.intent), { seed: [L.before?.seed, L.after?.seed], hand: [L.before?.hand, L.after?.hand], intent: [L.before?.intent, L.after?.intent] })
  add(`T5-${vp}`, '初陣で勝ったとき再戦文言は「同じ構成でもう一度」で seed が変わる', W.result?.rematchLabel === '同じ構成でもう一度' && !!W.before?.seed && !!W.after?.seed && W.before.seed !== W.after.seed, { label: W.result?.rematchLabel, seed: [W.before?.seed, W.after?.seed] })
  add(`T6-${vp}`, '初陣は Daily 回数に触れない', !L.after?.daily || Object.values(L.after.daily.days ?? {}).every((d) => (d.attemptsUsed ?? 0) === 0), L.after?.daily)
  add(`T7-${vp}`, 'JS error 0', (L.errors ?? []).length === 0 && (W.errors ?? []).length === 0, [...(L.errors ?? []), ...(W.errors ?? [])].slice(0, 3))
}
const failed = checks.filter((c) => c.verdict === 'FAIL')
writeFileSync(join(outDir, 'thesis.json'), JSON.stringify({ base, at: new Date().toISOString(), verdict: failed.length ? 'FAIL' : 'PASS', checks, raw: out }, null, 2))
for (const c of checks) console.log(`${c.verdict === 'PASS' ? '✅' : '❌'} ${c.id} ${c.d}${c.verdict === 'FAIL' ? ' — ' + JSON.stringify(c.detail).slice(0, 220) : ''}`)
console.log(`\n${failed.length ? 'FAIL' : 'PASS'} (${checks.length - failed.length}/${checks.length})`)

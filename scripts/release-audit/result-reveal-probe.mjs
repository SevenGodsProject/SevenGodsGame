// 結果画面の段階表示（決定226）の実ブラウザ計測（v1.1.6 Quick Win #1・読み取り専用）
//   node scripts/release-audit/result-reveal-probe.mjs <outDir> <baseUrl>
//   env: RR_VIEWPORTS（既定 pc,sp375）／RR_ENEMY（既定 oni）／RR_SEED（既定 p7spec-result-normal-win＝phase7-p1 の勝利 seed）
// 通常モードで勝利 → (A) 初回の結果画面：mount から「報酬カードを選ぶ」が見えるまで（初回演出が保たれているか）
//                  → 報酬を 1 枚選ぶ → (B) 報酬後の結果画面：再 mount から Primary（result-primary）が押せる見た目になるまで
// を ms で記録する。B が A と同じ長さなら「演出が二度流れている」。決定論・save には一切触れない。
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const [outDir, base] = process.argv.slice(2)
if (!outDir || !base) {
  console.error('usage: node scripts/release-audit/result-reveal-probe.mjs <outDir> <baseUrl>')
  process.exit(2)
}
mkdirSync(outDir, { recursive: true })
const VIEWPORTS = {
  pc: { viewport: { width: 1508, height: 660 }, isMobile: false },
  sp375: { viewport: { width: 375, height: 667 }, isMobile: true },
}
const vps = (process.env.RR_VIEWPORTS ?? 'pc,sp375').split(',')
const enemy = process.env.RR_ENEMY ?? 'oni'
const seed = process.env.RR_SEED ?? 'p7spec-result-normal-win'

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

async function startNormal(page) {
  await page.goto(`${base}/?enemy=${enemy}&seed=${seed}`, { waitUntil: 'load' })
  await page.waitForSelector('.home-screen .home-cta-primary', { timeout: 30000 })
  await page.waitForTimeout(400)
  if (await clickText(page, 'わかった')) await page.waitForTimeout(400)
  if (!(await clickSel(page, '[data-testid="home-start"]'))) await clickText(page, '神を選ぶ')
  await page.waitForTimeout(400)
  if (await clickText(page, '新しく始める')) await page.waitForTimeout(400)
  await clickText(page, '大耀')
  await page.waitForTimeout(300)
  await clickText(page, 'この構成で始める')
  await page.waitForTimeout(300)
  await clickText(page, '業斧の鬼将')
  await page.waitForTimeout(400)
  await clickText(page, 'この構成でバトル開始')
  await page.waitForSelector('.hand .card-view', { timeout: 20000 })
  await page.waitForFunction(() => { const b = document.querySelector('.end-round-button'); return b && !b.disabled }, null, { timeout: 20000 })
}

/** phase7-p1 の 'win' 方策（攻撃札優先）で決着まで進める */
async function playToWin(page) {
  const over = () => page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay, .enemy-defeat'))
  for (let round = 1; round <= 8; round++) {
    if (await over()) break
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
      if (await over()) break
    }
    if (await over()) break
    await page.evaluate(() => document.querySelectorAll('.divination-choice')[2]?.click())
    await page.waitForTimeout(400)
    await clickSel(page, '.end-round-button')
    await page.waitForTimeout(3300)
  }
}

/** ブラウザ内：結果画面の要素の見た目（opacity・進行中 animation・スコアの巻き上げ中か） */
const SAMPLE = () => {
  const q = (s) => document.querySelector(s)
  const look = (el) => {
    if (!el) return null
    const cs = getComputedStyle(el)
    const anims = typeof el.getAnimations === 'function' ? el.getAnimations().filter((a) => a.playState === 'running').length : -1
    return { opacity: Number(cs.opacity), running: anims }
  }
  return {
    overlay: !!q('.game-over-overlay'),
    skipped: !!q('.game-over-card-skipped'),
    status: look(q('.game-over-status')),
    score: look(q('.game-over-score')),
    scoreText: q('.game-over-score')?.textContent.trim() ?? null,
    rolling: !!q('.game-over-score-rolling'),
    openReward: look(q('.result-hub-pending')),
    primary: look(q('[data-testid="result-primary"]')),
    hub: look(q('.result-hub')),
  }
}

/** mount 直後から 50ms ごとに標本を取り、target が「opacity 1・animation なし・スコア巻き上げ終了」になった時刻（mount 比）を返す */
async function measureReveal(page, target, maxMs = 4000) {
  const t0 = Date.now()
  const samples = []
  let readyAt = null
  let scoreSettledAt = null
  while (Date.now() - t0 < maxMs) {
    const s = await page.evaluate(SAMPLE)
    const t = Date.now() - t0
    samples.push({ t, ...s })
    const el = s[target]
    if (readyAt == null && el && el.opacity >= 0.99 && el.running === 0) readyAt = t
    if (scoreSettledAt == null && s.score && !s.rolling && s.score.opacity >= 0.99) scoreSettledAt = t
    if (readyAt != null && scoreSettledAt != null && t > 600) break
    await page.waitForTimeout(50)
  }
  return { readyAt, scoreSettledAt, first: samples[0], last: samples[samples.length - 1] }
}

const browser = await chromium.launch({ headless: true })
const report = { base, enemy, seed, generatedAt: new Date().toISOString(), rows: [] }
for (const vp of vps) {
  const ctx = await browser.newContext({ ...VIEWPORTS[vp] })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()))
  const row = { vp, errors }
  try {
    await startNormal(page)
    await playToWin(page)
    // (A) 初回の結果画面：overlay の出現を待って計測（「報酬カードを選ぶ」が見えるまで）
    await page.waitForFunction(() => !!document.querySelector('.game-over-overlay'), null, { timeout: 30000 })
    row.first = await measureReveal(page, 'openReward')
    await page.waitForTimeout(600)
    row.status = await page.evaluate(() => document.querySelector('.game-over-status')?.textContent.trim() ?? null)
    await page.screenshot({ path: `${outDir}/${vp}-1-first-result.jpg`, type: 'jpeg', quality: 70 })
    // 報酬を 1 枚選ぶ
    if (!(await clickSel(page, '[data-testid="open-reward"]'))) throw new Error('open-reward not found')
    await page.waitForSelector('.reward-overlay .reward-card', { timeout: 10000 })
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${outDir}/${vp}-2-reward.jpg`, type: 'jpeg', quality: 70 })
    await clickSel(page, '.reward-overlay .reward-card')
    // (B) 報酬後の結果画面：再 mount の瞬間から Result Hub（Primary の親・段階表示の対象）が見えるまで
    await page.waitForFunction(() => !!document.querySelector('.game-over-overlay [data-testid="result-primary"]'), null, { timeout: 10000 })
    row.afterReward = await measureReveal(page, 'hub')
    await page.screenshot({ path: `${outDir}/${vp}-3-after-reward-measured.jpg`, type: 'jpeg', quality: 70 })
    await page.waitForTimeout(2300)
    await page.screenshot({ path: `${outDir}/${vp}-4-after-reward-settled.jpg`, type: 'jpeg', quality: 70 })
    row.finalScoreText = await page.evaluate(() => document.querySelector('.game-over-score')?.textContent.trim() ?? null)
    row.primaryText = await page.evaluate(() => document.querySelector('[data-testid="result-primary"]')?.textContent.trim() ?? null)
  } catch (e) {
    row.error = String(e)
    await page.screenshot({ path: `${outDir}/${vp}-error.jpg`, type: 'jpeg', quality: 60 }).catch(() => {})
  }
  report.rows.push(row)
  console.log(JSON.stringify({ vp, status: row.status, first: row.first && { ready: row.first.readyAt, score: row.first.scoreSettledAt }, afterReward: row.afterReward && { ready: row.afterReward.readyAt, score: row.afterReward.scoreSettledAt, firstFrame: row.afterReward.first && { rolling: row.afterReward.first.rolling, hubOpacity: row.afterReward.first.hub?.opacity, primaryOpacity: row.afterReward.first.primary?.opacity, statusOpacity: row.afterReward.first.status?.opacity } }, errors: errors.length, error: row.error }))
  await ctx.close()
}
await browser.close()
writeFileSync(`${outDir}/result-reveal-probe.json`, JSON.stringify(report, null, 2))
const bad = report.rows.filter((r) => r.error || r.errors.length)
console.log(`result-reveal-probe ${report.rows.length - bad.length}/${report.rows.length} rows ok`)
process.exit(bad.length ? 1 : 0)

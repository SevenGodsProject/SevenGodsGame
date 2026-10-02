// 決定207：phase7-p1 AC10 回帰（PC 1508×660・Daily 2 回目勝利の Result で Secondary CTA が初期可視領域外）の実測。
//
//   node scripts/release-solve-legibility-v1/measure-ac10.mjs <outJson> <url> [w x h ...]
//
// Daily を 1 回目「無操作で敗北」→「もう一度挑戦」→ 2 回目「攻撃優先で勝利」→ 報酬 1 枚 → Result Hub を出し、
// 結果カード（内側スクロール）の可視下端と Secondary CTA の下端の差（overflowPx）と、recap の実寸を記録する。
// CSS 変更の前後で同じ手順を回して比較する（runtime に触れない・保存は Playwright の空コンテキスト）。
import { writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const outJson = process.argv[2] ?? 'scripts/release-solve-legibility-v1/out/measure-ac10.json'
const base = (process.argv[3] ?? 'http://localhost:4181').replace(/\/$/, '')
const sizes = (process.argv.slice(4).length ? process.argv.slice(4) : ['1508x660']).map((s) => s.split('x').map(Number))

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

async function waitBattleReady(page) {
  await page.waitForSelector('.hand .card-view', { timeout: 20000 })
  await page.waitForFunction(() => { const b = document.querySelector('.end-round-button'); return b && !b.disabled }, null, { timeout: 20000 })
  await page.waitForTimeout(400)
}
const overlayUp = (page) => page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay'))
async function playToEnd(page, strategy) {
  for (let round = 1; round <= 8; round++) {
    if (await overlayUp(page)) break
    if (strategy !== 'lose') {
      // phase7-p1 と同じ bot（'win2'：⚡準備済み → 攻撃 → 防御、託宣は加護）で同じ盤面を再現する
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
  await page.waitForTimeout(2600)
}

const MEASURE = () => {
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), height: +r.height.toFixed(1), left: +r.left.toFixed(1), width: +r.width.toFixed(1) } }
  const cs = (el, props) => { if (!el) return null; const c = getComputedStyle(el); return Object.fromEntries(props.map((p) => [p, c[p]])) }
  const overlay = document.querySelector('.game-over-overlay')
  const card = document.querySelector('.game-over-card')
  const recap = document.querySelector('[data-testid="battle-recap"]')
  const cardRect = card.getBoundingClientRect()
  const visibleTop = cardRect.top + card.clientTop
  const visibleBottom = visibleTop + card.clientHeight
  const secondaries = [...document.querySelectorAll('[data-testid="result-secondary"]')]
  const primary = document.querySelector('[data-testid="result-primary"]')
  const secBottom = Math.max(...secondaries.map((b) => b.getBoundingClientRect().bottom))
  return {
    vw: innerWidth, vh: innerHeight,
    status: document.querySelector('.game-over-status')?.textContent.trim() ?? null,
    overlay: { rect: R(overlay), css: cs(overlay, ['paddingTop', 'paddingBottom', 'alignItems']) },
    card: { rect: R(card), clientHeight: card.clientHeight, scrollHeight: card.scrollHeight, scrollTop: card.scrollTop, css: cs(card, ['paddingTop', 'paddingBottom', 'gap', 'maxHeight']), visibleTop: +visibleTop.toFixed(1), visibleBottom: +visibleBottom.toFixed(1) },
    recap: recap ? { rect: R(recap), css: cs(recap, ['marginTop', 'marginBottom', 'paddingTop', 'paddingBottom', 'lineHeight', 'fontSize']), lines: [...recap.querySelectorAll('li')].map((li) => ({ text: li.textContent.trim(), height: +li.getBoundingClientRect().height.toFixed(1), css: cs(li, ['marginTop']) })) } : null,
    children: [...card.children].map((el) => ({ cls: el.className.split(' ')[0] || el.tagName, testid: el.dataset.testid ?? null, height: +el.getBoundingClientRect().height.toFixed(1) })),
    goal: document.querySelector('[data-testid="next-goal"]')?.textContent.trim() ?? null,
    primary: { text: primary?.textContent.trim() ?? null, rect: R(primary) },
    secondaries: secondaries.map((b) => ({ text: b.textContent.trim(), rect: R(b) })),
    dailyDiff: [...document.querySelectorAll('[data-testid="daily-diff"] p')].map((p) => p.textContent.trim()),
    breakdownOpen: !!document.querySelector('.score-breakdown[open], details[open]'),
    // AC10 と同じ inView（viewport 基準）と、カード可視領域基準の overflow
    secondaryInViewport: secondaries.map((b) => { const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight }),
    secondaryInCardVisible: secondaries.map((b) => { const r = b.getBoundingClientRect(); return r.top >= visibleTop && r.bottom <= visibleBottom }),
    overflowPx: +(secBottom - visibleBottom).toFixed(1),
  }
}

const browser = await chromium.launch()
const out = { base, at: new Date().toISOString(), results: {} }
for (const [w, h] of sizes) {
  const key = `${w}x${h}`
  const ctx = await browser.newContext({ viewport: { width: w, height: h } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  try {
    await page.goto(base + '/')
    await page.waitForSelector('.home-screen .home-cta-primary', { timeout: 30000 })
    await page.waitForTimeout(400)
    if (await clickText(page, 'わかった')) await page.waitForTimeout(400)
    await clickSel(page, '[data-testid="home-today-cta"]')
    await page.waitForSelector('.daily-screen', { timeout: 10000 })
    await page.waitForTimeout(400)
    await clickText(page, '挑戦開始')
    await page.waitForTimeout(400)
    if (await clickText(page, '新しく始める')) await page.waitForTimeout(400)
    await clickText(page, '大耀')
    await page.waitForTimeout(300)
    await clickText(page, 'この構成で始める')
    await page.waitForTimeout(400)
    await clickText(page, 'この構成でバトル開始')
    await waitBattleReady(page)
    await playToEnd(page, 'lose')
    await settleResult(page)
    const r1 = await page.evaluate(MEASURE)
    await clickSel(page, '[data-testid="result-primary"]')
    await waitBattleReady(page)
    await playToEnd(page, 'win2')
    await settleResult(page)
    const r2 = await page.evaluate(MEASURE)
    await page.screenshot({ path: outJson.replace(/\.json$/, `-${key}-daily2.png`) })
    out.results[key] = { r1, r2, errors }
    console.log(`[${key}] daily-2 ${r2.status} | card visible ${r2.card.visibleTop}..${r2.card.visibleBottom} (client ${r2.card.clientHeight} / scroll ${r2.card.scrollHeight}) | secondary bottom ${Math.max(...r2.secondaries.map((s) => s.rect.bottom))} | overflowPx ${r2.overflowPx} | inCardVisible ${JSON.stringify(r2.secondaryInCardVisible)} | recap lines ${r2.recap?.lines.length} heights ${JSON.stringify(r2.recap?.lines.map((l) => l.height))} recap css ${JSON.stringify(r2.recap?.css)}`)
  } catch (e) {
    out.results[key] = { error: String(e), errors }
    console.log(`[${key}] ERROR ${e}`)
  }
  await ctx.close()
}
await browser.close()
writeFileSync(outJson, JSON.stringify(out, null, 2))

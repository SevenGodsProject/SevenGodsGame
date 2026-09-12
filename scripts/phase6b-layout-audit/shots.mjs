// Phase 6-B：Battle Viewport Layout の Visual Regression（監査用。ゲームコードではない）。
//
//   node scripts/phase6b-layout-audit/shots.mjs <outDir> [baseUrl] [--json <out>]
//
// 6 viewport × 6 状態（ラウンド開始／カード選択中／着弾／敵ターン／神の一撃／撃破）の
// スクリーンショットを保存し、同時に「切れていないか」を数値でも記録する：
//   - 敵ポートレートの可視率（ビューポート内 ∧ 固定要素に覆われない ∧ 祖先 overflow で切れない）
//   - 手札カードが縦横ともにビューポート内にある枚数（横スクロール前）
//   - ページの scrollY / 横はみ出し量 / アリーナのはみ出し量
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const outDir = args[0] ?? 'shots-6b'
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:5173'
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')
mkdirSync(outDir, { recursive: true })

const VIEWPORTS = [
  { id: 'pc-1366-100', width: 1358, height: 594 },
  { id: 'pc-1366-90', width: 1508, height: 660 },
  { id: 'pc-1920', width: 1912, height: 906 },
  { id: 'sp-390-844', width: 390, height: 760 },
  { id: 'sp-390-780', width: 390, height: 696 },
  { id: 'sp-430-932', width: 430, height: 848 },
]

/** 可視率（play.mjs と同じ定義：遮蔽とクリップを考慮する） */
const VISIBLE_FN = `(sel) => {
  const el = document.querySelector(sel)
  if (!el) return null
  const vh = window.innerHeight
  const b = el.getBoundingClientRect()
  if (b.height <= 0) return 0
  let clipTop = 0, clipBottom = vh
  let node = el.parentElement
  while (node && node !== document.body) {
    const cs = getComputedStyle(node)
    if (cs.overflow !== 'visible' || cs.overflowY !== 'visible') {
      const r = node.getBoundingClientRect()
      clipTop = Math.max(clipTop, r.top); clipBottom = Math.min(clipBottom, r.bottom)
    }
    node = node.parentElement
  }
  const covers = ['.hand', '.divination-panel', '.end-round-button', '.battle-dock']
    .map((s) => document.querySelector(s))
    .filter((e) => e && e !== el && !el.contains(e) && !e.contains(el))
    .filter((e) => ['fixed', 'sticky'].includes(getComputedStyle(e).position))
    .map((e) => e.getBoundingClientRect())
  const top = Math.max(b.top, 0, clipTop)
  const bottom = Math.min(b.bottom, vh, clipBottom)
  if (bottom <= top) return 0
  let visible = 0
  for (let y = top; y < bottom; y += 1) {
    const covered = covers.some((c) => y >= c.top && y <= c.bottom && Math.min(b.right, c.right) - Math.max(b.left, c.left) > b.width * 0.6)
    if (!covered) visible++
  }
  return Math.min(100, Math.round((visible / Math.max(1, bottom - top)) * 100 * ((bottom - top) / b.height)))
}`

const METRICS = `() => {
  const vh = window.innerHeight
  const vw = window.innerWidth
  const cards = [...document.querySelectorAll('.hand .card-view')]
  const inView = cards.filter((c) => {
    const r = c.getBoundingClientRect()
    return r.top >= -1 && r.bottom <= vh + 1 && r.left >= -1 && r.right <= vw + 1
  }).length
  const hand = document.querySelector('.hand')
  const arena = document.querySelector('.battle-main')
  const se = document.scrollingElement
  return {
    cardsInView: inView,
    cardsTotal: cards.length,
    handScrollX: hand ? Math.max(0, hand.scrollWidth - hand.clientWidth) : null,
    arenaOverflow: arena ? Math.max(0, arena.scrollHeight - arena.clientHeight) : null,
    scrollY: Math.round(window.scrollY),
    pageOverflowX: se.scrollWidth - se.clientWidth,
    pageOverflowY: se.scrollHeight - se.clientHeight,
  }
}`

const browser = await chromium.launch({ headless: true })
const results = []

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  const click = (t) =>
    page.evaluate((text) => {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(text))
      if (!b) return false
      b.click()
      return true
    }, t)
  const playCard = (re) =>
    page.evaluate((src) => {
      const rx = new RegExp(src)
      const c = [...document.querySelectorAll('.hand .card-view')].find((x) => rx.test(x.querySelector('.card-view-name').textContent) && !x.disabled)
      if (!c) return false
      c.click()
      return true
    }, re)
  const playAnyAttack = () => playCard('⚔|🌟|💀')

  await page.goto(base + '/?enemy=oni&stake=2&seed=p6b-shots')
  await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
  await click('わかった')
  await page.waitForTimeout(200)
  await click('神を選ぶ')
  await page.waitForTimeout(350)
  if (await click('新しく始める')) await page.waitForTimeout(350)
  await click('大耀')
  await page.waitForTimeout(300)
  await click('この構成で始める')
  await page.waitForTimeout(300)
  await click('業斧の鬼将')
  await page.waitForTimeout(450)
  await click('この構成でバトル開始')
  await page.waitForSelector('.hand .card-view', { timeout: 10000 })
  await page.waitForTimeout(1900)

  const states = []
  const shot = async (name) => {
    await page.screenshot({ path: join(outDir, `${vp.id}-${name}.png`) })
    const enemy = await page.evaluate(([fn]) => eval(fn)('.enemy-avatar'), [VISIBLE_FN])
    const intent = await page.evaluate(([fn]) => eval(fn)('.enemy-panel .intent'), [VISIBLE_FN])
    const m = await page.evaluate(([fn]) => eval(fn)(), [METRICS])
    states.push({ state: name, enemy, intent, ...m })
  }

  // 1) ラウンド開始（プレイヤーのターン・操作可能）
  await shot('1-round-start')

  // 2) カード選択中（cast 280ms の最中）
  await playAnyAttack()
  await page.waitForTimeout(140)
  await shot('2-card-select')

  // 3) 着弾（CARD_IMPACT_MS 直後）
  await page.waitForTimeout(260)
  await shot('3-impact')

  // 4) 敵ターン（突進・被弾）
  await page.waitForTimeout(700)
  await click('ラウンドを終える')
  await page.waitForTimeout(1250)
  await shot('4-enemy-turn')
  await page.waitForTimeout(2200)

  // 5) 神の一撃（共鳴7/7のカットイン〜バナー）。7まで殴り続ける
  let burst = false
  for (let r = 0; r < 8 && !burst; r++) {
    for (let k = 0; k < 8; k++) {
      if (!(await playAnyAttack())) break
      await page.waitForTimeout(420)
      if (await page.evaluate(() => !!document.querySelector('.resonance-cutin, .burst-banner'))) {
        burst = true
        break
      }
      if (await page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay, .enemy-defeat'))) break
    }
    if (burst) break
    if (await page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay, .enemy-defeat'))) break
    await click('ラウンドを終える')
    await page.waitForTimeout(2600)
  }
  await shot('5-god-strike')
  await page.waitForTimeout(2600)

  // 6) 撃破（enemy-defeat の崩壊中）
  let defeat = await page.evaluate(() => !!document.querySelector('.enemy-defeat'))
  for (let r = 0; r < 10 && !defeat; r++) {
    for (let k = 0; k < 8; k++) {
      if (!(await playAnyAttack())) break
      await page.waitForTimeout(430)
      defeat = await page.evaluate(() => !!document.querySelector('.enemy-defeat'))
      if (defeat) break
      if (await page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay'))) break
    }
    if (defeat) break
    if (await page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay'))) break
    await click('ラウンドを終える')
    await page.waitForTimeout(2600)
  }
  await page.waitForTimeout(160)
  await shot('6-defeat')

  results.push({ viewport: vp.id, w: vp.width, h: vp.height, states, errors })
  for (const s of states) {
    console.log(
      `${vp.id} ${s.state}: enemy=${s.enemy}% intent=${s.intent}% cards=${s.cardsInView}/${s.cardsTotal} handScrollX=${s.handScrollX} arenaOver=${s.arenaOverflow} scrollY=${s.scrollY} pageX=${s.pageOverflowX} pageY=${s.pageOverflowY}`,
    )
  }
  if (errors.length) console.log(`  !! errors: ${errors.slice(0, 3).join(' | ')}`)
  await ctx.close()
}

await browser.close()
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(results, null, 1))

// Phase 6-A：受け入れ確認（監査用。ゲームコードではない）。
//   node scripts/phase6-audit/qa.mjs <outJson> [baseUrl]
// 1. animationend を取りこぼしても操作不能・報酬待ちにならない（全アニメーションを cancel する）
// 2. prefers-reduced-motion：揺れを止めても数字・HP・撃破は失われない
// 3. 390px：横スクロールが出ない／要素が画面内に収まる
// 4. 7戦（7神×7敵）を通し、撃破演出・順序・console error を確認する
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const [out, base = 'http://localhost:5173'] = process.argv.slice(2)
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')
const browser = await chromium.launch({ headless: true })

const newPage = async (opts = {}) => {
  const ctx = await browser.newContext({ viewport: opts.viewport ?? { width: 1366, height: 768 }, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  return { ctx, page, errors }
}
const click = (page, t) =>
  page.evaluate((text) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(text))
    if (!b) return false
    b.click()
    return true
  }, t)
const playCard = (page, name) =>
  page.evaluate((n) => {
    const c = [...document.querySelectorAll('.hand .card-view')].find((x) => x.querySelector('.card-view-name').textContent.includes(n) && !x.disabled)
    if (!c) return false
    c.click()
    return true
  }, name)
const snapshot = (page) =>
  page.evaluate(() => ({
    round: document.querySelector('.battle-topbar')?.textContent,
    enemyHp: document.querySelector('.enemy-panel .hp-bar-label')?.textContent,
    playerHp: document.querySelector('.player-panel .hp-bar-label')?.textContent,
    intent: document.querySelector('.enemy-panel .intent')?.textContent,
    hand: [...document.querySelectorAll('.hand .card-view')].map((c) => ({ name: c.querySelector('.card-view-name').textContent.trim(), dis: c.disabled, bonus: !!c.querySelector('.card-view-bonus-ready') })),
    endEnabled: !!document.querySelector('.end-round-button') && !document.querySelector('.end-round-button').disabled,
    defeat: !!document.querySelector('.enemy-defeat'),
    reward: !!document.querySelector('.reward-overlay'),
    over: !!document.querySelector('.game-over-overlay'),
    overText: document.querySelector('.game-over-card')?.innerText?.replace(/\n+/g, ' | ').slice(0, 200),
  }))
const startBattle = async (page, url, god, enemy) => {
  await page.goto(base + '/' + url)
  await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
  await click(page, 'わかった')
  await page.waitForTimeout(200)
  await click(page, '神を選ぶ')
  await page.waitForTimeout(350)
  if (await click(page, '新しく始める')) await page.waitForTimeout(350)
  await click(page, god)
  await page.waitForTimeout(300)
  await click(page, 'この構成で始める')
  await page.waitForTimeout(300)
  await click(page, enemy)
  await page.waitForTimeout(450)
  await click(page, 'この構成でバトル開始')
  await page.waitForSelector('.hand .card-view', { timeout: 10000 })
  await page.waitForTimeout(1800)
}

const results = {}

// ---- 1. animationend 欠落時の安全弁 ----
{
  const { ctx, page, errors } = await newPage()
  await startBattle(page, '?enemy=oni&stake=2&seed=p6-taiyo', '大耀', '業斧の鬼将')
  // 共鳴を7まで溜めて神の一撃を起こし、その間ずっと全アニメーションを cancel し続ける
  const killer = setInterval(() => page.evaluate(() => document.getAnimations().forEach((a) => a.cancel())).catch(() => {}), 60)
  await playCard(page, '神楽舞')
  await page.waitForTimeout(900)
  await click(page, 'ラウンドを終える')
  await page.waitForTimeout(2200)
  await playCard(page, '巫女の舞')
  await page.waitForTimeout(900)
  await playCard(page, '豪快な一撃')
  await page.waitForTimeout(900)
  await click(page, 'ラウンドを終える')
  await page.waitForTimeout(2200)
  await playCard(page, '一心不乱')
  await page.waitForTimeout(900)
  await playCard(page, '速攻')
  await page.waitForTimeout(3000)
  clearInterval(killer)
  await page.waitForTimeout(1500)
  const s = await snapshot(page)
  results.cancelAnimations = {
    // カットインが残って操作不能になっていないこと（手札が押せる or 決着している）
    playable: s.hand.some((c) => !c.dis) || s.reward || s.over,
    cutinStuck: await page.evaluate(() => !!document.querySelector('.resonance-cutin')),
    snapshot: s,
    errors,
  }
  await ctx.close()
}

// ---- 2. prefers-reduced-motion ----
{
  const { ctx, page, errors } = await newPage({ reduced: true })
  await startBattle(page, '?enemy=trial&seed=p6a-s1', '恵比寿', '試練の影')
  const before = await snapshot(page)
  await playCard(page, '潮招き')
  await page.waitForTimeout(620) // 着弾（cast 280＋突き 90）＋数字が立ち上がるまで
  const during = await page.evaluate(() => {
    const r = document.querySelector('.enemy-reaction')
    const n = document.querySelector('.enemy-hit-layer .floating-number')
    return {
      reactionAnim: r ? getComputedStyle(r).animationName : null,
      numberText: n?.textContent ?? null,
      numberVisible: n ? getComputedStyle(n).opacity !== '0' : false,
    }
  })
  await page.waitForTimeout(900)
  const after = await snapshot(page)
  results.reducedMotion = { before: before.enemyHp, during, after: after.enemyHp, hpChanged: before.enemyHp !== after.enemyHp, errors }
  await ctx.close()
}

// ---- 3. 390px ----
{
  const { ctx, page, errors } = await newPage({ viewport: { width: 390, height: 760 } })
  await startBattle(page, '?enemy=onryo&stake=6&seed=p6-shouren', '笑蓮', '藍花の怨霊')
  const layout = await page.evaluate(() => ({
    overflowX: document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth,
    pageHeight: document.scrollingElement.scrollHeight,
    enemyStage: document.querySelector('.enemy-stage')?.getBoundingClientRect().height,
    hitLayer: !!document.querySelector('.enemy-hit-layer'),
  }))
  await playCard(page, 'おおらかな一打')
  await page.waitForTimeout(650)
  const shot = await page.evaluate(() => {
    const n = document.querySelector('.enemy-hit-layer .floating-number')
    if (!n) return null
    const r = n.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), inView: r.x >= 0 && r.right <= innerWidth }
  })
  results.mobile = { layout, number: shot, errors }
  await ctx.close()
}

// ---- 4. 7戦 ----
const BATTLES = process.env.QA_ONLY === 'checks' ? [] : [
  { id: 1, god: '大耀', enemy: '双牙の魔獣', url: '?enemy=juuma&stake=2&seed=qa-taiyo', bigAt: 100 },
  { id: 2, god: '蒼毘', enemy: '業斧の鬼将', url: '?enemy=oni&stake=3&seed=qa-sobi', bigAt: 100 },
  { id: 3, god: '福永', enemy: '銀甲の機工師', url: '?enemy=karakuri&stake=2&seed=qa-fukuei', bigAt: 120 },
  { id: 4, god: '寿楽', enemy: '蒼海の龍神', url: '?enemy=ryujin&stake=4&seed=qa-juraku', bigAt: 100 },
  { id: 5, god: '恵比寿', enemy: '試練の影', url: '?enemy=trial&seed=qa-ebisu', bigAt: 100 },
  { id: 6, god: '才華', enemy: '乱舞の道化', url: '?enemy=doukeshi&stake=1&seed=qa-saika', bigAt: 100 },
  { id: 7, god: '笑蓮', enemy: '藍花の怨霊', url: '?enemy=onryo&stake=5&seed=qa-shouren', bigAt: 100 },
]
results.battles = []
for (const b of BATTLES) {
  const { ctx, page, errors } = await newPage()
  const t0 = Date.now()
  await startBattle(page, b.url, b.god, b.enemy)
  const events = []
  let sawDefeatAnim = false
  let sawBeat = false
  let sawBurst = false
  let rewardAt = null
  const watch = setInterval(async () => {
    try {
      const s = await page.evaluate(() => ({
        defeat: !!document.querySelector('.enemy-defeat'),
        beat: !!document.querySelector('.victory-beat'),
        burst: !!document.querySelector('.resonance-cutin, .burst-banner'),
        reward: !!document.querySelector('.reward-overlay'),
      }))
      if (s.defeat) sawDefeatAnim = true
      if (s.beat) sawBeat = true
      if (s.burst) sawBurst = true
      if (s.reward && rewardAt === null) rewardAt = Date.now() - t0
    } catch {
      /* ページ遷移中 */
    }
  }, 90)
  for (let round = 0; round < 8; round++) {
    const s = await snapshot(page)
    if (s.reward || s.over) break
    const intentN = (s.intent?.match(/\d+/g) ?? []).reduce((a, x) => a + Number(x), 0)
    const big = intentN >= b.bigAt
    for (let k = 0; k < 8; k++) {
      const played = await page.evaluate(
        ([bigTurn]) => {
          const cards = [...document.querySelectorAll('.hand .card-view')].filter((c) => !c.disabled)
          if (cards.length === 0) return null
          const score = (c) => {
            const t = c.querySelector('.card-view-name').textContent
            const guard = /🛡|🌿/.test(t)
            const atk = /⚔|🌟|💀/.test(t)
            const res = /✨/.test(t)
            const bonus = c.querySelector('.card-view-bonus-ready') ? 1 : 0
            return (bigTurn ? (guard ? 3 : 0) : (atk ? 3 : 0)) + bonus + (res ? 1.5 : 0) + Number(c.querySelector('.card-view-cost').textContent) * 0.1
          }
          cards.sort((x, y) => score(y) - score(x))
          cards[0].click()
          return cards[0].querySelector('.card-view-name').textContent.trim()
        },
        [big],
      )
      if (!played) break
      events.push(`R${round + 1}:${played}`)
      await page.waitForTimeout(950)
      if (await page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay'))) break
    }
    await page.evaluate((i) => document.querySelectorAll('.divination-choice')[i]?.click(), big ? 0 : 2)
    await page.waitForTimeout(700)
    if (await page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay'))) break
    await click(page, 'ラウンドを終える')
    await page.waitForTimeout(2400)
  }
  await page.waitForTimeout(2500)
  const end = await snapshot(page)
  clearInterval(watch)
  await page.evaluate(() => document.querySelector('.reward-card')?.click())
  await page.waitForTimeout(2500)
  const over = await snapshot(page)
  results.battles.push({
    ...b,
    events,
    sawBurst,
    sawDefeatAnim,
    sawBeat,
    rewardAt,
    result: over.overText ?? end.overText ?? null,
    errors,
    durationMs: Date.now() - t0,
  })
  console.log(b.id, b.god, 'burst=' + sawBurst, 'defeatAnim=' + sawDefeatAnim, 'beat=' + sawBeat, 'reward@' + rewardAt, (over.overText ?? '').slice(0, 60), 'errors=' + errors.length)
  await ctx.close()
}

await browser.close()
if (out) writeFileSync(out, JSON.stringify(results, null, 1))
console.log('cancelAnimations', JSON.stringify(results.cancelAnimations?.playable), 'cutinStuck', JSON.stringify(results.cancelAnimations?.cutinStuck))
console.log('reduced', JSON.stringify(results.reducedMotion))
console.log('mobile', JSON.stringify(results.mobile))

// Phase 6-B：実プレイ中に「着弾が見えているか」を測る（監査用。ゲームコードではない）。
//
//   node scripts/phase6b-layout-audit/play.mjs <outJson> [baseUrl] [--layout current|P5] [--viewport pc90|pc100|sp390]
//
// カードを選ぶ → 着弾 → 撃破 の各瞬間に、敵ポートレート・予告・手札が
// 「ビューポート内にあり、固定要素や overflow で隠れていない」割合を測る。
// 候補レイアウトは CSS 注入のみ（リポジトリの CSS は変更しない）。
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const out = args[0]
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:5173'
const layout = args.includes('--layout') ? args[args.indexOf('--layout') + 1] : 'current'
const vpName = args.includes('--viewport') ? args[args.indexOf('--viewport') + 1] : 'pc90'
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const VIEWPORTS = { pc100: { width: 1358, height: 594 }, pc90: { width: 1508, height: 660 }, sp390: { width: 390, height: 760 } }
const viewport = VIEWPORTS[vpName]

/** P5（設計案）の CSS。measure.mjs の P5 と同じ考え方を1つにまとめたもの */
const P5_CSS = `
:root { --app-chrome: 108px; }
.battle {
  height: calc(100dvh - var(--app-chrome)); max-height: calc(100dvh - var(--app-chrome));
  padding-bottom: 0; gap: 6px; overflow: hidden;
  display: grid; grid-template-rows: auto minmax(0, 1fr) auto auto;
  grid-template-areas: 'top' 'arena' 'oracle' 'dock';
}
.battle-topbar { grid-area: top; }
.battle-main { grid-area: arena; min-height: 0; overflow: hidden; }
.divination-panel { grid-area: oracle; margin: 0; }
.hand { grid-area: dock; margin: 0; }
.battle-log, .battle-hud, .battle-error { display: none; }
.enemy-type-row, .enemy-speech-bubble, .god-tagline, .burst-preview { display: none; }
.portrait-otomo figcaption { display: none; }
.panel-title { font-size: 12px; line-height: 1.2; }
.enemy-avatar-wrap::before, .player-avatar-wrap::before { display: none; }
@media (min-width: 900px) {
  .battle-main { padding: 8px; gap: 8px; }
  .battle-main .panel { padding: 6px; gap: 4px; min-height: 0; }
  .enemy-avatar { width: clamp(132px, 23vh, 210px); height: clamp(140px, 25vh, 226px); }
  .player-avatar { width: clamp(104px, 18vh, 168px); height: clamp(112px, 19vh, 182px); }
  .portrait-otomo img { width: clamp(48px, 8vh, 96px); height: clamp(48px, 8vh, 96px); }
  .intent { font-size: 20px; font-weight: 700; }
  .divination-panel { height: 44px; box-sizing: border-box; display: flex; align-items: center; gap: 10px; padding: 2px 210px 2px 10px; }
  .divination-panel-title { display: none; }
  .divination-choices { display: flex; gap: 8px; flex: 1; }
  .divination-choice { padding: 2px 8px; gap: 6px; }
  .divination-choice-text { display: none; }
  .hand { height: 164px; box-sizing: border-box; padding: 5px 10px; gap: 8px; align-items: center; }
  .card-view { width: 116px; min-height: 0; padding: 5px; gap: 2px; }
  .card-view-clip { height: 66px; }
  .card-view-has-art .card-view-body { padding: 10px 5px 3px; }
  .card-view-type { display: none; }
  .card-view-name { font-size: 11.5px; }
  .card-view-text { font-size: 9.5px; line-height: 1.25; }
  .end-round-button { position: absolute; right: 10px; bottom: 10px; left: auto; transform: none; z-index: 5; padding: 9px 16px; }
  .end-round-button:not(:disabled):hover { transform: translateY(-2px); }
}
@media (max-width: 899px) {
  .battle-main { padding: 6px; gap: 6px; display: grid; grid-template-columns: 1.05fr 0.95fr; align-items: start; }
  .battle-main .panel { padding: 5px; gap: 3px; min-height: 0; }
  .enemy-panel { grid-column: 1; }
  .ally-row { grid-column: 2; grid-template-columns: 1fr; gap: 4px; }
  .enemy-avatar { width: clamp(104px, 16vh, 150px); height: clamp(112px, 17vh, 158px); }
  .player-avatar { width: clamp(80px, 12vh, 120px); height: clamp(88px, 13vh, 130px); }
  .portrait-otomo img { width: 48px; height: 48px; }
  .intent { font-size: 16px; font-weight: 700; }
  .resonance-gauge { height: 14px; }
  .divination-panel { height: 46px; box-sizing: border-box; display: flex; align-items: center; gap: 6px; padding: 2px 96px 2px 6px; }
  .divination-panel-title { display: none; }
  .divination-choices { display: flex; gap: 6px; flex: 1; }
  .divination-choice { padding: 2px 6px; }
  .divination-choice-text, .divination-choice-preview { display: none; }
  .hand { height: 168px; box-sizing: border-box; display: flex; flex-wrap: nowrap; overflow-x: auto; justify-content: flex-start; gap: 6px; padding: 6px 8px; }
  .card-view { width: 100px; min-height: 0; padding: 5px; flex: 0 0 auto; }
  .card-view-clip { height: 58px; }
  .card-view-has-art .card-view-body { padding: 10px 5px 3px; }
  .card-view-type { display: none; }
  .card-view-name { font-size: 11px; }
  .card-view-text { font-size: 9px; line-height: 1.2; }
  .end-round-button { position: absolute; right: 4px; bottom: 50%; transform: translateY(50%); margin: 0; padding: 7px 10px; font-size: 12px; z-index: 5; }
}`

/** P6：P5 ＋ 名札化（敵・味方の HP／予告を立ち絵の上へ） */
const P6_EXTRA = `
.enemy-panel .panel-title { order: -3; }
.enemy-panel .hp-bar { order: -2; }
.enemy-panel .badge-block { order: -2; }
.enemy-panel .intent { order: -1; }
.enemy-panel .buff-list { order: -1; }
.player-panel .panel-title { order: -3; }
.player-panel .hp-bar { order: -2; }
.player-panel .badge-block { order: -2; }
.player-panel .buff-list { order: -1; }
`

/** P7：P6 ＋ 立ち絵を可変サイズに（名札の残り高さへ収める） */
const P7_EXTRA = `
/* 立ち絵は「名札の残り」に収まる可変サイズにする（切れない・縮んで全身が残る） */
.enemy-panel { display: flex; flex-direction: column; }
.enemy-stage { flex: 1 1 auto; min-height: 0; display: flex; align-items: center; justify-content: center; }
.enemy-stage .enemy-collapse, .enemy-stage .enemy-avatar-wrap, .enemy-stage .enemy-reaction, .enemy-stage .enemy-reaction-idle { height: 100%; display: flex; align-items: center; justify-content: center; }
.enemy-avatar { width: 100% !important; height: 100% !important; max-height: 100%; background-size: contain; }
.player-panel { display: flex; flex-direction: column; }
.player-windup { flex: 1 1 auto; min-height: 0; display: flex; }
.player-avatar-wrap { flex: 1 1 auto; min-height: 0; align-items: center; }
.player-avatar { width: auto !important; height: 100% !important; max-height: 100%; object-fit: contain; }
`

/** 見えている割合（ビューポート内 ∧ 固定要素に覆われていない ∧ 祖先の overflow で切れていない） */
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
  const covers = ['.hand', '.divination-panel', '.end-round-button']
    .map((s) => document.querySelector(s))
    .filter((e) => e && e !== el && !el.contains(e) && !e.contains(el))
    .filter((e) => ['fixed', 'sticky'].includes(getComputedStyle(e).position))
    .map((e) => e.getBoundingClientRect())
  const top = Math.max(b.top, 0, clipTop)
  const bottom = Math.min(b.bottom, vh, clipBottom)
  if (bottom <= top) return 0
  let rows = 0, visible = 0
  for (let y = top; y < bottom; y += 1) {
    rows++
    const covered = covers.some((c) => y >= c.top && y <= c.bottom && Math.min(b.right, c.right) - Math.max(b.left, c.left) > b.width * 0.6)
    if (!covered) visible++
  }
  return Math.round((visible / Math.max(1, b.height)) * 100)
}`

const BATTLES = [
  { id: 1, god: '大耀', enemy: '双牙の魔獣', url: '?enemy=juuma&stake=2&seed=qa-taiyo' },
  { id: 2, god: '蒼毘', enemy: '業斧の鬼将', url: '?enemy=oni&stake=3&seed=qa-sobi' },
  { id: 3, god: '福永', enemy: '銀甲の機工師', url: '?enemy=karakuri&stake=2&seed=qa-fukuei' },
  { id: 4, god: '寿楽', enemy: '蒼海の龍神', url: '?enemy=ryujin&stake=4&seed=qa-juraku' },
  { id: 5, god: '恵比寿', enemy: '試練の影', url: '?enemy=trial&seed=qa-ebisu' },
  { id: 6, god: '才華', enemy: '乱舞の道化', url: '?enemy=doukeshi&stake=1&seed=qa-saika' },
  { id: 7, god: '笑蓮', enemy: '藍花の怨霊', url: '?enemy=onryo&stake=5&seed=qa-shouren' },
]

const browser = await chromium.launch({ headless: true })
const results = []
for (const b of BATTLES) {
  const ctx = await browser.newContext({ viewport })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  const click = (t) =>
    page.evaluate((text) => {
      const el = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(text))
      if (!el) return false
      el.click()
      return true
    }, t)
  await page.goto(base + '/' + b.url)
  await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
  await click('わかった')
  await page.waitForTimeout(200)
  await click('神を選ぶ')
  await page.waitForTimeout(350)
  if (await click('新しく始める')) await page.waitForTimeout(350)
  await click(b.god)
  await page.waitForTimeout(300)
  await click('この構成で始める')
  await page.waitForTimeout(300)
  await click(b.enemy)
  await page.waitForTimeout(450)
  await click('この構成でバトル開始')
  await page.waitForSelector('.hand .card-view', { timeout: 10000 })
  await page.waitForTimeout(1800)
  if (['P5', 'P6', 'P7'].includes(layout)) await page.addStyleTag({ content: P5_CSS })
  if (layout === 'P6' || layout === 'P7') await page.addStyleTag({ content: P6_EXTRA })
  if (layout === 'P7') await page.addStyleTag({ content: P7_EXTRA })
  await page.waitForTimeout(300)

  const samples = []
  const sample = async (tag) =>
    samples.push({
      tag,
      ...(await page.evaluate(
        ([fn]) => {
          const visible = eval(fn)
          return {
            enemy: visible('.enemy-avatar'),
            intent: visible('.enemy-panel .intent'),
            enemyHp: visible('.enemy-panel .hp-bar'),
            cards: [...document.querySelectorAll('.hand .card-view')].filter((c) => {
              const r = c.getBoundingClientRect()
              return r.top >= -1 && r.bottom <= window.innerHeight + 1
            }).length,
            cardsTotal: document.querySelectorAll('.hand .card-view').length,
            scrollY: Math.round(window.scrollY),
          }
        },
        [VISIBLE_FN],
      )),
    })

  for (let round = 0; round < 8; round++) {
    const st = await page.evaluate(() => ({
      over: !!document.querySelector('.reward-overlay, .game-over-overlay'),
      intent: document.querySelector('.enemy-panel .intent')?.textContent ?? '',
    }))
    if (st.over) break
    const intentN = (st.intent.match(/\d+/g) ?? []).reduce((a, x) => a + Number(x), 0)
    const big = intentN >= 100
    for (let k = 0; k < 8; k++) {
      // 「カードを選ぶ直前」の可視状態（＝プレイヤーが手札を見ている状態）
      await sample('selecting')
      const played = await page.evaluate(
        ([bigTurn]) => {
          const cards = [...document.querySelectorAll('.hand .card-view')].filter((c) => !c.disabled)
          if (cards.length === 0) return null
          const score = (c) => {
            const t = c.querySelector('.card-view-name').textContent
            const guard = /🛡|🌿/.test(t)
            const atk = /⚔|🌟|💀/.test(t)
            const res = /✨/.test(t)
            return (bigTurn ? (guard ? 3 : 0) : atk ? 3 : 0) + (c.querySelector('.card-view-bonus-ready') ? 1 : 0) + (res ? 1.5 : 0)
          }
          cards.sort((x, y) => score(y) - score(x))
          cards[0].click()
          return cards[0].querySelector('.card-view-name').textContent.trim()
        },
        [big],
      )
      if (!played) break
      await page.waitForTimeout(430) // cast 280 ＋ 着弾 90 ＋ 少し
      await sample('impact:' + played)
      await page.waitForTimeout(500)
      if (await page.evaluate(() => !!document.querySelector('.enemy-defeat'))) {
        await sample('defeat')
        break
      }
      if (await page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay'))) break
    }
    if (await page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay, .enemy-defeat'))) break
    await page.evaluate((i) => document.querySelectorAll('.divination-choice')[i]?.click(), big ? 0 : 2)
    await page.waitForTimeout(600)
    await click('ラウンドを終える')
    await page.waitForTimeout(900)
    await sample('enemyTurn')
    await page.waitForTimeout(1500)
  }
  const impacts = samples.filter((s) => s.tag.startsWith('impact'))
  const selecting = samples.filter((s) => s.tag === 'selecting')
  const agg = (arr, key) => (arr.length ? Math.round(arr.reduce((a, s) => a + (s[key] ?? 0), 0) / arr.length) : null)
  const min = (arr, key) => (arr.length ? Math.min(...arr.map((s) => s[key] ?? 0)) : null)
  results.push({
    ...b,
    layout,
    viewport: vpName,
    impacts: impacts.length,
    enemyAtImpactAvg: agg(impacts, 'enemy'),
    enemyAtImpactMin: min(impacts, 'enemy'),
    intentWhileSelectingAvg: agg(selecting, 'intent'),
    enemyWhileSelectingAvg: agg(selecting, 'enemy'),
    cardsWhileSelecting: agg(selecting, 'cards'),
    cardsTotalWhileSelecting: agg(selecting, 'cardsTotal'),
    scrollAvg: agg(samples, 'scrollY'),
    defeatSeen: samples.some((s) => s.tag === 'defeat'),
    defeatEnemyVisible: samples.find((s) => s.tag === 'defeat')?.enemy ?? null,
    errors,
    samples,
  })
  const r = results[results.length - 1]
  console.log(
    `${layout}/${vpName} #${b.id} ${b.god}×${b.enemy}: impacts=${r.impacts} enemy@impact avg=${r.enemyAtImpactAvg}% min=${r.enemyAtImpactMin}% | selecting: enemy=${r.enemyWhileSelectingAvg}% intent=${r.intentWhileSelectingAvg}% cards=${r.cardsWhileSelecting}/${r.cardsTotalWhileSelecting} | scroll=${r.scrollAvg} defeat=${r.defeatSeen}(${r.defeatEnemyVisible}%) err=${r.errors.length}`,
  )
  await ctx.close()
}
await browser.close()
if (out) writeFileSync(out, JSON.stringify(results, null, 1))

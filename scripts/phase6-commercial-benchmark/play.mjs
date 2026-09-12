// Phase 6 Commercial Benchmark Audit v2：最新版（7583595）の実プレイ計測（監査用。ゲームコードではない）。
//
//   node scripts/phase6-commercial-benchmark/play.mjs <outJson> [baseUrl] [--shots <dir>]
//
// 14戦（7神×2・敵7体すべて・PC 9戦／Mobile 5戦・難易度と神階を分散）を自動プレイし、
// 商用比較の各軸に対応する「人が感じる差」の代理指標を記録する：
//   - 最初に見た場所：開始直後の画面で最も面積が大きい／上に置かれた要素の順
//   - 迷い：手札が操作可能になるまでの時間、予告と加護プレビューが見えているか
//   - 良い判断：大技の予告があるラウンドに加護／防御で受け切れたか（block ≥ intent）
//   - 攻撃満足度：着弾数字の段階分布（L1〜L4／max）、hit stop、撃破演出の有無
//   - 敵個性：予告の種類（attack/charge/special/multi）、必殺カットイン、掛け声
//   - 神個性：得意技の発動回数、専用カードの使用回数、神の一撃
//   - 危機：HP最小比率、HP30%以下のラウンド数
//   - Victory／Reward／Retry：結果画面の情報、報酬3択、再挑戦導線の有無
// 発生する演出は MutationObserver で class の出現を時刻付きで記録する。
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const out = args[0]
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:5173'
const shotsDir = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null
if (shotsDir) mkdirSync(shotsDir, { recursive: true })
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const PC = { width: 1508, height: 660 } // CEO 環境（1366×768 @90%）
const SP = { width: 390, height: 760 } // iPhone 14 級

/** 14戦：7神×2、敵7体すべて、PC 9／SP 5、難易度・神階を分散 */
const BATTLES = [
  { id: 1, god: '大耀', enemy: '業斧の鬼将', url: '?enemy=oni&seed=cb-01', vp: 'pc', diff: 'normal' },
  { id: 2, god: '蒼毘', enemy: '双牙の魔獣', url: '?enemy=juuma&stake=2&seed=cb-02', vp: 'pc', diff: 'stake2' },
  { id: 3, god: '福永', enemy: '銀甲の機工師', url: '?enemy=karakuri&stake=3&seed=cb-03', vp: 'pc', diff: 'stake3' },
  { id: 4, god: '寿楽', enemy: '蒼海の龍神', url: '?enemy=ryujin&seed=cb-04', vp: 'pc', diff: 'normal' },
  { id: 5, god: '恵比寿', enemy: '試練の影', url: '?enemy=trial&seed=cb-05', vp: 'pc', diff: 'normal' },
  { id: 6, god: '才華', enemy: '乱舞の道化', url: '?enemy=doukeshi&stake=1&seed=cb-06', vp: 'pc', diff: 'stake1' },
  { id: 7, god: '笑蓮', enemy: '藍花の怨霊', url: '?enemy=onryo&stake=4&seed=cb-07', vp: 'pc', diff: 'stake4' },
  { id: 8, god: '大耀', enemy: '蒼海の龍神', url: '?enemy=ryujin&stake=5&seed=cb-08', vp: 'pc', diff: 'stake5' },
  { id: 9, god: '蒼毘', enemy: '銀甲の機工師', url: '?enemy=karakuri&seed=cb-09', vp: 'pc', diff: 'normal' },
  { id: 10, god: '福永', enemy: '双牙の魔獣', url: '?enemy=juuma&seed=cb-10', vp: 'sp', diff: 'normal' },
  { id: 11, god: '寿楽', enemy: '乱舞の道化', url: '?enemy=doukeshi&stake=2&seed=cb-11', vp: 'sp', diff: 'stake2' },
  { id: 12, god: '恵比寿', enemy: '業斧の鬼将', url: '?enemy=oni&stake=1&seed=cb-12', vp: 'sp', diff: 'stake1' },
  { id: 13, god: '才華', enemy: '藍花の怨霊', url: '?enemy=onryo&seed=cb-13', vp: 'sp', diff: 'normal' },
  { id: 14, god: '笑蓮', enemy: '試練の影', url: '?enemy=trial&stake=3&seed=cb-14', vp: 'sp', diff: 'stake3' },
]

/** 演出 class の出現を時刻付きで記録する観測器（ページ側） */
const OBSERVER = `() => {
  const W = window
  W.__cb = { t0: performance.now(), events: [], numbers: [], seen: {} }
  const WATCH = [
    'floating-number-l1','floating-number-l2','floating-number-l3','floating-number-l4','floating-number-max',
    'enemy-cutin','resonance-cutin','burst-banner','evolve-banner','enemy-turn-banner','boss-entrance',
    'enemy-defeat','victory-beat','reward-overlay','game-over-overlay','battle-mini-result','result-toast',
    'enemy-avatar-charging','enemy-avatar-charging-super','god-passive-armed','card-view-bonus-ready',
    'enemy-impact-beam','hit-shake-flash','hit-shake-multi-2','hit-shake-multi-3','enemy-reaction','react-final','react-burst',
    'god-strike','god-burst-strike','otomo-reacting','heal-pulse','badge-block-pulse','resonance-gauge-ready-flash',
  ]
  const mark = (cls, el) => {
    const t = Math.round(performance.now() - W.__cb.t0)
    W.__cb.events.push({ cls, t, text: (el.textContent || '').slice(0, 24) })
    W.__cb.seen[cls] = (W.__cb.seen[cls] || 0) + 1
  }
  const scan = (el) => {
    if (!(el instanceof Element)) return
    const cl = el.classList
    for (const c of WATCH) if (cl.contains(c)) mark(c, el)
    if (cl.contains('floating-number')) W.__cb.numbers.push({ t: Math.round(performance.now() - W.__cb.t0), text: el.textContent, cls: el.className })
    for (const ch of el.children) scan(ch)
  }
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.addedNodes) scan(n)
      if (m.type === 'attributes' && m.target instanceof Element) {
        const cl = m.target.classList
        for (const c of WATCH) if (cl.contains(c) && !(m.oldValue || '').split(/\\s+/).includes(c)) mark(c, m.target)
      }
    }
  })
  mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true })
  return true
}`

/** 現在の盤面を読む（表示テキストから） */
const STATE = `() => {
  const q = (s) => document.querySelector(s)
  const txt = (s) => (q(s)?.textContent ?? '').trim()
  const num = (s) => { const m = txt(s).replace(/,/g,'').match(/(\\d+)\\s*\\/\\s*(\\d+)/); return m ? { cur: +m[1], max: +m[2] } : null }
  const cards = [...document.querySelectorAll('.hand .card-view')].map((c) => ({
    name: c.querySelector('.card-view-name')?.textContent.trim(),
    cost: c.querySelector('.card-view-cost')?.textContent.trim(),
    disabled: c.disabled,
    bonusReady: !!c.querySelector('.card-view-bonus-ready'),
    exclusive: c.classList.contains('card-view-exclusive'),
    opacity: getComputedStyle(c).opacity,
  }))
  return {
    round: txt('.battle-topbar').match(/ラウンド\\s*(\\d+)/)?.[1] ?? null,
    ap: txt('.battle-topbar-ap').match(/(\\d+)\\s*\\/\\s*(\\d+)/)?.slice(1,3) ?? null,
    score: txt('.battle-topbar').match(/スコア\\s*([\\d,]+)/)?.[1] ?? null,
    enemyHp: num('.enemy-plate .hp-bar-label'),
    playerHp: num('.player-plate .hp-bar-label'),
    intent: txt('.enemy-plate .intent'),
    intentTier: q('.enemy-plate .intent')?.className ?? '',
    enemyBlock: txt('.enemy-plate .badge-block'),
    playerBlock: txt('.player-plate .badge-block'),
    resonance: txt('.resonance-gauge-label'),
    burstHead: txt('.burst-preview-head'),
    passive: txt('.god-passive-badge'),
    passiveArmed: !!q('.god-passive-armed'),
    guardPreview: txt('.divination-choice-preview'),
    divinationLeft: txt('.divination-panel-title'),
    cards,
    endEnabled: !!q('.end-round-button') && !q('.end-round-button').disabled,
    over: !!q('.reward-overlay, .game-over-overlay'),
    defeatAnim: !!q('.enemy-defeat'),
    speech: txt('.enemy-speech-bubble'),
  }
}`

/** 開始直後の「最初に見る場所」：面積×上部優先で並べた要素順 */
const FIRST_LOOK = `() => {
  const vh = window.innerHeight, vw = window.innerWidth
  const items = [
    ['敵の立ち絵', '.enemy-avatar'], ['敵の名札（HP・予告）', '.enemy-plate'], ['予告（Intent）', '.enemy-plate .intent'],
    ['神の立ち絵', '.player-avatar'], ['神の名札（HP）', '.player-plate'], ['共鳴の名札', '.god-otomo-plate'],
    ['OTOMO', '.portrait img'], ['手札', '.hand'], ['託宣バー', '.divination-panel'], ['神力（AP）', '.battle-topbar-ap'],
    ['ラウンドを終える', '.end-round-button'],
  ]
  const rows = []
  for (const [label, sel] of items) {
    const el = document.querySelector(sel)
    if (!el) continue
    const r = el.getBoundingClientRect()
    const area = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0))
    const cs = getComputedStyle(el)
    const fs = parseFloat(cs.fontSize)
    // 視線モデル（簡易）：面積 + 上に近い + コントラスト（フォントサイズ）。
    const salience = Math.sqrt(area) * (1 - r.top / vh * 0.5) + (isNaN(fs) ? 0 : fs * 3)
    rows.push({ label, top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height), fontSize: fs, salience: Math.round(salience) })
  }
  rows.sort((a, b) => b.salience - a.salience)
  return rows
}`

const GAMEOVER = `() => {
  const q = (s) => document.querySelector(s)
  const txt = (s) => (q(s)?.textContent ?? '').trim()
  const buttons = [...document.querySelectorAll('.reward-overlay button, .game-over-overlay button')].map((b) => b.textContent.trim())
  return {
    reward: !!q('.reward-overlay'),
    rewardCards: [...document.querySelectorAll('.reward-card-name')].map((e) => e.textContent.trim()),
    rewardTitle: txt('.reward-title'),
    rewardSub: txt('.reward-subtitle'),
    gameOver: !!q('.game-over-overlay'),
    status: txt('.game-over-status'),
    score: txt('.game-over-score'),
    newBest: !!q('.game-over-new-best'),
    bestGap: txt('.game-over-best-gap'),
    defeatCause: txt('.game-over-defeat-cause'),
    mastery: txt('.game-over-mastery, .mastery, [class*="mastery"]').slice(0, 160),
    breakdown: [...document.querySelectorAll('.score-breakdown dt')].map((e) => e.textContent.trim()),
    enemyHpLeft: txt('.game-over-enemy-hp'),
    otomoLevelUp: txt('.game-over-otomo-levelup'),
    buttons,
    textLength: (q('.game-over-card')?.textContent ?? '').length,
  }
}`

const browser = await chromium.launch({ headless: true })
const results = []

for (const b of BATTLES) {
  try {
  const viewport = b.vp === 'pc' ? PC : SP
  const ctx = await browser.newContext({ viewport, isMobile: b.vp === 'sp', hasTouch: b.vp === 'sp' })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()))
  const click = (t) =>
    page.evaluate((text) => {
      const el = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(text))
      if (!el) return false
      el.click()
      return true
    }, t)
  const shot = async (name) => {
    if (!shotsDir) return
    await page.screenshot({ path: join(shotsDir, `b${String(b.id).padStart(2, '0')}-${b.vp}-${name}.png`) })
  }

  const tLoad = Date.now()
  await page.goto(base + '/' + b.url)
  await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
  const tHome = Date.now() - tLoad
  await click('わかった')
  await page.waitForTimeout(150)
  await click('神を選ぶ')
  await page.waitForTimeout(300)
  if (await click('新しく始める')) await page.waitForTimeout(300)
  await click(b.god)
  await page.waitForTimeout(250)
  await click('この構成で始める')
  await page.waitForTimeout(250)
  await click(b.enemy)
  await page.waitForTimeout(400)
  const tStartClick = Date.now()
  await page.evaluate(`(${OBSERVER})()`)
  await click('この構成でバトル開始')
  await page.waitForSelector('.hand .card-view', { timeout: 10000 })
  // 手札が「操作可能」になるまで（Boss Entrance 1.5s の後）
  await page.waitForFunction(() => { const b = document.querySelector('.end-round-button'); return b && !b.disabled }, null, { timeout: 15000 })
  const tPlayable = Date.now() - tStartClick
  await page.waitForTimeout(200)
  const firstLook = await page.evaluate(`(${FIRST_LOOK})()`)
  const start = await page.evaluate(`(${STATE})()`)
  await shot('1-start')

  const rounds = []
  let minHpRatio = 1
  let lowHpRounds = 0
  let goodGuards = 0
  let bigIntentRounds = 0
  let exclusivePlays = 0
  let bonusReadyPlays = 0
  let firstImpactShot = false
  let burstShot = false
  for (let round = 1; round <= 8; round++) {
    const st = await page.evaluate(`(${STATE})()`)
    if (st.over) break
    const intentN = (st.intent.match(/\d+/g) ?? []).reduce((a, x) => a + Number(x), 0)
    const big = intentN >= 100 || /charge|溜め/.test(st.intentTier + st.intent)
    if (intentN >= 100) bigIntentRounds++
    const played = []
    for (let k = 0; k < 8; k++) {
      const pick = await page.evaluate(
        ([bigTurn]) => {
          const cards = [...document.querySelectorAll('.hand .card-view')].filter((c) => !c.disabled)
          if (cards.length === 0) return null
          const score = (c) => {
            const t = c.querySelector('.card-view-name').textContent
            const guard = /🛡|🌿/.test(t)
            const atk = /⚔|🌟|💀/.test(t)
            const res = /✨/.test(t)
            return (bigTurn ? (guard ? 3 : 0) : atk ? 3 : 0) + (c.querySelector('.card-view-bonus-ready') ? 1.5 : 0) + (res ? 1 : 0)
          }
          cards.sort((x, y) => score(y) - score(x))
          const c = cards[0]
          const info = { name: c.querySelector('.card-view-name').textContent.trim(), exclusive: c.classList.contains('card-view-exclusive'), bonusReady: !!c.querySelector('.card-view-bonus-ready') }
          c.click()
          return info
        },
        [big],
      )
      if (!pick) break
      played.push(pick.name)
      if (pick.exclusive) exclusivePlays++
      if (pick.bonusReady) bonusReadyPlays++
      await page.waitForTimeout(430)
      if (!firstImpactShot) { await shot('2-first-impact'); firstImpactShot = true }
      await page.waitForTimeout(400)
      if (!burstShot && (await page.evaluate(() => !!document.querySelector('.resonance-cutin, .burst-banner, .god-burst-strike')))) {
        await shot('3-god-strike')
        burstShot = true
        await page.waitForTimeout(2200)
      }
      if (await page.evaluate(() => !!document.querySelector('.enemy-defeat'))) {
        await page.waitForTimeout(200)
        await shot('4-final-blow')
        break
      }
      if (await page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay'))) break
    }
    if (await page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay, .enemy-defeat'))) {
      rounds.push({ round, intent: st.intent, played })
      break
    }
    // 託宣：大技なら加護、そうでなければ天啓
    await page.evaluate((i) => document.querySelectorAll('.divination-choice')[i]?.click(), big ? 0 : 2)
    await page.waitForTimeout(500)
    const beforeEnd = await page.evaluate(`(${STATE})()`)
    const blockN = Number((beforeEnd.playerBlock.match(/\d+/g) ?? ['0']).join('')) || 0
    if (intentN >= 100 && blockN >= intentN) goodGuards++
    await click('ラウンドを終える')
    await page.waitForTimeout(3200)
    const after = await page.evaluate(`(${STATE})()`)
    if (after.playerHp) {
      const ratio = after.playerHp.cur / after.playerHp.max
      minHpRatio = Math.min(minHpRatio, ratio)
      if (ratio <= 0.3) lowHpRounds++
    }
    rounds.push({ round, intent: st.intent, intentN, big, played, blockBefore: blockN, hpAfter: after.playerHp, enemyHpAfter: after.enemyHp, resonance: after.resonance, passiveArmed: after.passiveArmed })
  }
  // 決着待ち（撃破演出→報酬／結果）
  await page.waitForFunction(() => !!document.querySelector('.reward-overlay, .game-over-overlay'), null, { timeout: 12000 }).catch(() => {})
  await page.waitForTimeout(400)
  const end1 = await page.evaluate(`(${GAMEOVER})()`)
  await shot('5-result-a')
  // 報酬があれば1枚選んで結果画面へ
  if (end1.reward) {
    await page.evaluate(() => document.querySelector('.reward-card')?.click())
    await page.waitForTimeout(1200)
  }
  const end2 = await page.evaluate(`(${GAMEOVER})()`)
  await shot('6-result-b')
  const cb = await page.evaluate(() => ({ seen: window.__cb?.seen ?? {}, numbers: window.__cb?.numbers ?? [], events: (window.__cb?.events ?? []).slice(0, 400) }))
  const nums = cb.numbers
  const tierOf = (cls) => (cls.match(/floating-number-(l\d|max)/) ?? [])[1] ?? 'base'
  const tierCount = nums.reduce((acc, n) => ((acc[tierOf(n.cls)] = (acc[tierOf(n.cls)] || 0) + 1), acc), {})
  const r = {
    ...b,
    viewport: `${viewport.width}x${viewport.height}`,
    tHomeMs: tHome,
    tPlayableMs: tPlayable,
    firstLook: firstLook.slice(0, 5).map((x) => `${x.label}(${x.salience})`),
    intentAtStart: start.intent,
    intentFont: firstLook.find((x) => x.label === '予告（Intent）')?.fontSize ?? null,
    guardPreviewAtStart: start.guardPreview,
    passive: start.passive,
    rounds: rounds.length,
    bigIntentRounds,
    goodGuards,
    exclusivePlays,
    bonusReadyPlays,
    minHpRatio: Math.round(minHpRatio * 100),
    lowHpRounds,
    numbers: nums.length,
    tierCount,
    seen: cb.seen,
    burst: !!cb.seen['resonance-cutin'] || !!cb.seen['burst-banner'],
    enemyCutin: !!cb.seen['enemy-cutin'],
    charging: !!cb.seen['enemy-avatar-charging'],
    passiveArmedSeen: !!cb.seen['god-passive-armed'],
    defeatAnim: !!cb.seen['enemy-defeat'],
    victoryBeat: !!cb.seen['victory-beat'],
    result: end2.gameOver ? end2 : end1,
    rewardOffered: end1.rewardCards,
    errors,
    roundsDetail: rounds,
    events: cb.events.slice(0, 120),
  }
  results.push(r)
  console.log(
    `#${b.id} ${b.vp} ${b.god}×${b.enemy} [${b.diff}]: playable=${tPlayable}ms rounds=${r.rounds} status=${r.result.status || (end1.reward ? 'won(reward)' : '?')} score=${r.result.score} nums=${nums.length} tiers=${JSON.stringify(tierCount)} burst=${r.burst} cutin=${r.enemyCutin} charge=${r.charging} passive=${r.passiveArmedSeen} excl=${exclusivePlays} bonus=${bonusReadyPlays} minHp=${r.minHpRatio}% lowR=${lowHpRounds} bigR=${bigIntentRounds} guards=${goodGuards} defeat=${r.defeatAnim} beat=${r.victoryBeat} reward=${end1.rewardCards.length} err=${errors.length}`,
  )
  console.log(`   firstLook: ${r.firstLook.join(' > ')} | buttons: ${r.result.buttons?.join(' / ')}`)
  await ctx.close()
  } catch (e) {
    console.log('#' + b.id + ' FAILED: ' + String(e).split(String.fromCharCode(10))[0])
    results.push({ ...b, failed: String(e).split(String.fromCharCode(10))[0] })
  }
  if (out) writeFileSync(out, JSON.stringify(results, null, 1))
}
await browser.close()
if (out) writeFileSync(out, JSON.stringify(results, null, 1))

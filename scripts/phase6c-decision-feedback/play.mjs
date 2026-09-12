// Phase 6-C（決定166）：Decision Feedback ＋ Battle Recap の実プレイ QA（監査用。ゲームコードではない）。
//
//   node scripts/phase6c-decision-feedback/play.mjs <outJson> [baseUrl] [--shots <dir>]
//
// 14戦（7神×2・敵7体・PC 9／SP 5・normal〜神階Ⅴ）＋ reduced-motion 1戦 を自動プレイし、
//   - callout の回数・種類・priority・文言・表示時刻
//   - 同時表示（2件以上）／同一バッチ重複（同じ id が 300ms 以内に2回）
//   - 誤判定：「完封！」が出た敵ターンで自分の HP が減っていないか、
//            「反撃！」が蒼毘以外で出ていないか、「得意技！」が得意技の無い神で出ていないか
//   - 視覚競合：callout の矩形が浮遊数字・予告・敵の顔（立ち絵の上 40%）と重なっていないか
//   - 6-B 保護：callout 表示中の scrollY／横はみ出し／敵・予告・手札の可視
//   - 結果画面：勝利 → 結果（振り返り）→「報酬カードを選ぶ」→ 報酬 → 結果（通常ボタン）の順序
//   - Recap の行（勝利＝固有の事実／敗北＝助言）
// を記録する。
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

const PC = { width: 1508, height: 660 }
const SP = { width: 390, height: 760 }
const GODS_WITH_PASSIVE = { 蒼毘: 'counter', 福永: 'passive', 笑蓮: 'passive' }

const BATTLES = [
  { id: 1, god: '大耀', enemy: '業斧の鬼将', url: '?enemy=oni&seed=c6-01', vp: 'pc', diff: 'normal' },
  { id: 2, god: '蒼毘', enemy: '双牙の魔獣', url: '?enemy=juuma&stake=2&seed=c6-02', vp: 'pc', diff: 'stake2' },
  { id: 3, god: '福永', enemy: '銀甲の機工師', url: '?enemy=karakuri&stake=3&seed=c6-03', vp: 'pc', diff: 'stake3' },
  { id: 4, god: '寿楽', enemy: '蒼海の龍神', url: '?enemy=ryujin&seed=c6-04', vp: 'pc', diff: 'normal' },
  { id: 5, god: '恵比寿', enemy: '試練の影', url: '?enemy=trial&seed=c6-05', vp: 'pc', diff: 'normal' },
  { id: 6, god: '才華', enemy: '乱舞の道化', url: '?enemy=doukeshi&stake=1&seed=c6-06', vp: 'pc', diff: 'stake1' },
  { id: 7, god: '笑蓮', enemy: '藍花の怨霊', url: '?enemy=onryo&stake=4&seed=c6-07', vp: 'pc', diff: 'stake4' },
  { id: 8, god: '大耀', enemy: '蒼海の龍神', url: '?enemy=ryujin&stake=5&seed=c6-08', vp: 'pc', diff: 'stake5' },
  { id: 9, god: '蒼毘', enemy: '銀甲の機工師', url: '?enemy=karakuri&seed=c6-09', vp: 'pc', diff: 'normal' },
  { id: 10, god: '福永', enemy: '双牙の魔獣', url: '?enemy=juuma&seed=c6-10', vp: 'sp', diff: 'normal' },
  { id: 11, god: '寿楽', enemy: '乱舞の道化', url: '?enemy=doukeshi&stake=2&seed=c6-11', vp: 'sp', diff: 'stake2' },
  { id: 12, god: '恵比寿', enemy: '業斧の鬼将', url: '?enemy=oni&stake=1&seed=c6-12', vp: 'sp', diff: 'stake1' },
  { id: 13, god: '才華', enemy: '藍花の怨霊', url: '?enemy=onryo&seed=c6-13', vp: 'sp', diff: 'normal' },
  { id: 14, god: '笑蓮', enemy: '試練の影', url: '?enemy=trial&stake=3&seed=c6-14', vp: 'sp', diff: 'stake3' },
  { id: 15, god: '蒼毘', enemy: '業斧の鬼将', url: '?enemy=oni&stake=2&seed=c6-15', vp: 'pc', diff: 'stake2', reduced: true },
]

/** ページ側の観測器：callout の出現を矩形・競合情報つきで記録する */
const OBSERVER = `() => {
  const W = window
  W.__c6 = { t0: performance.now(), callouts: [], maxSimultaneous: 0, overlays: [] }
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, w: r.width, h: r.height } }
  const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
  const record = (el) => {
    const t = Math.round(performance.now() - W.__c6.t0)
    const parts = [el.querySelector('.battle-callout-label'), el.querySelector('.battle-callout-sub')].filter(Boolean).map(rectOf)
    const r = parts.length ? { top: Math.min(...parts.map(p => p.top)), left: Math.min(...parts.map(p => p.left)), right: Math.max(...parts.map(p => p.right)), bottom: Math.max(...parts.map(p => p.bottom)) } : rectOf(el)
    r.w = r.right - r.left; r.h = r.bottom - r.top
    const nums = [...document.querySelectorAll('.floating-number')].map(rectOf)
    const intent = document.querySelector('.enemy-plate .intent')
    const enemy = document.querySelector('.enemy-avatar')
    const hand = document.querySelector('.hand')
    const er = enemy ? rectOf(enemy) : null
    const face = er ? { ...er, bottom: er.top + er.h * 0.4 } : null
    W.__c6.callouts.push({
      t,
      id: el.dataset.calloutId,
      priority: Number(el.dataset.calloutPriority),
      label: el.querySelector('.battle-callout-label')?.textContent ?? '',
      sub: el.querySelector('.battle-callout-sub')?.textContent ?? '',
      rect: { top: Math.round(r.top), h: Math.round(r.h), w: Math.round(r.w) },
      numberOverlapPx: Math.round(nums.reduce((a, n) => a + overlap(r, n), 0)),
      intentOverlapPx: intent ? Math.round(overlap(r, rectOf(intent))) : 0,
      enemyFaceOverlapPx: face ? Math.round(overlap(r, face)) : 0,
      enemyOverlapRatio: er ? +(overlap(r, er) / (er.w * er.h)).toFixed(3) : 0,
      handOverlapPx: hand ? Math.round(overlap(r, rectOf(hand))) : 0,
      miniResultOverlapPx: (() => { const m = document.querySelector('.battle-mini-result'); return m ? Math.round(overlap(r, rectOf(m))) : 0 })(),
      scrollY: Math.round(window.scrollY),
      overflowX: document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth,
      simultaneous: document.querySelectorAll('.battle-callout').length,
      playerHp: document.querySelector('.player-plate .hp-bar-label')?.textContent ?? '',
      pointerEvents: getComputedStyle(el).pointerEvents,
    })
    W.__c6.maxSimultaneous = Math.max(W.__c6.maxSimultaneous, document.querySelectorAll('.battle-callout').length)
  }
  const mo = new MutationObserver((muts) => {
    for (const m of muts) for (const n of m.addedNodes) {
      if (!(n instanceof Element)) continue
      if (n.classList.contains('battle-callout')) record(n)
      if (n.classList.contains('game-over-overlay') || n.classList.contains('reward-overlay')) W.__c6.overlays.push({ t: Math.round(performance.now() - W.__c6.t0), cls: n.className.split(' ')[0] })
      for (const c of n.querySelectorAll?.('.battle-callout, .game-over-overlay, .reward-overlay') ?? []) {
        if (c.classList.contains('battle-callout')) record(c)
        else W.__c6.overlays.push({ t: Math.round(performance.now() - W.__c6.t0), cls: c.className.split(' ')[0] })
      }
    }
  })
  mo.observe(document.body, { childList: true, subtree: true })
  return true
}`

const STATE = `() => {
  const q = (s) => document.querySelector(s)
  const txt = (s) => (q(s)?.textContent ?? '').trim()
  const num = (s) => { const m = txt(s).replace(/,/g,'').match(/(\\d+)\\s*\\/\\s*(\\d+)/); return m ? { cur: +m[1], max: +m[2] } : null }
  return {
    playerHp: num('.player-plate .hp-bar-label'),
    enemyHp: num('.enemy-plate .hp-bar-label'),
    intent: txt('.enemy-plate .intent'),
    over: !!q('.reward-overlay, .game-over-overlay'),
    endEnabled: !!q('.end-round-button') && !q('.end-round-button').disabled,
  }
}`

const RESULT = `() => {
  const q = (s) => document.querySelector(s)
  const txt = (s) => (q(s)?.textContent ?? '').trim()
  return {
    gameOver: !!q('.game-over-overlay'),
    reward: !!q('.reward-overlay'),
    status: txt('.game-over-status'),
    recap: [...document.querySelectorAll('[data-testid="battle-recap"] li')].map((e) => e.textContent.trim()),
    recapKind: q('[data-testid="battle-recap"]')?.className ?? '',
    defeatCause: txt('.game-over-defeat-cause'),
    buttons: [...document.querySelectorAll('.game-over-overlay button, .reward-overlay button')].map((b) => b.textContent.trim()),
    score: txt('.game-over-score'),
    rewardCards: [...document.querySelectorAll('.reward-card-name')].map((e) => e.textContent.trim()),
  }
}`

const browser = await chromium.launch({ headless: true })
const results = []

for (const b of BATTLES) {
  try {
    const viewport = b.vp === 'pc' ? PC : SP
    const ctx = await browser.newContext({ viewport, isMobile: b.vp === 'sp', hasTouch: b.vp === 'sp', reducedMotion: b.reduced ? 'reduce' : 'no-preference' })
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
      // ヘッドレスは描画要求が無いと CSS animation の timeline が止まる（callout は opacity 0 のまま写る）。
      // 1 枚目でフレームを流し、2 枚目を保存する
      await page.screenshot({ path: join(shotsDir, '_pump.png') })
      await page.waitForTimeout(90)
      await page.screenshot({ path: join(shotsDir, `b${String(b.id).padStart(2, '0')}-${b.vp}-${name}.png`) })
    }
    await page.goto(base + '/' + b.url)
    await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
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
    await page.evaluate(`(${OBSERVER})()`)
    await click('この構成でバトル開始')
    await page.waitForSelector('.hand .card-view', { timeout: 10000 })
    await page.waitForFunction(() => { const e = document.querySelector('.end-round-button'); return e && !e.disabled }, null, { timeout: 15000 })
    await page.waitForTimeout(200)

    const enemyTurns = []
    let calloutShotDone = false
    for (let round = 1; round <= 8; round++) {
      const st = await page.evaluate(`(${STATE})()`)
      if (st.over) break
      const intentN = (st.intent.match(/\d+/g) ?? []).reduce((a, x) => a + Number(x), 0)
      const big = intentN >= 100 || /溜め/.test(st.intent)
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
              return (bigTurn ? (guard ? 3 : 0) : atk ? 3 : 0) + (c.querySelector('.card-view-bonus-ready') ? 1.5 : 0) + (res ? 1 : 0)
            }
            cards.sort((x, y) => score(y) - score(x))
            cards[0].click()
            return cards[0].querySelector('.card-view-name').textContent.trim()
          },
          [big],
        )
        if (!played) break
        await page.waitForTimeout(520)
        if (!calloutShotDone && (await page.evaluate(() => !!document.querySelector('.battle-callout')))) {
          await shot('1-callout')
          calloutShotDone = true
        }
        await page.waitForTimeout(380)
        if (await page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay, .enemy-defeat'))) break
      }
      if (await page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay, .enemy-defeat'))) break
      await page.evaluate((i) => document.querySelectorAll('.divination-choice')[i]?.click(), big ? 0 : 2)
      await page.waitForTimeout(500)
      const before = await page.evaluate(`(${STATE})()`)
      const nBefore = await page.evaluate(() => window.__c6.callouts.length)
      await click('ラウンドを終える')
      await page.waitForTimeout(900)
      if (!calloutShotDone && (await page.evaluate(() => !!document.querySelector('.battle-callout')))) {
        await shot('1-callout')
        calloutShotDone = true
      }
      await page.waitForTimeout(2400)
      const after = await page.evaluate(`(${STATE})()`)
      const newCallouts = await page.evaluate((n) => window.__c6.callouts.slice(n), nBefore)
      enemyTurns.push({ round, intent: st.intent, hpBefore: before.playerHp?.cur ?? null, hpAfter: after.playerHp?.cur ?? null, callouts: newCallouts.map((c) => c.id) })
    }
    // 決着 → 結果画面（振り返り）→ 報酬 → 結果
    await page.waitForFunction(() => !!document.querySelector('.reward-overlay, .game-over-overlay'), null, { timeout: 12000 }).catch(() => {})
    await page.waitForTimeout(500)
    const first = await page.evaluate(`(${RESULT})()`)
    await shot('2-result-first')
    let afterReward = null
    let rewardScreen = null
    if (first.gameOver && first.buttons.some((t) => t.includes('報酬カードを選ぶ'))) {
      await click('報酬カードを選ぶ')
      await page.waitForTimeout(500)
      rewardScreen = await page.evaluate(`(${RESULT})()`)
      await shot('3-reward')
      await page.evaluate(() => document.querySelector('.reward-card')?.click())
      await page.waitForTimeout(600)
      afterReward = await page.evaluate(`(${RESULT})()`)
      await shot('4-result-after-reward')
    }
    const obs = await page.evaluate(() => ({ callouts: window.__c6.callouts, maxSimultaneous: window.__c6.maxSimultaneous, overlays: window.__c6.overlays }))

    // 誤判定チェック
    const wrong = []
    for (const et of enemyTurns) {
      const perfect = et.callouts.filter((id) => id === 'perfect' || id === 'perfect-big')
      if (perfect.length && et.hpBefore !== null && et.hpAfter !== null && et.hpAfter < et.hpBefore) wrong.push(`R${et.round}: 完封なのにHP ${et.hpBefore}→${et.hpAfter}`)
    }
    for (const c of obs.callouts) {
      if (c.id === 'counter' && b.god !== '蒼毘') wrong.push(`反撃！ が ${b.god} で出た`)
      if (c.id === 'passive' && !(b.god in GODS_WITH_PASSIVE && GODS_WITH_PASSIVE[b.god] === 'passive')) wrong.push(`得意技！ が ${b.god} で出た`)
    }
    // 同一バッチ重複：同じ id が 300ms 以内に連続
    let dup = 0
    for (let i = 1; i < obs.callouts.length; i++) if (obs.callouts[i].id === obs.callouts[i - 1].id && obs.callouts[i].t - obs.callouts[i - 1].t < 300) dup++
    const byId = {}
    for (const c of obs.callouts) byId[c.id] = (byId[c.id] ?? 0) + 1
    const firstOverlay = obs.overlays[0]?.cls ?? null
    const r = {
      ...b,
      calloutCount: obs.callouts.length,
      byId,
      maxSimultaneous: obs.maxSimultaneous,
      duplicates: dup,
      wrong,
      numberOverlapMax: Math.max(0, ...obs.callouts.map((c) => c.numberOverlapPx)),
      intentOverlapMax: Math.max(0, ...obs.callouts.map((c) => c.intentOverlapPx)),
      enemyFaceOverlapMax: Math.max(0, ...obs.callouts.map((c) => c.enemyFaceOverlapPx)),
      enemyOverlapRatioMax: Math.max(0, ...obs.callouts.map((c) => c.enemyOverlapRatio)),
      handOverlapMax: Math.max(0, ...obs.callouts.map((c) => c.handOverlapPx)),
      miniResultOverlapMax: Math.max(0, ...obs.callouts.map((c) => c.miniResultOverlapPx)),
      scrollYMax: Math.max(0, ...obs.callouts.map((c) => c.scrollY)),
      overflowXMax: Math.max(0, ...obs.callouts.map((c) => c.overflowX)),
      pointerEventsNone: obs.callouts.every((c) => c.pointerEvents === 'none'),
      resultFirst: firstOverlay,
      resultStatus: first.status,
      recap: first.recap,
      recapKind: first.recapKind,
      defeatCause: first.defeatCause,
      buttonsFirst: first.buttons,
      rewardShown: !!rewardScreen?.reward,
      rewardCards: rewardScreen?.rewardCards ?? [],
      buttonsAfterReward: afterReward?.buttons ?? null,
      errors,
      callouts: obs.callouts.map((c) => ({ t: c.t, id: c.id, p: c.priority, label: c.label, sub: c.sub })),
      enemyTurns,
    }
    results.push(r)
    console.log(
      `#${b.id} ${b.vp}${b.reduced ? '(reduced)' : ''} ${b.god}×${b.enemy} [${b.diff}]: callouts=${r.calloutCount} ${JSON.stringify(byId)} simul=${r.maxSimultaneous} dup=${dup} wrong=${wrong.length} numOverlap=${r.numberOverlapMax}px intentOverlap=${r.intentOverlapMax} faceOverlap=${r.enemyFaceOverlapMax} enemyRatio=${r.enemyOverlapRatioMax} hand=${r.handOverlapMax} mini=${r.miniResultOverlapMax} scroll=${r.scrollYMax} ox=${r.overflowXMax} pe=${r.pointerEventsNone} | ${r.resultStatus} first=${r.resultFirst} recap=${JSON.stringify(r.recap)} reward=${r.rewardShown} after=${JSON.stringify(r.buttonsAfterReward)} err=${errors.length}`,
    )
    await ctx.close()
  } catch (e) {
    console.log('#' + b.id + ' FAILED: ' + String(e).split(String.fromCharCode(10))[0])
    results.push({ ...b, failed: String(e).split(String.fromCharCode(10))[0] })
  }
  if (out) writeFileSync(out, JSON.stringify(results, null, 1))
}
await browser.close()

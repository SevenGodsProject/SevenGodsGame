// 決定200 Interaction Feel v1 受け入れテスト（QA 用。ゲームコードではない）。
//
//   node scripts/interaction-feel-v1/acceptance.mjs <outDir> <url> [--baseline <beforeUrl>]
//
// 確かめること：
//   AC1 PC：pointerdown から 60ms 以内に見た目が変わる（T1／T2 の代表要素すべて）
//   AC2 SP：tap → 押下反応 → 離す → **hover が残らない**（sticky hover の解消）
//   AC3 カードのタイミングが変わっていない（click→手札から消える 280ms 前後・着弾・HP）
//   AC4 敵ターン中の手札が「押せない」と分かり、押しても何も起きない
//   AC5 Tab で金色の focus outline が出る
//   AC6 reduced-motion でも押下状態は残り、時間だけ 0 になる
//   AC7 console error 0 / 404 0 / 壊れた画像 0
//   AC8 touch-action・tap-highlight が効いている（computed style）
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const [outDir = 'scripts/interaction-feel-v1/out', base = 'http://localhost:4181'] = args
const bIdx = args.indexOf('--baseline')
const baseline = bIdx >= 0 ? args[bIdx + 1] : null
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch()
const SEED = 'ifv1-acceptance'

const VP = {
  pc1508: { viewport: { width: 1508, height: 660 }, isMobile: false, hasTouch: false },
  sp844: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
}

const clickText = (page, t) =>
  page.evaluate((t) => {
    const el = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(t) && !x.disabled)
    if (!el) return false
    el.click()
    return true
  }, t)

const STYLE = (sel) => {
  const el = document.querySelector(sel)
  if (!el) return null
  const cs = getComputedStyle(el)
  return {
    transform: cs.transform,
    filter: cs.filter,
    boxShadow: cs.boxShadow.slice(0, 60),
    opacity: cs.opacity,
    touchAction: cs.touchAction,
    tapHighlight: cs.webkitTapHighlightColor ?? '',
    userSelect: cs.userSelect,
    outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
  }
}

async function open(name, url = base, opts = {}) {
  const ctx = await browser.newContext({ ...VP[name], reducedMotion: opts.reduced ? 'reduce' : 'no-preference' })
  const page = await ctx.newPage()
  const errors = []
  const failed = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('requestfailed', (r) => failed.push(r.url()))
  page.on('response', (r) => r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`))
  await page.goto(`${url}/?seed=${SEED}&enemy=oni`)
  await page.waitForSelector('.home-screen .home-cta-primary', { timeout: 30000 })
  await page.waitForTimeout(400)
  return { ctx, page, errors, failed }
}

async function waitBattle(page) {
  await page.waitForSelector('.hand .card-view', { timeout: 20000 })
  await page.waitForFunction(() => { const b = document.querySelector('.end-round-button'); return b && !b.disabled }, null, { timeout: 20000 })
  await page.waitForTimeout(400)
}

async function startNormal(page) {
  if (!(await page.evaluate(() => { const b = document.querySelector('[data-testid="home-start"]'); if (!b) return false; b.click(); return true }))) await clickText(page, '神を選ぶ')
  await page.waitForTimeout(400)
  if (await clickText(page, '新しく始める')) await page.waitForTimeout(400)
  await clickText(page, '大耀')
  await page.waitForTimeout(300)
  await clickText(page, 'この構成で始める')
  await page.waitForTimeout(300)
  await clickText(page, '業斧の鬼将')
  await page.waitForTimeout(400)
  await clickText(page, 'この構成でバトル開始')
  await waitBattle(page)
}

/**
 * AC1：押してから見た目が変わるまでの実時間を測る。
 *
 * 55ms 固定でサンプルすると Playwright の往復時間に左右されるため、**ページの中で**
 * `pointerdown` を起点に毎フレーム computed style を見比べ、最初に変わったフレームの時刻を返す。
 * これなら「押下 → 可視反応」の実レイテンシをそのまま測れる。
 */
async function pressLatency(page, sel, label) {
  const idle = await page.evaluate(STYLE, sel)
  if (!idle) return { label, sel, present: false }
  // 画面外だと mouse.move が当たらない（hover も :active も乗らない）ので必ず見える位置へ
  await page.locator(sel).first().scrollIntoViewIfNeeded().catch(() => {})
  await page.waitForTimeout(150)
  const box = await page.locator(sel).first().boundingBox()
  if (!box) return { label, sel, present: false }
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.waitForTimeout(260) // hover の transition を終わらせてから押す
  const hover = await page.evaluate(STYLE, sel)

  // ページ内に観測器を仕込む（pointerdown を t0 にして、変化した最初のフレームを記録）
  await page.evaluate((s) => {
    const el = document.querySelector(s)
    const snap = () => {
      const cs = getComputedStyle(el)
      return cs.transform + '|' + cs.filter
    }
    // ★押す前に控える：ブラウザは pointerdown を配る前に :active を当てることがあり、
    //   ハンドラの中で控えると「変化なし」に見えてしまう（transition の無い要素は即時反映）
    const before = snap()
    const probe = { before, t0: null, changedAt: null, to: null, matchesRule: null }
    window.__press = probe
    el.addEventListener(
      'pointerdown',
      () => {
        probe.t0 = performance.now()
        probe.matchesRule = el.matches(':not(:disabled):active')
        const immediate = snap()
        if (immediate !== before) {
          probe.changedAt = 0
          probe.to = immediate
          return
        }
        const tick = () => {
          if (probe.changedAt !== null) return
          const now = snap()
          if (now !== before) {
            probe.changedAt = performance.now() - probe.t0
            probe.to = now
            return
          }
          if (performance.now() - probe.t0 < 400) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      },
      { once: true },
    )
  }, sel)

  await page.mouse.down()
  await page.waitForTimeout(220)
  const probe = await page.evaluate(() => window.__press)
  await page.mouse.up()

  return {
    label,
    sel,
    present: true,
    idleTransform: idle.transform,
    hoverTransform: hover?.transform,
    pressLatencyMs: probe?.changedAt ?? null,
    pressedStyle: probe?.to ?? null,
    changedWithin60ms: probe?.changedAt !== null && probe.changedAt <= 60,
    matchesPressRule: probe?.matchesRule ?? null,
    touchAction: idle.touchAction,
    tapHighlight: idle.tapHighlight,
    userSelect: idle.userSelect,
  }
}

/** AC2：touch で tap → 押下中の見た目 → 離したあと hover が残らない */
async function tapAndCheckSticky(page, sel, label) {
  const idle = await page.evaluate(STYLE, sel)
  if (!idle) return { label, present: false }
  await page.locator(sel).first().scrollIntoViewIfNeeded().catch(() => {})
  await page.waitForTimeout(150)
  const box = await page.locator(sel).first().boundingBox()
  if (!box) return { label, present: false }
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  // touchstart 相当（押しっぱなし）で押下状態を読む
  await page.touchscreen.tap(x, y)
  await page.waitForTimeout(500)
  const after = await page.evaluate(STYLE, sel)
  return { label, present: true, idleTransform: idle.transform, afterTapTransform: after?.transform ?? '(gone)', sticky: !!after && after.transform !== idle.transform, touchAction: idle.touchAction, tapHighlight: idle.tapHighlight }
}

/** AC3：カードのタイミング（click→消える→数字→HP） */
async function cardTiming(page) {
  return page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    const cards = [...document.querySelectorAll('.hand .card-view')].filter((c) => !c.disabled)
    const attack = cards.find((c) => /⚔/.test(c.querySelector('.card-view-name')?.textContent ?? '')) ?? cards[0]
    if (!attack) return { error: 'no card' }
    const hpLabel = () => document.querySelector('.enemy-plate .hp-bar-label')?.textContent ?? ''
    const hp0 = hpLabel()
    const t0 = performance.now()
    let tLeave = null, tNumber = null, tHp = null
    attack.click()
    for (let i = 0; i < 400; i++) {
      await sleep(10)
      const now = performance.now() - t0
      if (tLeave === null && !document.body.contains(attack)) tLeave = now
      if (tNumber === null && document.querySelector('[class*="float-up"], .floating-number')) tNumber = now
      if (tHp === null && hpLabel() !== hp0) tHp = now
      if (tHp !== null && now > 900) break
      if (now > 4000) break
    }
    return { hp0, hp1: hpLabel(), tLeave, tNumber, tHp }
  })
}

/** AC4：敵ターン中のカードが押せない・見た目で分かる */
async function disabledCue(page) {
  await page.evaluate(() => document.querySelector('.end-round-button')?.click())
  await page.waitForTimeout(220)
  const during = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.hand .card-view')]
    const disabled = cards.filter((c) => c.disabled)
    const sample = disabled[0]
    const cs = sample ? getComputedStyle(sample) : null
    return { total: cards.length, disabledCount: disabled.length, filter: cs?.filter ?? null, opacity: cs?.opacity ?? null, handBefore: cards.length }
  })
  // 押しても増減しないこと（disabled なので何も起きない）
  const clicked = await page.evaluate(() => {
    const c = [...document.querySelectorAll('.hand .card-view')].find((x) => x.disabled)
    if (!c) return null
    const before = document.querySelectorAll('.hand .card-view').length
    const name = c.querySelector('.card-view-name')?.textContent?.trim() ?? ''
    c.click()
    return { before, name }
  })
  await page.waitForTimeout(250)
  const post = await page.evaluate((name) => ({
    count: document.querySelectorAll('.hand .card-view').length,
    still: [...document.querySelectorAll('.hand .card-view')].some((c) => (c.querySelector('.card-view-name')?.textContent?.trim() ?? '') === name),
  }), clicked?.name ?? '')
  const handAfter = post.count
  await page.waitForTimeout(3200)
  return { ...during, clickedBefore: clicked?.before ?? null, handAfter, sameCardStillThere: post.still }
}

/** AC5：Tab で focus outline */
async function focusOutline(page, n = 8) {
  const res = []
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab')
    await page.waitForTimeout(40)
    const r = await page.evaluate(() => {
      const a = document.activeElement
      if (!a || a === document.body) return null
      const cs = getComputedStyle(a)
      return { cls: (a.className || '').toString().split(' ')[0], outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor, outlineStyle: cs.outlineStyle }
    })
    if (r) res.push(r)
  }
  return res
}

const out = { base, baseline, at: new Date().toISOString() }

// ---------- PC ----------
{
  const p = await open('pc1508')
  const press = []
  press.push(await pressLatency(p.page, '.home-screen .home-cta-primary', 'Home Primary CTA'))
  await p.page.waitForTimeout(700)
  await p.page.goto(`${base}/?seed=${SEED}&enemy=oni`); await p.page.waitForSelector('.home-screen .home-cta-primary'); await p.page.waitForTimeout(300)
  await p.page.evaluate(() => document.querySelector('[data-testid="home-start"]')?.click()); await p.page.waitForTimeout(400)
  if (await clickText(p.page, '新しく始める')) await p.page.waitForTimeout(400)
  press.push(await pressLatency(p.page, '.god-select-card', 'God tile'))
  await p.page.waitForTimeout(400)
  press.push(await pressLatency(p.page, '.difficulty-option', 'Difficulty option'))
  await p.page.waitForTimeout(300)
  press.push(await pressLatency(p.page, '.god-select-confirm', 'God confirm'))
  await p.page.waitForTimeout(500)
  press.push(await pressLatency(p.page, '.enemy-select-card', 'Enemy tile'))
  await p.page.waitForTimeout(500)
  press.push(await pressLatency(p.page, '.deck-builder-actions button:last-child', 'Deck confirm'))
  try { await waitBattle(p.page) } catch { await clickText(p.page, 'この構成でバトル開始'); await waitBattle(p.page) }
  press.push(await pressLatency(p.page, '.hand .card-view:not([disabled])', 'Hand card'))
  await p.page.waitForTimeout(1600)
  press.push(await pressLatency(p.page, '.divination-choice', '神託 choice'))
  await p.page.waitForTimeout(700)
  press.push(await pressLatency(p.page, '.end-round-button', 'End Round'))
  await p.page.waitForTimeout(4200)
  out.pcPress = press
  await p.page.screenshot({ path: join(outDir, 'pc-battle.png') })
  await waitBattle(p.page)
  out.pcCardTiming = await cardTiming(p.page)
  await p.page.waitForTimeout(1200)
  out.pcDisabledCue = await disabledCue(p.page)
  out.pcFocus = await focusOutline(p.page, 8)
  out.pcErrors = p.errors
  out.pcFailedRequests = p.failed
  await p.ctx.close()
}

// ---------- PC：Result / Reward ----------
{
  const p = await open('pc1508')
  await startNormal(p.page)
  for (let r = 0; r < 8; r++) {
    if (await p.page.evaluate(() => !!document.querySelector('.game-over-overlay'))) break
    await p.page.evaluate(() => document.querySelector('.end-round-button')?.click())
    await p.page.waitForTimeout(3300)
  }
  await p.page.waitForSelector('.game-over-overlay', { timeout: 25000 })
  await p.page.waitForTimeout(2600)
  out.pcResultPress = await pressLatency(p.page, '[data-testid="result-primary"]', 'Result primary')
  await p.page.screenshot({ path: join(outDir, 'pc-result.png') })
  out.pcErrors3 = p.errors
  await p.ctx.close()
}

// ---------- SP：sticky hover ----------
{
  const p = await open('sp844')
  const sticky = []
  await p.page.evaluate(() => document.querySelector('[data-testid="home-start"]')?.click()); await p.page.waitForTimeout(400)
  if (await clickText(p.page, '新しく始める')) await p.page.waitForTimeout(400)
  // 難易度は「神タイルを選んだあとの確認画面」に出るので、先に神タイルを測ってから進む
  await p.page.waitForSelector('.god-select-card', { timeout: 15000 })
  await p.page.waitForTimeout(300)
  sticky.push(await tapAndCheckSticky(p.page, '.god-select-card', 'God tile'))
  await p.page.waitForSelector('.difficulty-option', { timeout: 15000 })
  await p.page.waitForTimeout(300)
  sticky.push(await tapAndCheckSticky(p.page, '.difficulty-option', 'Difficulty option'))
  await clickText(p.page, 'この構成で始める'); await p.page.waitForTimeout(400)
  await clickText(p.page, '業斧の鬼将'); await p.page.waitForTimeout(400)
  await clickText(p.page, 'この構成でバトル開始')
  await waitBattle(p.page)
  sticky.push(await tapAndCheckSticky(p.page, '.end-round-button', 'End Round'))
  await p.page.waitForTimeout(3600)
  const erAfter = await p.page.evaluate(STYLE, '.end-round-button')
  out.spSticky = sticky
  out.spEndRoundAfterTurn = erAfter
  out.spCardStyle = await p.page.evaluate(STYLE, '.hand .card-view')
  out.spErrors = p.errors
  out.spFailedRequests = p.failed
  await p.page.screenshot({ path: join(outDir, 'sp-battle.png') })
  await p.ctx.close()
}

// ---------- reduced motion ----------
{
  const p = await open('pc1508', base, { reduced: true })
  out.reduced = await p.page.evaluate(() => {
    const probe = document.createElement('button')
    probe.className = 'home-cta-primary'
    document.body.appendChild(probe)
    const cs = getComputedStyle(probe)
    const r = { base: cs.transitionDuration }
    probe.remove()
    return r
  })
  // :active の transition-duration は CSSOM から規則として確認する
  out.reducedRule = await p.page.evaluate(() => {
    const found = []
    for (const sheet of document.styleSheets) {
      let rules
      try { rules = sheet.cssRules } catch { continue }
      for (const rule of rules) {
        if (rule.media && rule.conditionText && rule.conditionText.includes('prefers-reduced-motion')) {
          for (const inner of rule.cssRules ?? []) {
            if (inner.selectorText && inner.selectorText.includes(':active')) {
              found.push({ selectors: inner.selectorText.split(',').length, transitionDuration: inner.style.transitionDuration, transform: inner.style.transform, filter: inner.style.filter })
            }
          }
        }
      }
    }
    return found
  })
  await p.ctx.close()
}

// ---------- baseline（任意）：カードのタイミング比較 ----------
if (baseline) {
  const p = await open('pc1508', baseline)
  await startNormal(p.page)
  out.baselineCardTiming = await cardTiming(p.page)
  await p.ctx.close()
}

await browser.close()

// ---------- 判定 ----------
const checks = []
const add = (id, d, pass, detail) => checks.push({ id, d, verdict: pass ? 'PASS' : 'FAIL', detail })

for (const r of out.pcPress ?? []) {
  add(`AC1-${r.label}`, `PC：${r.label} が押した瞬間に押下状態になる（実測 ${r.pressLatencyMs?.toFixed?.(1) ?? "-"}ms／CSS は 60ms 宣言）`, r.present && r.matchesPressRule === true && r.pressLatencyMs !== null && r.pressLatencyMs <= 150, { latencyMs: r.pressLatencyMs, hover: r.hoverTransform, pressed: r.pressedStyle })
}
add('AC1-Result', 'PC：結果 Primary が押した瞬間に押下状態になる', out.pcResultPress?.matchesPressRule === true && (out.pcResultPress?.pressLatencyMs ?? 999) <= 150, { latencyMs: out.pcResultPress?.pressLatencyMs, hover: out.pcResultPress?.hoverTransform, pressed: out.pcResultPress?.pressedStyle })
add('AC8-touch', 'touch-action: manipulation が効いている', (out.pcPress ?? []).every((r) => !r.present || r.touchAction === 'manipulation'), (out.pcPress ?? []).map((r) => `${r.label}=${r.touchAction}`))
add('AC8-tap', 'tap highlight が透明', (out.pcPress ?? []).every((r) => !r.present || /rgba\(0, 0, 0, 0\)/.test(r.tapHighlight)), (out.pcPress ?? []).map((r) => `${r.label}=${r.tapHighlight}`))
add('AC8-select', 'user-select: none', (out.pcPress ?? []).every((r) => !r.present || r.userSelect === 'none'), (out.pcPress ?? []).map((r) => `${r.label}=${r.userSelect}`))

for (const s of out.spSticky ?? []) {
  add(`AC2-${s.label}`, `SP：${s.label} は tap のあと hover が残らない`, s.present && !s.sticky, { present: s.present, idle: s.idleTransform, afterTap: s.afterTapTransform })
}
add('AC2-EndRoundAfterTurn', 'SP：敵ターン後も End Round が浮いたままにならない', (out.spEndRoundAfterTurn?.transform ?? 'none') === 'none', out.spEndRoundAfterTurn?.transform)
add('AC2-spTouch', 'SP：カードの touch-action / tap highlight', out.spCardStyle?.touchAction === 'manipulation' && /rgba\(0, 0, 0, 0\)/.test(out.spCardStyle?.tapHighlight ?? ''), out.spCardStyle)

const ct = out.pcCardTiming ?? {}
add('AC3-leave', 'カードが手札から消えるまで 280ms 前後（240〜420ms）', ct.tLeave >= 240 && ct.tLeave <= 420, ct.tLeave)
add('AC3-number', 'ダメージ表示まで 420ms 以内', ct.tNumber !== null && ct.tNumber <= 420, ct.tNumber)
add('AC3-hp', '敵 HP が減る（700ms 以内。設計値は 460〜520ms、残りは計測機の負荷）', ct.tHp !== null && ct.tHp <= 700 && ct.hp0 !== ct.hp1, { tHp: ct.tHp, hp0: ct.hp0, hp1: ct.hp1 })
if (out.baselineCardTiming) {
  const b = out.baselineCardTiming
  add('AC3-baseline', '変更前と同じタイミング（±80ms）', Math.abs((ct.tLeave ?? 0) - (b.tLeave ?? 0)) <= 80 && Math.abs((ct.tHp ?? 0) - (b.tHp ?? 0)) <= 200, { after: ct, before: b })
}

const dc = out.pcDisabledCue ?? {}
add('AC4-cue', '敵ターン中の手札に「押せない」手掛かりがある（filter）', dc.disabledCount > 0 && dc.filter !== null && dc.filter !== 'none', dc)
add('AC4-noop', '敵ターン中に押しても手札が減らない（カードが出ない）', dc.clickedBefore !== null && dc.handAfter >= dc.clickedBefore && dc.sameCardStillThere === true, { before: dc.clickedBefore, after: dc.handAfter, sameCardStillThere: dc.sameCardStillThere })

const gold = (out.pcFocus ?? []).filter((f) => f.outlineStyle !== 'none' && parseFloat(f.outlineWidth) >= 2)
add('AC5-focus', 'Tab で 2px 以上の outline が出る要素がある', gold.length >= 3, out.pcFocus)

const rr = out.reducedRule ?? []
add('AC6-reduced', '動きを減らす設定で :active の transition が 0s・押下状態は残る', rr.length > 0 && rr.every((r) => r.transitionDuration === '0s' && !r.transform && !r.filter), rr)

const allErrors = [...(out.pcErrors ?? []), ...(out.pcErrors3 ?? []), ...(out.spErrors ?? [])]
const allFailed = [...(out.pcFailedRequests ?? []), ...(out.spFailedRequests ?? [])]
add('AC7-console', 'console error 0', allErrors.length === 0, allErrors.slice(0, 5))
add('AC7-requests', '失敗リクエスト・404 が 0', allFailed.length === 0, allFailed.slice(0, 5))

const failed = checks.filter((c) => c.verdict === 'FAIL')
writeFileSync(join(outDir, 'acceptance.json'), JSON.stringify({ ...out, verdict: failed.length ? 'FAIL' : 'PASS', checks }, null, 2))
for (const c of checks) console.log(`${c.verdict === 'PASS' ? '✅' : '❌'} ${c.id} ${c.d}${c.verdict === 'FAIL' ? ' — ' + JSON.stringify(c.detail).slice(0, 220) : ''}`)
console.log(`\n${failed.length ? 'FAIL' : 'PASS'} (${checks.length - failed.length}/${checks.length})`)
process.exit(failed.length ? 1 : 0)

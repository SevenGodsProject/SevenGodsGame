// v1.0.5 RC：Enemy Break SE と敵の揺れ（必殺・敗北を決める最後の被弾）の実測 probe（Playwright headless・QA 用。ゲームコードではない）。
//
//   node scripts/v1_0_5-rc/se-shake-probe.mjs <outJson> <baseUrl> [--baseline <v1.0.4 baseUrl>] [--only pc1508,sp375]
//
// runtime は一切変えない。ページに入る前（addInitScript）に次のフックを入れて、事実だけを記録する。
//   - AudioBufferSourceNode.prototype.start：呼び出し時刻・予約時刻（when − currentTime）・playbackRate・音源 URL
//     （URL は fetch → arrayBuffer → decodeAudioData の結果に紐づける）
//   - Element.prototype.animate：`.battle-main` への WAAPI（揺れ）の keyframes・duration・delay・終了時刻
//   - MutationObserver：敵の体に `cf2-break-half／quarter` が付いた時刻と、そのとき溜め予告（.enemy-avatar-charging）が出ていたか
//   - requestAnimationFrame：`.battle-main` の computed transform（揺れの実際の開始・静止）
//   - 結果画面（.game-over-card）が出た時刻・「ラウンドを終える」を押した時刻
// シナリオ（PC 1508×660／SP 375×667）：
//   S1 崩し：大耀 × 鬼将（seed 固定）を攻撃札優先で倒しに行き、崩し 1 回ごとの SE（enemy_charge @0.7／0.6）の回数と時刻差
//   S2 敗北 ×2：大耀 × 鬼将でカードを出さず「ラウンドを終える」→ R4 断岩で敗北 → 同じ盤面でもう一度 → 再び敗北
//       揺れ（4px／280ms・1,350ms 開始）・静止・結果画面の出現時刻・Stage B の前回比の行・Primary の可視
//   S3 必殺（致命でない）：大耀 × 乱舞の道化でラウンドを終えるだけ → 致命でない必殺の揺れ（3px／240ms・1,300ms 開始）
//   S4 reduced-motion：S2 の 1 戦を prefers-reduced-motion: reduce で → `.battle-main` への animate 0 本・結果画面は出る
//   （--baseline）S2 を v1.0.4 build でも流し、結果画面の出現時刻を両 build 4 回ずつの中央値で比べる
// 判定の分け方：計画値（WAAPI の delay／duration／振幅・SE の rate）と順序（揺れ→結果画面）・静止は PASS／FAIL。
// 実時間（ブラウザが実際に動かした時刻）は headless の描画速度に左右される（この PC では戦闘中 7〜22fps）ため、
// ±30ms を外れても WARN として値と animate()→開始の遅れ・フレーム間隔を記録する（実機確認は Human QA）。
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const [out, base] = args
if (!out || !base) throw new Error('usage: se-shake-probe.mjs <outJson> <baseUrl> [--baseline <url>] [--only pc1508,sp375]')
const baselineUrl = args.includes('--baseline') ? args[args.indexOf('--baseline') + 1] : null
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null
/** --scenarios s1,s3：指定したシナリオだけを流す（部分的な再計測用） */
const scenarios = args.includes('--scenarios') ? args[args.indexOf('--scenarios') + 1].split(',') : ['s1', 's5', 's2', 's3', 's4']
const want = (s) => scenarios.includes(s)
mkdirSync(dirname(out), { recursive: true })
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const VIEWPORTS = [
  { id: 'pc1508', viewport: { width: 1508, height: 660 } },
  { id: 'sp375', viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true },
].filter((v) => !only || only.includes(v.id))

// 期待値（docs/V1_0_5_ENEMY_HEAVY_SHAKE_V1.md §1・docs/V1_0_5_BREAK_SE_V1.md §5）
const EXPECT = {
  special: { px: 3, ms: 240, startMs: 1300 },
  final: { px: 4, ms: 280, startMs: 1350 },
  tolMs: 30,
  breakRate: { half: 0.7, quarter: 0.6 },
  breakSyncMs: 16,
  resultVsBaselineMs: 50,
}

const PROBE_INIT = () => {
  const P = (window.__probe = { sounds: [], anims: [], breaks: [], clicks: [], results: [], samples: [] })
  const abUrl = new WeakMap()
  const bufUrl = new WeakMap()
  const of = window.fetch
  window.fetch = async (...a) => {
    const r = await of(...a)
    const u = String((a[0] && a[0].url) || a[0])
    const oab = r.arrayBuffer.bind(r)
    r.arrayBuffer = async () => {
      const ab = await oab()
      abUrl.set(ab, u)
      return ab
    }
    return r
  }
  const od = BaseAudioContext.prototype.decodeAudioData
  BaseAudioContext.prototype.decodeAudioData = function (ab, ...rest) {
    const u = abUrl.get(ab)
    return od.call(this, ab, ...rest).then((buf) => {
      if (u) bufUrl.set(buf, u)
      return buf
    })
  }
  const os = AudioBufferSourceNode.prototype.start
  AudioBufferSourceNode.prototype.start = function (when, ...rest) {
    const ctx = this.context
    const now = performance.now()
    const ahead = typeof when === 'number' && when > ctx.currentTime ? (when - ctx.currentTime) * 1000 : 0
    const url = (this.buffer && bufUrl.get(this.buffer)) || null
    P.sounds.push({ t: now, playAt: now + ahead, rate: this.playbackRate.value, name: url ? url.split('/').pop().replace(/\.(wav|mp3)$/, '') : null, ctxState: ctx.state })
    return os.call(this, when, ...rest)
  }
  const oa = Element.prototype.animate
  Element.prototype.animate = function (kf, opts) {
    const a = oa.call(this, kf, opts)
    if (this.classList && this.classList.contains('battle-main')) {
      const m = /translate\((-?[\d.]+)px/.exec(JSON.stringify(kf[1] ?? {}))
      const rec = { t: performance.now(), amp: m ? Math.abs(Number(m[1])) : null, duration: opts?.duration ?? null, delay: opts?.delay ?? 0 }
      P.anims.push(rec)
      // startTime はブラウザがこのアニメーションを実際に始めた document timeline の時刻（performance.now と同じ原点）
      a.ready.then(() => (rec.startTime = a.startTime)).catch(() => {})
      a.finished.then(() => (rec.finishedAt = performance.now())).catch(() => (rec.cancelled = true))
    }
    return a
  }
  document.addEventListener('click', (e) => { if (e.target.closest?.('.end-round-button')) P.clicks.push(performance.now()) }, true)
  const seen = new WeakMap()
  const onReady = () => {
    new MutationObserver((list) => {
      const t = performance.now()
      for (const m of list) {
        const el = m.target
        if (!(el instanceof Element)) continue
        const lvl = el.classList.contains('cf2-break-quarter') ? 'quarter' : el.classList.contains('cf2-break-half') ? 'half' : null
        // 体（prefix 'cf2-break'）だけを数える（名札 cf2-break-plate／舞台 cf2-break-stage は同じ崩しの別要素）
        const isBody = lvl && el.classList.contains('cf2-break') && !el.classList.contains('cf2-break-plate') && !el.classList.contains('cf2-break-stage')
        const prev = seen.get(el) ?? null
        if (isBody && prev !== lvl) P.breaks.push({ t, level: lvl, charging: !!document.querySelector('.enemy-avatar-charging') })
        seen.set(el, isBody ? lvl : null)
      }
      if (!P.results.length && document.querySelector('.game-over-card')) P.results.push(t)
    }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true })
    let wasMoving = false
    const tick = () => {
      // フレームの到着時刻（rAF が間引かれていないか＝計測の信頼性を後で確かめるため。直近 4000 本）
      P.frames = P.frames ?? []
      P.frames.push(performance.now())
      if (P.frames.length > 4000) P.frames.shift()
      // 被弾の CSS アニメーション（プレイヤー側パネル）を同じ document timeline 上で記録する＝揺れとの相対時刻を、描画の遅れを打ち消して比べるため
      P.css = P.css ?? []
      P.cssSeen = P.cssSeen ?? new WeakSet()
      for (const an of document.getAnimations()) {
        if (P.cssSeen.has(an) || !an.animationName) continue
        P.cssSeen.add(an)
        const tg = an.effect && an.effect.target
        if (!tg || !tg.closest || !tg.closest('.ally-row')) continue
        const rec = { name: an.animationName, cls: String(tg.className).slice(0, 80), startTime: an.startTime, delay: an.effect.getTiming().delay ?? 0, seenAt: performance.now() }
        P.css.push(rec)
        if (rec.startTime === null) an.ready.then(() => (rec.startTime = an.startTime)).catch(() => {})
      }
      const el = document.querySelector('.battle-main')
      if (el) {
        const tr = getComputedStyle(el).transform
        const moving = tr !== 'none' && tr !== 'matrix(1, 0, 0, 1, 0, 0)'
        if (moving || wasMoving) P.samples.push({ t: performance.now(), tr })
        wasMoving = moving
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady)
  else onReady()
}

async function open(browser, vp, { reduced = false } = {}) {
  const ctx = await browser.newContext({ viewport: vp.viewport, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()))
  await page.addInitScript(PROBE_INIT)
  return { ctx, page, errors }
}
const btn = (page, name) => page.getByRole('button', { name }).first()
async function maybe(page, name) {
  const l = btn(page, name)
  if (await l.isVisible().catch(() => false)) await l.click({ timeout: 3000 }).catch(() => {})
}
async function startBattle(page, base, query, enemyName) {
  await page.goto(base + '/' + query, { waitUntil: 'networkidle' })
  await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
  await maybe(page, 'わかった')
  await btn(page, '神を選ぶ').click({ timeout: 8000 })
  await maybe(page, '新しく始める')
  await btn(page, '大耀').click({ timeout: 8000 })
  await btn(page, 'この構成で始める').click({ timeout: 8000 })
  await page.getByText('挑む敵を選ぼう').first().waitFor({ timeout: 8000 })
  await page.locator('.enemy-select-card', { hasText: enemyName }).first().click()
  await btn(page, 'この構成でバトル開始').click({ timeout: 8000 })
  await waitRoundReady(page)
}
async function waitRoundReady(page) {
  await page.waitForFunction(() => !document.querySelector('[data-testid="boss-entrance"]'), null, { timeout: 15000 }).catch(() => {})
  await page.waitForFunction(() => {
    const b = document.querySelector('.end-round-button')
    return (b && !b.disabled) || !!document.querySelector('.game-over-card, .reward-overlay')
  }, null, { timeout: 25000 })
}
const over = (page) => page.evaluate(() => !!document.querySelector('.game-over-card, .reward-overlay, [data-testid="open-reward"]'))
async function endRound(page) {
  // 押せる状態になるか、決着（勝利の演出中を含む）するまで待つ。決着していれば押さない
  await waitRoundReady(page).catch(() => {})
  await page.waitForTimeout(300)
  if (await over(page)) return
  const enabled = await page.evaluate(() => { const b = document.querySelector('.end-round-button'); return !!b && !b.disabled })
  if (!enabled) return
  await page.locator('.end-round-button').first().click({ timeout: 5000 })
  await page.waitForTimeout(300)
  await waitRoundReady(page)
  await page.waitForTimeout(400)
}
/** 攻撃札（⚔／🌟／💀）を優先して、出せる札を出し切る（実クリック） */
async function playAttacks(page) {
  for (let k = 0; k < 8; k++) {
    if (await over(page)) return
    const idx = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.hand .card-view')].map((c, i) => ({ i, ok: !c.disabled && !c.classList.contains('card-view-disabled'), name: c.querySelector('.card-view-name')?.textContent ?? '' }))
      const ok = cards.filter((c) => c.ok)
      if (!ok.length) return -1
      ok.sort((a, b) => Number(/⚔|🌟|💀/.test(b.name)) - Number(/⚔|🌟|💀/.test(a.name)))
      return ok[0].i
    })
    if (idx < 0) return
    await page.locator('.hand .card-view').nth(idx).click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(900)
  }
}
const probe = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__probe)))
async function resultMeta(page) {
  await page.waitForSelector('.game-over-card', { timeout: 25000 })
  await page.waitForTimeout(2600)
  return page.evaluate(() => {
    const p = document.querySelector('[data-testid="result-primary"]')
    const card = document.querySelector('.game-over-card')
    const r = p?.getBoundingClientRect()
    const c = card?.getBoundingClientRect()
    const sb = document.querySelector('[data-testid="same-board-diff"]')
    return {
      status: document.querySelector('.game-over-status')?.textContent.trim() ?? null,
      defeatFact: !!document.querySelector('[data-testid="defeat-fact"]'),
      primary: p?.textContent.trim() ?? null,
      primaryInView: !!r && !!c && r.top >= Math.max(0, c.top) && r.bottom <= Math.min(innerHeight, c.bottom),
      sameBoard: sb ? { text: sb.textContent.trim(), overflowX: sb.scrollWidth > sb.clientWidth + 1 } : null,
      arenaTransform: document.querySelector('.battle-main') ? getComputedStyle(document.querySelector('.battle-main')).transform : null,
    }
  })
}
/** 揺れ 1 本を「実際に動き始めた時刻・止まった時刻」で評価する（rAF の transform サンプルから） */
function shakeFacts(anim, samples, frames = [], css = []) {
  // 同じ document timeline 上で、揺れが実際に始まる時刻と、その直前に始まった被弾の CSS アニメーション（プレイヤー側）の差
  const arenaEff = typeof anim.startTime === 'number' ? anim.startTime + anim.delay : null
  const hits = arenaEff === null ? [] : css.filter((c) => typeof c.startTime === 'number' && c.startTime + c.delay <= arenaEff + 50 && c.startTime + c.delay >= arenaEff - 1500)
  const hit = hits.sort((p, q) => q.startTime + q.delay - (p.startTime + p.delay))[0] ?? null
  const vsHit = hit ? { name: hit.name, cls: hit.cls, offsetMs: Math.round(arenaEff - (hit.startTime + hit.delay)) } : null
  const from = anim.t + anim.delay - 50
  const to = anim.t + anim.delay + anim.duration + 200
  // 揺れの区間の前後で、フレームが最大で何 ms 空いたか（大きいと rAF の観測と finished の時刻が遅れる＝計測側の限界）
  const win = frames.filter((f) => f >= from - 100 && f <= to + 100)
  const maxFrameGapMs = win.length > 1 ? Math.round(Math.max(...win.slice(1).map((f, i) => f - win[i]))) : null
  // ブラウザが実際にアニメーションを始めた時刻（animate() 呼び出し → startTime の遅れ）
  const pipelineLagMs = typeof anim.startTime === 'number' ? Math.round(anim.startTime - anim.t) : null
  const moving = samples.filter((s) => s.t >= from && s.t <= to && s.tr !== 'none' && s.tr !== 'matrix(1, 0, 0, 1, 0, 0)')
  const restAfter = samples.find((s) => s.t > (moving.at(-1)?.t ?? to) && (s.tr === 'none' || s.tr === 'matrix(1, 0, 0, 1, 0, 0)'))
  return {
    amp: anim.amp,
    plannedStartMs: anim.delay,
    plannedDurMs: anim.duration,
    visibleStartMs: moving.length ? Math.round(moving[0].t - anim.t) : null,
    visibleEndMs: moving.length ? Math.round(moving.at(-1).t - anim.t) : null,
    finishedAfterMs: anim.finishedAt ? Math.round(anim.finishedAt - anim.t) : null,
    restAfterMs: restAfter ? Math.round(restAfter.t - anim.t) : null,
    cancelled: !!anim.cancelled,
    pipelineLagMs,
    effectiveStartMs: pipelineLagMs !== null ? pipelineLagMs + anim.delay : null,
    maxFrameGapMs,
    framesInWindow: win.length,
    vsHit,
  }
}

const checks = []
const check = (id, name, ok, detail) => checks.push({ id, name, ok: !!ok, detail })
const warns = []
const browser = await chromium.launch({ headless: true })
const report = { base, baselineUrl, at: new Date().toISOString(), expect: EXPECT, viewports: {} }

for (const vp of VIEWPORTS) {
  const v = vp.id
  const R = (report.viewports[v] = {})

  // ---- S1 崩しの SE ----
  if (want('s1')) {
    // playbackRate は float32 で返る（0.7 → 0.699999988…）ので ±0.001 で比べる
    const rateIs = (r, w) => Math.abs(r - w) < 0.001
    const isBreakSe = (s) => s.name === 'enemy_charge' && (rateIs(s.rate, EXPECT.breakRate.half) || rateIs(s.rate, EXPECT.breakRate.quarter))
    // half と quarter の両方を観測するまで敵を替えて攻める（一撃で half→撃破に飛ぶと quarter が出ない）
    const BATTLES = [
      ['?enemy=oni&seed=p7spec-result-normal-win', '業斧の鬼将'],
      ['?enemy=ryujin&seed=probe-se-2', '蒼海の龍神'],
      ['?enemy=onryo&seed=probe-se-3', '藍花の怨霊'],
      ['?enemy=juuma&seed=probe-se-4', '双牙の魔獣'],
    ]
    const battles = []
    for (const [query, enemyName] of BATTLES) {
      const { ctx, page, errors } = await open(browser, vp)
      await startBattle(page, base, query, enemyName)
      for (let round = 1; round <= 7 && !(await over(page)); round++) {
        await playAttacks(page)
        if (await over(page)) break
        await endRound(page)
      }
      await page.waitForTimeout(1500)
      const P = await probe(page)
      await ctx.close()
      const brkSe = P.sounds.filter(isBreakSe)
      const expected = P.breaks.filter((b) => !(b.charging && b.level === 'half'))
      const pairs = expected.map((b) => {
        const s = brkSe.find((x) => Math.abs(x.playAt - b.t) <= 200 && rateIs(x.rate, EXPECT.breakRate[b.level]))
        return { level: b.level, charging: b.charging, deltaMs: s ? Math.round(s.playAt - b.t) : null }
      })
      const suppressed = P.breaks.filter((b) => b.charging && b.level === 'half').map((b) => ({ level: b.level, soundsNear: P.sounds.filter((s) => isBreakSe(s) && Math.abs(s.playAt - b.t) <= 200).length }))
      const soundSummary = {}
      for (const s of P.sounds) soundSummary[`${s.name}@${Math.round(s.rate * 100) / 100}`] = (soundSummary[`${s.name}@${Math.round(s.rate * 100) / 100}`] ?? 0) + 1
      battles.push({ enemy: enemyName, breaks: P.breaks.map((b) => b.level + (b.charging ? '(溜め中)' : '')), breakSe: brkSe.length, expected: expected.length, pairs, suppressed, soundSummary, errors })
      const seen = new Set(battles.flatMap((b) => b.breaks.map((x) => x.replace('(溜め中)', ''))))
      if (seen.has('half') && seen.has('quarter') && battles.length >= 2) break
    }
    R.s1 = { battles }
    const allPairs = battles.flatMap((b) => b.pairs)
    const levels = new Set(allPairs.map((p) => p.level))
    check('SE', `${v}/崩しを half・quarter とも観測（${battles.length} 戦）`, levels.has('half') && levels.has('quarter'), battles.map((b) => [b.enemy, b.breaks]))
    check('SE', `${v}/崩しの SE の回数＝鳴らすべき崩しの回数（各戦で一致・余分 0）`, battles.every((b) => b.breakSe === b.expected), battles.map((b) => [b.enemy, b.breakSe, b.expected]))
    check('SE', `${v}/各崩しで帯どおりの rate（half 0.7・quarter 0.6）で鳴る`, allPairs.every((p) => p.deltaMs !== null), allPairs)
    check('SE', `${v}/崩しの表示と SE の予約時刻の差 ≤ ${EXPECT.breakSyncMs}ms`, allPairs.every((p) => p.deltaMs !== null && Math.abs(p.deltaMs) <= EXPECT.breakSyncMs), allPairs.map((p) => p.deltaMs))
    const supp = battles.flatMap((b) => b.suppressed)
    if (supp.length) check('SE', `${v}/溜め予告中の half は鳴らさない（${supp.length} 件）`, supp.every((s) => s.soundsNear === 0), supp)
    else warns.push(`${v}/S1：溜め予告中に half の崩しが起きなかった＝抑止条件は実画面では未観測（単体テスト breakSe.test.ts で固定済み）`)
    check('SE', `${v}/JS error 0（S1）`, battles.every((b) => b.errors.length === 0), battles.map((b) => b.errors))
  }

  // ---- S5 溜め予告中の half（抑止条件）：銀甲の機工師は R2・R4 で溜める。R2 は攻めずに見送り、R4（溜め予告中）に half を越えさせる ----
  if (want('s5')) {
    const rateIs = (r, w) => Math.abs(r - w) < 0.001
    const isBreakSe = (s) => s.name === 'enemy_charge' && (rateIs(s.rate, EXPECT.breakRate.half) || rateIs(s.rate, EXPECT.breakRate.quarter))
    const tries = []
    for (const plan of [{ seed: 'probe-supp-1', skip: [2] }, { seed: 'probe-supp-2', skip: [2] }, { seed: 'probe-supp-3', skip: [2, 3] }]) {
      const { ctx, page, errors } = await open(browser, vp)
      await startBattle(page, base, `?enemy=karakuri&seed=${plan.seed}`, '銀甲の機工師')
      for (let round = 1; round <= 7 && !(await over(page)); round++) {
        if (!plan.skip.includes(round)) await playAttacks(page)
        if (await over(page)) break
        await endRound(page)
      }
      await page.waitForTimeout(1500)
      const P = await probe(page)
      await ctx.close()
      const supp = P.breaks.filter((b) => b.charging && b.level === 'half').map((b) => ({ soundsNear: P.sounds.filter((s) => isBreakSe(s) && Math.abs(s.playAt - b.t) <= 200).length, chargeSoundNear: P.sounds.filter((s) => s.name === 'enemy_charge' && rateIs(s.rate, 1) && Math.abs(s.playAt - b.t) <= 200).length }))
      tries.push({ plan, breaks: P.breaks.map((b) => b.level + (b.charging ? '(溜め中)' : '')), suppressed: supp, breakSe: P.sounds.filter(isBreakSe).length, errors })
      if (supp.length) break
    }
    R.s5 = { tries }
    const supp = tries.flatMap((t) => t.suppressed)
    if (supp.length) check('SE', `${v}/溜め予告中の half は鳴らさない（実画面で ${supp.length} 件観測・その時刻 ±200ms に崩しの SE 0）`, supp.every((s) => s.soundsNear === 0), tries)
    else warns.push(`${v}/S5：3 通り試しても溜め予告中の half を作れなかった（${JSON.stringify(tries.map((t) => t.breaks))}）＝抑止条件は単体テストのみ`)
    check('SE', `${v}/JS error 0（S5）`, tries.every((t) => t.errors.length === 0), tries.map((t) => t.errors))
  }

  // ---- S2 敗北 ×2（揺れ・結果画面・Stage B） ----
  const loseTwice = async (url, label) => {
    const { ctx, page, errors } = await open(browser, vp)
    await startBattle(page, url, '', '業斧の鬼将')
    for (let i = 0; i < 8 && !(await over(page)); i++) await endRound(page).catch(() => {})
    const first = await resultMeta(page)
    let P = await probe(page)
    const res1 = P.results[0] && P.clicks.length ? Math.round(P.results[0] - P.clicks.at(-1)) : null
    const anims1 = P.anims.map((a) => shakeFacts(a, P.samples, P.frames, P.css))
    await page.locator('[data-testid="result-primary"]').first().click({ timeout: 5000 })
    await waitRoundReady(page)
    await page.evaluate(() => { window.__probe.anims = []; window.__probe.samples = []; window.__probe.results = []; window.__probe.clicks = [] })
    for (let i = 0; i < 8 && !(await over(page)); i++) await endRound(page).catch(() => {})
    const second = await resultMeta(page)
    P = await probe(page)
    const res2 = P.results[0] && P.clicks.length ? Math.round(P.results[0] - P.clicks.at(-1)) : null
    const anims2 = P.anims.map((a) => shakeFacts(a, P.samples, P.frames, P.css))
    await page.screenshot({ path: `${dirname(out)}/s2-${label}-${v}-defeat2.png` })
    await ctx.close()
    return { first, second, res1, res2, anims1, anims2, errors }
  }
  if (want('s2')) R.s2 = await loseTwice(base, 'rc')
  if (want('s2')) {
    const s = R.s2
    const f1 = s.anims1
    check('SHAKE', `${v}/敗北 1 回目：揺れは 1 本だけ（R1〜R3 の通常攻撃・溜めでは揺れない）`, f1.length === 1, f1)
    const a = f1[0]
    // 計画値（WAAPI に渡した値）は決定論で、仕様と完全一致を要求する
    check('SHAKE', `${v}/敗北の決着被弾の計画値：${EXPECT.final.px}px／${EXPECT.final.ms}ms／開始 ${EXPECT.final.startMs}ms`, a && a.amp === EXPECT.final.px && a.plannedDurMs === EXPECT.final.ms && a.plannedStartMs === EXPECT.final.startMs, a)
    // 終了後の静止と順序（実時間の遅れがあっても成り立つべき性質）
    check('SHAKE', `${v}/揺れは最後まで再生されて終わり（cancel なし）、終了後は静止（transform なし）`, a && !a.cancelled && a.finishedAfterMs !== null && /none|matrix\(1, 0, 0, 1, 0, 0\)/.test(s.first.arenaTransform ?? ''), { a, arenaAtResult: s.first.arenaTransform })
    check('SHAKE', `${v}/揺れは結果画面が出る前に終わる`, a && s.res1 !== null && a.finishedAfterMs !== null && a.finishedAfterMs < s.res1, { finishedAfterMs: a?.finishedAfterMs, resultMs: s.res1 })
    // 実時間：ブラウザが実際に始めた時刻（startTime＋delay）と終わった時刻。headless の描画が遅い環境では遅れるので、フレーム間隔の範囲内なら WARN 扱い
    if (a) {
      const startErr = a.effectiveStartMs !== null ? a.effectiveStartMs - EXPECT.final.startMs : null
      const durErr = a.finishedAfterMs !== null && a.effectiveStartMs !== null ? a.finishedAfterMs - a.effectiveStartMs - EXPECT.final.ms : null
      R.s2wall = { startErr, durErr, pipelineLagMs: a.pipelineLagMs, maxFrameGapMs: a.maxFrameGapMs, framesInWindow: a.framesInWindow, vsHit: a.vsHit }
      // 描画の遅れを打ち消した相対時刻：揺れは被弾（プレイヤー側の CSS アニメーション）の開始と同時〜150ms 以内に始まる
      if (a.vsHit && a.vsHit.offsetMs >= 0 && a.vsHit.offsetMs <= 150) check('SHAKE', `${v}/揺れは被弾の演出の開始から ${a.vsHit.offsetMs}ms で始まる（同じ timeline 上・0〜150ms）`, true, a.vsHit)
      else warns.push(`${v}/S2 揺れと被弾の相対時刻：${JSON.stringify(a.vsHit)}`)
      if (startErr !== null && Math.abs(startErr) <= EXPECT.tolMs && durErr !== null && Math.abs(durErr) <= EXPECT.tolMs) check('SHAKE', `${v}/実時間：開始・継続とも ±${EXPECT.tolMs}ms`, true, R.s2wall)
      else warns.push(`${v}/S2 揺れの実時間：開始のずれ ${startErr}ms・継続のずれ ${durErr}ms（animate()→開始の遅れ ${a.pipelineLagMs}ms・揺れの区間の最大フレーム間隔 ${a.maxFrameGapMs}ms・区間内フレーム ${a.framesInWindow} 本）＝headless の描画の遅れ。実機で確認`)
    }
    check('UI', `${v}/敗北画面：敗北・事実行・Primary「同じ盤面でもう一度」が初期可視`, s.first.status === '敗北' && s.first.defeatFact && s.first.primary === '同じ盤面でもう一度' && s.first.primaryInView, s.first)
    check('UI', `${v}/2 回目の敗北：Stage B の前回比が出る・横はみ出し 0・Primary 初期可視`, s.second.sameBoard && /^同じ盤面 2 回目：前回 R4で敗北/.test(s.second.sameBoard.text) && !s.second.sameBoard.overflowX && s.second.primaryInView, s.second)
    check('SHAKE', `${v}/2 回目の敗北でも揺れは 1 本・同じ値`, s.anims2.length === 1 && s.anims2[0].amp === EXPECT.final.px, s.anims2)
    check('UI', `${v}/JS error 0（S2）`, s.errors.length === 0, s.errors)
  }
  if (baselineUrl && want('s2')) {
    // 結果画面の出現時刻（最後の「ラウンドを終える」→ .game-over-card）を、両 build で 4 回ずつ測って中央値で比べる（1 回ごとの揺らぎが大きいため）
    R.s2base = await loseTwice(baselineUrl, 'v104')
    const rcB = await loseTwice(base, 'rc-b')
    const baseB = await loseTwice(baselineUrl, 'v104-b')
    const med = (xs) => { const s = xs.filter((x) => x !== null).sort((p, q) => p - q); return s.length ? s[Math.floor((s.length - 1) / 2)] : null }
    const rcT = [R.s2.res1, R.s2.res2, rcB.res1, rcB.res2]
    const baseT = [R.s2base.res1, R.s2base.res2, baseB.res1, baseB.res2]
    const d = med(rcT) !== null && med(baseT) !== null ? med(rcT) - med(baseT) : null
    R.resultTiming = { rc: rcT, v104: baseT, medianRc: med(rcT), medianV104: med(baseT), medianDelta: d }
    if (d !== null && Math.abs(d) <= EXPECT.resultVsBaselineMs) check('UI', `${v}/結果画面の出現時刻の中央値が v1.0.4 と ±${EXPECT.resultVsBaselineMs}ms 以内`, true, R.resultTiming)
    else if (d !== null && Math.abs(d) <= 250) warns.push(`${v}/結果画面の出現時刻の中央値の差 ${d}ms（±${EXPECT.resultVsBaselineMs}ms 超・250ms 以内）＝計測の揺らぎの範囲か要確認：${JSON.stringify(R.resultTiming)}`)
    else check('UI', `${v}/結果画面の出現時刻の中央値が v1.0.4 と ±250ms 以内`, false, R.resultTiming)
    check('SHAKE', `${v}/v1.0.4 の同じ経路では揺れ 0 本（新しい揺れであることの対照）`, R.s2base.anims1.length === 0 && baseB.anims1.length === 0, [R.s2base.anims1, baseB.anims1])
    check('UI', `${v}/v1.0.4 の 2 回目の敗北には前回比の行が無い（Stage B は新規）`, R.s2base.second.sameBoard === null, R.s2base.second.sameBoard)
  }

  // ---- S3 致命でない必殺 ----
  if (want('s3')) {
    const { ctx, page, errors } = await open(browser, vp)
    await startBattle(page, base, '?enemy=doukeshi', '乱舞の道化')
    const log = []
    for (let i = 0; i < 4 && !(await over(page)); i++) {
      await page.evaluate(() => { window.__probe.anims = []; window.__probe.samples = [] })
      await endRound(page).catch(() => {})
      await page.waitForTimeout(800)
      // 揺れが再生し終わる（finished）まで待ってから読む（描画が遅い SP では 800ms では足りないことがある・最大 4s）
      await page.waitForFunction(() => window.__probe.anims.every((a) => a.finishedAt || a.cancelled), null, { timeout: 4000 }).catch(() => {})
      const P = await probe(page)
      log.push({ round: i + 1, over: await over(page), anims: P.anims.map((a) => shakeFacts(a, P.samples, P.frames, P.css)) })
    }
    await ctx.close()
    R.s3 = { log, errors }
    const specialShakes = log.flatMap((l) => (l.over ? [] : l.anims.filter((a) => a.amp === EXPECT.special.px)))
    const a = specialShakes[0]
    if (!a) warns.push(`${v}/S3：致命でない必殺の揺れを観測できず（${JSON.stringify(log.map((l) => [l.round, l.over, l.anims.length]))}）`)
    else {
      check('SHAKE', `${v}/致命でない必殺の計画値：${EXPECT.special.px}px／${EXPECT.special.ms}ms／開始 ${EXPECT.special.startMs}ms`, a.amp === EXPECT.special.px && a.plannedDurMs === EXPECT.special.ms && a.plannedStartMs === EXPECT.special.startMs, a)
      check('SHAKE', `${v}/必殺の揺れは最後まで再生されて終わり、終了後は静止`, !a.cancelled && a.finishedAfterMs !== null && (a.restAfterMs !== null || a.visibleEndMs === null), a)
      const startErr = a.effectiveStartMs !== null ? a.effectiveStartMs - EXPECT.special.startMs : null
      const durErr = a.finishedAfterMs !== null && a.effectiveStartMs !== null ? a.finishedAfterMs - a.effectiveStartMs - EXPECT.special.ms : null
      R.s3wall = { startErr, durErr, pipelineLagMs: a.pipelineLagMs, maxFrameGapMs: a.maxFrameGapMs, framesInWindow: a.framesInWindow, vsHit: a.vsHit }
      if (a.vsHit && a.vsHit.offsetMs >= 0 && a.vsHit.offsetMs <= 150) check('SHAKE', `${v}/必殺の揺れは被弾の演出の開始から ${a.vsHit.offsetMs}ms で始まる（同じ timeline 上・0〜150ms）`, true, a.vsHit)
      else warns.push(`${v}/S3 揺れと被弾の相対時刻：${JSON.stringify(a.vsHit)}`)
      if (startErr !== null && Math.abs(startErr) <= EXPECT.tolMs && durErr !== null && Math.abs(durErr) <= EXPECT.tolMs) check('SHAKE', `${v}/必殺の実時間：開始・継続とも ±${EXPECT.tolMs}ms`, true, R.s3wall)
      else warns.push(`${v}/S3 必殺の揺れの実時間：開始のずれ ${startErr}ms・継続のずれ ${durErr}ms（animate()→開始の遅れ ${a.pipelineLagMs}ms・最大フレーム間隔 ${a.maxFrameGapMs}ms・区間内フレーム ${a.framesInWindow} 本）＝headless の描画の遅れ。実機で確認`)
      const others = log.flatMap((l) => l.anims).filter((x) => x !== a && x.amp !== EXPECT.special.px && x.amp !== EXPECT.final.px)
      check('SHAKE', `${v}/通常攻撃・溜めのラウンドでは揺れない（敵側の揺れ以外の値 0 本）`, others.length === 0, others)
    }
    check('SHAKE', `${v}/JS error 0（S3）`, errors.length === 0, errors)
  }

  // ---- S4 reduced-motion ----
  if (want('s4')) {
    const { ctx, page, errors } = await open(browser, vp, { reduced: true })
    await startBattle(page, base, '', '業斧の鬼将')
    for (let i = 0; i < 8 && !(await over(page)); i++) await endRound(page).catch(() => {})
    const meta = await resultMeta(page)
    const P = await probe(page)
    await ctx.close()
    R.s4 = { anims: P.anims.length, meta, errors }
    check('SHAKE', `${v}/reduced-motion：.battle-main の揺れ 0 本・敗北画面は出る`, P.anims.length === 0 && meta.status === '敗北' && meta.primaryInView, R.s4)
  }
}
await browser.close()
report.checks = checks
report.warns = warns
report.pass = checks.filter((c) => c.ok).length
report.total = checks.length
writeFileSync(out, JSON.stringify(report, null, 2))
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.id}  ${c.name}${c.ok ? '' : '  ' + JSON.stringify(c.detail).slice(0, 400)}`)
for (const w of warns) console.log(`WARN  ${w}`)
console.log(`${report.pass}/${report.total} → ${out}`)
process.exit(report.pass === report.total ? 0 : 1)

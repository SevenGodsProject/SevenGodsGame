// Official Voice Pilot v1／Crisis Pilot v1：大耀の公式ボイスが決めた時刻に 1 回だけ鳴り、ミュート時は鳴らないことを PC／SP で実測する。
//   PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/official-voice-pilot/acceptance.mjs <outJson> [baseUrl] [--only greeting|crisis]
// 計測方法：AudioBufferSourceNode.start を包んで「5 秒より長い buffer の start」をボイスとして数える（SE は全て ≤1.0s）。
// BGM duck は AudioParam.linearRampToValueAtTime の呼び出し（値と時刻）を記録して、ボイス開始の直後に 1 未満へ下がり、
// 終了後に 1 へ戻る予約があることを見る。音は出さない（headless）。
//
// 【greeting 4 ケース】（Pilot v1・不変）PC／SP × ミュート有無。入口の終わりで「あいさつ」（11.783s）が 1 回。
// 【crisis 4 ケース】（Crisis Pilot v1・Gate G-B）PC／SP × ミュート有無。固定 seed（下の CRISIS）で大耀 × 蒼海の龍神を
//   「使える札を左から使う → 無くなったらラウンドを終える」の素朴方策で進め、R4「大海嘯」で HP 30→10（≤ 50%）に落ちた
//   バッチの「最後の着弾（SPECIAL_IMPACT_MS 1,260）＋ 300ms」に「ピンチ」（8.858s）が 1 回だけ鳴ることを見る。
//   着弾時刻は DOM から取る：自分側の浮遊数字（.player-panel .floating-number）の animationstart（animation-delay＝着弾時刻）と、
//   HP ラベル（.player-panel .hp-bar-label-text）の変化（MutationObserver。着弾 ＋ hit stop 40 ＋ HP_LAG 90）。
//   seed・HP 経路は scripts/official-voice-pilot/crisis-seed.mjs（engine 純関数・node 単体）の出力と突き合わせる。
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const out = args[0] && !args[0].startsWith('--') ? args[0] : undefined
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:4173'
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const VIEWPORTS = [
  { id: 'pc', viewport: { width: 1508, height: 660 }, isMobile: false },
  { id: 'sp', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
]

/** 実測尺（Chromium decodeAudioData）。Pilot v1 実測 11.783s／Crisis Pilot v1 §3 の MP3 走査値 8.858s（crisis は ±0.05 で判定） */
const VOICE_SEC = { greeting: 11.783, crisis: 8.858 }

/**
 * Crisis Pilot v1 の固定条件（crisis-seed.mjs 2026-10-22 の出力。UI 既定＝おすすめデッキ・ふつう・guardian・報酬ボーナス無し）。
 *   crisis-003：R1 26 → R2 26 → R3 30 → R4 大海嘯（special 20・ブロック 0）30→10 ＝ 初めて ≤15 → R5 10→7（2 回目は鳴らない）→ R6 撃破
 *   代替：crisis-001（R4 special 29→14・R5 自傷 14→12）／crisis-002（R3 通常攻撃 23→11・着弾 228＋300＝528）
 */
const CRISIS = {
  enemySlug: 'ryujin',
  enemyName: '蒼海の龍神',
  seed: 'crisis-003',
  maxHp: 30,
  threshold: 15,
  crisisRound: 4,
  enemyAct: 'special 大海嘯',
  /** ラウンド終了ごとの HP（engine 値。表示は ×10）。R6 は撃破で終わる */
  hpAfterRound: { 1: 26, 2: 26, 3: 30, 4: 10, 5: 7 },
  /** ピンチのバッチの自分への着弾（engine 値 20 → 表示 "-200"）と commit からの時刻 */
  crisisDamage: 20,
  impactMs: 1260,
  afterImpactMs: 300,
  toleranceMs: 50,
  /** 自分側の着弾の hit stop（tier ≥ 3）＋ HP_LAG_MS。HP ラベルの変化時刻から着弾を逆算する */
  hpLabelLagMs: 40 + 90,
  /** 2 回目が鳴らないことを見る「さらに落ちる」ラウンド */
  laterDropRound: 5,
  /** 7 ラウンド目まで回さない（撃破 R6 の想定。R5 終了＝laterDrop まで見れば十分） */
  stopAfterRound: 5,
}

const HOOK = `() => {
  window.__audio = { starts: [], ramps: [], ctxCreated: 0, t0: performance.now() }
  const OrigCtx = window.AudioContext
  window.AudioContext = class extends OrigCtx { constructor(...a) { super(...a); window.__audio.ctxCreated++ } }
  const start = AudioBufferSourceNode.prototype.start
  AudioBufferSourceNode.prototype.start = function (...a) {
    const d = this.buffer ? this.buffer.duration : 0
    window.__audio.starts.push({ duration: +d.toFixed(3), atMs: Math.round(performance.now() - window.__audio.t0), rate: this.playbackRate.value })
    return start.apply(this, a)
  }
  const ramp = AudioParam.prototype.linearRampToValueAtTime
  AudioParam.prototype.linearRampToValueAtTime = function (v, t) {
    window.__audio.ramps.push({ value: +v.toFixed(3), atMs: Math.round(performance.now() - window.__audio.t0) })
    return ramp.call(this, v, t)
  }
}`

/**
 * crisis 用の計測フック（greeting の HOOK は不変・こちらは別物）。HOOK に加えて
 *  - start に id を振り、stop(when) を記録する（ボイス 2 本が同時に走っていないかを区間で見る）
 *  - ramp に予約時刻 t と AudioContext.currentTime を残す（duck の合流＝復帰 1.0 の予約時刻より前に再 duck）
 *  - 自分側の浮遊数字の animationstart と、HP ラベルの変化を時刻つきで記録する（着弾時刻の DOM 標本）
 */
const CRISIS_HOOK = `() => {
  const A = { starts: [], stops: [], ramps: [], ctxCreated: 0, ctxs: [], playerFloats: [], hpLabel: [], t0: performance.now() }
  window.__audio = A
  const now = () => Math.round(performance.now() - A.t0)
  const ctxNow = () => (A.ctxs.length ? +Math.max(...A.ctxs.map((c) => c.currentTime)).toFixed(3) : null)
  const OrigCtx = window.AudioContext
  window.AudioContext = class extends OrigCtx { constructor(...a) { super(...a); A.ctxCreated++; A.ctxs.push(this) } }
  let nextId = 0
  const start = AudioBufferSourceNode.prototype.start
  AudioBufferSourceNode.prototype.start = function (...a) {
    const d = this.buffer ? this.buffer.duration : 0
    this.__id = nextId++
    A.starts.push({ id: this.__id, duration: +d.toFixed(3), atMs: now(), ctxNow: ctxNow(), rate: this.playbackRate.value })
    return start.apply(this, a)
  }
  const stop = AudioBufferSourceNode.prototype.stop
  AudioBufferSourceNode.prototype.stop = function (when) {
    if (this.buffer && this.buffer.duration > 5) {
      const cn = ctxNow()
      const delayMs = typeof when === 'number' && cn !== null ? Math.max(0, Math.round((when - cn) * 1000)) : 0
      A.stops.push({ id: this.__id, atMs: now(), effectiveMs: now() + delayMs })
    }
    return stop.apply(this, arguments)
  }
  const ramp = AudioParam.prototype.linearRampToValueAtTime
  AudioParam.prototype.linearRampToValueAtTime = function (v, t) {
    A.ramps.push({ value: +v.toFixed(3), t: +t.toFixed(3), ctxNow: ctxNow(), atMs: now() })
    return ramp.call(this, v, t)
  }
  document.addEventListener('animationstart', (e) => {
    const el = e.target
    if (!(el instanceof Element) || !el.classList.contains('floating-number') || !el.closest('.player-panel')) return
    A.playerFloats.push({ atMs: now(), text: el.textContent, cls: el.className })
  }, true)
  const observeHp = () => {
    const el = document.querySelector('.player-panel .hp-bar-label-text')
    if (!el || el.__observed) return
    el.__observed = true
    A.hpLabel.push({ atMs: now(), text: el.textContent })
    new MutationObserver(() => A.hpLabel.push({ atMs: now(), text: el.textContent })).observe(el, { childList: true, characterData: true, subtree: true })
  }
  new MutationObserver(observeHp).observe(document.documentElement, { childList: true, subtree: true })
}`

async function clickText(page, text, timeout = 6000) {
  const l = page.getByRole('button', { name: text }).first()
  await l.click({ timeout })
}
async function maybeClick(page, text) {
  const l = page.getByRole('button', { name: text }).first()
  if (await l.isVisible().catch(() => false)) await l.click({ timeout: 3000 }).catch(() => {})
}

async function startBattle(page, enemyName = '業斧の鬼将') {
  await maybeClick(page, 'わかった')
  await clickText(page, '神を選ぶ')
  await maybeClick(page, '新しく始める')
  await clickText(page, '大耀')
  await clickText(page, 'この構成で始める')
  await clickText(page, enemyName)
  await clickText(page, 'この構成でバトル開始')
}

async function newCase(browser, vp, hook) {
  const context = await browser.newContext({ viewport: vp.viewport, isMobile: vp.isMobile, hasTouch: !!vp.hasTouch, reducedMotion: 'no-preference' })
  const page = await context.newPage()
  const errors = []
  const voiceRequests = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('request', (r) => { if (r.url().includes('/assets/voice/')) voiceRequests.push({ url: r.url().replace(base, ''), atMs: Date.now() }) })
  await page.addInitScript({ content: `(${hook})()` })
  return { context, page, errors, voiceRequests }
}

// ---------------------------------------------------------------- greeting（Pilot v1・不変）
async function runGreetingCase(browser, vp, muted) {
  const { context, page, errors, voiceRequests } = await newCase(browser, vp, HOOK)
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
  await page.goto(base, { waitUntil: 'networkidle' })
  await maybeClick(page, 'わかった')
  if (muted) await page.getByRole('button', { name: 'ミュート' }).first().click()
  const tStart = Date.now()
  await startBattle(page)
  // 入口 Full 2,800ms（セッション最初の 1 戦）の終わりでボイスが始まる。始まるまで最大 9 秒待ち、さらに 1 秒見て 2 本目が無いことを確認
  await page.waitForFunction(() => window.__audio.starts.some((s) => s.duration > 5), null, { timeout: 9000 }).catch(() => {})
  await page.waitForTimeout(1000)
  const audio = await page.evaluate(() => window.__audio)
  const voiceStarts = audio.starts.filter((s) => s.duration > 5)
  const seStarts = audio.starts.filter((s) => s.duration <= 5)
  const firstVoice = voiceStarts[0]
  const rampsAfterVoice = firstVoice ? audio.ramps.filter((r) => r.atMs >= firstVoice.atMs - 50) : []
  const duckDown = rampsAfterVoice.find((r) => r.value < 1)
  const duckUp = rampsAfterVoice.find((r) => r.value === 1)
  const inBattle = await page.getByRole('button', { name: 'ラウンドを終える' }).first().isVisible().catch(() => false)
  // 連続再生防止：もう一度「あいさつ」を鳴らす経路は無い（入口は新規開始でのみ）。ここでは 4.5 秒以内に 2 本目が無いことを見る
  const result = {
    suite: 'greeting',
    viewport: vp.id,
    muted,
    inBattle,
    voiceRequests: voiceRequests.map((r) => ({ url: r.url, afterStartMs: r.atMs - tStart })),
    voiceStarts,
    seStartsCount: seStarts.length,
    duck: firstVoice ? { down: duckDown ?? null, up: duckUp ?? null } : null,
    errors,
    pass: muted
      ? voiceStarts.length === 0 && voiceRequests.length === 0 && errors.length === 0 && inBattle
      : voiceStarts.length === 1 && Math.abs(voiceStarts[0].duration - VOICE_SEC.greeting) < 0.1 && voiceRequests.length === 1 && !!duckDown && !!duckUp && errors.length === 0 && inBattle,
  }
  await context.close()
  return result
}

// ---------------------------------------------------------------- crisis（Crisis Pilot v1・Gate G-B）
const END_ROUND = 'ラウンドを終える'

/** 操作できる（isPlayerTurn：入口・カード演出・カットイン・敵のターンが終わった）まで待つ */
async function waitPlayerTurn(page, timeout = 12000) {
  await page.waitForFunction(() => {
    const b = document.querySelector('.end-round-button')
    return !!b && !b.disabled
  }, null, { timeout })
}

/** 「使える札を左から使う」：押せるカードが無くなるまで、常に左端の押せるカードを押す（crisis-seed.mjs と同じ方策） */
async function playAffordableCards(page) {
  const played = []
  for (let i = 0; i < 12; i++) {
    await waitPlayerTurn(page)
    const card = page.locator('.hand .card-view:not([disabled])').first()
    if ((await card.count()) === 0) break
    const name = ((await card.innerText().catch(() => '')) || '').split('\n').find((s) => s.trim()) ?? ''
    await card.click({ timeout: 4000 }).catch(() => card.click({ force: true, timeout: 4000 }))
    played.push(name.trim())
    // CARD_PLAY_REVEAL_MS 280 の後に commit。手札が入れ替わるまで待つ
    await page.waitForFunction(() => !document.querySelector('.hand .card-view-playing'), null, { timeout: 6000 }).catch(() => {})
  }
  return played
}

async function readRound(page) {
  return page.evaluate(() => {
    const m = (document.querySelector('.battle-topbar')?.textContent ?? '').match(/ラウンド\s*(\d+)\s*\/\s*(\d+)/)
    return m ? Number(m[1]) : null
  })
}
async function readHpLabel(page) {
  return page.evaluate(() => document.querySelector('.player-panel .hp-bar-label-text')?.textContent?.trim() ?? null)
}
async function isGameOver(page) {
  return page.evaluate(() => !!document.querySelector('.game-over-overlay'))
}
/** 5 秒超のボイス（＝あいさつ）が鳴り終わるまで待つ（ピンチをあいさつに重ねない：Human play の間合いと同じ） */
async function waitVoiceSilent(page, timeout = 20000) {
  await page.waitForFunction(() => {
    const A = window.__audio
    const now = performance.now() - A.t0
    return A.starts.filter((s) => s.duration > 5).every((s) => {
      const st = A.stops.find((x) => x.id === s.id)
      const end = st ? Math.min(st.effectiveMs, s.atMs + s.duration * 1000) : s.atMs + s.duration * 1000
      return end + 150 <= now
    })
  }, null, { timeout }).catch(() => {})
}

async function runCrisisCase(browser, vp, muted) {
  const { context, page, errors, voiceRequests } = await newCase(browser, vp, CRISIS_HOOK)
  const url = `${base}/?enemy=${CRISIS.enemySlug}&seed=${CRISIS.seed}`
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
  await page.goto(url, { waitUntil: 'networkidle' })
  await maybeClick(page, 'わかった')
  if (muted) await page.getByRole('button', { name: 'ミュート' }).first().click()
  const tStart = Date.now()
  await startBattle(page, CRISIS.enemyName)
  await page.getByRole('button', { name: END_ROUND }).first().waitFor({ state: 'visible', timeout: 8000 })
  const enemyOk = await page.evaluate((name) => [...document.querySelectorAll('.panel-title')].some((el) => el.textContent?.trim() === name), CRISIS.enemyName)
  // 入口 Full（2,800ms）の終わりで「あいさつ」。鳴り始めを最大 9 秒待つ（ミュート時は入口の分だけ待つ）
  if (!muted) await page.waitForFunction(() => window.__audio.starts.some((s) => s.duration > 5), null, { timeout: 9000 }).catch(() => {})
  else await page.waitForTimeout(3500)

  const rounds = []
  let gameOver = false
  for (let guard = 0; guard < 8 && !gameOver; guard++) {
    await waitPlayerTurn(page)
    const round = await readRound(page)
    if (round === null) break
    const played = await playAffordableCards(page)
    await waitPlayerTurn(page)
    // ピンチのラウンドは、あいさつが鳴り終わってからラウンドを終える（二重再生の有無は別途 stops から判定する）
    if (round === CRISIS.crisisRound && !muted) await waitVoiceSilent(page)
    const endClickMs = await page.evaluate(() => Math.round(performance.now() - window.__audio.t0))
    await page.getByRole('button', { name: END_ROUND }).first().click({ timeout: 4000 })
    // 敵のターン（700ms）→ 着弾（通常 228／必殺 1,260）→ 表示 HP 追従（+130〜+600）→ 次ラウンド
    await page.waitForFunction((r) => {
      const t = document.querySelector('.battle-topbar')?.textContent ?? ''
      const m = t.match(/ラウンド\s*(\d+)/)
      return (m && Number(m[1]) > r) || !!document.querySelector('.game-over-overlay')
    }, round, { timeout: 12000 }).catch(() => {})
    await page.waitForTimeout(round === CRISIS.crisisRound ? 2600 : 1400)
    gameOver = await isGameOver(page)
    const hpLabel = await readHpLabel(page)
    const expected = CRISIS.hpAfterRound[round]
    rounds.push({ round, played, endClickMs, hpLabel, expectedHp: expected ?? null, hpMatch: expected == null ? null : hpLabel?.startsWith(`${expected * 10} /`) ?? false, gameOver })
    if (round >= CRISIS.stopAfterRound) break
  }
  // ピンチの声（8.9s）が鳴り終わる前でも 2 本目の有無は判定できる。最後に 1.5 秒見る
  await page.waitForTimeout(1500)

  const audio = await page.evaluate(() => {
    const A = window.__audio
    return { starts: A.starts, stops: A.stops, ramps: A.ramps, ctxCreated: A.ctxCreated, playerFloats: A.playerFloats, hpLabel: A.hpLabel }
  })
  const isScene = (s, scene) => Math.abs(s.duration - VOICE_SEC[scene]) < 0.05
  const voiceStarts = audio.starts.filter((s) => s.duration > 5)
  const greetingStarts = voiceStarts.filter((s) => isScene(s, 'greeting'))
  const crisisStarts = voiceStarts.filter((s) => isScene(s, 'crisis'))
  const crisisRequests = voiceRequests.filter((r) => r.url.includes('taiyo/crisis.mp3'))
  const crisis = crisisStarts[0] ?? null

  // (b) 着弾時刻：ピンチの声の直前 2.5 秒以内に始まった自分側の浮遊数字のうち、ピンチのダメージ（"-200"）のもの（無ければ最後のもの）
  const damageText = `-${(CRISIS.crisisDamage * 10).toLocaleString('en-US')}`
  const floatsBefore = crisis ? audio.playerFloats.filter((f) => f.atMs <= crisis.atMs + 20 && f.atMs >= crisis.atMs - 2500) : []
  const impactFloat = floatsBefore.filter((f) => f.text === damageText).at(-1) ?? floatsBefore.at(-1) ?? null
  const hpChange = crisis ? audio.hpLabel.filter((h) => h.atMs >= crisis.atMs - 2500 && h.atMs <= crisis.atMs + 400 && h.text.startsWith(`${CRISIS.hpAfterRound[CRISIS.crisisRound] * 10} /`))[0] ?? null : null
  const deltaFloat = crisis && impactFloat ? crisis.atMs - impactFloat.atMs : null
  const deltaHp = crisis && hpChange ? crisis.atMs - (hpChange.atMs - CRISIS.hpLabelLagMs) : null
  const expectedDelta = CRISIS.afterImpactMs
  const timingOk = deltaFloat !== null && Math.abs(deltaFloat - expectedDelta) <= CRISIS.toleranceMs

  // (c) duck：ピンチ開始の直後に 1 未満へ → その後 1 へ。合流＝再 duck の呼び出し時刻（ctxNow）が、直前に予約済みの「復帰 1.0」の時刻 t より前
  const rampsAt = crisis ? audio.ramps.filter((r) => r.atMs >= crisis.atMs - 50) : []
  const duckDown = rampsAt.find((r) => r.value < 1 && r.atMs <= (crisis?.atMs ?? 0) + 200) ?? null
  const duckUp = duckDown ? rampsAt.find((r) => r.value === 1 && r.atMs >= duckDown.atMs) ?? null : null
  const prevUp = crisis ? audio.ramps.filter((r) => r.value === 1 && r.atMs < crisis.atMs - 50).at(-1) ?? null : null
  const merged = !!(duckDown && prevUp && duckDown.ctxNow !== null && duckDown.ctxNow < prevUp.t)
  const duckOk = !!duckDown && !!duckUp && merged

  // (d) 二重再生なし：5 秒超の source の区間 [start, min(start+duration, stop)] が重ならない
  const intervals = voiceStarts.map((s) => {
    const st = audio.stops.find((x) => x.id === s.id)
    const natural = s.atMs + s.duration * 1000
    return { id: s.id, scene: isScene(s, 'greeting') ? 'greeting' : isScene(s, 'crisis') ? 'crisis' : 'unknown', from: s.atMs, to: st ? Math.min(st.effectiveMs, natural) : natural }
  })
  let overlapMs = 0
  for (let i = 0; i < intervals.length; i++)
    for (let j = i + 1; j < intervals.length; j++)
      overlapMs = Math.max(overlapMs, Math.min(intervals[i].to, intervals[j].to) - Math.max(intervals[i].from, intervals[j].from))
  const noOverlap = overlapMs <= 0

  // (e) 1 戦 1 回：laterDrop のラウンドまで進み、HP 経路が予測どおり（さらに落ちた）で crisis が 1 本のまま
  const laterRow = rounds.find((r) => r.round === CRISIS.laterDropRound)
  const hpPathOk = rounds.filter((r) => r.expectedHp !== null).every((r) => r.hpMatch === true)
  const reachedLater = !!laterRow && laterRow.hpMatch === true

  const inBattle = rounds.length > 0
  const common = errors.length === 0 && inBattle && enemyOk && hpPathOk && reachedLater
  const pass = muted
    ? common && voiceStarts.length === 0 && crisisRequests.length === 0 && voiceRequests.length === 0
    : common && crisisStarts.length === 1 && greetingStarts.length === 1 && voiceStarts.length === 2 && crisisRequests.length === 1 && timingOk && duckOk && noOverlap

  const result = {
    suite: 'crisis',
    viewport: vp.id,
    muted,
    url: url.replace(base, ''),
    seed: CRISIS.seed,
    enemyOk,
    inBattle,
    rounds,
    voiceRequests: voiceRequests.map((r) => ({ url: r.url, afterStartMs: r.atMs - tStart })),
    crisisRequestCount: crisisRequests.length,
    voiceStarts,
    seStartsCount: audio.starts.filter((s) => s.duration <= 5).length,
    measured: {
      crisisDurationSec: crisis ? crisis.duration : null,
      greetingDurationSec: greetingStarts[0]?.duration ?? null,
      expectedCrisisDurationSec: VOICE_SEC.crisis,
    },
    timing: {
      expectedAfterImpactMs: expectedDelta,
      toleranceMs: CRISIS.toleranceMs,
      impactFloat,
      hpLabelChange: hpChange,
      voiceStartMs: crisis?.atMs ?? null,
      deltaFromFloatMs: deltaFloat,
      deltaFromHpLabelMs: deltaHp,
      ok: timingOk,
    },
    duck: { down: duckDown, up: duckUp, prevUp, merged, ok: duckOk },
    voiceIntervals: intervals,
    overlapMs,
    noOverlap,
    onePerBattle: { laterDropRound: CRISIS.laterDropRound, reachedLater, crisisStartCount: crisisStarts.length },
    hpPathOk,
    playerFloats: audio.playerFloats,
    hpLabelLog: audio.hpLabel,
    ramps: audio.ramps,
    errors,
    pass,
  }
  await context.close()
  return result
}

// ---------------------------------------------------------------- main
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
const results = []
if (!only || only === 'greeting') for (const vp of VIEWPORTS) for (const muted of [false, true]) results.push(await runGreetingCase(browser, vp, muted))
if (!only || only === 'crisis') for (const vp of VIEWPORTS) for (const muted of [false, true]) results.push(await runCrisisCase(browser, vp, muted))
await browser.close()
const summary = {
  base,
  at: new Date().toISOString(),
  allPass: results.every((r) => r.pass),
  crisisMeasuredDurationSec: results.find((r) => r.suite === 'crisis' && r.measured?.crisisDurationSec)?.measured.crisisDurationSec ?? null,
  results,
}
if (out) writeFileSync(out, JSON.stringify(summary, null, 2))
// 画面には要約だけ（浮遊数字・HP ラベル・ramp の全記録は json に残す）
console.log(JSON.stringify({ ...summary, results: summary.results.map((r) => ({ ...r, playerFloats: undefined, hpLabelLog: undefined, ramps: undefined })) }, null, 2))
process.exit(summary.allPass ? 0 : 1)

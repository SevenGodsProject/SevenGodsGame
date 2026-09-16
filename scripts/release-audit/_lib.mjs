// Clean Release Audit 共通ヘルパー（監査用。ゲームコードではない）。
import { pathToFileURL } from 'node:url'

export async function loadChromium() {
  const pwPath = process.env.PLAYWRIGHT_MODULE
  const mod = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')
  return mod.chromium
}

export const VIEWPORTS = {
  pc1366: { viewport: { width: 1366, height: 768 }, isMobile: false },
  pc1508: { viewport: { width: 1508, height: 660 }, isMobile: false },
  sp760: { viewport: { width: 390, height: 760 }, isMobile: true },
  sp844: { viewport: { width: 390, height: 844 }, isMobile: true },
}

/** ボタンをテキストで探して押す（要素が無ければ false） */
export function clickText(page, text) {
  return page.evaluate((t) => {
    const el = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(t) && !x.disabled)
    if (!el) return false
    el.click()
    return true
  }, text)
}

/**
 * Home の「続きから」ボタンの文言（無ければ null）。
 * Phase 7 P1（決定187）でボタンが .home-cta-secondary → 最上位の .home-cta-primary に移ったため、
 * クラスではなく文言で探す（リリース前後どちらのビルドにも同じスクリプトで使える）。
 */
export function resumeLabel(page) {
  return page.evaluate(() => {
    const el = [...document.querySelectorAll('.home-screen button')].find((b) => b.textContent.trim().startsWith('続きから'))
    return el ? el.textContent.trim() : null
  })
}

/** Home の「続きから」を押す（無ければ false） */
export function clickResume(page) {
  return page.evaluate(() => {
    const el = [...document.querySelectorAll('.home-screen button')].find((b) => b.textContent.trim().startsWith('続きから'))
    if (!el) return false
    el.click()
    return true
  })
}

/**
 * Home から神域挑戦画面を開く。P1 以前は「今日の神域挑戦 ★★★★★」ボタン、
 * P1 以後は Today パネルの挑戦ボタン（data-testid="home-today-cta"）。
 */
export async function openDailyFromHome(page) {
  if (await clickText(page, '今日の神域挑戦')) return true
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="home-today-cta"]')
    if (!el) return false
    el.click()
    return true
  })
}

/** ネットワーク・エラー監視を付ける（同一オリジン以外／api／ranking を全部数える） */
export function watch(page, base) {
  const rec = { requests: [], external: [], api: [], failed: [], errors: [] }
  const origin = new URL(base).origin
  page.on('request', (r) => {
    const u = r.url()
    rec.requests.push(u)
    if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) rec.external.push(u)
    if (/\/api\/|ranking|leaderboard|neon|submit/i.test(u.replace(origin, ''))) rec.api.push(u)
  })
  page.on('requestfailed', (r) => rec.failed.push(r.url()))
  page.on('response', (r) => r.status() >= 400 && rec.failed.push(r.status() + ' ' + r.url()))
  page.on('pageerror', (e) => rec.errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && rec.errors.push('console: ' + m.text()))
  return rec
}

export async function gotoHome(page, base, query = '') {
  await page.goto(base + '/' + query, { waitUntil: 'load' })
  await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
  await page.waitForTimeout(600)
  await clickText(page, 'わかった')
  await page.waitForTimeout(300)
}

// ページ内で評価する関数のソース。template literal なので正規表現のバックスラッシュは二重にする。
/** 戦闘画面の実測（scroll・overflow・敵/意図/手札/End Round の可視性） */
export const BATTLE_METRICS = `() => {
  const q = (s) => document.querySelector(s)
  const vis = (el) => {
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height), inView: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && r.width > 0 && r.height > 0 }
  }
  const doc = document.documentElement
  const topbar = q('.battle-topbar')?.textContent ?? document.body.textContent
  return {
    scrollY: Math.round(scrollY),
    overflowX: Math.max(0, doc.scrollWidth - innerWidth),
    overflowY: Math.max(0, doc.scrollHeight - innerHeight),
    enemy: vis(q('.enemy-stage') ?? q('.enemy-plate')),
    intent: vis(q('.intent')),
    intentText: q('.intent')?.textContent.trim() ?? '',
    hp: vis(q('.hp-bar-fill')),
    hpGhost: !!q('.hp-bar-ghost'),
    handCards: document.querySelectorAll('.hand .card-view').length,
    handEnabled: [...document.querySelectorAll('.hand .card-view')].filter((c) => !c.disabled).length,
    hand: vis(q('.hand')),
    endRound: vis(q('.end-round-button')),
    endRoundEnabled: !!q('.end-round-button') && !q('.end-round-button').disabled,
    dailyTag: !!q('.battle-daily-tag'),
    round: (topbar.match(/ラウンド\\s*(\\d)/) ?? [])[1] ?? null,
  }
}`

export const RESULT_METRICS = `() => {
  const q = (s) => document.querySelector(s)
  const txt = (s) => q(s)?.textContent.trim() ?? ''
  return {
    gameOver: !!q('.game-over-overlay'),
    reward: !!q('.reward-overlay'),
    status: txt('.game-over-status'),
    score: txt('.game-over-score'),
    recap: [...document.querySelectorAll('[data-testid="battle-recap"] li')].map((e) => e.textContent.trim()),
    defeatCause: txt('.game-over-defeat-cause'),
    daily: txt('.game-over-daily'),
    buttons: [...document.querySelectorAll('.game-over-overlay button, .reward-overlay button')].map((b) => b.textContent.trim()),
    hasRankingUi: !!q('.game-over-daily-rank, .daily-ranking, .daily-ranking-panel, [class*="ranking"]'),
    rankingText: /ランキング|順位|leaderboard/i.test(q('.game-over-overlay')?.textContent ?? ''),
  }
}`

/**
 * 決着まで自動プレイ。opts.noCards=true なら End Round だけ押す（敗北誘導）。
 * 途中で見えた演出（神の一撃 cut-in／6-C callout／最終打／HP ghost）を数える。
 * ヘッドレスは描画要求が無いと CSS animation が進まず cut-in の animationend が来ないため、
 * cut-in を見たらスクリーンショットでフレームを流して先へ進める（見張るだけで手は止めない）。
 */
export async function playToEnd(page, opts = {}) {
  const seen = { godStrike: 0, callout: [], finalBlow: false, hpGhost: false, rounds: 0, cardsPlayed: 0 }
  const t0 = Date.now()
  const limit = opts.timeoutMs ?? 150000
  let strikeVisible = false
  const pump = async (n) => { for (let i = 0; i < n; i++) { await page.screenshot({ path: opts.pumpPath ?? 'release-audit-pump.png' }).catch(() => {}); await page.waitForTimeout(120) } }
  while (Date.now() - t0 < limit) {
    const s = await page.evaluate(() => ({
      over: !!document.querySelector('.game-over-overlay, .reward-overlay'),
      strike: !!document.querySelector('.resonance-cutin, .god-burst-strike'),
      callout: document.querySelector('.battle-callout-label')?.textContent.trim() ?? null,
      blow: !!document.querySelector('.enemy-defeat'),
      ghost: !!document.querySelector('.hp-bar-ghost'),
    }))
    if (s.ghost) seen.hpGhost = true
    if (s.blow) seen.finalBlow = true
    if (s.callout && seen.callout[seen.callout.length - 1] !== s.callout) seen.callout.push(s.callout)
    if (s.over) break
    if (s.strike && !strikeVisible) { seen.godStrike++; strikeVisible = true; if (opts.onStrike) await opts.onStrike(); await pump(12); continue }
    if (!s.strike) strikeVisible = false
    if (!opts.noCards) {
      const played = await page.evaluate(() => {
        const c = [...document.querySelectorAll('.hand .card-view')].filter((c) => !c.disabled)
        if (!c.length) return false
        c[0].click()
        return true
      })
      if (played) { seen.cardsPlayed++; await page.waitForTimeout(opts.playWaitMs ?? 900); await pump(2); continue }
    }
    const ended = await page.evaluate(() => { const e = document.querySelector('.end-round-button'); if (e && !e.disabled) { e.click(); return true } return false })
    if (ended) seen.rounds++
    await page.waitForTimeout(ended ? 3000 : 300)
    await pump(ended ? 4 : 1)
  }
  await page.waitForFunction(() => !!document.querySelector('.game-over-overlay, .reward-overlay'), null, { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(500)
  seen.timedOut = Date.now() - t0 >= limit
  return seen
}

export function dumpStorage(page) {
  return page.evaluate(() => {
    const out = {}
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); out[k] = localStorage.getItem(k) }
    return out
  })
}

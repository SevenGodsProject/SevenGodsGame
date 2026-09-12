// Phase 6-D Visual Patch v1：神の一撃カットインの撮影＆検査（QA用。ゲームコードではない）。
//   PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/phase6d-visual-audit/godstrike.mjs <outDir> [baseUrl] [--tag before|after]
//
// 7神それぞれで共鳴を貯めて神の一撃を出し、PC（1508×660）と Mobile（390×760）で撮る。
// さらに PC 1366×768（CEO 環境の確認用）を2神、reduced-motion を1神。
//
// ■ ヘッドレスでカットインを撮るための注意（Phase 6-C で判明した挙動の応用）
// ヘッドレス Chromium は描画要求が無いと CSS animation の timeline が進まないため、
// 素直に撮ると opacity 0 のまま写る。さらにカットインは 900ms（+安全弁400ms）で
// 必ずアンマウントされるので、検出してから撮りに行くと間に合わないことがある。
// そこで **MutationObserver の中で同期的に** カットイン配下の animation を
// 「完成形の時刻」へ送って pause する（currentTime を明示するので、フレームが
// 流れていなくてもスタイルは確定する）。ルートの timer も止めるため onComplete は
// JS 側の安全弁（RESONANCE_CUTIN_MS+400ms）経由になるが、撮影後に play() で戻す。
// ＝この停止は撮影用の計測アーティファクトで、製品の挙動ではない。
// タイムラインの実測は凍結を一切しない scripts/phase6-audit/timeline.mjs が担当する。
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const outDir = args[0] ?? 'p6d-godstrike'
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:5173'
const tag = args.includes('--tag') ? args[args.indexOf('--tag') + 1] : 'after'
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')
mkdirSync(outDir, { recursive: true })

const PC = { width: 1508, height: 660 }
const PC1366 = { width: 1366, height: 768 }
const SP = { width: 390, height: 760 }
/** 7神。共鳴を貯めきる前に決着しないよう、HPの高い敵を第1候補にする */
const GODS = [
  { id: 'ebisu', god: '恵比寿', enemies: [['試練の影', 'trial'], ['銀甲の機工師', 'karakuri']] },
  { id: 'taiyo', god: '大耀', enemies: [['業斧の鬼将', 'oni'], ['藍花の怨霊', 'onryo']] },
  { id: 'sobi', god: '蒼毘', enemies: [['双牙の魔獣', 'juuma'], ['銀甲の機工師', 'karakuri']] },
  { id: 'saika', god: '才華', enemies: [['藍花の怨霊', 'onryo'], ['蒼海の龍神', 'ryujin']] },
  { id: 'juraku', god: '寿楽', enemies: [['乱舞の道化', 'doukeshi'], ['蒼海の龍神', 'ryujin']] },
  { id: 'fukuei', god: '福永', enemies: [['銀甲の機工師', 'karakuri'], ['藍花の怨霊', 'onryo']] },
  // 笑蓮は支援型で火力が低く、強敵だと共鳴7/7の前に力尽きる。最も被害の小さい
  // 試練の影を第1候補にして、生き残りながら共鳴を貯めきる
  { id: 'shouren', god: '笑蓮', enemies: [['試練の影', 'trial'], ['蒼海の龍神', 'ryujin']] },
]
/** `--only ebisu,taiyo` で撮り直す神を絞れる（失敗分の埋め合わせ用） */
const only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1].split(',')) : null
const RUNS_ALL = [
  ...GODS.map((g) => ({ ...g, vp: 'pc', viewport: PC, mobile: false, reduced: false })),
  ...GODS.map((g) => ({ ...g, vp: 'sp', viewport: SP, mobile: true, reduced: false })),
  // CEO 環境相当（1366×768）は代表2神。笑蓮だけ keyvisual が 1:1 で他6神と構図が違う
  ...GODS.filter((g) => g.id === 'taiyo' || g.id === 'shouren').map((g) => ({ ...g, vp: 'pc1366', viewport: PC1366, mobile: false, reduced: false })),
  ...GODS.filter((g) => g.id === 'sobi').map((g) => ({ ...g, vp: 'pc', viewport: PC, mobile: false, reduced: true })),
]
const RUNS = only ? RUNS_ALL.filter((r) => only.has(r.id)) : RUNS_ALL

/** バトル開始前に仕込む。カットインが出た瞬間に同期で「完成形」に固定する */
const ARM = (measureSrc) => `() => {
  const measure = ${measureSrc}
  window.__gs = { at: null, frozen: [], m: null }
  const freeze = () => {
    for (const a of document.getAnimations()) {
      const name = a.animationName
      if (!name || !name.startsWith('resonance-cutin')) continue
      try {
        const t = a.effect.getComputedTiming()
        a.currentTime = (t.delay ?? 0) + (t.activeDuration ?? 0)
        a.pause()
        window.__gs.frozen.push(name)
      } catch (e) { /* 途中で外れた要素は無視 */ }
    }
  }
  // 本体は 900ms（＋安全弁 400ms）で必ずアンマウントされる。撮影が間に合わない
  // ことがあるので、本体が外れた瞬間に「凍結済みの完成形」の静止コピーを同じ場所へ
  // 差し込む（同一DOM・同一CSSの複製なので見た目は本体と1pxも変わらない）。
  // 撮影後に必ず取り除く。
  const keepShot = (node) => {
    const clone = node.cloneNode(true)
    clone.setAttribute('data-gs-clone', '1')
    const mo2 = new MutationObserver(() => {
      if (node.isConnected) return
      mo2.disconnect()
      document.body.appendChild(clone)
      void clone.offsetWidth
      freeze()
      window.__gs.cloned = true
    })
    mo2.observe(document.body, { childList: true, subtree: true })
  }
  const mo = new MutationObserver((muts) => {
    if (window.__gs.at) return
    for (const m of muts) for (const n of m.addedNodes) {
      if (!(n instanceof Element)) continue
      const cut = n.classList.contains('resonance-cutin') ? n : n.querySelector?.('.resonance-cutin')
      if (cut) {
        window.__gs.at = Math.round(performance.now())
        freeze()
        // 凍結した「完成形」をその場で計測する。撮影の往復を待つとカットインが
        // 消えてしまい、null だらけの計測になる
        try { window.__gs.m = measure() } catch (e) { window.__gs.m = { measureError: String(e) } }
        keepShot(cut)
        return
      }
    }
  })
  mo.observe(document.body, { childList: true, subtree: true })
  return true
}`
const THAW = `() => { let n = 0; for (const a of document.getAnimations()) { try { a.play(); n++ } catch (e) {} } return n }`

/** 文字切れ・はみ出し・重なり・素材の出どころを機械で確かめる */
const MEASURE = `() => {
  const el = (s) => document.querySelector(s)
  const R = (s) => { const e = el(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) } }
  const clip = (s) => { const e = el(s); if (!e) return null; return e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1 }
  const cs = (s, p) => { const e = el(s); return e ? getComputedStyle(e)[p] : null }
  const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight
  const inView = (r) => (r ? r.l >= -1 && r.t >= -1 && r.r <= vw + 1 && r.b <= vh + 1 : null)
  const root = el('.resonance-cutin')
  const title = R('.resonance-cutin-title'), god = R('.resonance-cutin-god'), sub = R('.resonance-cutin-sub'), portrait = R('.resonance-cutin-portrait')
  const img = el('.resonance-cutin-image')
  return {
    present: !!root,
    parts: { rays: !!el('.resonance-cutin-rays'), band: !!el('.resonance-cutin-band'), ring: !!el('.resonance-cutin-ring'), portrait: !!el('.resonance-cutin-portrait') },
    text: { god: el('.resonance-cutin-god')?.textContent ?? null, title: el('.resonance-cutin-title')?.textContent ?? null, sub: el('.resonance-cutin-sub')?.textContent ?? null },
    rect: { title, god, sub, portrait },
    inView: { title: inView(title), god: inView(god), sub: inView(sub), portrait: inView(portrait) },
    clipped: { title: clip('.resonance-cutin-title'), god: clip('.resonance-cutin-god'), sub: clip('.resonance-cutin-sub') },
    opacity: { root: cs('.resonance-cutin', 'opacity'), group: cs('.resonance-cutin-group', 'opacity'), title: cs('.resonance-cutin-title', 'opacity'), band: cs('.resonance-cutin-band', 'opacity'), rays: cs('.resonance-cutin-rays', 'opacity') },
    accent: root ? getComputedStyle(root).getPropertyValue('--god-accent').trim() : null,
    objectPosition: cs('.resonance-cutin-image', 'objectPosition'),
    titleFont: (cs('.resonance-cutin-title', 'fontFamily') ?? '').slice(0, 60),
    titleSize: cs('.resonance-cutin-title', 'fontSize'),
    borderRadius: cs('.resonance-cutin-image', 'borderRadius'),
    img: img ? { complete: img.complete, w: img.naturalWidth, src: img.getAttribute('src') } : null,
    scrollY: Math.round(window.scrollY),
    overflowX: document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth,
    pageH: document.scrollingElement.scrollHeight,
    pointerEvents: cs('.resonance-cutin', 'pointerEvents'),
    zIndex: cs('.resonance-cutin', 'zIndex'),
  }
}`

const log = (s) => process.stdout.write(s + '\n')
/** 待機中も 60ms ごとにカットインを見張る（検出が遅れると消えてしまい撮れない） */
async function settle(page, ms) {
  return page
    .waitForFunction(() => !!window.__gs?.at, null, { timeout: ms, polling: 16 })
    .then(() => true)
    .catch(() => false)
}
const results = []
const browser = await chromium.launch({ headless: true })
for (const run of RUNS) {
  const name = `${tag}-${run.vp}-${run.id}${run.reduced ? '-reduced' : ''}`
  let done = null
  for (const [enemyJa, enemyKey] of run.enemies) {
    if (done) break
    const ctx = await browser.newContext({
      viewport: run.viewport,
      isMobile: run.mobile,
      hasTouch: run.mobile,
      reducedMotion: run.reduced ? 'reduce' : 'no-preference',
    })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()))
    const click = (t) =>
      page.evaluate((text) => {
        const b = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(text))
        if (!b) return false
        b.click()
        return true
      }, t)
    try {
      await page.goto(`${base}/?enemy=${enemyKey}&seed=p6d-${run.id}`)
      await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
      await click('わかった')
      await page.waitForTimeout(150)
      await click('神を選ぶ')
      await page.waitForTimeout(300)
      if (await click('新しく始める')) await page.waitForTimeout(300)
      await click(run.god)
      await page.waitForTimeout(250)
      await click('この構成で始める')
      await page.waitForTimeout(250)
      await click(enemyJa)
      await page.waitForTimeout(400)
      await page.evaluate(`(${ARM(MEASURE)})()`)
      await click('この構成でバトル開始')
      await page.waitForSelector('.hand .card-view', { timeout: 10000 })
      await page.waitForFunction(() => { const e = document.querySelector('.end-round-button'); return e && !e.disabled }, null, { timeout: 15000 })

      const t0 = Date.now()
      while (Date.now() - t0 < 150000 && !done) {
        if (await page.evaluate(() => !!window.__gs?.at || !!window.__gs?.cloned)) {
          // 凍結済み。1枚だけ撮る（pumpは不要：currentTimeを明示しているためスタイルは確定）
          const shown = await page.evaluate(() => {
            const n = document.querySelector('.resonance-cutin')
            return n ? (n.hasAttribute('data-gs-clone') ? 'clone' : 'live') : 'none'
          })
          await page.screenshot({ path: join(outDir, `${name}.png`) })
          const gs = await page.evaluate(() => ({ frozen: window.__gs.frozen, m: window.__gs.m, cloned: !!window.__gs.cloned }))
          await page.evaluate(() => document.querySelector('[data-gs-clone]')?.remove())
          const thawed = await page.evaluate(`(${THAW})()`)
          done = { enemy: enemyJa, frozen: [...new Set(gs.frozen)], thawed, shown, cloned: gs.cloned, ...(gs.m ?? {}) }
          break
        }
        if (await page.evaluate(() => !!document.querySelector('.game-over-overlay, .reward-overlay'))) break
        const played = await page.evaluate(() => {
          const cards = [...document.querySelectorAll('.hand .card-view')].filter((c) => !c.disabled)
          if (!cards.length) return false
          // ✨（共鳴を上げる札）を最優先。攻撃札は最後（神の一撃の前に敵を倒して
          // しまうと撮れないため。笑蓮のような低火力の神で実際に起きた）
          const score = (c) => {
            const t = c.querySelector('.card-view-name')?.textContent ?? ''
            if (/✨/.test(t)) return 3
            if (/⚔|🌟|💀/.test(t)) return 0
            return 1
          }
          cards.sort((a, b) => score(b) - score(a))
          cards[0].click()
          return true
        })
        if (played) {
          await settle(page, 1400)
          continue
        }
        const ended = await page.evaluate(() => { const e = document.querySelector('.end-round-button'); if (e && !e.disabled) { e.click(); return true } return false })
        await settle(page, ended ? 3400 : 300)
      }
      if (done) done.errors = errors
      else log(`${name}: no cut-in vs ${enemyJa}（別の敵で再試行）`)
    } catch (e) {
      log(`${name}: error vs ${enemyJa} ${String(e).slice(0, 100)}`)
    }
    await ctx.close()
  }
  results.push({ name, vp: run.vp, god: run.id, reduced: run.reduced, ok: !!done, ...(done ?? {}) })
  log(
    done
      ? `${name}: OK enemy=${done.enemy} text="${done.text.god}/${done.text.title}/${done.text.sub}" accent=${done.accent} objPos=${done.objectPosition} radius=${done.borderRadius} size=${done.titleSize} inView=${JSON.stringify(done.inView)} clipped=${JSON.stringify(done.clipped)} opacity=${JSON.stringify(done.opacity)} parts=${JSON.stringify(done.parts)} scrollY=${done.scrollY} ox=${done.overflowX} pe=${done.pointerEvents} z=${done.zIndex} frozen=${done.frozen.length} err=${(done.errors ?? []).length}`
      : `${name}: FAILED (no cut-in)`,
  )
}
await browser.close()
writeFileSync(join(outDir, `${tag}-godstrike.json`), JSON.stringify(results, null, 1))
log(`done ${outDir} ok=${results.filter((r) => r.ok).length}/${results.length}`)

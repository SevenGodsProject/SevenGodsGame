// 託宣 3 択の状況表示（決定253）の実ブラウザ計測（v1.1.6 Quick Win #2・読み取り専用）
//   node scripts/release-audit/oracle-sp-probe.mjs <outDir> <baseUrl>
//   env: OR_VIEWPORTS（既定 sp375,sp390,sp660,pc660,pc768）／OR_ENEMY（既定 oni）／OR_SEED（既定 qw2-oracle）
// 各 viewport で通常バトル R1 を開き、(1) 3 択の名前・状況表示（長い形／短い形のどちらが見えているか）・文字切れ
// （scrollWidth > clientWidth）・ボタンの箱を読む、(2) 導きの候補が出るまで札を出して同じ計測を繰り返す、
// (3) 短い形の候補文字列（全カード名）を状況表示の要素に一時的に入れて、幅に収まるかを実測する（表示後に元へ戻す）。
// 託宣は押さない（決定論・save には一切触れない）。パネル部分の jpeg を残す。
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const [outDir, base] = process.argv.slice(2)
if (!outDir || !base) {
  console.error('usage: node scripts/release-audit/oracle-sp-probe.mjs <outDir> <baseUrl>')
  process.exit(2)
}
mkdirSync(outDir, { recursive: true })
const VIEWPORTS = {
  sp375: { viewport: { width: 375, height: 667 }, isMobile: true },
  sp390: { viewport: { width: 390, height: 844 }, isMobile: true },
  sp660: { viewport: { width: 390, height: 660 }, isMobile: true },
  pc660: { viewport: { width: 1508, height: 660 }, isMobile: false },
  pc768: { viewport: { width: 1366, height: 768 }, isMobile: false },
}
const vps = (process.env.OR_VIEWPORTS ?? 'sp375,sp390,sp660,pc660,pc768').split(',')
const enemy = process.env.OR_ENEMY ?? 'oni'
const seed = process.env.OR_SEED ?? 'qw2-oracle'
/** 短い形の候補文字列の型。{name} を全カード名で置き換えて幅を測る */
const CANDIDATES = (process.env.OR_CANDIDATES ?? '『{name}』|出せる『{name}』|出せる:{name}|出せる {name}|『{name}』可|出せる札＋1|1枚引く＋神力1|札を1枚引く').split('|')

const clickText = (page, text) =>
  page.evaluate((t) => {
    const el = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(t) && !x.disabled)
    if (!el) return false
    el.click()
    return true
  }, text)
const clickSel = (page, sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s)
    if (!el || el.disabled) return false
    el.click()
    return true
  }, sel)

async function startNormal(page) {
  await page.goto(`${base}/?enemy=${enemy}&seed=${seed}`, { waitUntil: 'load' })
  await page.waitForSelector('.home-screen .home-cta-primary', { timeout: 30000 })
  await page.waitForTimeout(400)
  if (await clickText(page, 'わかった')) await page.waitForTimeout(400)
  if (!(await clickSel(page, '[data-testid="home-start"]'))) await clickText(page, '神を選ぶ')
  await page.waitForTimeout(400)
  if (await clickText(page, '新しく始める')) await page.waitForTimeout(400)
  await clickText(page, '大耀')
  await page.waitForTimeout(300)
  await clickText(page, 'この構成で始める')
  await page.waitForTimeout(300)
  await clickText(page, '業斧の鬼将')
  await page.waitForTimeout(400)
  await clickText(page, 'この構成でバトル開始')
  await page.waitForSelector('.hand .card-view', { timeout: 20000 })
  await page.waitForFunction(() => { const b = document.querySelector('.end-round-button'); return b && !b.disabled }, null, { timeout: 20000 })
  // 入口（降臨の間）が出ていれば tap で飛ばし、消えるまで待つ（パネルの撮影に被らないように）
  if (await page.evaluate(() => !!document.querySelector('[class*="battle-entrance"]'))) {
    await page.mouse.click(8, 8)
    await page.waitForFunction(() => !document.querySelector('[class*="battle-entrance"]'), null, { timeout: 8000 }).catch(() => {})
  }
  await page.waitForTimeout(600)
}

const PANEL = () => {
  const vis = (el) => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }
  const panel = document.querySelector('.divination-panel')
  const choices = [...document.querySelectorAll('.divination-choice')].map((b) => {
    const long = b.querySelector('.divination-choice-preview-long')
    const short = b.querySelector('.divination-choice-preview-short')
    const prev = b.querySelector('.divination-choice-preview')
    const text = b.querySelector('.divination-choice-text')
    const shown = vis(short) ? short : vis(long) ? long : null
    const textWidth = (el) => { if (!el || !el.firstChild) return 0; const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().width }
    return {
      box: box(b),
      name: b.querySelector('.divination-choice-name')?.textContent.replace(/\s+/g, '') ?? null,
      effectTextVisible: vis(text),
      previewMode: vis(short) ? 'short' : vis(long) ? 'long' : 'none',
      preview: shown?.textContent ?? null,
      previewFont: prev ? getComputedStyle(prev).fontSize : null,
      previewBox: box(prev),
      previewTextWidth: Math.round(textWidth(shown)),
      previewTruncated: !!prev && !!shown && textWidth(shown) > prev.clientWidth + 0.5,
      availWidth: (() => { const cs = getComputedStyle(b); return Math.round(b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) })(),
      buttonOverflowX: b.scrollWidth > b.clientWidth + 1,
      buttonOverflowY: b.scrollHeight > b.clientHeight + 1,
      disabled: b.disabled,
    }
  })
  return {
    title: document.querySelector('.divination-panel-title')?.textContent.trim() ?? null,
    panelBox: box(panel),
    hScroll: document.documentElement.scrollWidth > innerWidth + 1,
    ap: document.body.innerText.match(/神力\s*(\d+)\s*\/\s*(\d+)/)?.slice(1, 3) ?? null,
    choices,
  }
}

/** 候補文字列を導き（2 番目）の状況表示に一時的に入れて幅を測る。終わったら元に戻す */
const MEASURE = ({ candidates, names }) => {
  const b = document.querySelectorAll('.divination-choice')[1]
  const prev = b?.querySelector('.divination-choice-preview')
  const short = b?.querySelector('.divination-choice-preview-short')
  const long = b?.querySelector('.divination-choice-preview-long')
  if (!b || !prev) return null
  const target = getComputedStyle(short).display !== 'none' ? short : long
  const other = target === short ? long : short
  const saved = { target: target.textContent, other: other.textContent }
  const cs = getComputedStyle(b)
  const avail = Math.round(b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight))
  const tw = (el) => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().width }
  const out = []
  for (const c of candidates) {
    const samples = c.includes('{name}') ? names.map((n) => c.replace('{name}', n)) : [c]
    const rows = samples.map((s) => {
      target.textContent = s
      const w = Math.round(tw(target) * 10) / 10
      return { text: s, width: w, fits: w <= avail }
    })
    out.push({ candidate: c, fits: rows.filter((r) => r.fits).length, total: rows.length, avail, overflow: rows.filter((r) => !r.fits).map((r) => `${r.text}(${r.width})`) })
  }
  target.textContent = saved.target
  other.textContent = saved.other
  return out
}

async function playOneCard(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll('.hand .card-view')].filter((c) => !c.disabled)
    if (!cards.length) return false
    cards[cards.length - 1].click()
    return true
  })
}

const browser = await chromium.launch({ headless: true })
const report = { base, enemy, seed, candidates: CANDIDATES, generatedAt: new Date().toISOString(), rows: [] }
let names = null
for (const vp of vps) {
  const ctx = await browser.newContext({ ...VIEWPORTS[vp] })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()))
  const row = { vp, errors, states: [] }
  try {
    await startNormal(page)
    if (!names) {
      // 全カード名：Enemy/手札からは取れないので、バンドルの表示（カード名）ではなく docs の cards データを読む代わりに
      // ページ内の手札＋デッキ表示は不完全なため、呼び出し側が OR_NAMES を渡せる。無ければ手札の名前だけで測る
      names = process.env.OR_NAMES ? process.env.OR_NAMES.split(',') : await page.evaluate(() => [...document.querySelectorAll('.hand .card-view-name')].map((e) => e.textContent.trim()))
    }
    const shoot = async (tag) => {
      const pb = await page.evaluate(() => { const r = document.querySelector('.battle-dock, .divination-panel')?.getBoundingClientRect(); return r ? { x: Math.max(0, r.x - 4), y: Math.max(0, r.y - 4), width: Math.min(innerWidth, r.width + 8), height: Math.min(innerHeight - r.y + 4, r.height + 8) } : null })
      await page.screenshot({ path: `${outDir}/${vp}-${tag}.jpg`, type: 'jpeg', quality: 80, ...(pb ? { clip: pb } : {}) })
      await page.screenshot({ path: `${outDir}/${vp}-${tag}-full.jpg`, type: 'jpeg', quality: 60 })
    }
    let st = await page.evaluate(PANEL)
    row.states.push({ tag: 'r1-start', ...st })
    await shoot('r1-start')
    // 導きの候補が出る状態（神力を減らす）を最大 4 手まで探す
    for (let k = 0; k < 4; k++) {
      const guide = st.choices[1]?.preview ?? ''
      if (/『|^出せる/.test(guide)) break
      if (!(await playOneCard(page))) break
      await page.waitForTimeout(900)
      st = await page.evaluate(PANEL)
    }
    if (/『|^出せる/.test(st.choices[1]?.preview ?? '')) {
      row.states.push({ tag: 'guide-candidate', ...st })
      await shoot('guide-candidate')
    }
    row.measure = await page.evaluate(MEASURE, { candidates: CANDIDATES, names })
  } catch (e) {
    row.error = String(e)
    await page.screenshot({ path: `${outDir}/${vp}-error.jpg`, type: 'jpeg', quality: 60 }).catch(() => {})
  }
  report.rows.push(row)
  console.log(JSON.stringify({ vp, error: row.error, errors: errors.length, states: row.states.map((s) => ({ tag: s.tag, ap: s.ap, previews: s.choices.map((c) => `${c.previewMode}:${c.preview}[${c.previewTextWidth}/${c.availWidth}]${c.previewTruncated ? '(切れ)' : ''}`), effectText: s.choices[0]?.effectTextVisible, box: s.choices[1]?.box, prevW: s.choices[1]?.previewBox?.w, font: s.choices[1]?.previewFont, overflowY: s.choices.some((c) => c.buttonOverflowY) })), measure: row.measure?.map((m) => `${m.candidate}: ${m.fits}/${m.total} (avail ${m.avail})`) }))
  await ctx.close()
}
await browser.close()
report.names = names
writeFileSync(`${outDir}/oracle-sp-probe.json`, JSON.stringify(report, null, 2))
const bad = report.rows.filter((r) => r.error || r.errors.length)
console.log(`oracle-sp-probe ${report.rows.length - bad.length}/${report.rows.length} rows ok`)
process.exit(bad.length ? 1 : 0)

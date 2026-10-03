// 決定264 Fast Gate — HUD（G13 コントラスト〈画素実測〉・G14 環／角金具／接地影・共鳴 0〜7 の描画と BURST READY 発光・G8 HP 長さ）
// node scripts/d264-duel-hud/gate-hud.mjs [only=after] [vp=pc660,sp844]
// 1 browser・context を 1 つずつ直列（6GB 機）。Before＝:4301（Production 8cba184 と同一 runtime）／After＝:4302
import { withBrowser, startBattle, BASES, logger } from './lib.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'
const OUT = 'docs/evidence/decision264/gate-hud'
mkdirSync(`${OUT}/shots`, { recursive: true })
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')))
const SIDES = args.only ? [args.only] : ['before', 'after']
const VPN = args.vp ? args.vp.split(',') : ['pc660', 'sp844', 'sp660']
const COMBOS = [
  { god: 'taiyo', enemy: 'oni' },
  { god: 'taiyo', enemy: 'karakuri' },
  { god: 'taiyo', enemy: 'ryujin' },
  { god: 'sobi', enemy: 'ryujin' },
]
const log = logger(`${OUT}/gate-hud.log.txt`)

// 文字の背景を「その文字を透明にした画面の画素」で測る（画像・グラデ込み）。前景は文字色（text-shadow は無視＝安全側）
const TEXTS = [
  ['enemyName', '.enemy-plate .panel-title'],
  ['enemyType', '.enemy-plate .enemy-type-badge'],
  ['intent', '.enemy-plate .intent'],
  ['godName', '.player-plate .panel-title'],
  ['burstHead', '.god-otomo-plate .burst-preview-head'],
  ['enemyHpLabel', '.enemy-plate .hp-bar-label'],
  ['godHpLabel', '.player-plate .hp-bar-label'],
  ['resoLabel', '.resonance-gauge-label'],
  ['passive', '.god-otomo-plate .god-passive-badge'],
]

async function contrastOf(page, sel) {
  const box = await page.evaluate((sel) => {
    const e = document.querySelector(sel)
    if (!e || getComputedStyle(e).display === 'none') return null
    // 測る範囲＝文字そのものの範囲（Range の外接矩形）。block 要素の空き（文字の無い所）を背景に数えない
    const rg = document.createRange()
    rg.selectNodeContents(e)
    const t = rg.getBoundingClientRect()
    // 要素の箱との共通部分（ゲージ 12px の中の 10px 文字は行の箱がゲージの外へ出る＝外の画素を数えない）
    const eb = e.getBoundingClientRect()
    const x0 = Math.max(t.left, eb.left), y0 = Math.max(t.top, eb.top), x1 = Math.min(t.right, eb.right), y1 = Math.min(t.bottom, eb.bottom)
    const r = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }
    if (r.width < 1 || r.height < 1) return null
    // 文字色（グラデ文字＝background-clip:text も含む）は text-fill だけを透明にする。要素の背景（ゲージの艶など）は残す
    const color = (() => { const cs = getComputedStyle(e); const clip = cs.webkitBackgroundClip || cs.backgroundClip; return clip === 'text' ? (cs.backgroundImage.match(/rgba?\([^)]+\)/) || [cs.color])[0] : cs.color })()
    window.__d264saved = []
    for (const el of [e, ...e.querySelectorAll('*')]) {
      window.__d264saved.push([el, el.getAttribute('style')])
      el.style.setProperty('-webkit-text-fill-color', 'transparent', 'important')
      el.style.setProperty('color', 'transparent', 'important')
      el.style.setProperty('text-shadow', 'none', 'important')
      const cs = getComputedStyle(el)
      if ((cs.webkitBackgroundClip || cs.backgroundClip) === 'text') el.style.setProperty('background-image', 'none', 'important')
      if (el.tagName.toLowerCase() === 'svg') el.style.setProperty('visibility', 'hidden', 'important')
    }
    return { x: r.x, y: r.y, w: r.width, h: r.height, color }
  }, sel)
  if (!box) return null
  await page.waitForTimeout(60)
  const png = await page.screenshot({ clip: { x: Math.max(0, box.x), y: Math.max(0, box.y), width: Math.max(1, box.w), height: Math.max(1, box.h) } })
  await page.evaluate(() => { for (const [el, s] of window.__d264saved ?? []) { if (s === null) el.removeAttribute('style'); else el.setAttribute('style', s) } })
  return page.evaluate(async ({ b64, color }) => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth; c.height = img.naturalHeight
    const g = c.getContext('2d')
    g.drawImage(img, 0, 0)
    const d = g.getImageData(0, 0, c.width, c.height).data
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
    const L = []
    for (let i = 0; i < d.length; i += 4) L.push(0.2126 * f(d[i]) + 0.7152 * f(d[i + 1]) + 0.0722 * f(d[i + 2]))
    L.sort((a, b) => a - b)
    const p = (q) => L[Math.min(L.length - 1, Math.floor(q * L.length))]
    const m = color.match(/rgba?\(([^)]+)\)/)
    const [r, gg, bb] = m[1].split(/[ ,/]+/).map(Number)
    const Lt = 0.2126 * f(r) + 0.7152 * f(gg) + 0.0722 * f(bb)
    const cr = (Lb) => +((Math.max(Lt, Lb) + 0.05) / (Math.min(Lt, Lb) + 0.05)).toFixed(2)
    return { color, Lt: +Lt.toFixed(3), bgMedian: +p(0.5).toFixed(4), bgP95: +p(0.95).toFixed(4), crMedian: cr(p(0.5)), crP95: cr(p(0.95)) }
  }, { b64: png.toString('base64'), color: box.color })
}

// 共鳴 0〜7：fill の幅・段階クラス（GodOtomoPanel の getResonanceStage と同じ ≥6 high／≥5 mid）・7 で READY 発光（決定128 の class）を当て、
// 計算後のスタイル（::after の光・ゲージの animation）とゲージの画像を記録する。engine には触れない（DOM の見た目だけ）
async function resoStates(page, key) {
  const out = []
  for (let v = 0; v <= 7; v++) {
    const r = await page.evaluate(async (v) => {
      const wrap = document.querySelector('.resonance-gauge-wrap')
      const fill = wrap.querySelector('.resonance-gauge-fill')
      const label = wrap.querySelector('.resonance-gauge-label')
      fill.style.transition = 'none'
      fill.style.width = `${(v / 7) * 100}%`
      label.textContent = `共鳴 ${v} / 7`
      wrap.classList.remove('resonance-gauge-mid', 'resonance-gauge-high', 'resonance-gauge-ready-flash')
      if (v >= 6) wrap.classList.add('resonance-gauge-high')
      else if (v >= 5) wrap.classList.add('resonance-gauge-mid')
      if (v === 7) { void wrap.offsetWidth; wrap.classList.add('resonance-gauge-ready-flash') }
      await new Promise((res) => setTimeout(res, v === 7 ? 250 : 80))
      const gauge = wrap.querySelector('.resonance-gauge')
      const a = getComputedStyle(wrap, '::after')
      const ticks = getComputedStyle(gauge, '::before')
      const gr = gauge.getBoundingClientRect(), fr = fill.getBoundingClientRect()
      return { v, cls: wrap.className, afterOpacity: a.opacity, afterShadow: a.boxShadow.slice(0, 50), afterAnim: a.animationName, gaugeAnim: getComputedStyle(gauge).animationName, fillW: +fr.width.toFixed(1), gaugeW: +gr.width.toFixed(1), gaugeH: +gr.height.toFixed(1), fillRatio: +(fr.width / gr.width).toFixed(3), ticks: ticks.content !== 'none' ? ticks.backgroundImage.slice(0, 40) : 'none', box: [gr.x, gr.y, gr.width, gr.height] }
    }, v)
    const [x, y, w, h] = r.box
    if (v === 0 || v === 3 || v >= 5) await page.screenshot({ path: `${OUT}/shots/${key}-reso${v}.png`, clip: { x: Math.max(0, x - 14), y: Math.max(0, y - 10), width: w + 28, height: h + 40 } })
    delete r.box
    out.push(r)
  }
  return out
}

const results = []
for (const vp of VPN) for (const c of COMBOS) for (const side of SIDES) {
  const key = `${side}-${vp}-${c.god}-${c.enemy}`
  try {
    const { mem, result } = await withBrowser(async (browser) => {
      const { ctx, page, errors } = await startBattle(browser, BASES[side], vp, { ...c, seed: 'd264-hud' })
      // G14：環・角金具・接地影・名札の材質
      const pseudo = await page.evaluate(() => {
        const ps = (sel, p) => { const e = document.querySelector(sel); return e ? getComputedStyle(e, p).content : null }
        const plate = (sel) => { const e = document.querySelector(sel); if (!e) return null; const cs = getComputedStyle(e); return { bg: cs.backgroundImage.slice(0, 90), border: cs.borderTopColor, radius: cs.borderTopLeftRadius, shadow: cs.boxShadow.slice(0, 30) } }
        return {
          ringEnemy: ps('.enemy-avatar-wrap', '::before'), ringGod: ps('.player-avatar-wrap', '::before'), ringOtomo: ps('.portrait-otomo', '::before'),
          cornerEnemy: ps('.enemy-plate', '::before'), cornerGod: ps('.player-plate', '::before'), cornerReso: ps('.god-otomo-plate', '::before'),
          groundEnemy: ps('.enemy-stage', '::after'), groundGod: ps('.player-stage', '::after'),
          plateEnemy: plate('.enemy-plate'), plateGod: plate('.player-plate'), plateReso: plate('.god-otomo-plate'),
          // 負傷の形：HP>50% では React が描かないため、同じ class の要素を舞台に一時的に置いて計算後の箱と背景を読む（DOM はすぐ戻す）
          wound: (() => { const st = document.querySelector('.enemy-stage'); const out = {}; for (const cls of ['enemy-wound enemy-wound-half', 'enemy-wound enemy-wound-quarter']) { const e = document.createElement('div'); e.className = cls; st.prepend(e); const r = e.getBoundingClientRect(), s = st.getBoundingClientRect(), cs = getComputedStyle(e); out[cls.split(' ')[1]] = { w: Math.round(r.width), h: Math.round(r.height), bottomFromStage: Math.round(s.bottom - r.bottom), radius: cs.borderTopLeftRadius, bg: cs.backgroundImage.slice(0, 70) }; e.remove() } return out })(),
          hp: ['.enemy-plate .hp-bar', '.player-plate .hp-bar', '.resonance-gauge'].map((s) => { const e = document.querySelector(s); const r = e?.getBoundingClientRect(); return r ? [+r.width.toFixed(1), +r.height.toFixed(1)] : null }),
          intentBox: (() => { const e = document.querySelector('.enemy-plate .intent'); const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { h: +r.height.toFixed(1), fontSize: cs.fontSize, lineHeight: cs.lineHeight, cls: e.className } })(),
        }
      })
      const contrast = {}
      for (const [k, sel] of TEXTS) contrast[k] = await contrastOf(page, sel)
      await page.screenshot({ path: `${OUT}/shots/${key}.jpg`, type: 'jpeg', quality: 60 })
      const reso = await resoStates(page, key)
      await ctx.close()
      return { pseudo, contrast, reso, errors: [...errors] }
    }, log)
    results.push({ key, side, vp, ...c, mem, ...result })
    const cr = Object.entries(result.contrast).map(([k, v]) => `${k}=${v ? v.crP95 : '-'}`).join(' ')
    log(`done ${key} mem=${mem} err=${result.errors.length} ${cr}`)
  } catch (e) {
    log(`FAIL ${key} ${String(e).slice(0, 200)}`)
  }
}
writeFileSync(`${OUT}/gate-hud${args.only ? '-' + args.only : ''}${args.vp ? '-' + args.vp.replace(/,/g, '_') : ''}.json`, JSON.stringify(results, null, 1))
log('gate-hud finished')

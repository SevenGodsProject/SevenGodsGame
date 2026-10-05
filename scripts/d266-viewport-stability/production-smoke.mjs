// 決定264＋266 Production Smoke — 本番 URL で (1) 決定261 と同じ 6 ケースの構図・着弾・重なり・反転・文字切れ・横スクロール・console、
// (2) 決定266 の核＝手札 5→10 枚（ラウンドを終える ×3）で Arena 高が不変・全カード中心が自分に当たる・console 0 を PC 2／SP 1 画面で確認。
// 1 browser／1 run 直列（6GB 機）。runtime には触れない。
import { withBrowser, startBattle, MEASURE, logger } from './lib.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
const BASE = process.env.SMOKE_BASE ?? 'https://seven-gods-game.vercel.app'
const OUT = process.env.SMOKE_OUT ?? 'docs/evidence/decision266/production-smoke'
mkdirSync(OUT, { recursive: true })
const log = logger(`${OUT}/smoke.log.txt`)
const html = execSync(`curl -s ${BASE}/`, { encoding: 'utf8' })
const css = html.match(/assets\/index-[A-Za-z0-9_-]+\.css/)?.[0], js = html.match(/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0]
const md5 = (p) => execSync(`curl -s ${BASE}/${p} | md5sum`, { encoding: 'utf8' }).slice(0, 32)
const served = { css, js, cssMd5: css ? md5(css) : null, jsMd5: js ? md5(js) : null }
log(`served ${JSON.stringify(served)}`)
const CASES_ALL = [
  { vp: 'pc660', god: 'taiyo', enemy: 'ryujin', hand: true }, { vp: 'pc660', god: 'shouren', enemy: 'ryujin' },
  { vp: 'sp844', god: 'taiyo', enemy: 'ryujin', hand: true }, { vp: 'sp844', god: 'sobi', enemy: 'karakuri' },
  { vp: 'sp660', god: 'taiyo', enemy: 'oni' }, { vp: 'pc800', god: 'ebisu', enemy: 'juuma', hand: true },
]
const CASES = process.env.SMOKE_ONLY ? process.env.SMOKE_ONLY.split(";").map((s) => { const [vp, god, enemy, hand] = s.split(":"); return { vp, god, enemy, hand: hand === "hand" } }) : CASES_ALL
const PROBE = () => {
  const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { h: Math.round(b.height * 10) / 10, w: Math.round(b.width * 10) / 10 } }
  const q = (s) => document.querySelector(s)
  return { arena: r(q('.battle-main')), enemyHp: r(q('.enemy-plate .hp-bar')), godHp: r(q('.player-plate .hp-bar')), reso: r(q('.resonance-gauge')), n: document.querySelectorAll('.hand .card-view').length, bodyHS: document.documentElement.scrollWidth > innerWidth + 1 }
}
const HITTEST = async () => {
  const out = []
  for (const c of [...document.querySelectorAll('.hand .card-view')]) {
    const hand = c.closest('.hand'); const scrollable = hand && hand.scrollWidth > hand.clientWidth + 1
    if (scrollable) { c.scrollIntoView({ block: 'nearest', inline: 'nearest' }); await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))) }
    const b = c.getBoundingClientRect(); const h = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)
    out.push(!!h && c.contains(h))
  }
  const hand = document.querySelector('.hand'); if (hand) hand.scrollLeft = 0
  return out
}
async function waitPlayerTurn(page) {
  await page.waitForFunction(() => { const b = document.querySelector('.end-round-button'); return b && b.disabled }, null, { timeout: 8000 }).catch(() => {})
  await page.waitForFunction(() => { const b = document.querySelector('.end-round-button'); return b && !b.disabled }, null, { timeout: 30000 })
  await page.waitForTimeout(1800)
}
const cnt = (o) => o && typeof o === 'object' ? `${Object.values(o).filter((v) => v === true).length}/${Object.values(o).filter((v) => typeof v === 'boolean').length}` : String(o)
const results = []
for (const c of CASES) {
  const key = `prod-${c.vp}-${c.god}-${c.enemy}`
  try {
    const { mem, result } = await withBrowser(async (browser) => {
      const { page, errors, entrance } = await startBattle(browser, BASE, c.vp, { god: c.god, enemy: c.enemy, seed: 'd266-hand' })
      const m = await page.evaluate(MEASURE)
      await page.screenshot({ path: `${OUT}/${key}.jpg`, type: 'jpeg', quality: 55 })
      let hand = null
      if (c.hand) {
        const steps = []
        for (let round = 1; round <= 4; round++) {
          const p = await page.evaluate(PROBE); const hits = await page.evaluate(HITTEST)
          steps.push({ round, ...p, hits: `${hits.filter(Boolean).length}/${hits.length}` })
          if (p.n >= 10 || round === 4) break
          await page.evaluate(() => document.querySelector('.end-round-button')?.click())
          await waitPlayerTurn(page)
        }
        await page.screenshot({ path: `${OUT}/${key}-hand10.jpg`, type: 'jpeg', quality: 55 })
        const ah = steps.map((s) => s.arena?.h ?? -1)
        hand = { steps, arenaRange: Math.max(...ah) - Math.min(...ah), allHit: steps.every((s) => s.hits.split('/')[0] === s.hits.split('/')[1]), anyBodyHS: steps.some((s) => s.bodyHS), finalHand: steps.at(-1).n }
      }
      return { m, entrance, hand, errors: [...errors] }
    }, log)
    const r = { key, ...c, mem, ...result }
    results.push(r)
    const m = r.m
    const clipped = Array.isArray(m.clipped) ? m.clipped.filter((x) => x.root !== 'card-view' || x.over || x.overY).length : m.clipped
    log(`done ${key} mem=${mem}MB errors=${r.errors.length} area e=${m.area?.enemy} g=${m.area?.god} gap=${m.gapEnemyGod} hit=${cnt(m.hit)} overlapEG=${m.overlapEG} scale=${JSON.stringify(m.scale)} clipped=${clipped} hs=${m.hScroll || m.bodyHScroll}` + (r.hand ? ` | hand ${r.hand.steps.map((s) => `${s.n}:${s.arena?.h}`).join(' ')} arenaRange=${r.hand.arenaRange} allHit=${r.hand.allHit} bodyHS=${r.hand.anyBodyHS}` : ''))
  } catch (e) { log(`FAIL ${key} ${String(e).slice(0, 200)}`); results.push({ key, error: String(e).slice(0, 300) }) }
}
writeFileSync(`${OUT}/smoke266.json`, JSON.stringify({ base: BASE, served, results }, null, 1))
log('smoke finished')

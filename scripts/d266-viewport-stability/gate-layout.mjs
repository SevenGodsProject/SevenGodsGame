// 決定266 AC8：決定264 の gate-layout.mjs の写し（出力先のみ docs/evidence/decision266/d264-regression へ変更・seed／計測は同一。after＝:4303）
// 決定264 Fast Gate（決定261 gate-layout の写し・OUT／seed のみ変更）— 静止画面の構図（G1 面積／G2 キャラ÷カード／G3 着弾中心∈ink／G4 重なり／G5 入口 T5 HUD 箱差／
// G7 HUD 反転／G8 横スクロール・文字の切れ／G9 console）＋入口の操作開放時刻（G10 のロック時間）。
// 4 viewport × 13 組（大耀×7 敵＋7 神×龍神）× Before／After。1 browser／1 context／1 run 直列。
// node scripts/d264-duel-hud/gate-layout.mjs [only=after] [vp=pc660,sp844]
import { withBrowser, startBattle, MEASURE, BASES, logger } from './lib.mjs'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
const OUT = 'docs/evidence/decision266/d264-regression/layout'
const RUNS = `${OUT}/runs-layout`
mkdirSync(RUNS, { recursive: true })
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')))
const SIDES = args.only ? [args.only] : ['before', 'after']
const VPN = args.vp ? args.vp.split(',') : ['pc660', 'pc800', 'sp844', 'sp660']
const COMBOS = [
  ...['trial', 'oni', 'onryo', 'karakuri', 'juuma', 'ryujin', 'doukeshi'].map((e) => ({ god: 'taiyo', enemy: e })),
  ...['ebisu', 'sobi', 'saika', 'juraku', 'fukuei', 'shouren'].map((g) => ({ god: g, enemy: 'ryujin' })),
]
const log = logger(`${OUT}/gate-layout.log.txt`)
const retry = []
async function one(side, vp, c) {
  const key = `${side}-${vp}-${c.god}-${c.enemy}`
  const file = `${RUNS}/${key}.json`
  if (existsSync(file) && !args.force) return JSON.parse(readFileSync(file, 'utf8'))
  try {
    const { mem, result } = await withBrowser(async (browser) => {
      const { page, errors, entrance } = await startBattle(browser, BASES[side], vp, { ...c, seed: 'd264-gate' })
      const m = await page.evaluate(MEASURE)
      if (side === 'after' || (c.god === 'taiyo' && ['oni', 'karakuri', 'ryujin'].includes(c.enemy))) await page.screenshot({ path: `${OUT}/shots/${key}.jpg`, type: 'jpeg', quality: 55 })
      return { m, entrance, errors: [...errors] }
    }, log)
    const rec = { key, side, vp, ...c, mem, ...result }
    writeFileSync(file, JSON.stringify(rec))
    log(`done ${key} mem=${mem}MB errors=${result.errors.length} area e=${result.m.area.enemy} g=${result.m.area.god} o=${result.m.area.otomo} gap=${result.m.gapEnemyGod}`)
    return rec
  } catch (e) {
    log(`FAIL ${key} ${String(e).slice(0, 200)}`)
    retry.push([side, vp, c])
    return null
  }
}
mkdirSync(`${OUT}/shots`, { recursive: true })
for (const vp of VPN) for (const c of COMBOS) for (const side of SIDES) await one(side, vp, c)
for (const [side, vp, c] of retry.splice(0)) { log(`retry ${side} ${vp} ${c.god}-${c.enemy}`); await one(side, vp, c) }
log('gate-layout finished')

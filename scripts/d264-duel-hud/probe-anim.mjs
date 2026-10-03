// 決定264 G10 Root Cause：決定250 の入力ロック（900ms の CSS animation の animationend、取りこぼし時 1300ms の fallback）が
// 描画負荷で遅れるかを、戦闘画面の上で「900ms の CSS animation の animationend の遅れ」として直接測る。
// 神の一撃中に近づけるため god-strike-v2.mp4 を全面の video で再生しながら 8 試行。Before／After と After の部分無効化（原因切り分け）を比較。
// node scripts/d264-duel-hud/probe-anim.mjs [rounds=2]
import { withBrowser, startBattle, BASES, VPS, logger } from './lib.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'
const OUT = 'docs/evidence/decision264/g10-anim-probe'
mkdirSync(OUT, { recursive: true })
const log = logger(`${OUT}/probe-anim.log.txt`)
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')))
const ROUNDS = Number(args.rounds ?? 2)
VPS.sp844dsf2 = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
const OFF = {
  none: '',
  noGround: 'body.battle-viewport .battle-main .enemy-stage::after, body.battle-viewport .battle-main .player-stage::after { display: none !important; }',
  noScrim: 'body.battle-viewport .battle-main .enemy-plate, body.battle-viewport .battle-main .player-plate, body.battle-viewport .battle-main .god-otomo-plate { background: none !important; }',
  noArt: 'body.battle-viewport .battle-main .enemy-avatar-wrap { scale: none !important; translate: none !important; }',
}
const VARIANTS = [['before', 'none'], ['after', 'none'], ['after', 'noGround'], ['after', 'noScrim'], ['after', 'noArt']]
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }
const out = []
for (let round = 1; round <= ROUNDS; round++) for (const vp of ['sp844dsf2', 'pc660']) for (const [side, off] of VARIANTS) {
  const key = `${vp}-${side}-${off}-r${round}`
  const { mem, result } = await withBrowser(async (browser) => {
    const { ctx, page, errors } = await startBattle(browser, BASES[side], vp, { god: 'taiyo', enemy: 'ryujin', seed: 'rl-qa-7' })
    if (OFF[off]) await page.addStyleTag({ content: OFF[off] })
    const r = await page.evaluate(async () => {
      const st = document.createElement('style')
      st.textContent = '@keyframes d264-probe { from { opacity: 0.99 } to { opacity: 1 } } .d264-probe { position: fixed; left: 0; top: 0; width: 2px; height: 2px; animation: d264-probe 900ms linear both; }'
      document.head.appendChild(st)
      const v = document.createElement('video')
      v.src = '/assets/gods/taiyo/god-strike-v2.mp4'; v.muted = true; v.loop = true; v.playsInline = true
      v.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;object-fit:cover;opacity:.6;pointer-events:none;z-index:50'
      document.body.appendChild(v)
      try { await v.play() } catch {}
      await new Promise((r) => setTimeout(r, 300))
      const lates = []
      for (let i = 0; i < 8; i++) {
        const el = document.createElement('div'); el.className = 'd264-probe'
        const t0 = performance.now()
        const done = new Promise((res) => el.addEventListener('animationend', () => res(performance.now() - t0), { once: true }))
        document.body.appendChild(el)
        const ms = await Promise.race([done, new Promise((res) => setTimeout(() => res(9999), 4000))])
        lates.push(Math.round(ms - 900))
        el.remove()
        await new Promise((r) => setTimeout(r, 150))
      }
      v.remove()
      return lates
    })
    await ctx.close()
    return { lates: r, errors: [...errors] }
  }, log)
  out.push({ key, vp, side, off, round, mem, ...result, med: med(result.lates) })
  log(`${key} mem=${mem} lateMed=${med(result.lates)} lates=${result.lates.join(',')} err=${result.errors.length}`)
}
const summary = {}
for (const vp of ['sp844dsf2', 'pc660']) for (const [side, off] of VARIANTS) { const all = out.filter((o) => o.vp === vp && o.side === side && o.off === off).flatMap((o) => o.lates); summary[`${vp}/${side}/${off}`] = { n: all.length, med: med(all), over400: all.filter((x) => x > 400).length } }
writeFileSync(`${OUT}/probe-anim.json`, JSON.stringify({ summary, out }, null, 1))
log('summary ' + JSON.stringify(summary))

// Phase 6-D 監査用モック：リポジトリのコードは触らず、ページに CSS/DOM を注入して「既存素材＋CSS だけ」の到達点を実画面で比較する（監査専用・製品コード不変）
//   PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/phase6d-visual-audit/mock.mjs <outDir> [baseUrl]
import { pathToFileURL } from 'node:url'
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')
const base = process.argv.find((a) => a.startsWith('http')) ?? 'http://localhost:5173'
const OUT = process.argv[2]
const MOCK_B = `
.battle-main { position: relative; }
#mockGrade { position:absolute; inset:0; z-index:1; pointer-events:none; border-radius:inherit;
  background: radial-gradient(ellipse at 50% 62%, transparent 48%, #05060dbb 100%); }
#mockGrade::after { content:''; position:absolute; inset:0; background: var(--stage-accent, #ffd166); opacity:.12; mix-blend-mode: multiply; }
.enemy-avatar, .player-avatar-wrap { position: relative; }
.enemy-avatar::before, .player-avatar-wrap::before { content:''; position:absolute; left:18%; right:18%; bottom:2px; height:16px; border-radius:50%;
  background: radial-gradient(ellipse at center, #000000b3 0%, #00000066 45%, transparent 72%); filter: blur(2px); z-index:0; pointer-events:none; }
.enemy-avatar::after, .player-avatar-wrap::after { content:''; position:absolute; left:-10%; right:-10%; bottom:-14px; height:64px; border-radius:50%;
  background: radial-gradient(ellipse at center, var(--stage-accent, #ffd166) 0%, transparent 68%); opacity:.38; mix-blend-mode: screen; z-index:0; pointer-events:none; }
.enemy-avatar img, img.player-avatar { position: relative; z-index:1; filter: drop-shadow(0 0 5px var(--stage-accent, #ffd166)) drop-shadow(0 2px 2px #00000088) contrast(1.04); }
.god-otomo-portraits img { filter: drop-shadow(0 0 5px var(--stage-accent, #ffd166)); }
`
const MOCK_A = (god, kv) => `
<div id="mockStrike" style="position:fixed;inset:0;z-index:50;pointer-events:none;background:#05060dd6;overflow:hidden;font-family:'Yu Mincho','YuMincho','Hiragino Mincho ProN','Noto Serif JP',serif">
  <div style="position:absolute;inset:-40%;background:repeating-conic-gradient(from 0deg at 50% 50%, #ffd16626 0 1.2deg, transparent 1.2deg 7deg);opacity:.6"></div>
  <div style="position:absolute;left:-6%;right:-6%;top:50%;height:36%;transform:translateY(-50%) rotate(-5deg);background:#03040acc;border-top:1px solid #e6c27acc;border-bottom:1px solid #e6c27acc;box-shadow:0 0 40px #000"></div>
  <div style="position:absolute;left:50%;top:50%;width:min(86vw,980px);height:36%;transform:translate(-50%,-50%) rotate(-5deg);display:flex;align-items:center;gap:4%">
    <div style="flex:0 0 auto;width:calc(36vh + 40px);aspect-ratio:1;border-radius:50%;overflow:hidden;box-shadow:0 0 0 2px #e6c27a,0 0 34px #ffd16666"><img src="${kv}" style="width:100%;height:100%;object-fit:cover;object-position:50% 18%"></div>
    <div style="flex:1;color:#ffe9b0">
      <div style="font-size:clamp(12px,1.6vw,18px);letter-spacing:.35em;color:#e6c27a">${god}、共鳴発動</div>
      <div style="font-size:clamp(34px,6vw,72px);font-weight:700;letter-spacing:.18em;line-height:1.05;background:linear-gradient(180deg,#fff2c8,#e6c27a 55%,#a8842f);-webkit-background-clip:text;color:transparent;text-shadow:none;filter:drop-shadow(0 2px 0 #3a2a00) drop-shadow(0 0 18px #ffd16688)">神の一撃</div>
      <div style="margin-top:.4em;height:1px;background:linear-gradient(90deg,#e6c27a,transparent)"></div>
    </div>
  </div>
</div>`
const browser = await chromium.launch()
for (const sp of [false, true]) {
  const vp = sp ? { width: 390, height: 760 } : { width: 1508, height: 660 }
  const page = await browser.newPage({ viewport: vp, isMobile: sp, hasTouch: sp })
  const click = (t) => page.evaluate((text) => { const el = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(text)); if (!el) return false; el.click(); return true }, t)
  const id = sp ? 'sp' : 'pc'
  for (const [god, enemy, q] of [['大耀', '業斧の鬼将', '?enemy=oni&seed=p6d-mock'], ['蒼毘', '双牙の魔獣', '?enemy=juuma&seed=p6d-mock2']]) {
    await page.goto(base + '/' + q)
    await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
    await click('わかった'); await page.waitForTimeout(150); await click('神を選ぶ'); await page.waitForTimeout(300)
    if (await click('新しく始める')) await page.waitForTimeout(300)
    await click(god); await page.waitForTimeout(250); await click('この構成で始める'); await page.waitForTimeout(250)
    await click(enemy); await page.waitForTimeout(400); await click('この構成でバトル開始')
    await page.waitForSelector('.hand .card-view', { timeout: 10000 })
    await page.waitForFunction(() => { const e = document.querySelector('.end-round-button'); return e && !e.disabled }, null, { timeout: 15000 })
    await page.waitForTimeout(400)
    const tag = enemy === '業斧の鬼将' ? 'oni' : 'juuma'
    await page.screenshot({ path: `${OUT}/${id}-${tag}-0-before.png` })
    await page.evaluate((css) => { const st = document.createElement('style'); st.id = 'mockB'; st.textContent = css; document.head.appendChild(st); const g = document.createElement('div'); g.id = 'mockGrade'; document.querySelector('.battle-main').appendChild(g) }, MOCK_B)
    await page.waitForTimeout(200)
    await page.screenshot({ path: `${OUT}/${id}-${tag}-1-mockB-grounding.png` })
    await page.evaluate(() => { document.getElementById('mockB')?.remove(); document.getElementById('mockGrade')?.remove() })
    if (tag === 'oni') {
      const kv = await page.evaluate(() => (document.querySelector('.god-select-card-img-keyvisual') || {}).src || '/assets/gods/taiyo/keyvisual.webp')
      await page.evaluate((html) => { document.body.insertAdjacentHTML('beforeend', html) }, MOCK_A(god, god === '大耀' ? '/assets/gods/taiyo/keyvisual.webp' : kv))
      await page.waitForTimeout(400)
      await page.screenshot({ path: `${OUT}/${id}-${tag}-2-mockA-godstrike.png` })
      await page.evaluate(() => document.getElementById('mockStrike')?.remove())
    }
  }
  await page.close()
}
await browser.close()
console.log('mock done')

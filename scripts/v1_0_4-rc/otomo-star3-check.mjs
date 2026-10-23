// v1.0.4 Production Smoke：OTOMO 絆 ★3 の到達条件（Retention 束 ①）を実画面で確認する（Playwright headless・QA 用。ゲームコードではない）。
//   node scripts/v1_0_4-rc/otomo-star3-check.mjs <outJson> <baseUrl> [--expect v104|v103]
// 隔離プロファイルの localStorage に sevengods.otomoBond（version 1）を注入し、Home →「OTOMOとの絆を見る」で各神の札を読む。
//   大耀（taiyo）：12pt＝Lv5・童子 0 → v1.0.4 は ★3「固い絆で結ばれた相棒」・次の解放「童子の記録（…解放）」・童子の形態は未解放
//                                     v1.0.3 は ★2（童子条件が必要）
//   恵比寿（ebisu）：11pt＝Lv4・童子 0 → どちらも ★2・次の解放「固い絆…（あと 1pt）」（Lv5 未満は従来どおり＝降格・昇格なし）
//   蒼毘（sobi）：12pt＝Lv5・童子 1 → どちらも ★3・次の解放なし・童子の形態は解放（既存の ★3 は不変）
// 実ユーザーの保存には触れない（新しいブラウザコンテキスト）。外部通信・JS error も数える。
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const [out, base] = args
if (!out || !base) throw new Error('usage: otomo-star3-check.mjs <outJson> <baseUrl> [--expect v104|v103]')
const expect = args.includes('--expect') ? args[args.indexOf('--expect') + 1] : 'v104'
mkdirSync(dirname(out), { recursive: true })
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const FIXTURE = {
  version: 1,
  records: {
    taiyo: { battlesPlayed: 6, resonanceCount: 12, dojiReached: 0 },
    ebisu: { battlesPlayed: 5, resonanceCount: 11, dojiReached: 0 },
    sobi: { battlesPlayed: 6, resonanceCount: 12, dojiReached: 1 },
  },
}
const GOD_NAME = { taiyo: '大耀', ebisu: '恵比寿', sobi: '蒼毘' }
const TITLE3 = '固い絆で結ばれた相棒'

const checks = []
const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail })

const browser = await chromium.launch({ headless: true })
const report = { base, expect, at: new Date().toISOString(), viewports: {} }
for (const vp of [{ id: 'pc1508', viewport: { width: 1508, height: 660 } }, { id: 'sp375', viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true }]) {
  const ctx = await browser.newContext({ viewport: vp.viewport, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch })
  const page = await ctx.newPage()
  const errors = []
  const external = []
  const origin = new URL(base).origin
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()))
  page.on('request', (r) => { if (!r.url().startsWith(origin) && !r.url().startsWith('data:')) external.push(r.url()) })
  await page.addInitScript((fx) => {
    try { if (!localStorage.getItem('sevengods.otomoBond')) localStorage.setItem('sevengods.otomoBond', JSON.stringify(fx)) } catch {}
  }, FIXTURE)
  await page.goto(base + '/', { waitUntil: 'networkidle' })
  await page.waitForSelector('.home-screen', { timeout: 30000 })
  await page.getByRole('button', { name: 'わかった' }).first().click({ timeout: 2000 }).catch(() => {})
  await page.getByRole('button', { name: /OTOMOとの絆を見る/ }).first().click({ timeout: 8000 })
  await page.waitForSelector('.otomo-growth-grid', { timeout: 10000 })
  await page.waitForTimeout(500)
  const cards = await page.evaluate(() => [...document.querySelectorAll('.otomo-growth-body')].map((b) => {
    const card = b.parentElement
    return {
      god: b.querySelector('.otomo-growth-god')?.textContent.trim() ?? '',
      level: b.querySelector('.otomo-growth-level')?.textContent.trim() ?? '',
      rank: b.querySelector('.otomo-growth-rank-stars')?.getAttribute('title') ?? '',
      title: b.querySelector('.otomo-growth-title-text')?.textContent.trim() ?? '',
      nextUnlock: b.querySelector('.otomo-growth-next-unlock')?.textContent.trim() ?? null,
      lockedForms: [...(card ?? b).querySelectorAll('.otomo-growth-gallery-slot')].map((s) => s.getAttribute('title')),
    }
  }))
  await page.screenshot({ path: `${dirname(out)}/otomo-${expect}-${vp.id}.png` })
  const stored = await page.evaluate(() => localStorage.getItem('sevengods.otomoBond'))
  await ctx.close()
  const of = (id) => cards.find((c) => c.god.startsWith(GOD_NAME[id])) ?? null
  const t = of('taiyo')
  const e = of('ebisu')
  const s = of('sobi')
  const v = vp.id
  if (expect === 'v104') {
    check(`${v}/大耀 Lv5・童子 0 → ★3「${TITLE3}」`, t?.level === 'Lv.5' && t?.rank === '絆ランク 3/3' && t?.title === `「${TITLE3}」`, t)
    check(`${v}/大耀 次の解放＝童子の記録（童子形態で対局を終えると解放）・童子は未解放`, /童子の記録（童子形態で対局を終えると解放）/.test(t?.nextUnlock ?? '') && t?.lockedForms?.some((x) => /未解放/.test(x ?? '')), t)
  } else {
    check(`${v}/大耀 Lv5・童子 0 → ★2（v1.0.3：童子条件が必要）`, t?.level === 'Lv.5' && t?.rank === '絆ランク 2/3', t)
  }
  check(`${v}/恵比寿 Lv4 → ★2・固い絆まであと 1pt（Lv5 未満は不変）`, e?.level === 'Lv.4' && e?.rank === '絆ランク 2/3' && /あと1pt/.test(e?.nextUnlock ?? ''), e)
  check(`${v}/蒼毘 Lv5・童子 1 → ★3・次の解放なし（既存の ★3 は不変）`, s?.level === 'Lv.5' && s?.rank === '絆ランク 3/3' && s?.nextUnlock === null, s)
  check(`${v}/保存は読み込みで不変`, stored === JSON.stringify(FIXTURE), stored === JSON.stringify(FIXTURE))
  check(`${v}/JS error 0・外部通信 0`, errors.length === 0 && external.length === 0, { errors, external })
  report.viewports[v] = { cards, errors, external }
}
await browser.close()
report.checks = checks
report.pass = checks.filter((c) => c.ok).length
report.total = checks.length
writeFileSync(out, JSON.stringify(report, null, 2))
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.ok ? '' : '  ' + JSON.stringify(c.detail).slice(0, 300)}`)
console.log(`${report.pass}/${report.total}`)
process.exit(report.pass === report.total ? 0 : 1)

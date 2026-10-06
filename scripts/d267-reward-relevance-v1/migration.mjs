// 決定267 Release Gate：localStorage migration（Gate 項目 15）。
//
//   node scripts/d267-reward-relevance-v1/migration.mjs <outDir> <url>
//
// 旧データを持つ端末を再現し、通常勝利 → 報酬 3 択 → 1 枚選択 まで進めて確認する：
//   M1 既存 `sevengods.rewardBonuses`（version 1）は形式不変のまま読まれ、選んだ札だけ +1 される（既存 bonus は保持）
//   M2 壊れた／version 違いの `sevengods.rewardHistory` は空として扱われ（3 択は成立）、確定時に version 1 で書き直される
//   M3 `sevengods.deckPreference`・`sevengods.records` など他 key は触られない（内容一致）
//   M4 bonus>0 かつ編成が上限未満の札（余り枠あり）は 3 択に出ない（D4）
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const outDir = process.argv[2] ?? 'scripts/d267-reward-relevance-v1/out-migration'
const base = (process.argv[3] ?? 'http://127.0.0.1:4306').replace(/\/$/, '')
mkdirSync(outDir, { recursive: true })

const OLD_BONUSES = JSON.stringify({ version: 1, bonuses: { ebisu: { card_common_attack_01: 1 }, taiyo: { card_taiyo_attack_01: 2 } } })
const BROKEN_HISTORY = '{"version":2,"gods":{"ebisu":{"offered":["card_common_guard_01"],"declined":"x"}}}'
const RECORDS = JSON.stringify({ version: 1, records: { ebisu: { bestScore: 0, bestScoreDifficulty: null, bestBattleScore: 620, bestBattleScoreDifficulty: 'normal', wins: 3, losses: 1, finished: 0, fastestWinRound: 4 } } })

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript((s) => {
  if (sessionStorage.getItem('__d267m_seeded')) return
  for (const k in s) localStorage.setItem(k, s[k])
  sessionStorage.setItem('__d267m_seeded', '1')
}, { 'sevengods.rewardBonuses': OLD_BONUSES, 'sevengods.rewardHistory': BROKEN_HISTORY, 'sevengods.records': RECORDS })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()))

const clickText = (t) =>
  page.evaluate((t) => {
    const el = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(t) && !x.disabled)
    if (!el) return false
    el.click()
    return true
  }, t)
const clickSel = (s) =>
  page.evaluate((s) => {
    const el = document.querySelector(s)
    if (!el || el.disabled) return false
    el.click()
    return true
  }, s)
const raw = (k) => page.evaluate((k) => localStorage.getItem(k), k)

await page.goto(`${base}/?seed=d267-u1-pc`)
await page.waitForSelector('.home-screen .home-cta-primary', { timeout: 30000 })
await page.waitForTimeout(400)
if (await clickText('わかった')) await page.waitForTimeout(400)
const before = { bonuses: await raw('sevengods.rewardBonuses'), history: await raw('sevengods.rewardHistory'), records: await raw('sevengods.records'), deckPref: await raw('sevengods.deckPreference') }
if (!(await clickSel('[data-testid="home-start"]'))) await clickText('神を選ぶ')
await page.waitForTimeout(400)
if (await clickText('新しく始める')) await page.waitForTimeout(400)
await clickText('恵比寿')
await page.waitForTimeout(300)
await clickText('この構成で始める')
await page.waitForTimeout(300)
await clickText('試練の影')
await page.waitForTimeout(400)
await clickText('この構成でバトル開始')
await page.waitForSelector('.hand .card-view', { timeout: 20000 })
await page.waitForFunction(() => {
  const b = document.querySelector('.end-round-button')
  return b && !b.disabled
}, null, { timeout: 20000 })
await page.waitForTimeout(400)
const deckPrefAfterStart = await raw('sevengods.deckPreference')

const over = () => page.evaluate(() => !!document.querySelector('.reward-overlay, .game-over-overlay, .enemy-defeat'))
for (let round = 1; round <= 8; round++) {
  if (await over()) break
  for (let k = 0; k < 8; k++) {
    const picked = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.hand .card-view')].filter((c) => !c.disabled)
      if (!cards.length) return false
      const name = (c) => c.querySelector('.card-view-name')?.textContent ?? ''
      const score = (c) => (/⚔|🌟|💀/.test(name(c)) ? 3 : 0) + (c.querySelector('.card-view-bonus-ready') ? 1.5 : 0)
      cards.sort((x, y) => score(y) - score(x))
      cards[0].click()
      return true
    })
    if (!picked) break
    await page.waitForTimeout(850)
    if (await over()) break
  }
  if (await over()) break
  await page.evaluate(() => document.querySelectorAll('.divination-choice')[2]?.click())
  await page.waitForTimeout(400)
  await clickSel('.end-round-button')
  await page.waitForTimeout(3300)
}
await page.waitForFunction(() => !!document.querySelector('.reward-overlay, .game-over-overlay'), null, { timeout: 25000 })
await page.waitForTimeout(2600)
const status = await page.evaluate(() => document.querySelector('.game-over-status')?.textContent.trim() ?? null)
let reward = null
let after = null
if (status === '勝利') {
  await page.waitForSelector('[data-testid="open-reward"]', { timeout: 15000 })
  await page.waitForTimeout(400)
  await clickSel('[data-testid="open-reward"]')
  await page.waitForSelector('.reward-overlay .reward-card', { timeout: 10000 })
  await page.waitForTimeout(500)
  reward = await page.evaluate(() => [...document.querySelectorAll('.reward-overlay .reward-card')].map((c) => ({ id: c.getAttribute('data-card-id'), role: c.getAttribute('data-role'), now: c.querySelector('.reward-copies-now')?.textContent.trim(), limit: c.querySelector('.reward-copies-limit')?.textContent.trim() })))
  await page.screenshot({ path: join(outDir, 'migration-reward.png') })
  await clickSel('.reward-overlay .reward-card')
  await page.waitForSelector('[data-testid="result-hub"]', { timeout: 15000 })
  await page.waitForTimeout(500)
  after = { bonuses: await raw('sevengods.rewardBonuses'), history: await raw('sevengods.rewardHistory'), records: await raw('sevengods.records'), deckPref: await raw('sevengods.deckPreference') }
}
await browser.close()

const j = (s) => (s ? JSON.parse(s) : null)
const picked = reward?.[0]?.id ?? null
const ab = j(after?.bonuses)
const ah = j(after?.history)
const checks = [
  { label: '前提：勝利', pass: status === '勝利' },
  { label: 'M1 既存 rewardBonuses v1 を読める（起動時に書き換えない）', pass: before.bonuses === OLD_BONUSES },
  { label: 'M1 既存 bonus 保持（taiyo:2・ebisu 一撃:1）＋ 選んだ札 +1', pass: !!ab && ab.version === 1 && ab.bonuses.taiyo.card_taiyo_attack_01 === 2 && ab.bonuses.ebisu.card_common_attack_01 === 1 + (picked === 'card_common_attack_01' ? 1 : 0) && ab.bonuses.ebisu[picked] >= 1 },
  { label: 'M2 壊れた rewardHistory は起動時に消されない', pass: before.history === BROKEN_HISTORY },
  { label: 'M2 3 択は成立（3 枚・重複なし）', pass: !!reward && reward.length === 3 && new Set(reward.map((c) => c.id)).size === 3 },
  { label: 'M2 確定時に version 1 で書き直され offered に 3 枚', pass: !!ah && ah.version === 1 && JSON.stringify(ah.gods.ebisu.offered) === JSON.stringify(reward?.map((c) => c.id)) && ah.gods.ebisu.declined.length === 0 },
  { label: 'M3 records 不変（勝利記録以外の形式）', pass: !!after && j(after.records)?.version === 1 && j(after.records)?.records?.ebisu?.wins === 4 },
  { label: 'M3 deckPreference は編成確定で書かれ、報酬で変わらない', pass: !!after && after.deckPref === deckPrefAfterStart },
  { label: 'M4 余り枠あり（一撃 bonus1・編成 1 枚）は 3 択に出ない', pass: !!reward && !reward.some((c) => c.id === 'card_common_attack_01') },
  { label: 'console error 0', pass: errors.length === 0 },
]
writeFileSync(join(outDir, 'summary.json'), JSON.stringify({ base, status, before, deckPrefAfterStart, reward, after, errors, checks }, null, 2))
for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'} ${c.label}`)
console.log(`RESULT: ${checks.filter((c) => c.pass).length}/${checks.length} PASS`)
process.exit(checks.every((c) => c.pass) ? 0 : 1)

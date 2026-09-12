// Clean Release Audit：Production master のビルドで作ったセーブを RC ビルドで開く（Save Migration）。
//   PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/release-audit/save-migration.mjs <outJson> <masterBase> <rcBase>
//
// master 側で ①通常戦を決着まで（戦績・報酬・神階が保存される）②新しい通常戦を1ラウンド進めて中断
// ③神域挑戦を1回開始して1ラウンド進めて中断 の localStorage を実際に作り、
// RC 側にそのまま注入して「続きから」「戦績」「神域挑戦の残り回数」が欠けずに読めるかを確かめる。
import { writeFileSync } from 'node:fs'
import { loadChromium, clickText, watch, gotoHome, BATTLE_METRICS, RESULT_METRICS, playToEnd, dumpStorage } from './_lib.mjs'

const [outJson = 'release-audit-migration.json', masterBase = 'http://localhost:4182', rcBase = 'http://localhost:4181'] = process.argv.slice(2)
const chromium = await loadChromium()
const browser = await chromium.launch()
const vp = { viewport: { width: 1508, height: 660 } }
const report = { masterBase, rcBase, at: new Date().toISOString() }

async function waitBattle(page) {
  await page.waitForSelector('.hand .card-view', { timeout: 15000 })
  await page.waitForFunction(() => { const e = document.querySelector('.end-round-button'); return e && !e.disabled }, null, { timeout: 20000 })
  await page.waitForTimeout(500)
}
async function startNormal(page, base, seed) {
  await gotoHome(page, base, '?enemy=oni&seed=' + seed)
  await clickText(page, '神を選ぶ'); await page.waitForTimeout(400)
  if (await clickText(page, '新しく始める')) await page.waitForTimeout(300)
  await clickText(page, '大耀'); await page.waitForTimeout(300)
  await clickText(page, 'この構成で始める'); await page.waitForTimeout(400)
  await clickText(page, '業斧の鬼将'); await page.waitForTimeout(500)
  await clickText(page, 'この構成でバトル開始')
  await waitBattle(page)
}
async function oneRound(page) {
  await page.evaluate(() => { const c = [...document.querySelectorAll('.hand .card-view')].find((c) => !c.disabled); c?.click() })
  await page.waitForTimeout(1200)
  await page.evaluate(() => document.querySelector('.end-round-button')?.click())
  await page.waitForTimeout(3200)
  return await page.evaluate('(' + BATTLE_METRICS + ')()')
}
const saveSummary = (raw) => {
  if (!raw) return null
  const j = JSON.parse(raw); const s = j.state
  return { version: j.version, mode: s.mode, dailyKey: s.dailyKey ?? null, godId: s.godId, round: s.round, status: s.status, hand: s.hand.length, deck: s.deck.length, playerHp: s.player?.hp ?? null, enemyHp: s.enemy?.hp ?? null, enemyId: s.enemy?.id ?? s.enemyId ?? null }
}
const dailySummary = (raw) => (raw ? Object.values(JSON.parse(raw).days).map((d) => ({ dateKey: d.dateKey, enemyId: d.enemyId, seed: d.seed, attemptsUsed: d.attemptsUsed, results: d.results.length })) : null)

// ---- master: 通常戦を決着まで → 新しい通常戦を1ラウンド → 中断 ----
const mctx = await browser.newContext(vp)
const mp = await mctx.newPage()
const mnet = watch(mp, masterBase)
await startNormal(mp, masterBase, 'migrate-a')
const mplay = await playToEnd(mp, { pumpPath: outJson + '.pump.png' })
const mresult = await mp.evaluate('(' + RESULT_METRICS + ')()')
if (await clickText(mp, '報酬カードを選ぶ')) { await mp.waitForTimeout(600); await mp.evaluate(() => document.querySelector('.reward-card')?.click()); await mp.waitForTimeout(600) }
await startNormal(mp, masterBase, 'migrate-b')
const mmid = await oneRound(mp)
const normalDump = await dumpStorage(mp)
report.master = { play: mplay, result: { status: mresult.status, score: mresult.score }, midBattle: { round: mmid.round, hand: mmid.handCards }, save: saveSummary(normalDump['sevengods.battleSave']), keys: Object.keys(normalDump).sort(), records: normalDump['sevengods.records'] ? JSON.parse(normalDump['sevengods.records']) : null, errors: mnet.errors }
await mctx.close()

// ---- master: 神域挑戦を1回開始 → 1ラウンド → 中断 ----
const dctx = await browser.newContext(vp)
const dp = await dctx.newPage()
await gotoHome(dp, masterBase)
await clickText(dp, '今日の神域挑戦'); await dp.waitForTimeout(800)
const dailyBefore = await dp.evaluate(() => document.querySelector('.home-cta-primary')?.textContent.trim())
await clickText(dp, '挑戦開始'); await dp.waitForTimeout(400)
if (await clickText(dp, '新しく始める')) await dp.waitForTimeout(300)
await clickText(dp, '大耀'); await dp.waitForTimeout(500)
await clickText(dp, 'この構成でバトル開始')
await waitBattle(dp)
const dmid = await oneRound(dp)
const dailyDump = await dumpStorage(dp)
report.masterDaily = { startLabelBefore: dailyBefore, midBattle: { round: dmid.round, hand: dmid.handCards, dailyTag: dmid.dailyTag }, save: saveSummary(dailyDump['sevengods.battleSave']), daily: dailySummary(dailyDump['sevengods.daily']) }
await dctx.close()

// ---- RC 側に注入 ----
async function inject(dump) {
  const ctx = await browser.newContext(vp)
  await ctx.addInitScript((d) => {
    if (sessionStorage.getItem('__injected')) return
    localStorage.clear()
    for (const [k, v] of Object.entries(d)) localStorage.setItem(k, v)
    sessionStorage.setItem('__injected', '1')
  }, dump)
  const page = await ctx.newPage()
  return { ctx, page, net: watch(page, rcBase) }
}
async function openHome(page) {
  await page.goto(rcBase + '/', { waitUntil: 'load' })
  await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
  await page.waitForTimeout(600)
  await clickText(page, 'わかった'); await page.waitForTimeout(300)
}
{
  const { ctx, page, net } = await inject(normalDump)
  await openHome(page)
  const resumeLabel = await page.evaluate(() => document.querySelector('.home-cta-secondary')?.textContent.trim() ?? null)
  await page.evaluate(() => document.querySelector('.home-cta-secondary')?.click())
  await page.waitForSelector('.hand .card-view', { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(800)
  const resumed = await page.evaluate('(' + BATTLE_METRICS + ')()')
  const rcSave = saveSummary((await dumpStorage(page))['sevengods.battleSave'])
  const play = await playToEnd(page, { pumpPath: outJson + '.pump.png' })
  const result = await page.evaluate('(' + RESULT_METRICS + ')()')
  await openHome(page)
  await clickText(page, '戦績を見る'); await page.waitForTimeout(800)
  const recordsText = await page.evaluate(() => document.body.textContent.replace(/\s+/g, ' ').slice(0, 600))
  const after = await dumpStorage(page)
  report.rcNormal = {
    resumeLabel,
    resumed: { round: resumed.round, hand: resumed.handCards, enemyInView: resumed.enemy?.inView, endRound: resumed.endRoundEnabled },
    saveAfterLoad: rcSave,
    playedToEnd: { status: result.status, rounds: play.rounds },
    keysAfter: Object.keys(after).sort(),
    recordsPreserved: after['sevengods.records'] === normalDump['sevengods.records'] || (!!after['sevengods.records'] && after['sevengods.records'].length >= normalDump['sevengods.records'].length),
    rewardPreserved: after['sevengods.rewardBonuses'] === normalDump['sevengods.rewardBonuses'],
    stakesPreserved: after['sevengods.stakes'] === normalDump['sevengods.stakes'],
    recordsText,
    network: { api: net.api, external: net.external, errors: net.errors },
  }
  await ctx.close()
}
{
  const { ctx, page, net } = await inject(dailyDump)
  await openHome(page)
  const resumeLabel = await page.evaluate(() => document.querySelector('.home-cta-secondary')?.textContent.trim() ?? null)
  await page.evaluate(() => document.querySelector('.home-cta-secondary')?.click())
  await page.waitForSelector('.hand .card-view', { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(800)
  const resumed = await page.evaluate('(' + BATTLE_METRICS + ')()')
  const play = await playToEnd(page, { pumpPath: outJson + '.pump.png' })
  const result = await page.evaluate('(' + RESULT_METRICS + ')()')
  await openHome(page)
  await clickText(page, '今日の神域挑戦'); await page.waitForTimeout(800)
  const startLabel = await page.evaluate(() => document.querySelector('.home-cta-primary')?.textContent.trim() ?? null)
  const after = await dumpStorage(page)
  report.rcDaily = {
    resumeLabel,
    resumed: { round: resumed.round, hand: resumed.handCards, dailyTag: resumed.dailyTag },
    result: { status: result.status, daily: result.daily, rounds: play.rounds },
    startLabelAfter: startLabel,
    daily: dailySummary(after['sevengods.daily']),
    network: { api: net.api, external: net.external, errors: net.errors },
  }
  await ctx.close()
}
await browser.close()
writeFileSync(outJson, JSON.stringify(report, null, 2))
console.log(JSON.stringify({ master: { save: report.master.save, result: report.master.result, keys: report.master.keys }, masterDaily: { save: report.masterDaily.save, daily: report.masterDaily.daily }, rcNormal: { ...report.rcNormal, recordsText: undefined }, rcDaily: report.rcDaily }, null, 1))

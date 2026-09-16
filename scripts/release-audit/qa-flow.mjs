// Clean Release Audit：RC ビルドの通し QA（PC 1366×768／1508×660、Mobile 390×760／390×844）。
//   PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/release-audit/qa-flow.mjs <outJson> [baseUrl] [--shots <dir>]
//
// 各 viewport で
//   A) 通常戦：Home → 神選択 → 難易度 → 敵選択 → デッキ → 戦闘（実測）→ リロードして「続きから」再開 →
//      決着まで自動プレイ（神の一撃・6-C callout・最終打・HP ghost を観測）→ 結果（振り返り）→ 報酬
//   B) 神域挑戦：Home → 今日の神域挑戦 → 挑戦開始 → 神 → デッキ → 戦闘（daily tag）→ 決着 → 残り回数 → 戦績
//   C) 敗北（pc1508 のみ）：カードを出さず End Round だけで決着させ、敗北画面を確認
// を通し、全リクエストを記録して「/api/・ranking・外部オリジンへの通信が 0」を機械で確かめる。
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadChromium, VIEWPORTS, clickText, watch, gotoHome, BATTLE_METRICS, RESULT_METRICS, playToEnd, dumpStorage, openDailyFromHome, resumeLabel, clickResume } from './_lib.mjs'

const args = process.argv.slice(2)
const outJson = args[0] ?? 'release-audit-qa.json'
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:4181'
const shots = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null
if (shots) mkdirSync(shots, { recursive: true })
const chromium = await loadChromium()
const browser = await chromium.launch()
const report = { base, at: new Date().toISOString(), viewports: {} }

const waitBattle = async (page) => {
  await page.waitForSelector('.hand .card-view', { timeout: 15000 })
  await page.waitForFunction(() => { const e = document.querySelector('.end-round-button'); return e && !e.disabled }, null, { timeout: 20000 })
  await page.waitForTimeout(700)
}
const startNormal = async (page, seed) => {
  await gotoHome(page, base, '?enemy=oni&seed=' + seed)
  await clickText(page, '神を選ぶ'); await page.waitForTimeout(500)
  if (await clickText(page, '新しく始める')) await page.waitForTimeout(300)
  await clickText(page, '大耀'); await page.waitForTimeout(400)
  await clickText(page, 'この構成で始める'); await page.waitForTimeout(500)
  await clickText(page, '業斧の鬼将'); await page.waitForTimeout(600)
  await clickText(page, 'この構成でバトル開始')
  await waitBattle(page)
}

for (const [id, vp] of Object.entries(VIEWPORTS)) {
  const ctx = await browser.newContext({ viewport: vp.viewport, isMobile: vp.isMobile, hasTouch: vp.isMobile })
  const page = await ctx.newPage()
  const net = watch(page, base)
  const shot = async (n) => { if (shots) { await page.screenshot({ path: join(shots, '_pump.png') }); await page.screenshot({ path: join(shots, id + '-' + n + '.png') }) } }
  const R = { A: {}, B: {}, C: null }

  // ---- A) 通常戦 ----
  await gotoHome(page, base, '?enemy=oni&seed=rc-audit')
  await shot('a01-home')
  await clickText(page, '神を選ぶ'); await page.waitForTimeout(500)
  if (await clickText(page, '新しく始める')) await page.waitForTimeout(300)
  await shot('a02-god')
  await clickText(page, '大耀'); await page.waitForTimeout(400)
  await shot('a03-difficulty')
  await clickText(page, 'この構成で始める'); await page.waitForTimeout(500)
  await shot('a04-enemy')
  await clickText(page, '業斧の鬼将'); await page.waitForTimeout(600)
  await shot('a05-deck')
  await clickText(page, 'この構成でバトル開始')
  await waitBattle(page)
  R.A.battle = await page.evaluate('(' + BATTLE_METRICS + ')()')
  await shot('a06-battle')
  // 1枚出して End Round → 中断 → 続きから
  await page.evaluate(() => { const c = [...document.querySelectorAll('.hand .card-view')].find((c) => !c.disabled); c?.click() })
  await page.waitForTimeout(1200)
  await page.evaluate(() => document.querySelector('.end-round-button')?.click())
  await page.waitForTimeout(3200)
  const beforeReload = await page.evaluate('(' + BATTLE_METRICS + ')()')
  const savedRaw = (await dumpStorage(page))['sevengods.battleSave']
  const saved = savedRaw ? JSON.parse(savedRaw) : null
  R.A.saveBeforeReload = { round: beforeReload.round, hand: beforeReload.handCards, savedVersion: saved?.version ?? null, savedRound: saved?.state.round ?? null }
  await page.goto(base + '/?enemy=oni&seed=rc-audit', { waitUntil: 'load' })
  await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
  await page.waitForTimeout(500)
  R.A.resumeButton = await resumeLabel(page)
  await shot('a07-home-resume')
  await clickResume(page)
  await page.waitForSelector('.hand .card-view', { timeout: 15000 })
  await page.waitForTimeout(800)
  R.A.resumed = await page.evaluate('(' + BATTLE_METRICS + ')()')
  await shot('a08-resumed')
  R.A.play = await playToEnd(page, { onStrike: () => shot('a09-god-strike'), pumpPath: outJson + '.pump.png' })
  R.A.result = await page.evaluate('(' + RESULT_METRICS + ')()')
  await shot('a10-result')
  if (await clickText(page, '報酬カードを選ぶ')) {
    await page.waitForTimeout(700)
    R.A.reward = await page.evaluate(() => ({ overlay: !!document.querySelector('.reward-overlay'), cards: [...document.querySelectorAll('.reward-card-name')].map((e) => e.textContent.trim()) }))
    await shot('a11-reward')
    await page.evaluate(() => document.querySelector('.reward-card')?.click())
    await page.waitForTimeout(800)
    R.A.afterReward = await page.evaluate('(' + RESULT_METRICS + ')()')
    await shot('a12-after-reward')
  }
  await gotoHome(page, base)
  R.A.homeAfter = await page.evaluate(() => ({ home: !!document.querySelector('.home-cta-primary'), resume: [...document.querySelectorAll('.home-screen button')].find((b) => b.textContent.trim().startsWith('続きから'))?.textContent.trim() ?? null }))

  // ---- B) 神域挑戦 ----
  await gotoHome(page, base)
  await openDailyFromHome(page); await page.waitForTimeout(900)
  R.B.screen = await page.evaluate(() => ({
    startLabel: document.querySelector('.home-cta-primary')?.textContent.trim() ?? null,
    text: document.body.textContent.replace(/\s+/g, ' ').slice(0, 400),
    rankingUi: !!document.querySelector('[class*="ranking"]'),
    rankingWord: /ランキング|順位|leaderboard/i.test(document.body.textContent),
  }))
  await shot('b01-daily')
  await clickText(page, '挑戦開始'); await page.waitForTimeout(500)
  if (await clickText(page, '新しく始める')) await page.waitForTimeout(300)
  await clickText(page, '大耀'); await page.waitForTimeout(600)
  await shot('b02-daily-deck')
  await clickText(page, 'この構成でバトル開始')
  await waitBattle(page)
  R.B.battle = await page.evaluate('(' + BATTLE_METRICS + ')()')
  const st = await dumpStorage(page)
  const dailyRaw = st['sevengods.daily']
  const dailySave = st['sevengods.battleSave'] ? JSON.parse(st['sevengods.battleSave']).state : null
  R.B.storage = {
    daily: dailyRaw ? Object.values(JSON.parse(dailyRaw).days).map((d) => ({ dateKey: d.dateKey, enemyId: d.enemyId, seed: d.seed, attemptsUsed: d.attemptsUsed })) : null,
    save: dailySave ? { mode: dailySave.mode, dailyKey: dailySave.dailyKey, seed: dailySave.seed ?? null } : null,
  }
  await shot('b03-daily-battle')
  R.B.play = await playToEnd(page, { pumpPath: outJson + '.pump.png' })
  R.B.result = await page.evaluate('(' + RESULT_METRICS + ')()')
  await shot('b04-daily-result')
  await gotoHome(page, base)
  await openDailyFromHome(page); await page.waitForTimeout(900)
  R.B.after = await page.evaluate(() => ({ startLabel: document.querySelector('.home-cta-primary')?.textContent.trim() ?? null }))
  await shot('b05-daily-after')
  await clickText(page, 'ホームへ戻る'); await page.waitForTimeout(500)
  await clickText(page, '戦績を見る'); await page.waitForTimeout(800)
  R.B.records = await page.evaluate(() => ({ dailyEmpty: !!document.querySelector('.record-daily-empty'), text: document.querySelector('.record-daily')?.textContent.replace(/\s+/g, ' ').slice(0, 200) ?? '' }))
  await shot('b06-records')

  // ---- C) 敗北（pc1508 のみ）----
  if (id === 'pc1508') {
    await startNormal(page, 'rc-audit-defeat')
    const play = await playToEnd(page, { noCards: true, pumpPath: outJson + '.pump.png' })
    const result = await page.evaluate('(' + RESULT_METRICS + ')()')
    await shot('c01-defeat')
    R.C = { play, result }
  }

  R.network = { total: net.requests.length, external: net.external, api: net.api, failed: net.failed, errors: net.errors, hosts: [...new Set(net.requests.map((u) => { try { return new URL(u).host } catch { return u.slice(0, 20) } }))] }
  report.viewports[id] = R
  const a = R.A, b = R.B
  console.log('[' + id + '] battle scroll=' + a.battle.scrollY + ' ox=' + a.battle.overflowX + ' enemy=' + a.battle.enemy?.inView + ' intent=' + a.battle.intent?.inView + '(' + a.battle.intentText + ') hand=' + a.battle.handEnabled + '/' + a.battle.handCards + ' end=' + a.battle.endRoundEnabled +
    ' | resume="' + a.resumeButton + '" round=' + a.resumed.round + ' | strike=' + a.play.godStrike + ' callouts=' + a.play.callout.length + ' blow=' + a.play.finalBlow + ' ghost=' + a.play.hpGhost +
    ' | ' + a.result.status + ' recap=' + a.result.recap.length + ' buttons=' + JSON.stringify(a.result.buttons) + ' reward=' + (a.reward?.cards?.length ?? 0) +
    ' | daily tag=' + b.battle.dailyTag + ' ' + JSON.stringify(b.storage.daily) + ' -> ' + b.result.status + ' "' + b.result.daily + '" after="' + b.after.startLabel + '" rankingUi=' + b.result.hasRankingUi + '/' + b.screen.rankingUi +
    ' | net total=' + R.network.total + ' external=' + R.network.external.length + ' api=' + R.network.api.length + ' failed=' + R.network.failed.length + ' errors=' + R.network.errors.length +
    (R.C ? ' | defeat: ' + R.C.result.status + ' cause="' + R.C.result.defeatCause + '" recap=' + R.C.result.recap.length : ''))
  await ctx.close()
}
await browser.close()
writeFileSync(outJson, JSON.stringify(report, null, 2))
console.log('written', outJson)

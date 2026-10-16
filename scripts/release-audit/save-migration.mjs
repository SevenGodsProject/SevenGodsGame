// Clean Release Audit：Production master のビルドで作ったセーブを RC ビルドで開く（Save Migration）。
//   PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/release-audit/save-migration.mjs <outJson> <masterBase> <rcBase>
//   スクリーンショットは <outJson> と同じディレクトリに置く（500KB 超の PNG は同名 .webp に変換して PNG を消す）。
//
// master 側で実際の localStorage を 2 種類作る：
//   A（normal）：①通常戦を決着まで（records・stakes・otomoBond・rewardBonuses が保存される）②神域挑戦を決着まで（daily に results）
//               ③新しい通常戦を 1 ラウンド進めて中断（battleSave）→ 途中セーブ＋決着後データが同居した状態
//   B（daily） ：神域挑戦を 1 回開始して 1 ラウンド進めて中断（battleSave mode=daily・attemptsUsed 1）
// 同じ storage で master 自身の Home／戦績／「続きから」を観測して期待値にし、RC 側に注入して PC と SP375 で
// 「同じラウンド・HP・手札で復元」「戦績・神域の記録が欠けずに表示」「Home の version 表示が不変」「JS error 0」を数える。
//
// 2026-10-17（v1.0.1 G8）：決着まで進まなかった原因は headless shell の screenshot pump（1 枚 ≈2.6 s・cut-in 1 回 ≈35 s）。
// 新 headless（channel:'chromium'）では animation が自走するので pump 無しで回す（3 R・約 24 s で決着を実測）。無ければ従来 pump に戻る。
import { mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { loadChromium, clickText, watch, gotoHome, BATTLE_METRICS, RESULT_METRICS, playToEnd, dumpStorage, openDailyFromHome, resumeLabel, clickResume } from './_lib.mjs'

const [outJson = 'release-audit-migration.json', masterBase = 'http://localhost:4182', rcBase = 'http://localhost:4181'] = process.argv.slice(2)
const shotDir = dirname(outJson)
mkdirSync(shotDir, { recursive: true })
const chromium = await loadChromium()
let browser
let pump = false
try {
  browser = await chromium.launch({ channel: 'chromium' })
} catch (e) {
  console.log('info  channel:chromium unavailable (' + String(e).split('\n')[0] + ') → headless shell + screenshot pump')
  browser = await chromium.launch()
  pump = true
}
const PLAY = { pump, pumpPath: outJson + '.pump.png', timeoutMs: 240000 }
// channel:'chromium' では context／browser の close() が返らないことがある（初回実測・全 45 check PASS 後に停止）。15 秒で諦めて先へ進む
const closeSafe = (target) => Promise.race([target.close().catch(() => {}), new Promise((r) => setTimeout(r, 15000))])
const VIEWPORTS = {
  pc: { viewport: { width: 1508, height: 660 } },
  sp375: { viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true },
}
const rcVersion = JSON.parse(readFileSync('package.json', 'utf8')).version
const report = { masterBase, rcBase, at: new Date().toISOString(), headless: pump ? 'shell+pump' : 'channel:chromium', rcVersion, checks: [] }
const check = (id, ok, detail) => { report.checks.push({ id, ok: !!ok, detail }); console.log((ok ? 'PASS' : 'FAIL') + '  ' + id + (detail === undefined ? '' : ': ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)))) }

async function shot(page, name, fullPage = false) {
  const png = `${shotDir}/${name}.png`
  await page.screenshot({ path: png, fullPage })
  const size = statSync(png).size
  if (size <= 500 * 1024) return { file: `${name}.png`, bytes: size }
  const dataUrl = 'data:image/png;base64,' + readFileSync(png).toString('base64')
  const webp = await page.evaluate(async (src) => {
    const img = new Image()
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src })
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    c.getContext('2d').drawImage(img, 0, 0)
    return c.toDataURL('image/webp', 0.82)
  }, dataUrl)
  writeFileSync(`${shotDir}/${name}.webp`, Buffer.from(webp.split(',')[1], 'base64'))
  unlinkSync(png)
  return { file: `${name}.webp`, bytes: statSync(`${shotDir}/${name}.webp`).size, pngBytes: size }
}

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
async function startDaily(page, base) {
  await gotoHome(page, base)
  await openDailyFromHome(page); await page.waitForTimeout(800)
  const label = await page.evaluate(() => document.querySelector('.home-cta-primary')?.textContent.trim() ?? null)
  await clickText(page, '挑戦開始'); await page.waitForTimeout(400)
  if (await clickText(page, '新しく始める')) await page.waitForTimeout(300)
  await clickText(page, '大耀'); await page.waitForTimeout(500)
  await clickText(page, 'この構成でバトル開始')
  await waitBattle(page)
  return label
}
async function oneRound(page) {
  await page.evaluate(() => { const c = [...document.querySelectorAll('.hand .card-view')].find((c) => !c.disabled); c?.click() })
  await page.waitForTimeout(1200)
  await page.evaluate(() => document.querySelector('.end-round-button')?.click())
  await page.waitForTimeout(3200)
  return await page.evaluate('(' + BATTLE_METRICS + ')()')
}
/** 復元一致の比較に使う戦闘画面の観測値（ビルドに依らない：ラウンド・AP・HP の数字・手札枚数・手札の名前） */
const BATTLE_VIEW = `() => {
  const norm = (s) => (s ?? '').replace(/\\s+/g, ' ').trim()
  const topbar = norm(document.querySelector('.battle-topbar')?.textContent)
  const body = norm(document.body.textContent)
  return {
    round: (topbar.match(/ラウンド\\s*(\\d)/) ?? body.match(/ラウンド\\s*(\\d)/) ?? [])[1] ?? null,
    topbar,
    hpPairs: body.match(/\\d[\\d,]*\\s*\\/\\s*\\d[\\d,]*/g) ?? [],
    handCards: document.querySelectorAll('.hand .card-view').length,
    handNames: [...document.querySelectorAll('.hand .card-view')].map((c) => norm(c.textContent).slice(0, 24)),
    dailyTag: !!document.querySelector('.battle-daily-tag'),
  }
}`
const HOME_VIEW = `() => {
  const norm = (s) => (s ?? '').replace(/\\s+/g, ' ').trim()
  return {
    version: norm(document.querySelector('[data-testid="home-version"]')?.textContent) || null,
    todayCta: norm(document.querySelector('[data-testid="home-today-cta"]')?.textContent) || null,
  }
}`
const RECORD_VIEW = `() => {
  const norm = (s) => (s ?? '').replace(/\\s+/g, ' ').trim()
  const root = document.querySelector('.record-screen') ?? document.body
  return {
    text: norm(root.textContent),
    cards: [...root.querySelectorAll('.record-card')].map((c) => norm(c.textContent)),
    dailyRows: [...root.querySelectorAll('.record-daily-table tbody tr')].map((r) => norm(r.textContent)),
  }
}`
const saveSummary = (raw) => {
  if (!raw) return null
  const j = JSON.parse(raw); const s = j.state
  return { version: j.version, mode: s.mode, dailyKey: s.dailyKey ?? null, godId: s.godId, round: s.round, status: s.status, hand: s.hand.length, deck: s.deck.length, playerHp: s.player?.hp ?? null, enemyHp: s.enemy?.hp ?? null, enemyId: s.enemy?.defId ?? s.enemy?.id ?? null }
}
const dailySummary = (raw) => (raw ? Object.values(JSON.parse(raw).days).map((d) => ({ dateKey: d.dateKey, enemyId: d.enemyId, seed: d.seed, attemptsUsed: d.attemptsUsed, results: d.results.length })) : null)
const recordsSummary = (raw) => (raw ? Object.fromEntries(Object.entries(JSON.parse(raw).records).map(([g, r]) => [g, { wins: r.wins, losses: r.losses, finished: r.finished, bestBattleScore: r.bestBattleScore }])) : null)
/** 保存済み対局 state の差分キー（復元後に RC が書き戻した battleSave と master の fixture を比べる） */
const stateDiff = (a, b) => {
  if (!a || !b) return ['(missing)']
  const sa = JSON.parse(a).state, sb = JSON.parse(b).state
  return [...new Set([...Object.keys(sa), ...Object.keys(sb)])].filter((k) => JSON.stringify(sa[k]) !== JSON.stringify(sb[k]))
}
async function observeHome(page, base, tag) {
  await gotoHome(page, base)
  const home = await page.evaluate('(' + HOME_VIEW + ')()')
  home.resume = await resumeLabel(page)
  home.shot = await shot(page, tag + '-home', true)
  return home
}
async function observeRecords(page, base, tag) {
  await gotoHome(page, base)
  await clickText(page, '戦績を見る'); await page.waitForTimeout(800)
  const rec = await page.evaluate('(' + RECORD_VIEW + ')()')
  rec.shot = await shot(page, tag + '-records', true)
  return rec
}
async function observeResume(page, base, tag) {
  await gotoHome(page, base)
  const clicked = await clickResume(page)
  await page.waitForSelector('.hand .card-view', { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(1500)
  const view = await page.evaluate('(' + BATTLE_VIEW + ')()')
  view.clicked = clicked
  view.shot = await shot(page, tag + '-resume')
  return view
}

// ---- master：fixture A（normal）----
const fixtures = {}
{
  const ctx = await browser.newContext(VIEWPORTS.pc)
  const page = await ctx.newPage()
  const net = watch(page, masterBase)
  await startNormal(page, masterBase, 'migrate-a')
  const playA = await playToEnd(page, PLAY)
  const resultA = await page.evaluate('(' + RESULT_METRICS + ')()')
  if (await clickText(page, '報酬カードを選ぶ')) { await page.waitForTimeout(600); await page.evaluate(() => document.querySelector('.reward-card')?.click()); await page.waitForTimeout(600) }
  const resultA2 = await page.evaluate('(' + RESULT_METRICS + ')()')
  const dailyLabelBefore = await startDaily(page, masterBase)
  const playD = await playToEnd(page, PLAY)
  const resultD = await page.evaluate('(' + RESULT_METRICS + ')()')
  await startNormal(page, masterBase, 'migrate-b')
  const mid = await oneRound(page)
  const dump = await dumpStorage(page)
  fixtures.normal = dump
  const home = await observeHome(page, masterBase, 'master-normal')
  const records = await observeRecords(page, masterBase, 'master-normal')
  const resume = await observeResume(page, masterBase, 'master-normal')
  const afterResume = await dumpStorage(page)
  report.masterNormal = {
    finishedNormal: { play: playA, status: resultA.status, score: resultA.score, buttonsAfterReward: resultA2.buttons },
    finishedDaily: { startLabelBefore: dailyLabelBefore, play: playD, status: resultD.status, daily: resultD.daily },
    midBattle: { round: mid.round, hand: mid.handCards },
    keys: Object.keys(dump).sort(),
    save: saveSummary(dump['sevengods.battleSave']),
    records: recordsSummary(dump['sevengods.records']),
    daily: dailySummary(dump['sevengods.daily']),
    home, records_screen: records, resume,
    saveRewrittenByMasterResume: stateDiff(dump['sevengods.battleSave'], afterResume['sevengods.battleSave']),
    errors: net.errors,
  }
  check('master A: 通常戦が決着（records 保存）', resultA.status && !playA.timedOut && !!dump['sevengods.records'], { status: resultA.status, rounds: playA.rounds, cards: playA.cardsPlayed, timedOut: playA.timedOut })
  check('master A: 神域挑戦が決着（daily results 1）', resultD.status && !playD.timedOut && report.masterNormal.daily?.[0]?.results === 1, { status: resultD.status, rounds: playD.rounds, daily: report.masterNormal.daily })
  check('master A: 途中セーブ（battleSave round 2・mode normal）', report.masterNormal.save?.round === 2 && report.masterNormal.save?.mode === 'normal', report.masterNormal.save)
  check('master A: JS error 0', net.errors.length === 0, net.errors)
  await closeSafe(ctx)
}
// ---- master：fixture B（daily 途中）----
{
  const ctx = await browser.newContext(VIEWPORTS.pc)
  const page = await ctx.newPage()
  const net = watch(page, masterBase)
  const labelBefore = await startDaily(page, masterBase)
  const mid = await oneRound(page)
  const dump = await dumpStorage(page)
  fixtures.daily = dump
  const home = await observeHome(page, masterBase, 'master-daily')
  const resume = await observeResume(page, masterBase, 'master-daily')
  report.masterDaily = { startLabelBefore: labelBefore, midBattle: { round: mid.round, hand: mid.handCards, dailyTag: mid.dailyTag }, keys: Object.keys(dump).sort(), save: saveSummary(dump['sevengods.battleSave']), daily: dailySummary(dump['sevengods.daily']), home, resume, errors: net.errors }
  check('master B: 神域挑戦の途中セーブ（mode daily・round 2）', report.masterDaily.save?.mode === 'daily' && report.masterDaily.save?.round === 2, report.masterDaily.save)
  check('master B: JS error 0', net.errors.length === 0, net.errors)
  await closeSafe(ctx)
}

// ---- RC 側に注入 ----
async function inject(vp, dump) {
  const ctx = await browser.newContext(VIEWPORTS[vp])
  await ctx.addInitScript((d) => {
    if (sessionStorage.getItem('__injected')) return
    localStorage.clear()
    for (const [k, v] of Object.entries(d)) localStorage.setItem(k, v)
    sessionStorage.setItem('__injected', '1')
  }, dump)
  const page = await ctx.newPage()
  return { ctx, page, net: watch(page, rcBase) }
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
report.rc = {}
for (const vp of Object.keys(VIEWPORTS)) {
  // 注入前（空の storage）の version 表示
  const fresh = await browser.newContext(VIEWPORTS[vp])
  const fp = await fresh.newPage()
  await gotoHome(fp, rcBase)
  const freshHome = await fp.evaluate('(' + HOME_VIEW + ')()')
  await closeSafe(fresh)
  check(`rc ${vp}: Home version 表示が v${rcVersion}`, freshHome.version?.startsWith('v' + rcVersion + ' ('), freshHome.version)

  for (const fx of ['normal', 'daily']) {
    const tag = `rc-${vp}-${fx}`
    const expect = fx === 'normal' ? report.masterNormal : report.masterDaily
    const fixture = fixtures[fx]
    const { ctx, page, net } = await inject(vp, fixture)
    const home = await observeHome(page, rcBase, tag)
    check(`${tag}: Home version 表示が注入前と同じ`, home.version === freshHome.version, { before: freshHome.version, after: home.version })
    check(`${tag}: Home「続きから」文言が master と同じ`, home.resume && home.resume === expect.home.resume, { master: expect.home.resume, rc: home.resume })
    check(`${tag}: Home 今日の試練（残り回数）が master と同じ`, home.todayCta === expect.home.todayCta, { master: expect.home.todayCta, rc: home.todayCta })
    let records = null
    if (fx === 'normal') {
      records = await observeRecords(page, rcBase, tag)
      check(`${tag}: 戦績画面の神カードが master と同じ`, same(records.cards, expect.records_screen.cards), { master: expect.records_screen.cards, rc: records.cards })
      check(`${tag}: 戦績画面の神域挑戦（直近7日）行が master と同じ`, same(records.dailyRows, expect.records_screen.dailyRows), { master: expect.records_screen.dailyRows, rc: records.dailyRows })
    }
    const resume = await observeResume(page, rcBase, tag)
    const afterLoad = await dumpStorage(page)
    const restore = {
      round: resume.round === expect.resume.round,
      hpPairs: same(resume.hpPairs, expect.resume.hpPairs),
      handCards: resume.handCards === expect.resume.handCards,
      handNames: same(resume.handNames, expect.resume.handNames),
      topbar: resume.topbar === expect.resume.topbar,
      dailyTag: resume.dailyTag === expect.resume.dailyTag,
    }
    check(`${tag}: 復元が master と同じ（ラウンド・HP・手札枚数・手札名・topbar・daily タグ）`, Object.values(restore).every(Boolean), { restore, master: { round: expect.resume.round, hpPairs: expect.resume.hpPairs, hand: expect.resume.handNames, topbar: expect.resume.topbar }, rc: { round: resume.round, hpPairs: resume.hpPairs, hand: resume.handNames, topbar: resume.topbar } })
    const saveDiff = stateDiff(fixture['sevengods.battleSave'], afterLoad['sevengods.battleSave'])
    check(`${tag}: 復元後の battleSave state が fixture と同一（差分キー 0）`, saveDiff.length === 0, saveDiff)
    const otherKeys = Object.keys(fixture).filter((k) => k !== 'sevengods.battleSave')
    const changed = otherKeys.filter((k) => afterLoad[k] !== fixture[k])
    const missing = otherKeys.filter((k) => !(k in afterLoad))
    check(`${tag}: battleSave 以外の ${otherKeys.length} キーが読み込みで不変（欠損 0・改変 0）`, changed.length === 0 && missing.length === 0, { keys: otherKeys, changed, missing })
    let played = null
    if (vp === 'pc') {
      const play = await playToEnd(page, PLAY)
      const result = await page.evaluate('(' + RESULT_METRICS + ')()')
      const after = await dumpStorage(page)
      const recBefore = recordsSummary(fixture['sevengods.records']) ?? {}
      const recAfter = recordsSummary(after['sevengods.records']) ?? {}
      const g = 'taiyo'
      const games = (r) => (r?.wins ?? 0) + (r?.losses ?? 0) + (r?.finished ?? 0)
      played = { play, status: result.status, daily: result.daily, keysAfter: Object.keys(after).sort(), records: recAfter, dailyAfter: dailySummary(after['sevengods.daily']), shot: await shot(page, tag + '-result') }
      check(`${tag}: 復元した対局を RC で決着まで進められる`, !!result.status && !play.timedOut, { status: result.status, rounds: play.rounds, timedOut: play.timedOut })
      if (fx === 'normal') {
        check(`${tag}: 決着で records が 1 戦ぶん増え、daily は不変`, games(recAfter[g]) === games(recBefore[g]) + 1 && after['sevengods.daily'] === fixture['sevengods.daily'], { before: recBefore[g], after: recAfter[g] })
      } else {
        const d = played.dailyAfter?.[0]
        check(`${tag}: 決着で daily results 1・attemptsUsed 1（二重消費なし）`, d && d.results === 1 && d.attemptsUsed === 1, played.dailyAfter)
      }
    }
    check(`${tag}: JS error 0・外部通信 0・api 0`, net.errors.length === 0 && net.external.length === 0 && net.api.length === 0, { errors: net.errors, external: net.external, api: net.api })
    report.rc[tag] = { home, records, resume, saveAfterLoad: saveSummary(afterLoad['sevengods.battleSave']), saveDiff, otherKeys: { keys: otherKeys, changed, missing }, played, network: { api: net.api, external: net.external, failed: net.failed, errors: net.errors } }
    await closeSafe(ctx)
  }
}
const failed = report.checks.filter((c) => !c.ok)
report.result = failed.length ? 'FAIL' : 'PASS'
report.summary = { checks: report.checks.length, pass: report.checks.length - failed.length, fail: failed.length }
// 結果は close より先に書く（close が返らなくても証跡が残るように）
writeFileSync(outJson, JSON.stringify(report, null, 2))
console.log('RESULT: ' + report.result + ' (' + report.summary.pass + '/' + report.summary.checks + ')')
await closeSafe(browser)
process.exit(failed.length ? 1 : 0)

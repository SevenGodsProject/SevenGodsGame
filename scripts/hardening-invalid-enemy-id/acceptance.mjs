// Post-P2 Hardening（決定191）：未知 enemyId 耐性の受け入れ試験（QA 用。ゲームコードではない）。
//
//   node scripts/hardening-invalid-enemy-id/acceptance.mjs <outDir> <rcUrl> [--only sp844,pc1508]
//
// 独立したブラウザコンテキストへ既知の fixture（正常データ／Resume 破損／Daily 破損／混在／
// matchups 破損）を注入し、Home・戦績・Records が JS error 0 でレンダリングされることを確認する。
// localStorage はブラウザコンテキストごとに空から始まる（実ユーザーの保存には触れない）。
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadChromium, VIEWPORTS } from '../release-audit/_lib.mjs'

const args = process.argv.slice(2)
const outDir = args[0]
const rc = args.find((a, i) => i > 0 && a.startsWith('http'))
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null
if (!outDir || !rc) {
  console.error('usage: node scripts/hardening-invalid-enemy-id/acceptance.mjs <outDir> <rcUrl> [--only sp844,pc1508]')
  process.exit(2)
}
mkdirSync(outDir, { recursive: true })
const chromium = await loadChromium()
const browser = await chromium.launch({ headless: true })
const report = { rc, startedAt: new Date().toISOString(), scenarios: {}, errors: [] }

const UNKNOWN_ID = 'enemy_does_not_exist'
const VALID_ENEMY = 'enemy_02' // 業斧の鬼将

// ---------- fixture 群 ----------
function validBattleSave(enemyId) {
  const state = {
    version: 9,
    seed: 'p7hard-seed',
    rngCursor: 0,
    round: 2,
    phase: 'playerTurn',
    status: 'playing',
    ap: { current: 3, max: 6 },
    player: { hp: 25, maxHp: 30, block: 0, buffs: [] },
    enemy: { defId: enemyId, name: '?', maxHp: 100, hp: 88, block: 0, buffs: [], intent: null },
    otomo: { defId: 'kozuchi', form: 'spirit' },
    godId: 'taiyo',
    difficulty: 'normal',
    otomoGrowthPath: 'guardian',
    resonance: { value: 0, max: 7 },
    divination: { remaining: 3, usedThisRound: false },
    deck: [],
    hand: [],
    discard: [],
    exhausted: [],
    score: { damage: 0, combo: 0, victory: 0, tempo: 0, survival: 0, difficultyBonus: 0, legacy: 0, total: 0 },
    mastery: {},
    cardsPlayedThisRound: 0,
    totalApGranted: 0,
    totalApSpent: 0,
  }
  return JSON.stringify({ version: 9, state })
}

function dailyFixture(days) {
  return JSON.stringify({ version: 1, days })
}
function dailyDay(dateKey, enemyId, attemptsUsed) {
  return {
    dateKey,
    enemyId,
    seed: 'daily-' + dateKey + '-' + enemyId,
    attemptsUsed: attemptsUsed || 1,
    results: [],
    bestScore: 0,
    bestGodId: null,
    bestByGod: {},
  }
}

function matchupsFixture(cleared) {
  return JSON.stringify({ version: 1, cleared, seeded: { at: 1, source: 'daily' } })
}

const SCENARIOS = {
  A_normal: {
    'sevengods.tutorialSeen': 'true',
    'sevengods.battleSave': validBattleSave(VALID_ENEMY),
    'sevengods.daily': dailyFixture({ '2026-09-10': dailyDay('2026-09-10', VALID_ENEMY) }),
    'sevengods.matchups': matchupsFixture({ taiyo: [VALID_ENEMY] }),
  },
  B_resumeUnknown: {
    'sevengods.tutorialSeen': 'true',
    'sevengods.battleSave': validBattleSave(UNKNOWN_ID),
  },
  C_dailyUnknown: {
    'sevengods.tutorialSeen': 'true',
    'sevengods.daily': dailyFixture({ '2026-09-10': dailyDay('2026-09-10', UNKNOWN_ID) }),
  },
  D_mixed: {
    'sevengods.tutorialSeen': 'true',
    'sevengods.battleSave': validBattleSave(UNKNOWN_ID),
    'sevengods.daily': dailyFixture({
      '2026-09-08': dailyDay('2026-09-08', VALID_ENEMY),
      '2026-09-09': dailyDay('2026-09-09', UNKNOWN_ID),
      '2026-09-10': dailyDay('2026-09-10', 'enemy_06'),
    }),
  },
  E_matchupsUnknown: {
    'sevengods.tutorialSeen': 'true',
    'sevengods.matchups': matchupsFixture({ taiyo: [VALID_ENEMY, UNKNOWN_ID], zeus: [VALID_ENEMY] }),
  },
}

// ---------- 計測 ----------
function homeMetricsFn() {
  const vw = window.innerWidth
  const home = document.querySelector('.home-screen')
  return {
    hasHomeScreen: !!home,
    resumeVisible: !!document.querySelector('[data-testid="home-resume"]'),
    startVisible: !!document.querySelector('[data-testid="home-start"]'),
    overflowX: document.documentElement.scrollWidth > vw + 1,
    text: home ? home.innerText.slice(0, 300) : null,
  }
}
function recordsMetricsFn() {
  const vw = window.innerWidth
  const rows = document.querySelectorAll('.record-daily-table tbody tr td:nth-child(2)')
  return {
    hasRecordScreen: !!document.querySelector('.setup-screen'),
    matchupBoard: !!document.querySelector('[data-testid="matchup-board"]'),
    dailyTableRows: [...rows].map((td) => td.textContent.trim()),
    recordCards: document.querySelectorAll('.record-card').length,
    overflowX: document.documentElement.scrollWidth > vw + 1,
  }
}

async function openContext(vpName, seed) {
  const vp = VIEWPORTS[vpName]
  const ctx = await browser.newContext({ viewport: vp.viewport, isMobile: vp.isMobile, hasTouch: vp.isMobile })
  await ctx.addInitScript((s) => {
    if (sessionStorage.getItem('__seeded')) return
    for (const k in s) localStorage.setItem(k, s[k])
    sessionStorage.setItem('__seeded', '1')
  }, seed)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text())
  })
  return { ctx, page, errors }
}

function clickText(page, t) {
  return page.evaluate((text) => {
    const el = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(text) && !x.disabled)
    if (!el) return false
    el.click()
    return true
  }, t)
}

async function runScenario(vp, name, seed) {
  const p = await openContext(vp, seed)
  const result = { vp, scenario: name }
  try {
    await p.page.goto(rc + '/')
    await p.page.waitForSelector('.home-screen', { timeout: 15000 })
    await p.page.waitForTimeout(500)
    if (await clickText(p.page, 'わかった')) await p.page.waitForTimeout(300)
    result.home = await p.page.evaluate(homeMetricsFn)
    await p.page.screenshot({ path: join(outDir, vp + '-' + name + '-home.png') })

    if (result.home.resumeVisible) {
      const clicked = await p.page.evaluate(() => {
        const el = document.querySelector('[data-testid="home-resume"]')
        if (!el) return false
        el.click()
        return true
      })
      if (clicked) {
        await p.page.waitForTimeout(1500)
        result.resumeClickErrors = [...p.errors]
        result.resumeReachedBattle = await p.page.evaluate(() => !!document.querySelector('.hand, .battle'))
        await p.page.screenshot({ path: join(outDir, vp + '-' + name + '-after-resume.png') })
        await p.page.goto(rc + '/')
        await p.page.waitForSelector('.home-screen', { timeout: 15000 })
        await p.page.waitForTimeout(300)
      }
    }

    await clickText(p.page, '戦績を見る')
    await p.page.waitForSelector('.setup-screen', { timeout: 15000 })
    await p.page.waitForTimeout(500)
    result.records = await p.page.evaluate(recordsMetricsFn)
    await p.page.screenshot({ path: join(outDir, vp + '-' + name + '-records.png') })
    await p.page.screenshot({ path: join(outDir, vp + '-' + name + '-records-full.png'), fullPage: true })
  } catch (e) {
    result.error = String(e)
  }
  result.errors = p.errors
  await p.ctx.close()
  return result
}

for (const vp of ['sp844', 'pc1508']) {
  if (only && !only.includes(vp)) continue
  console.log(vp)
  report.scenarios[vp] = {}
  for (const name of Object.keys(SCENARIOS)) {
    const seed = SCENARIOS[name]
    const t = Date.now()
    const r = await runScenario(vp, name, seed)
    report.scenarios[vp][name] = r
    const bad = r.error || r.errors.length
    console.log('  ' + (bad ? '✗' : '✓') + ' ' + name + ' (' + Math.round((Date.now() - t) / 1000) + 's)')
    if (r.error) console.log('    ' + r.error.slice(0, 200))
    if (r.errors.length) console.log('    errors: ' + JSON.stringify(r.errors.slice(0, 2)))
  }
}

// ---------- 判定 ----------
const results = []
function add(id, title, build) {
  let checks
  try {
    checks = build()
  } catch (e) {
    checks = [{ name: 'judge', ok: false, detail: String(e).slice(0, 200) }]
  }
  results.push({ id, title, pass: checks.length > 0 && checks.every((c) => c.ok), checks })
}
function ck(name, ok, detail) {
  return { name, ok: !!ok, detail: detail === undefined ? null : detail }
}
const S = report.scenarios
const vps = Object.keys(S)

add('H1', 'Scenario A（正常データ）：Home・戦績とも従来どおり', function () {
  return vps.map(function (vp) {
    const s = S[vp].A_normal
    return ck(vp, s.home && s.home.hasHomeScreen && s.home.resumeVisible && s.records && s.records.hasRecordScreen && s.records.matchupBoard && s.errors.length === 0, s)
  })
})

add('H2', 'Scenario B（Resume 破損）：Home はクラッシュせず、Resume CTA は出ない', function () {
  return vps.map(function (vp) {
    const s = S[vp].B_resumeUnknown
    return ck(vp, s.home && s.home.hasHomeScreen && s.home.startVisible && !s.home.resumeVisible && !s.error && s.errors.length === 0, s)
  })
})

add('H3', 'Scenario B：Resume CTA が無いので誤ってクリックしてもバトルへ進まない', function () {
  return vps.map(function (vp) {
    const s = S[vp].B_resumeUnknown
    return ck(vp, s.resumeClickErrors === undefined && s.resumeReachedBattle === undefined, { resumeClickErrors: s.resumeClickErrors, resumeReachedBattle: s.resumeReachedBattle })
  })
})

add('H5', 'Scenario C（Daily 履歴が未知 ID のみ）：戦績クラッシュ 0、不明な敵で表示', function () {
  return vps.map(function (vp) {
    const s = S[vp].C_dailyUnknown
    return ck(vp, s.records && s.records.hasRecordScreen && s.records.dailyTableRows.indexOf('不明な敵') >= 0 && s.errors.length === 0, s.records)
  })
})

add('H6', 'Scenario D（正常＋未知が混在）：有効な行は消えず、無効な行だけ fallback', function () {
  return vps.map(function (vp) {
    const s = S[vp].D_mixed
    const rows = (s.records && s.records.dailyTableRows) || []
    return ck(vp, rows.length === 3 && rows.indexOf('不明な敵') >= 0 && rows.indexOf('業斧の鬼将') >= 0 && rows.indexOf('蒼海の龍神') >= 0 && s.errors.length === 0, rows)
  })
})

add('H7', 'Scenario D：Resume も未知 ID なので CTA を出さない（Home クラッシュ 0）', function () {
  return vps.map(function (vp) {
    const s = S[vp].D_mixed
    return ck(vp, s.home && s.home.hasHomeScreen && !s.home.resumeVisible && s.errors.length === 0)
  })
})

add('H8', 'Scenario E（matchups に未知 ID が混在）：戦績クラッシュ 0、既知の攻略は表示継続', function () {
  return vps.map(function (vp) {
    const s = S[vp].E_matchupsUnknown
    return ck(vp, s.records && s.records.hasRecordScreen && s.records.matchupBoard && s.errors.length === 0, s.records)
  })
})

add('H9', '正常データ（Scenario A）で横はみ出し 0（P2 の 390px 修正を維持）', function () {
  return vps
    .filter(function (vp) {
      return vp === 'sp844'
    })
    .map(function (vp) {
      const s = S[vp].A_normal
      return ck(vp, s.home && !s.home.overflowX && s.records && !s.records.overflowX)
    })
})

add('H10', '全シナリオで JS error・uncaught exception 0', function () {
  const out = []
  for (const vp of vps) {
    for (const name of Object.keys(S[vp])) {
      const s = S[vp][name]
      out.push(ck(vp + '/' + name, !s.error && s.errors.length === 0, { error: s.error, jsErrors: s.errors }))
    }
  }
  return out
})

report.results = results
report.pass = results.every(function (r) {
  return r.pass
})
report.finishedAt = new Date().toISOString()
writeFileSync(join(outDir, 'hardening-acceptance.json'), JSON.stringify(report, null, 2))
await browser.close()
for (const r of results) {
  console.log((r.pass ? 'PASS' : 'FAIL') + '  ' + r.id.padEnd(4) + ' ' + r.title + '  (' + r.checks.filter(function (c) { return c.ok }).length + '/' + r.checks.length + ')')
  for (const c of r.checks.filter(function (x) { return !x.ok })) {
    console.log('        ✗ ' + c.name + ' ' + (JSON.stringify(c.detail) || '').slice(0, 300))
  }
}
console.log(report.pass ? 'ALL PASS' : 'SOME FAILED')
process.exit(report.pass ? 0 : 1)

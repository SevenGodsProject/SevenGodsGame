// Phase 6-A：戦闘演出タイムラインの Before/After 計測（監査用。ゲームコードではない）。
//
// ヘッドレス Chromium で実際にゲームを操作し、timelineProbe.js で各アクションの
// cast／impact／number／visualHp／defeat／victory／reward の時刻（入力=0ms）を記録する。
// 画面が非表示のタブではタイマーが間引かれて計測にならないため、ヘッドレスで回す。
//
// 使い方：
//   node scripts/phase6-audit/timeline.mjs <tag> <outJson> [baseUrl]
//   PLAYWRIGHT_MODULE で playwright の場所を指定できる（未指定なら import('playwright')）
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const [tag = 'X', out, base = 'http://localhost:5173'] = process.argv.slice(2)
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')
const probe = readFileSync(join(here, 'timelineProbe.js'), 'utf8')

/** 決定論（seed固定）で同じ盤面になるシナリオ。m＝そのアクションを計測する */
const SCENARIOS = [
  {
    id: 'E', god: '恵比寿', enemy: '試練の影', url: '?enemy=trial&seed=p6a-s1',
    steps: [{ p: '潮招き', m: '通常100（潮招き）' }, { e: 1, m: '敵の通常攻撃50' }],
  },
  {
    id: 'J', god: '寿楽', enemy: '蒼海の龍神', url: '?enemy=ryujin&stake=4&seed=p6-juraku',
    steps: [
      { p: '予言' }, { d: 2 }, { e: 1 },
      { p: '大喝', m: '大ダメージ180（大喝・L3）' }, { e: 1 },
      { p: '大喝' }, { p: '気まぐれ' }, { d: 2 }, { e: 1 },
      { p: '神楽舞' }, { p: '神託', m: '大ダメージ250（神託・L4）' }, { d: 0 }, { e: 1 },
      { p: '呪縛' }, { p: '長生きの知恵' }, { p: '悪戯' }, { p: 'からかい半分' }, { d: 0 }, { e: 1 },
      { p: '渾身の一撃' }, { p: '渾身の一撃', m: '通常カード致死（渾身）', wait: 5000 },
    ],
  },
  {
    id: 'T', god: '大耀', enemy: '業斧の鬼将', url: '?enemy=oni&stake=2&seed=p6-taiyo',
    steps: [
      { p: '神楽舞' }, { e: 1 },
      { p: '巫女の舞' }, { p: '豪快な一撃', m: 'bonus⚡（豪快140＋40）' }, { e: 1 },
      { p: '豪快な一撃' }, { p: '一心不乱' }, { p: '速攻' }, { d: 0 }, { e: 1 },
      { p: '鉄壁の構え' }, { p: '神託' }, { d: 0 }, { e: 1, m: 'Guard（強打130を盾180で完封）' },
      { p: '予言' }, { p: '後輩想い' }, { p: '守護' }, { p: '受け流し' }, { d: 0 }, { e: 1 },
      { p: '姉御の号令' }, { p: '一心不乱', m: '神の一撃・致死（420）', wait: 6000 },
    ],
  },
  {
    id: 'F', god: '福永', enemy: '乱舞の道化', url: '?enemy=doukeshi&stake=5&seed=p6-fukuei',
    steps: [
      { p: '冒険者の勘' }, { d: 2 }, { e: 1 },
      { p: '予言' }, { p: '共振' }, { d: 2 }, { e: 1 },
      { p: '冒険者の勘', m: '神の一撃・非致死（220）', wait: 4500 },
    ],
  },
  {
    id: 'S', god: '蒼毘', enemy: '銀甲の機工師', url: '?enemy=karakuri&stake=3&seed=p6-sobi',
    steps: [
      { p: '反撃の刃' }, { d: 2 }, { e: 1 },
      { p: '渾身の一撃' }, { d: 2 }, { e: 1 },
      { p: '誓いの盾' }, { p: '呪縛' }, { p: '速攻' }, { p: '誓いの盾' }, { d: 0 }, { e: 1 },
      { p: '神託' }, { p: '一撃' }, { p: '巫女の舞' }, { d: 2 }, { e: 1 },
      { p: '受け流し' }, { p: '一喝' }, { p: '反撃の刃' }, { e: 1, m: '敵必殺（神滅甲360）＋盾90', wait: 4500 },
      { p: '一喝' }, { p: '剛撃' }, { p: '神楽舞' }, { e: 1, m: '反撃（得意技）で致死', wait: 6000 },
    ],
  },
]

async function inPage(page, fn, arg) {
  return page.evaluate(fn, arg)
}

async function clickText(page, text) {
  return inPage(page, (t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(t))
    if (!b) return false
    b.click()
    return true
  }, text)
}

async function runScenario(browser, sc) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(base + '/' + sc.url)
  await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
  await page.evaluate(probe)
  await clickText(page, '神を選ぶ')
  await page.waitForTimeout(400)
  await clickText(page, sc.god)
  await page.waitForTimeout(300)
  await clickText(page, 'この構成で始める')
  await page.waitForTimeout(300)
  await clickText(page, sc.enemy)
  await page.waitForTimeout(500)
  await clickText(page, 'この構成でバトル開始')
  await page.waitForSelector('.hand .card-view', { timeout: 10000 })
  await page.waitForTimeout(1800)
  const rows = []
  const trace = []
  for (const st of sc.steps) {
    const act = await inPage(page, (s) => {
      let el = null
      if (s.p) el = [...document.querySelectorAll('.hand .card-view')].find((c) => c.querySelector('.card-view-name').textContent.includes(s.p) && !c.disabled)
      else if (s.d != null) el = document.querySelectorAll('.divination-choice')[s.d]
      else if (s.e) el = document.querySelector('.end-round-button')
      if (!el || el.disabled) return 'missing'
      window.__act = () => el.click()
      return 'ok'
    }, st)
    const desc = st.p ? 'play ' + st.p : st.d != null ? 'div' + st.d : 'end'
    if (act !== 'ok') {
      trace.push('MISSING ' + desc)
      if (st.p || st.e) break
      continue
    }
    if (st.m) {
      const row = await inPage(page, ([label, wait]) => window.__tl.run(label, () => window.__act(), wait), [sc.id + ':' + st.m, st.wait ?? 3000])
      rows.push(row)
      trace.push(desc + ' [measured]')
    } else {
      await inPage(page, () => window.__act())
      await page.waitForTimeout(st.e ? 2100 : 800)
      trace.push(desc)
    }
    if (await inPage(page, () => !!document.querySelector('.game-over-overlay, .reward-overlay'))) break
  }
  await ctx.close()
  return { id: sc.id, rows, trace, errors }
}

const browser = await chromium.launch({ headless: true })
const results = []
for (const sc of SCENARIOS) {
  const r = await runScenario(browser, sc)
  results.push(r)
  console.log(sc.id, r.trace.join(' > '))
  for (const row of r.rows) console.log('  ', JSON.stringify(row))
  if (r.errors.length) console.log('  errors:', r.errors.slice(0, 5))
}
await browser.close()
if (out) writeFileSync(out, JSON.stringify({ tag, at: new Date().toISOString(), results }, null, 1))

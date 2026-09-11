// Phase 6-A：演出の見た目 QA（監査用。ゲームコードではない）。
// ヘッドレス Chromium で決まった手順を再生し、演出の要所でスクリーンショットを保存する。
//   node scripts/phase6-audit/shots.mjs <outDir> [baseUrl] [--mobile] [--reduced]
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const outDir = args[0] ?? 'shots'
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:5173'
const mobile = args.includes('--mobile')
const reduced = args.includes('--reduced')
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')
mkdirSync(outDir, { recursive: true })

const tag = mobile ? 'm' : reduced ? 'r' : 'd'
const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({
  viewport: mobile ? { width: 390, height: 760 } : { width: 1366, height: 768 },
  reducedMotion: reduced ? 'reduce' : 'no-preference',
})
const page = await ctx.newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))

const click = (t) =>
  page.evaluate((text) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\s+/g, '').includes(text))
    if (!b) return false
    b.click()
    return true
  }, t)
const playCard = (name) =>
  page.evaluate((n) => {
    const c = [...document.querySelectorAll('.hand .card-view')].find((x) => x.querySelector('.card-view-name').textContent.includes(n) && !x.disabled)
    if (!c) return false
    c.click()
    return true
  }, name)
const shot = async (name) => {
  await page.screenshot({ path: join(outDir, `${tag}-${name}.png`) })
}
const state = () =>
  page.evaluate(() => ({
    enemyHp: document.querySelector('.enemy-panel .hp-bar-label')?.textContent,
    ghost: document.querySelector('.enemy-panel .hp-bar-ghost')?.style.width,
    fill: document.querySelector('.enemy-panel .hp-bar-fill')?.style.width,
    reaction: document.querySelector('.enemy-reaction')?.className,
    defeat: !!document.querySelector('.enemy-defeat'),
    beat: !!document.querySelector('.victory-beat'),
    reward: !!document.querySelector('.reward-overlay'),
    over: !!document.querySelector('.game-over-overlay'),
    hand: [...document.querySelectorAll('.hand .card-view')].map((c) => c.querySelector('.card-view-name').textContent.trim()),
  }))

await page.goto(`${base}/?enemy=oni&stake=2&seed=p6-taiyo`)
await page.waitForSelector('.home-cta-primary', { timeout: 30000 })
// 初回訪問の「遊び方」モーダルを閉じる
await click('わかった')
await page.waitForTimeout(300)
await click('神を選ぶ')
await page.waitForTimeout(400)
await click('大耀')
await page.waitForTimeout(300)
await click('この構成で始める')
await page.waitForTimeout(300)
await click('業斧の鬼将')
await page.waitForTimeout(500)
await click('この構成でバトル開始')
await page.waitForSelector('.hand .card-view')
await page.waitForTimeout(1900)
await shot('00-battle-start')

// R1：共鳴を溜める
await playCard('神楽舞')
await page.waitForTimeout(900)
await click('ラウンドを終える')
await page.waitForTimeout(2100)

// R2：⚡付きの大ダメージ。着弾の瞬間・hit stop・表示HPの追従を撮る
await playCard('巫女の舞')
await page.waitForTimeout(900)
await playCard('豪快な一撃')
await page.waitForTimeout(330) // cast(280)+突きの最前(90)＝着弾直後
await shot('01-impact')
await page.waitForTimeout(160)
await shot('02-after-impact-hp')
await page.waitForTimeout(300)
await shot('03-bonus')
await page.waitForTimeout(800)
await click('ラウンドを終える')
await page.waitForTimeout(2200)

// R3〜R5：進める
for (const seq of [
  ['豪快な一撃', '一心不乱', '速攻'],
  ['鉄壁の構え', '神託'],
  ['予言', '後輩想い', '守護', '受け流し'],
]) {
  for (const n of seq) {
    await playCard(n)
    await page.waitForTimeout(800)
  }
  await page.evaluate(() => document.querySelectorAll('.divination-choice')[0]?.click())
  await page.waitForTimeout(800)
  await click('ラウンドを終える')
  await page.waitForTimeout(2300)
}
await shot('04-enemy-turn-done')

// R6：神の一撃で撃破 → 崩壊 → 撃破 → 報酬
// 決着までのカードを順に使い、演出の段階を「状態が変わった瞬間」に撮る（固定待ちにしない）
const marks = []
const t0 = Date.now()
const waitFor = async (sel, name, timeout = 8000) => {
  try {
    await page.waitForSelector(sel, { timeout, state: 'attached' })
    marks.push([name, Date.now() - t0])
    await shot(name)
    return true
  } catch {
    marks.push([name + ':MISS', Date.now() - t0])
    return false
  }
}
for (const n of ['姉御の号令', '一心不乱', '共振', '後輩想い']) {
  if (await page.evaluate(() => !!document.querySelector('.enemy-defeat'))) break
  await playCard(n)
  await page.waitForTimeout(900)
}
await waitFor('.resonance-cutin', '05-burst-cutin', 3000)
await waitFor('.burst-banner', '06-burst-banner', 4000)
await page.waitForTimeout(450)
await shot('07-burst-impact')
await waitFor('.enemy-defeat', '08-collapse', 5000)
await page.waitForTimeout(260)
await shot('08b-collapse-mid')
await waitFor('.victory-beat', '09-beat', 5000)
const before = await state()
await waitFor('.reward-overlay', '10-reward', 5000)
const after = await state()
await page.evaluate(() => document.querySelector('.reward-card')?.click())
await page.waitForTimeout(2600)
await shot('11-result')
console.log(JSON.stringify({ tag, marks, before, after, errors }, null, 1))
await browser.close()

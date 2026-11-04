// 最終 Production Release Gate（決定288 v1.1 FINAL_SCOPE_ROADMAP_V1 §6 #3）：
// 7 神 × 将軍家 10 体 × normal／hard の決定論 probe。1 run＝seed 固定・「使える札のうち敵ダメージ最大の札を出す→札が尽きたらラウンドを終える」で
// 決着（勝敗）まで進め、各ラウンド開始時の予告・帯・敵 HP・神 HP・「あと N」行と、出した札・結果（勝敗）を fingerprint に残す。
// FG_REPEAT=2 のとき同じ組を 2 回走らせ fingerprint の一致（同 seed 同結果）を機械判定する。JS error・console error・外部オリジン通信も記録（0 が合格）。
// 撮影・rAF 標本化はしない（6 GB 機で 140 run を回すため）。browser は 1 プロセス 1 個・run ごとに context を作り直す。
// summary.json に済みの組があれば skip する（中断・再開できる）。
//   node scripts/final-gate/matrix-probe.mjs <outDir> <baseUrl>
//   env: FG_GODS（既定 7 神）・FG_ENEMIES（既定 将軍家 10 体）・FG_DIFFS（既定 normal,hard）・FG_SEED（既定 final-v114）・FG_REPEAT（既定 2）・FG_MAX_ROUNDS（既定 7）
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const outDir = args[0] ?? 'docs/evidence/final-gate/matrix'
const base = args.find((a) => a.startsWith('http')) ?? 'http://localhost:4198'
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

const ALL_GODS = ['恵比寿', '大耀', '蒼毘', '才華', '寿楽', '福永', '笑蓮']
const ALL_ENEMIES = ['将軍四天王・忠次', '捕り方・岡っ引き', '将軍四天王・直政', '将軍四天王・康政', '忍者衆・影', '忍者衆・くノ一', '影の頭領・鬼半蔵', '将軍四天王・忠勝', '科学者・ドーマン', '十七代将軍・康虎']
const GODS = (process.env.FG_GODS ?? ALL_GODS.join(',')).split(',').filter(Boolean)
const ENEMIES = (process.env.FG_ENEMIES ?? ALL_ENEMIES.join(',')).split(',').filter(Boolean)
const DIFFS = (process.env.FG_DIFFS ?? 'normal,hard').split(',').filter(Boolean)
const SEED = process.env.FG_SEED ?? 'final-v114'
const REPEAT = Number(process.env.FG_REPEAT ?? 2)
const MAX_ROUNDS = Number(process.env.FG_MAX_ROUNDS ?? 7)
const DIFF_LABEL = { easy: 'かんたん', normal: 'ふつう', hard: 'むずかしい' }
const VIEWPORT = { width: 1508, height: 660 }
// 札の選び方の版。v1＝使える札がなければ即ラウンド終了／v1.1＝700ms 置いて再確認（引いた札の配り中を待つ）
const POLICY = 'v1.3'

mkdirSync(outDir, { recursive: true })
const baseOrigin = new URL(base).origin
const log = (s) => {
  console.log(s)
  try { writeFileSync(`${outDir}/matrix-probe.log.txt`, s + '\n', { flag: 'a' }) } catch {}
}

async function clickText(page, text, timeout = 8000) {
  await page.getByRole('button', { name: text }).first().click({ timeout })
}
async function maybeClick(page, text) {
  const l = page.getByRole('button', { name: text }).first()
  if (await l.isVisible().catch(() => false)) await l.click({ timeout: 3000 }).catch(() => {})
}
const roundOf = (page) => page.evaluate(() => Number((document.body.innerText.match(/ラウンド\s*(\d)/) || [])[1] ?? 0))
// 表示 HP は着弾に追従して動く（PlayerPanel／EnemyPanel の hpShown）。読み取りは両 HP の文字が 400ms 連続で同じになってから（最大 5s）
const settle = async (page) => {
  let prev = ''
  for (let i = 0; i < 12; i++) {
    const cur = await page.evaluate(() => (document.querySelector('.player-plate .hp-bar')?.textContent ?? '') + '|' + (document.querySelector('.enemy-plate .hp-bar')?.textContent ?? '')).catch(() => '')
    if (cur === prev) return
    prev = cur
    await page.waitForTimeout(400)
  }
}
const snapshot = async (page) => {
  await settle(page)
  return snapshotNow(page)
}
const snapshotNow = (page) =>
  page.evaluate(() => {
    const panel = document.querySelector('.enemy-panel')
    const tl = document.querySelector('[data-testid="tactic-line"]')
    return {
      intent: document.querySelector('.enemy-plate .intent')?.textContent?.trim() ?? '',
      band: panel ? (panel.className.match(/enemy-band-(\w+)/) || [])[1] ?? null : null,
      enemyHp: document.querySelector('.enemy-plate .hp-bar')?.textContent?.trim().slice(0, 16) ?? '',
      godHp: document.querySelector('.player-plate .hp-bar')?.textContent?.trim().slice(0, 16) ?? '',
      tactic: tl ? `${tl.getAttribute('data-state')}:${tl.textContent?.trim()}` : null,
      scrollW: document.documentElement.scrollWidth,
      vw: innerWidth,
    }
  })
const overOf = (page) =>
  page.evaluate(() => {
    const t = document.body.innerText
    const btn = [...document.querySelectorAll('button')].some((b) => /もう一度|ホームへ|結果へ進む/.test(b.textContent ?? ''))
    const won = /勝利/.test(t)
    const lost = /敗北/.test(t)
    return btn || won || lost ? { won, lost } : null
  })
const waitIdle = (page, timeout = 8000) =>
  page
    .waitForFunction(
      () => {
        const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('ラウンドを終える'))
        const over = [...document.querySelectorAll('button')].some((b) => /もう一度|ホームへ|結果へ進む/.test(b.textContent ?? ''))
        return over || (btn && !btn.disabled)
      },
      null,
      { timeout },
    )
    .catch(() => {})

async function runOne(browser, god, enemy, diff, rep) {
  const context = await browser.newContext({ viewport: VIEWPORT })
  const page = await context.newPage()
  const errors = []
  const external = new Set()
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).split('\n')[0]))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200))
  })
  page.on('request', (r) => {
    const u = r.url()
    if (/^https?:/.test(u) && !u.startsWith(baseOrigin)) external.add(new URL(u).origin)
  })
  const url = `${base}/?seed=${SEED}`
  const rounds = []
  const plays = []
  let outcome = null
  let crashed = null
  let enemyName = ''
  const t0 = Date.now()
  try {
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.evaluate(() => {
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch {}
    })
    await page.goto(url, { waitUntil: 'networkidle' })
    await maybeClick(page, 'わかった')
    await clickText(page, '神を選ぶ')
    await maybeClick(page, '新しく始める')
    await clickText(page, god)
    if (diff !== 'normal') await page.getByRole('radio', { name: new RegExp(DIFF_LABEL[diff]) }).first().click({ timeout: 5000 })
    await clickText(page, 'この構成で始める')
    await page.getByText('挑む敵を選ぼう').first().waitFor({ timeout: 8000 })
    await page.getByRole('button', { name: new RegExp(enemy) }).first().click({ timeout: 8000 })
    await clickText(page, 'この構成でバトル開始')
    await page.waitForTimeout(500)
    await page.keyboard.press('Escape').catch(() => {})
    await page.getByRole('button', { name: 'ラウンドを終える' }).first().waitFor({ timeout: 25000 })
    await waitIdle(page, 12000)
    await page.waitForTimeout(400)
    enemyName = await page.locator('.enemy-panel .panel-title').first().innerText().catch(() => '')
    for (let guard = 0; guard < 80 && !outcome; guard++) {
      const over = await overOf(page)
      if (over) {
        outcome = over
        break
      }
      const round = await roundOf(page)
      if (round === 0 || round > MAX_ROUNDS) break
      if (!rounds.some((r) => r.round === round)) rounds.push({ round, ...(await snapshot(page)) })
      const pickIdx = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('.hand .card-view:not([disabled])')]
        if (cards.length === 0) return -1
        let best = 0
        let bestDmg = -1
        cards.forEach((c, i) => {
          const m = (c.textContent ?? '').match(/敵に\s*([\d,]+)\s*ダメージ/)
          const dmg = m ? Number(m[1].replace(/,/g, '')) : 0
          if (dmg > bestDmg) {
            bestDmg = dmg
            best = i
          }
        })
        return best
      })
      if (pickIdx >= 0) {
        const card = page.locator('.hand .card-view:not([disabled])').nth(pickIdx)
        const name = (await card.locator('.card-view-name').innerText().catch(() => '')).trim()
        await card.click({ timeout: 5000, force: true, noWaitAfter: true }).catch((e) => errors.push('card click: ' + String(e).split('\n')[0]))
        await page.waitForTimeout(250)
        await waitIdle(page, 8000)
        await page.waitForTimeout(150)
        // 診断用：出した直後の手札（名前・使える／使えない）と AP 表示。fingerprint には含めない
        const hand = await page.evaluate(() => ({
          cards: [...document.querySelectorAll('.hand .card-view')].map((c) => (c.querySelector('.card-view-name')?.textContent?.trim() ?? '') + (c.hasAttribute('disabled') ? '(x)' : '')),
          ap: (document.body.innerText.match(/神力\s*([\d/]+)/) || [])[1] ?? '',
        }))
        plays.push({ round, card: name, hand: hand.cards, ap: hand.ap })
      } else {
        // policy v1.1：札を引く札（巫女の舞など）の直後は新しい札が配られる間だけ disabled になる。
        // 700ms 置いて使える札が現れたらラウンドを終えずに続ける（probe の時刻依存を消す。engine は不変）
        // v1.2：手札の枚数が 600ms 連続で変わらず（配り終わり）かつ使える札 0 のときだけラウンドを終える（最大 3s 待つ）
        // v1.3：札は isPlayerTurn（pendingCard／カットイン中は false）と AP で disabled になる。カットイン（resonance-cutin／enemy-cutin／God Strike）・
        // 出した札の演出（card-view-playing）・配り（card-view-dealt）が続く間は「使える札 0」と判定しない（最大 8s）。
        let again = 0
        let stable = 0
        let prevCount = -1
        for (let k = 0; k < 40 && stable < 3; k++) {
          await page.waitForTimeout(200)
          const h = await page.evaluate(() => ({
            n: document.querySelectorAll('.hand .card-view').length,
            e: document.querySelectorAll('.hand .card-view:not([disabled])').length,
            busy: !!document.querySelector('[class*="cutin"], .card-view-playing, .card-view-dealt'),
          }))
          again = h.e
          if (again > 0) break
          if (h.busy) {
            stable = 0
            prevCount = -1
            continue
          }
          stable = h.n === prevCount ? stable + 1 : 0
          prevCount = h.n
        }
        if (again > 0) continue
        const btn = page.getByRole('button', { name: 'ラウンドを終える' }).first()
        if (!(await btn.isVisible().catch(() => false))) {
          const o = await overOf(page)
          if (o) outcome = o
          break
        }
        const prev = round
        await btn.click({ timeout: 5000 }).catch(() => {})
        await page
          .waitForFunction(
            (p) => {
              const r = Number((document.body.innerText.match(/ラウンド\s*(\d)/) || [])[1] ?? 0)
              const over =
                [...document.querySelectorAll('button')].some((b) => /もう一度|ホームへ|結果へ進む/.test(b.textContent ?? '')) || /勝利|敗北/.test(document.body.innerText)
              return over || r !== p
            },
            prev,
            { timeout: 15000 },
          )
          .catch(() => {})
        await waitIdle(page, 12000)
        await page.waitForTimeout(300)
      }
    }
    if (!outcome) {
      await page.waitForTimeout(2500)
      outcome = await overOf(page)
    }
  } catch (e) {
    crashed = String(e).split('\n')[0]
    errors.push('run crashed: ' + crashed)
  }
  const final = await snapshot(page).catch(() => null)
  await context.close().catch(() => {})
  const fingerprint = JSON.stringify({ rounds: rounds.map((r) => ({ r: r.round, i: r.intent, b: r.band, e: r.enemyHp, g: r.godHp, t: r.tactic })), plays: plays.map((p) => ({ round: p.round, card: p.card })), outcome })
  return { god, enemy, enemyName, diff, seed: SEED, rep, rounds, plays, outcome, final, errors, external: [...external], crashed, ms: Date.now() - t0, fingerprint }
}

const browser = await chromium.launch()
const summaryPath = `${outDir}/summary.json`
const prior = existsSync(summaryPath) ? (JSON.parse(readFileSync(summaryPath, 'utf8')).runs ?? []) : []
for (const god of GODS)
  for (const enemy of ENEMIES)
    for (const diff of DIFFS) {
      const key = `${god}×${enemy}×${diff}`
      if (prior.some((p) => p.key === key)) {
        log(`skip (done) ${key}`)
        continue
      }
      const reps = []
      const crashes = []
      for (let rep = 1; rep <= REPEAT; rep++) {
        // 画面遷移の click timeout／Page crashed（6 GB 機の headless 側の事象）は同 rep を 1 回だけやり直し、やり直した事実を crashes に残す
        let r = await runOne(browser, god, enemy, diff, rep)
        if (r.crashed && r.rounds.length === 0) {
          crashes.push({ rep, crashed: r.crashed, ms: r.ms })
          r = await runOne(browser, god, enemy, diff, rep)
        }
        reps.push(r)
      }
      const r1 = reps[0]
      const deterministic = reps.every((r) => r.fingerprint === r1.fingerprint)
      const errorsTotal = reps.reduce((n, r) => n + r.errors.length, 0)
      const externalAll = [...new Set(reps.flatMap((r) => r.external))]
      const lastRound = r1.rounds.length ? r1.rounds[r1.rounds.length - 1].round : 0
      const row = {
        key,
        god,
        enemy,
        enemyName: r1.enemyName,
        diff,
        seed: SEED,
        repeat: REPEAT,
        policy: POLICY,
        deterministic,
        outcome: r1.outcome,
        lastRound,
        r1Intent: r1.rounds[0]?.intent ?? '',
        finalEnemyHp: r1.final?.enemyHp ?? '',
        finalGodHp: r1.final?.godHp ?? '',
        errorsTotal,
        external: externalAll,
        scrollOverflow: reps.some((r) => r.rounds.some((x) => x.scrollW > x.vw)),
        crashed: reps.map((r) => r.crashed).filter(Boolean),
        setupRetries: crashes,
        ms: reps.map((r) => r.ms),
        plays: r1.plays.length,
      }
      writeFileSync(`${outDir}/${god}-${enemy.replace(/[^\p{L}\p{N}]/gu, '_')}-${diff}.json`, JSON.stringify({ row, reps }, null, 2))
      prior.push(row)
      writeFileSync(summaryPath, JSON.stringify({ base, seed: SEED, repeat: REPEAT, runs: prior }, null, 2))
      const oc = r1.outcome ? (r1.outcome.won ? 'WIN' : r1.outcome.lost ? 'LOSE' : 'END') : 'NONE'
      log(`[${key}] enemy="${r1.enemyName}" det=${deterministic} outcome=${oc} R${lastRound} plays=${r1.plays.length} eHP="${row.finalEnemyHp}" gHP="${row.finalGodHp}" errors=${errorsTotal} external=${externalAll.length} ms=${row.ms.join('/')}`)
    }
await browser.close()
const all = prior
const pass = all.filter((r) => r.deterministic && r.errorsTotal === 0 && r.external.length === 0 && r.outcome && r.crashed.length === 0 && !r.scrollOverflow)
log(
  `TOTAL ${all.length} combos: PASS ${pass.length} / FAIL ${all.length - pass.length}; deterministic ${all.filter((r) => r.deterministic).length}; outcomes WIN ${all.filter((r) => r.outcome?.won).length} LOSE ${all.filter((r) => r.outcome?.lost).length} NONE ${all.filter((r) => !r.outcome).length}; errors ${all.reduce((n, r) => n + r.errorsTotal, 0)}; external ${all.filter((r) => r.external.length).length}`,
)

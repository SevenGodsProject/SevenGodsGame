// Phase 7 P1（決定187）：acceptance.json から受け入れ基準（仕様 §16）の合否を出す（QA 用。ゲームコードではない）。
//
//   node scripts/phase7-p1/summarize.mjs <outDir>/acceptance.json
//
// AC8（saveVersion／gameVersion）と AC15（test／tsc／lint）は実画面では測れないため、
// ここでは扱わない（Invariant Audit と回帰テストで判定する）。
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const path = process.argv[2]
if (!path) {
  console.error('usage: node scripts/phase7-p1/summarize.mjs <acceptance.json>')
  process.exit(2)
}
const report = JSON.parse(readFileSync(path, 'utf8'))
const vps = report.viewports
const results = []
const add = (id, title, checks) => {
  const failed = checks.filter((c) => !c.ok)
  results.push({ id, title, pass: checks.length > 0 && failed.length === 0, checks: checks.length, failed })
}
const check = (name, ok, detail = null) => ({ name, ok: !!ok, detail })

/** すべての「決着後・報酬確定後」の結果画面計測を列挙する */
function resultScreens(vp, v) {
  const out = []
  const push = (name, m) => m && !m.rewardPending && out.push({ name: `${vp}/${name}`, m })
  push('normal-win', v.normalWin?.metrics)
  push('normal-lose', v.normalLoseChain?.lose?.metrics)
  push('resumed-lose', v.normalLoseChain?.resumed?.metrics)
  push('daily-1', v.dailySequence?.r1?.metrics)
  push('daily-2', v.dailySequence?.r2?.metrics)
  push('daily-3', v.dailySequence?.r3?.metrics)
  push('daily-lose-first', v.dailyLoseFirst?.metrics)
  return out
}
const allResults = Object.entries(vps).flatMap(([vp, v]) => resultScreens(vp, v))
const homes = Object.entries(vps).flatMap(([vp, v]) =>
  [
    ['home-noresume', v.homeNoResume?.metrics],
    ['home-resume', v.normalLoseChain?.homeResume],
  ]
    .filter(([, m]) => m)
    .map(([name, m]) => ({ name: `${vp}/${name}`, m })),
)

add('AC1', '通常勝利後、Result だけで次の行動候補（Primary 1＋Secondary 2）が分かる', Object.entries(vps).map(([vp, v]) => {
  const m = v.normalWin?.metrics
  return check(`${vp}/normal-win`, m && m.goal?.text && m.primary && m.secondary.length === 2 && m.primary.inView && m.secondary.every((b) => b.inView), m && { goal: m.goal?.text, primary: m.primary?.text, secondary: m.secondary.map((b) => b.text) })
}))

add('AC2', 'Daily 終了後、今日のベストとの関係が分かる（2 回目以降は前回も）', Object.entries(vps).flatMap(([vp, v]) => {
  const list = []
  const d = v.dailySequence
  if (d) {
    list.push(check(`${vp}/daily-1`, d.r1?.metrics?.dailyDiff?.[0]?.includes('今日のベスト'), d.r1?.metrics?.dailyDiff))
    list.push(check(`${vp}/daily-2`, d.r2?.metrics?.dailyDiff?.[0]?.includes('今日のベスト') && d.r2?.metrics?.dailyDiff?.[1]?.startsWith('前回'), d.r2?.metrics?.dailyDiff))
    list.push(check(`${vp}/daily-3`, d.r3?.metrics?.dailyDiff?.[0]?.includes('今日のベスト') && d.r3?.metrics?.dailyDiff?.[1]?.startsWith('前回'), d.r3?.metrics?.dailyDiff))
  }
  const f = v.dailyLoseFirst?.metrics
  if (f) list.push(check(`${vp}/daily-lose-first`, f.dailyDiff?.[0]?.includes('今日のベスト'), f.dailyDiff))
  return list
}))

add('AC3', 'Home 起動後、Daily の敵と残り回数がスクロールなしで読める', homes.map(({ name, m }) => check(name, m.todayEnemyInView && m.todayAttemptsInView && /残り \d\/3/.test(m.todayAttempts ?? ''), { enemy: m.todayEnemy, attempts: m.todayAttempts })))

add('AC4', '続きがあるとき「続きから」が Today より上の Primary', Object.entries(vps).filter(([, v]) => v.normalLoseChain).map(([vp, v]) => {
  const m = v.normalLoseChain.homeResume
  return check(`${vp}/home-resume`, m?.resume && m.primaryText?.startsWith('続きから') && m.primaryAboveToday && m.primaryInView, m && { primary: m.resumeText, aboveToday: m.primaryAboveToday })
}))

add('AC5', '390×844 で主要 CTA（Primary）が viewport 内・44px 以上', [
  ...allResults.filter((r) => r.name.startsWith('sp844/')).map(({ name, m }) => check(name, m.primary?.inView && m.primary.height >= 44, m.primary && { text: m.primary.text, top: m.primary.top, height: m.primary.height })),
  ...homes.filter((h) => h.name.startsWith('sp844/')).map(({ name, m }) => check(name, m.primaryInView && m.todayCtaInView, { primary: m.primaryRect, todayCta: m.todayCtaInView })),
])

add('AC5+', '（参考）他の viewport でも Primary が viewport 内', allResults.filter((r) => !r.name.startsWith('sp844/')).map(({ name, m }) => check(name, m.primary?.inView && m.primary.height >= 44, m.primary && { text: m.primary.text, top: m.primary.top, height: m.primary.height, vh: m.vh })))

add('AC6', 'Result/Home 変更で戦闘画面のレイアウトが変化しない（変更前ビルドと offset 箱が一致）', report.layout ? Object.entries(report.layout).map(([vp, l]) => check(`${vp}`, l.elements > 20 && l.diffs.length === 0 && l.errors.length === 0, { elements: l.elements, diffs: l.diffs.slice(0, 5) })) : [])

add('AC7', 'Daily：開始ごとに回数 +1（Home 経由／もう一度／デッキ調整経由）・seed 不変・残り 0 で開始不可', Object.entries(vps).filter(([, v]) => v.dailySequence).flatMap(([vp, v]) => {
  const d = v.dailySequence
  const used = (label) => d.steps.find((s) => s.label === label)?.storage.daily?.[0]?.attemptsUsed ?? 0
  const seeds = d.steps.flatMap((s) => [...(s.storage.daily ?? []).map((x) => x.seed), ...(s.storage.save?.seed ? [s.storage.save.seed] : [])])
  const day = d.steps.find((s) => s.storage.daily)?.storage.daily?.[0]
  const expectedSeed = day ? `daily-${day.dateKey}-${day.enemyId}` : null
  return [
    check(`${vp}/before`, used('before-1') === 0),
    check(`${vp}/home経由の開始で 1`, used('battle-1-started') === 1 && used('result-1') === 1),
    check(`${vp}/もう一度挑戦で 2`, used('battle-2-started') === 2 && used('result-2') === 2),
    check(`${vp}/デッキ調整画面では消費しない`, d.onDeckScreen && used('deck-before-3') === 2),
    check(`${vp}/デッキ調整経由の開始で 3`, used('battle-3-started') === 3 && used('result-3') === 3 && used('home-after') === 3),
    check(`${vp}/seed は全挑戦で同一`, expectedSeed && seeds.length > 0 && seeds.every((s) => s === expectedSeed), { expectedSeed, seeds: [...new Set(seeds)] }),
    check(`${vp}/残り 0：Primary はホーム・もう一度は出ない`, d.r3?.metrics?.primary?.exit === 'home' && !d.r3.metrics.secondary.some((b) => b.exit === 'rematch') && !d.r3.metrics.tertiary.some((b) => b.exit === 'rematch')),
    check(`${vp}/残り 0：Home は終了表示＋次の敵まで HH:MM`, /終了/.test(d.homeAfter?.todayAttempts ?? '') && /次の敵まで \d\d:\d\d/.test(d.homeAfter?.countdown ?? ''), { attempts: d.homeAfter?.todayAttempts, countdown: d.homeAfter?.countdown }),
    check(`${vp}/残り 0：神域挑戦画面の開始ボタンは無効`, d.startDisabled === true),
    check(`${vp}/残りがある Home では次の敵までを出さない`, d.homeBefore?.countdown === null),
  ]
}))

add('AC9', '次の目標は 1 行（SP で最大 2 行）・空でない', allResults.map(({ name, m }) => check(name, m.goal?.text && m.goal.lines <= 2, m.goal && { id: m.goal.id, text: m.goal.text, lines: m.goal.lines })))

add('AC10', 'Result 初期表示に別アクティビティへの CTA が 2 つ以上（報酬未確定は除外）', allResults.map(({ name, m }) => {
  const others = m.buttonsInView.filter((b) => b.exit && b.exit !== 'rematch' && b.exit !== 'share')
  return check(name, others.length >= 2, others.map((b) => b.text))
}))

add('AC11', '挑戦状のコピーは Primary より小さく、DOM 上も後ろ', allResults.map(({ name, m }) => check(name, m.share && m.primary && m.share.area < m.primary.area && m.shareAfterPrimary, m.share && { share: m.share.area, primary: m.primary?.area })))

// Phase 7 Entrance E1（決定193・仕様 §10・§15）：Home の「遊び方を見る」はヘッダーの本のアイコン（同じ機能）へ一本化したため、
// Home のリンクは「戦績を見る」「OTOMOとの絆を見る」の 2 本（機能の削除ではない）
add('AC12', 'PC 1508×660 で Home のリンク（E1 以降は 2 本：戦績・OTOMO）が viewport 内', homes.filter((h) => h.name.startsWith('pc1508/')).map(({ name, m }) => check(name, m.linksInView.length === 2 && m.linksInView.every(Boolean), m.linkRects)))

add('AC13', 'Home CLS ≤ 0.1・Home のボタンはすべて 44px 以上', [
  ...Object.entries(vps).map(([vp, v]) => check(`${vp}/cls`, v.homeNoResume && v.homeNoResume.clsAfterTutorial <= 0.1, { load: v.homeNoResume?.clsLoad, afterTutorial: v.homeNoResume?.clsAfterTutorial })),
  ...homes.map(({ name, m }) => check(`${name}/44px`, m.minButtonHeight >= 44, m.buttons.filter((b) => b.height < 44))),
])

const scenarioErrors = Object.entries(vps).flatMap(([vp, v]) => Object.entries(v).map(([name, s]) => ({ name: `${vp}/${name}`, errors: [...(s?.errors ?? []), ...(s?.error ? [s.error] : [])] })))
add('AC14', 'すべてのシナリオで JS error 0', [
  ...scenarioErrors.map(({ name, errors }) => check(name, errors.length === 0, errors.slice(0, 3))),
  ...Object.entries(report.layout ?? {}).map(([vp, l]) => check(`${vp}/layout`, l.errors.length === 0, l.errors.slice(0, 3))),
])

add('AC16', 'Daily 敗北＋今日のベスト未記録で「同点」を出さない', Object.entries(vps).filter(([, v]) => v.dailyLoseFirst).map(([vp, v]) => {
  const m = v.dailyLoseFirst.metrics
  const day = v.dailyLoseFirst.storage?.daily?.[0]
  return check(`${vp}/daily-lose-first`, day && day.bestScore === 0 && m.dailyDiff && !m.dailyDiff.join('').includes('同点'), { bestScore: day?.bestScore, diff: m.dailyDiff })
}))

add('EXTRA-1', '横スクロール・横はみ出しなし（Home・Result）', [
  ...homes.map(({ name, m }) => check(name, !m.overflowX && m.scrollX === 0)),
  ...allResults.map(({ name, m }) => check(name, !m.pageOverflowX && !m.card.overflowX && m.scrollX === 0)),
])

add('EXTRA-2', '結果→デッキ調整で直前の敵を引き継ぎ、決着後にホームへ戻っても幽霊の「続きから」が出ない', Object.entries(vps).filter(([, v]) => v.normalLoseChain).flatMap(([vp, v]) => {
  const c = v.normalLoseChain
  return [
    check(`${vp}/デッキ調整→デッキ画面`, c.adjustClicked && c.onDeckScreen),
    check(`${vp}/敵の引き継ぎ（業斧の鬼将・通常・神階0）`, c.afterAdjust?.save?.mode === 'normal' && c.afterAdjust.save.stake === 0 && c.homeResume?.resumeText?.includes('業斧の鬼将'), { save: c.afterAdjust?.save, resume: c.homeResume?.resumeText }),
    check(`${vp}/続きから再開→決着→ホームへ：続きが残らない`, c.homeClicked && c.homeAfter && !c.homeAfter.resume && c.storageAfter?.save === null),
  ]
}))

add('EXTRA-3', '報酬未確定（勝利直後）は「報酬カードを選ぶ」だけ', Object.entries(vps).filter(([, v]) => v.normalWin?.pending).map(([vp, v]) => {
  const p = v.normalWin.pending
  return check(`${vp}/normal-win`, p.rewardPending && !p.primary && p.secondary.length === 0 && p.tertiary.length === 0)
}))

add('EXTRA-4', '通常戦の「同じ構成でもう一度」（既存の再戦経路）が同じ敵・通常モードで始まる', Object.entries(vps).filter(([, v]) => v.normalWin?.rematch).map(([vp, v]) => {
  const r = v.normalWin.rematch
  return check(`${vp}/normal-win → rematch`, r.clicked && r.storage?.save?.mode === 'normal' && r.storage.save.status === 'playing' && r.storage.save.round === 1 && r.storage.save.enemy === 'enemy_02', r.storage?.save)
}))

const summary = { source: path, generatedAt: new Date().toISOString(), pass: results.every((r) => r.pass), results }
const out = join(dirname(path), 'summary.json')
writeFileSync(out, JSON.stringify(summary, null, 2))
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.id.padEnd(8)} ${r.title}  (${r.checks - r.failed.length}/${r.checks})`)
  for (const f of r.failed) console.log(`        ✗ ${f.name} ${JSON.stringify(f.detail)?.slice(0, 300) ?? ''}`)
}
console.log(summary.pass ? 'ALL PASS' : 'SOME FAILED', '→', out)
process.exit(summary.pass ? 0 : 1)

// 決定266 AC8：決定264 の After（:4302・docs/evidence/decision264）と 決定266 の After（:4303・docs/evidence/decision266/d264-regression）を
// 同じ key（vp×神×敵・同一 seed）で突き合わせる。面積・HP 幅・環 none・scrim（名札背景）・artScale・共鳴・intent・重なり・文字切れ・横スク・console。
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
const A = 'docs/evidence/decision264/layout/runs-layout'
// dir= で比較先（After 側）のディレクトリを変えられる（Polish：docs/evidence/decision266/polish/d264-regression）
const DIR = (process.argv.find((x) => x.startsWith('dir=')) ?? 'dir=docs/evidence/decision266/d264-regression').slice(4)
const B = `${DIR}/layout/runs-layout`
const L = ['# 決定266 AC8：決定264 回帰（D264 After :4302 ↔ D266 After :4303・同一 seed／同一 key）', '']
const rows = []
let worst = { area: 0, hp: 0, reso: 0, intent: 0, gap: 0 }
const fails = []
let boxFail = 0
for (const f of readdirSync(B).filter((x) => x.startsWith('after-') && x.endsWith('.json'))) {
  if (!existsSync(`${A}/${f}`)) { fails.push(`${f}: D264 側なし`); continue }
  const a = JSON.parse(readFileSync(`${A}/${f}`, 'utf8')), b = JSON.parse(readFileSync(`${B}/${f}`, 'utf8'))
  const d = (x, y) => Math.round(Math.abs((x ?? 0) - (y ?? 0)) * 100) / 100
  const dArea = Math.max(d(a.m.area.enemy, b.m.area.enemy), d(a.m.area.god, b.m.area.god), d(a.m.area.otomo, b.m.area.otomo))
  const dHp = Math.max(d(a.m.hud.enemyHp?.[0], b.m.hud.enemyHp?.[0]), d(a.m.hud.godHp?.[0], b.m.hud.godHp?.[0]), d(a.m.hud.enemyHp?.[1], b.m.hud.enemyHp?.[1]), d(a.m.hud.godHp?.[1], b.m.hud.godHp?.[1]))
  const dReso = Math.max(d(a.m.hud.reso?.[0], b.m.hud.reso?.[0]), d(a.m.hud.reso?.[1], b.m.hud.reso?.[1]))
  const dIntent = Math.max(d(a.m.hud.intent?.[0], b.m.hud.intent?.[0]), d(a.m.hud.intent?.[1], b.m.hud.intent?.[1]))
  const dGap = d(a.m.gapEnemyGod, b.m.gapEnemyGod)
  const same = (k) => JSON.stringify(a.m.hud[k]) === JSON.stringify(b.m.hud[k])
  const ring = same('auraEnemy') && same('auraGod') && same('auraOtomo') && b.m.hud.auraEnemy?.content === 'none'
  const scrim = same('plateBg')
  const art = a.m.hud.artScale === b.m.hud.artScale
  const cols = a.m.hud.mainCols === b.m.hud.mainCols
  const BOXES = ['enemyStage', 'godStage', 'enemyWrap', 'enemyPlate', 'godPlate', 'otomoPlate', 'portrait', 'enemyHp', 'godHp', 'reso', 'intent']
  const boxSame = BOXES.every((k) => same(k)) && JSON.stringify(a.m.dock) === JSON.stringify(b.m.dock)
  if (!boxSame) boxFail++
  // ink 面積は立ち絵の待機（呼吸）アニメの測定時刻差で ±0.25pt 揺れる（SP は CSS 無変更でも同程度）→ レイアウト箱の完全一致を主判定にする
  const ok = boxSame && dArea <= 0.25 && dHp <= 0.5 && dReso <= 0.5 && dIntent <= 0.5 && ring && scrim && art && b.m.clipped.length === 0 && !b.m.hScroll && b.errors.length === 0
  worst = { area: Math.max(worst.area, dArea), hp: Math.max(worst.hp, dHp), reso: Math.max(worst.reso, dReso), intent: Math.max(worst.intent, dIntent), gap: Math.max(worst.gap, dGap) }
  if (!ok) fails.push(f)
  rows.push(`| ${f.replace('.json', '')} | ${a.m.area.enemy}→${b.m.area.enemy} | ${a.m.area.god}→${b.m.area.god} | ${a.m.hud.enemyHp?.[0]}→${b.m.hud.enemyHp?.[0]} | ${a.m.hud.godHp?.[0]}→${b.m.hud.godHp?.[0]} | ${b.m.hud.auraEnemy?.content} ${ring ? '同値' : '差'} | ${scrim ? '同値' : '差'} | ${a.m.hud.artScale}→${b.m.hud.artScale} | ${cols ? '同値' : '差'} | ${b.m.clipped.length} | ${b.m.hScroll ? 'あり' : '0'} | ${b.errors.length} | ${ok ? 'PASS' : 'FAIL'} |`)
}
L.push(`レイアウト箱（舞台・名札・HP・共鳴・intent・OTOMO・dock）の完全一致：${rows.length - boxFail}/${rows.length}`, '')
L.push(`runs: ${rows.length}・FAIL ${fails.length}${fails.length ? '（' + fails.join(', ') + '）' : ''}`, '', `最大差：面積 ${worst.area} pt・HP 箱 ${worst.hp} px・共鳴 ${worst.reso} px・intent ${worst.intent} px・敵–神間隔 ${worst.gap} px（立ち絵の呼吸アニメによる測定時刻差を含む）`, '')
L.push('| key | 敵 面積% | 神 面積% | 敵 HP 幅 | 神 HP 幅 | 環 | scrim | artScale | 列 | 文字切れ | 横スク | console | 判定 |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|', ...rows.sort())
// gate-hud
const ha = 'docs/evidence/decision264/gate-hud/gate-hud.json', hb = `${DIR}/gate-hud/gate-hud-after.json`
if (existsSync(ha) && existsSync(hb)) {
  const ja = JSON.parse(readFileSync(ha, 'utf8')).filter((r) => r.side === 'after'), jb = JSON.parse(readFileSync(hb, 'utf8'))
  L.push('', '## gate-hud（環・角金具・名札 scrim・HP 箱・intent 箱・コントラスト）', '', '| key | pseudo 同値 | hp 同値 | intentBox 同値 | contrast 最大差 | 判定 |', '|---|---|---|---|---|---|')
  let hf = 0
  for (const b of jb) {
    const a = ja.find((x) => x.key === b.key)
    if (!a) { L.push(`| ${b.key} | D264 側なし | | | | FAIL |`); hf++; continue }
    const pa = { ...a.pseudo }, pb = { ...b.pseudo }
    const hpSame = JSON.stringify(pa.hp) === JSON.stringify(pb.hp), ibSame = JSON.stringify(pa.intentBox) === JSON.stringify(pb.intentBox)
    delete pa.hp; delete pb.hp; delete pa.intentBox; delete pb.intentBox; delete pa.wound; delete pb.wound
    const psSame = JSON.stringify(pa) === JSON.stringify(pb)
    let cd = 0
    for (const k of Object.keys(a.contrast ?? {})) cd = Math.max(cd, Math.abs((a.contrast[k]?.crMedian ?? 0) - (b.contrast?.[k]?.crMedian ?? 0)))
    const ok = psSame && hpSame && ibSame && cd <= 0.5
    if (!ok) hf++
    L.push(`| ${b.key} | ${psSame ? '同値' : '差'} | ${hpSame ? '同値' : '差'} | ${ibSame ? '同値' : '差'} | ${Math.round(cd * 100) / 100} | ${ok ? 'PASS' : 'FAIL'} |`)
  }
  L.push('', `gate-hud FAIL ${hf}`)
}
writeFileSync(`${DIR}/COMPARE_D264.md`, L.join('\n') + '\n')
console.log(L.slice(0, 6).join('\n'))
console.log(L.filter((l) => l.startsWith('gate-hud FAIL')).join('\n'))

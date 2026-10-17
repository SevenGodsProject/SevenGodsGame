// hard 難易度の「演出条件のずれ」の境界一致チェック（node 単体・heavy-run 不要・表示コードは変えない）。
//   node --import ./scripts/combat-pilots-rc/ts-loader.mjs scripts/combat-pilots-rc/hard-boundary.mjs <outJson>
// Lane 2 監査 §2-5 の手法（enemy_09・HP 全走査で hpBand と tacticBranch を突き合わせる）を 3 難易度へ広げる。
//   ・表示側：visualHp.ts hpBand(shown, max)（≤0.5 で half・≤0.25 で quarter）＝ 傷の光／Enemy Break half の条件
//   ・engine 側：tactic.ts tacticBranch(tactic, hp, maxHp, difficulty)（≤ ratioByDifficulty[difficulty]）
//   ・maxHp は engine と同じ丸め（createInitialState.ts の enemyHpMultiplier の扱い）で出す
// 不一致を 2 種に分ける：
//   A「then だが光らない」（hpBand high かつ then）＝ プレイヤー有利側（追い込めたのに気付かない）
//   B「光るが else」（hpBand half 以下かつ else）＝ プレイヤー不利側（追い込めたつもりで必殺を受ける）＝ 0 であること
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { execSync } from 'node:child_process'
import { PILOT_ENEMIES } from '../../src/core/data/enemies.ts'
import { RULES } from '../../src/core/data/rules.ts'
import { tacticBranch, tacticRatio, resolveEnemyTactic } from '../../src/core/engine/tactic.ts'
import { hpBand } from '../../src/components/battle/visualHp.ts'

const enemy = PILOT_ENEMIES.find((e) => e.id === 'enemy_09')
const tactic = enemy.actions.find((a) => a.kind === 'tactic')
const tacticRound = enemy.actions.indexOf(tactic) + 1

// createInitialState.ts と同じ式で maxHp を出す（式はソースから読んで照合する。下の文字列検査で固定）
const src = execSync('git show HEAD:src/core/engine/createInitialState.ts', { encoding: 'utf8' })
const m = src.match(/const enemyMaxHp = Math\.round\(\s*([\s\S]*?),?\s*\n\s*\)/)
const formulaLine = m ? 'Math.round(' + m[1].trim() + ')' : '(not found)'

const rows = []
const summary = {}
for (const difficulty of ['easy', 'normal', 'hard']) {
  const mult = RULES.difficulty[difficulty].enemyHpMultiplier
  const maxHp = Math.round(enemy.maxHp * mult)
  const ratio = tacticRatio(tactic, difficulty)
  const thenMax = Math.floor(maxHp * ratio + 1e-9)
  const halfMax = Math.floor(maxHp * 0.5 + 1e-9)
  const quarterMax = Math.floor(maxHp * 0.25 + 1e-9)
  let mismatchA = 0
  let mismatchB = 0
  const bandA = []
  const bandB = []
  for (let hp = maxHp; hp >= 0; hp--) {
    const band = hpBand(hp, maxHp)
    const branch = tacticBranch(tactic, hp, maxHp, difficulty)
    const glow = band !== 'high'
    const isThen = branch === 'then'
    const a = isThen && !glow
    const b = glow && !isThen
    if (a) { mismatchA++; bandA.push(hp) }
    if (b) { mismatchB++; bandB.push(hp) }
    rows.push({ difficulty, maxHp, hp, band, branch, mismatch: a ? 'A(then,no-glow)' : b ? 'B(glow,else)' : '' })
  }
  const range = (arr) => (arr.length ? `${Math.min(...arr)}〜${Math.max(...arr)}` : '—')
  summary[difficulty] = {
    enemyHpMultiplier: mult,
    maxHp,
    ratio,
    thenMaxHp: thenMax,
    halfMaxHp: halfMax,
    quarterMaxHp: quarterMax,
    scanned: maxHp + 1,
    mismatchA_then_noGlow: mismatchA,
    mismatchA_range: range(bandA),
    mismatchB_glow_else: mismatchB,
    mismatchB_range: range(bandB),
    resolveAtThenMax: resolveEnemyTactic(tactic, thenMax, maxHp, difficulty),
    resolveAtThenMaxPlus1: resolveEnemyTactic(tactic, thenMax + 1, maxHp, difficulty),
    firstThenHp: thenMax,
    firstHalfHp: halfMax,
  }
}
const head = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
const result = {
  head,
  date: new Date().toISOString(),
  enemy: { id: enemy.id, name: enemy.name, maxHp: enemy.maxHp, tacticRound, then: tactic.then, else: tactic.else, cond: tactic.cond },
  maxHpFormula: formulaLine,
  hpBandThresholds: { half: 0.5, quarter: 0.25 },
  summary,
  rows,
}
const out = process.argv[2]
if (out) {
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, JSON.stringify(result, null, 2))
}
console.log(`enemy ${enemy.id} maxHp ${enemy.maxHp} tactic R${tacticRound}  maxHp formula: ${formulaLine}`)
console.log('difficulty | mult | maxHp | ratio | then<= | half<= | A(then,no-glow) | B(glow,else)')
for (const [d, s] of Object.entries(summary)) {
  console.log(`${d} | ${s.enemyHpMultiplier} | ${s.maxHp} | ${s.ratio} | ${s.thenMaxHp} | ${s.halfMaxHp} | ${s.mismatchA_then_noGlow} (${s.mismatchA_range}) | ${s.mismatchB_glow_else} (${s.mismatchB_range})`)
}
const anyB = Object.values(summary).some((s) => s.mismatchB_glow_else > 0)
console.log(anyB ? 'B(glow,else) > 0 : FAIL' : 'B(glow,else) = 0 for all difficulties : PASS (player-favorable only)')
process.exit(anyB ? 1 : 0)

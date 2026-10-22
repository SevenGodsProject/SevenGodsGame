// 将軍家 Pilot v0.4（忠次 enemy_08・docs/SHOGUNATE_PILOT_V0_4.md）PM Gate G5：不変性の機械確認（node 単体・heavy-run 不要）。
//   node --import ./scripts/combat-pilots-rc/ts-loader.mjs scripts/shogunate-pilot/invariants.mjs <outJson>
// scripts/combat-pilots-rc/invariants.mjs（v1.0.2 RC・ENEMIES=8 前提）を v0.4 向けに複製し、忠次の分を足したもの。
// 見るもの：
//   ① CORE_ENEMIES（既存 7 体）の JSON sha256 ＝ golden 5678e3e7…（v1.0.2 と同値）
//   ② getGameVersion() ＝ 1.d794038a00b5b53c（golden・v1.0.0 以来不変）
//   ③ RULES.saveVersion ＝ 9
//   ④ 指紋（rankingImpactSnapshot）に enemy_08／忠次／tadatsugu／軍略／tactic が乗らない・"id":"enemy_0x" は 7 つ
//   ⑤ SHOGUNATE_ENEMIES ＝ [enemy_08]・ENEMIES ＝ CORE 7 ＋ PILOT 1 ＋ SHOGUNATE 1 ＝ 9・isPilotEnemyId が両 Pilot に真
//   ⑥ 忠次の tactic しきい値は ratio 0.5 のみ（ratioByDifficulty を埋めない＝Enemy Break half 帯と境界一致）
//   ⑦ pickEnemyId は CORE 7 体だけを返す（500 seed）
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { execSync } from 'node:child_process'
import { CORE_ENEMIES, PILOT_ENEMIES, SHOGUNATE_ENEMIES, ENEMIES, isPilotEnemyId, isShogunateEnemyId, pickEnemyId } from '../../src/core/data/enemies.ts'
import { RULES } from '../../src/core/data/rules.ts'
import { getGameVersion, rankingImpactSnapshot } from '../../src/core/replay/gameVersion.ts'

const CORE_GOLDEN_SHA256 = '5678e3e757f603ae3b2a1974c772c5480222bea9c7e3e6a78f96d1b49bd70e91'
const GAME_VERSION_GOLDEN = '1.d794038a00b5b53c'

const coreSha = createHash('sha256').update(JSON.stringify(CORE_ENEMIES)).digest('hex')
const version = getGameVersion()
const snap = rankingImpactSnapshot()
const head = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
const tadatsugu = SHOGUNATE_ENEMIES[0]
const tactic = tadatsugu?.actions.find((a) => a.kind === 'tactic')
const coreIds = new Set(CORE_ENEMIES.map((e) => e.id))
const picked = new Set()
for (let i = 0; i < 500; i++) picked.add(pickEnemyId(`gate-v04-seed-${i}`))

const checks = [
  { name: 'CORE_ENEMIES count = 7', pass: CORE_ENEMIES.length === 7, detail: CORE_ENEMIES.length },
  { name: 'CORE_ENEMIES sha256 = golden 5678e3e7…', pass: coreSha === CORE_GOLDEN_SHA256, detail: coreSha },
  { name: 'getGameVersion() = 1.d794038a00b5b53c', pass: version === GAME_VERSION_GOLDEN, detail: version },
  { name: 'RULES.saveVersion = 9', pass: RULES.saveVersion === 9, detail: RULES.saveVersion },
  { name: 'PILOT_ENEMIES = [enemy_09]', pass: PILOT_ENEMIES.length === 1 && PILOT_ENEMIES[0].id === 'enemy_09', detail: PILOT_ENEMIES.map((e) => e.id) },
  { name: 'SHOGUNATE_ENEMIES = [enemy_08 将軍四天王・忠次 maxHp 98]', pass: SHOGUNATE_ENEMIES.length === 1 && tadatsugu?.id === 'enemy_08' && tadatsugu?.name === '将軍四天王・忠次' && tadatsugu?.maxHp === 98, detail: SHOGUNATE_ENEMIES.map((e) => [e.id, e.name, e.maxHp]) },
  { name: 'ENEMIES = CORE + PILOT + SHOGUNATE (9)', pass: ENEMIES.length === 9 && ENEMIES[7].id === 'enemy_09' && ENEMIES[8].id === 'enemy_08', detail: ENEMIES.map((e) => e.id) },
  { name: 'enemy_08 is not in CORE/PILOT', pass: !coreIds.has('enemy_08') && !PILOT_ENEMIES.some((e) => e.id === 'enemy_08'), detail: null },
  { name: 'isPilotEnemyId true for enemy_08 and enemy_09, false for CORE', pass: isPilotEnemyId('enemy_08') && isPilotEnemyId('enemy_09') && CORE_ENEMIES.every((e) => !isPilotEnemyId(e.id)), detail: null },
  { name: 'isShogunateEnemyId true only for enemy_08', pass: isShogunateEnemyId('enemy_08') && !isShogunateEnemyId('enemy_09') && CORE_ENEMIES.every((e) => !isShogunateEnemyId(e.id)), detail: null },
  { name: 'fingerprint excludes enemy_08', pass: !snap.includes('enemy_08'), detail: snap.includes('enemy_08') },
  { name: 'fingerprint excludes enemy_09', pass: !snap.includes('enemy_09'), detail: snap.includes('enemy_09') },
  { name: 'fingerprint excludes 忠次 / tadatsugu / 軍略', pass: !snap.includes('忠次') && !snap.includes('tadatsugu') && !snap.includes('軍略'), detail: null },
  { name: 'fingerprint excludes tactic / ratioByDifficulty / hpRatioByDifficulty', pass: !snap.includes('"tactic"') && !snap.includes('ratioByDifficulty') && !snap.includes('hpRatioByDifficulty'), detail: null },
  { name: 'fingerprint enemy ids = 7', pass: (snap.match(/"id":"enemy_0\d"/g) ?? []).length === 7, detail: (snap.match(/"id":"enemy_0\d"/g) ?? []).length },
  { name: 'tadatsugu tactic cond = { enemyHpRatioAtMost, ratio 0.5 } without ratioByDifficulty', pass: !!tactic && tactic.cond?.type === 'enemyHpRatioAtMost' && tactic.cond?.ratio === 0.5 && tactic.cond?.ratioByDifficulty === undefined, detail: tactic?.cond ?? null },
  { name: 'tadatsugu R3 charge / R4 tactic then attack 12 / else special 24 軍略・総攻め', pass: tadatsugu?.actions[2]?.kind === 'charge' && tactic?.then?.kind === 'attack' && tactic?.then?.amount === 12 && tactic?.else?.kind === 'special' && tactic?.else?.amount === 24 && tactic?.else?.name === '軍略・総攻め', detail: tadatsugu?.actions.map((a) => a.kind) },
  { name: 'enemyTactic.hpRatioByDifficulty = {easy 0.5, normal 0.5, hard 0.6} (RC 不変)', pass: JSON.stringify(RULES.enemyTactic.hpRatioByDifficulty) === JSON.stringify({ easy: 0.5, normal: 0.5, hard: 0.6 }), detail: RULES.enemyTactic.hpRatioByDifficulty },
  { name: 'CORE enemies have no tactic', pass: CORE_ENEMIES.every((e) => e.actions.every((a) => a.kind !== 'tactic')), detail: null },
  { name: 'pickEnemyId(500 seeds) ⊆ CORE 7', pass: [...picked].every((id) => coreIds.has(id)) && picked.size === 7, detail: [...picked].sort() },
]
const result = { head, date: new Date().toISOString(), coreSha, version, saveVersion: RULES.saveVersion, enemyIds: ENEMIES.map((e) => e.id), checks, pass: checks.filter((c) => c.pass).length, total: checks.length }
const out = process.argv[2]
if (out) {
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, JSON.stringify(result, null, 2))
}
for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}  ${JSON.stringify(c.detail)}`)
console.log(`${result.pass}/${result.total} PASS  HEAD ${head}`)
process.exit(result.pass === result.total ? 0 : 1)

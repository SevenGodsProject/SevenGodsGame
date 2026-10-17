// 統合 RC（軍略 Pilot v1.1 × Enemy Break v1）の不変性の機械確認（node 単体・heavy-run 不要）。
//   node --import ./scripts/combat-pilots-rc/ts-loader.mjs scripts/combat-pilots-rc/invariants.mjs <outJson>
// 見るもの：
//   ① CORE_ENEMIES（既存 7 体）の JSON sha256 ＝ coreRoster.test.ts の golden（b4ce1e31…）
//   ② getGameVersion() ＝ 1.d794038a00b5b53c（golden）
//   ③ RULES.saveVersion ＝ 9
//   ④ PILOT_ENEMIES が指紋に入らない（rankingImpactSnapshot に enemy_09／tactic／ratioByDifficulty が無い）
// 評価は PASS／FAIL を出す（Gate 文書 §2 用）。
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { execSync } from 'node:child_process'
import { CORE_ENEMIES, PILOT_ENEMIES, ENEMIES } from '../../src/core/data/enemies.ts'
import { RULES } from '../../src/core/data/rules.ts'
import { getGameVersion, rankingImpactSnapshot } from '../../src/core/replay/gameVersion.ts'

const CORE_GOLDEN_SHA256 = 'b4ce1e3165e408d73762bc131bccab1dc0905919c3f3b18dd539f54421f9cdd4'
const GAME_VERSION_GOLDEN = '1.d794038a00b5b53c'

const coreSha = createHash('sha256').update(JSON.stringify(CORE_ENEMIES)).digest('hex')
const version = getGameVersion()
const snap = rankingImpactSnapshot()
const head = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()

const checks = [
  { name: 'CORE_ENEMIES count = 7', pass: CORE_ENEMIES.length === 7, detail: CORE_ENEMIES.length },
  { name: 'CORE_ENEMIES sha256 = golden', pass: coreSha === CORE_GOLDEN_SHA256, detail: coreSha },
  { name: 'getGameVersion() = golden', pass: version === GAME_VERSION_GOLDEN, detail: version },
  { name: 'RULES.saveVersion = 9', pass: RULES.saveVersion === 9, detail: RULES.saveVersion },
  { name: 'PILOT_ENEMIES = [enemy_09]', pass: PILOT_ENEMIES.length === 1 && PILOT_ENEMIES[0].id === 'enemy_09', detail: PILOT_ENEMIES.map((e) => e.id) },
  { name: 'ENEMIES = CORE + PILOT (8)', pass: ENEMIES.length === 8, detail: ENEMIES.length },
  { name: 'fingerprint excludes enemy_09', pass: !snap.includes('enemy_09'), detail: snap.includes('enemy_09') },
  { name: 'fingerprint excludes tactic', pass: !snap.includes('"tactic"'), detail: snap.includes('"tactic"') },
  { name: 'fingerprint excludes ratioByDifficulty', pass: !snap.includes('ratioByDifficulty'), detail: snap.includes('ratioByDifficulty') },
  { name: 'fingerprint excludes hpRatioByDifficulty', pass: !snap.includes('hpRatioByDifficulty'), detail: snap.includes('hpRatioByDifficulty') },
  { name: 'enemyTactic.hpRatioByDifficulty = {easy 0.5, normal 0.5, hard 0.6}', pass: JSON.stringify(RULES.enemyTactic.hpRatioByDifficulty) === JSON.stringify({ easy: 0.5, normal: 0.5, hard: 0.6 }), detail: RULES.enemyTactic.hpRatioByDifficulty },
  { name: 'enemy_09 cond.ratioByDifficulty embedded', pass: PILOT_ENEMIES[0].actions.some((a) => a.kind === 'tactic' && a.cond?.ratioByDifficulty?.hard === 0.6), detail: PILOT_ENEMIES[0].actions.filter((a) => a.kind === 'tactic').map((a) => a.cond) },
  { name: 'CORE enemies have no tactic', pass: CORE_ENEMIES.every((e) => e.actions.every((a) => a.kind !== 'tactic')), detail: null },
]
const result = { head, date: new Date().toISOString(), coreSha, version, saveVersion: RULES.saveVersion, checks, pass: checks.filter((c) => c.pass).length, total: checks.length }
const out = process.argv[2]
if (out) {
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, JSON.stringify(result, null, 2))
}
for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}  ${JSON.stringify(c.detail)}`)
console.log(`${result.pass}/${result.total} PASS  HEAD ${head}`)
process.exit(result.pass === result.total ? 0 : 1)

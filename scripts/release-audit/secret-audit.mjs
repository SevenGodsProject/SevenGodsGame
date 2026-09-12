// Clean Release Audit：Secret Audit（値は絶対に表示しない。場所と種類だけを出す）。
//   node scripts/release-audit/secret-audit.mjs [baseRef]
// tracked files・RC の git 履歴（baseRef..HEAD の追加行）・dist を走査する。
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const baseRef = process.argv[2] ?? '489352c'
const PATTERNS = [
  ['DATABASE_URL', /DATABASE_URL/],
  ['NEON', /\bNEON\b|neon\.tech|neondatabase/i],
  ['postgres URL', /postgres(ql)?:\/\/[^\s'"]+/i],
  ['SECRET', /SECRET/],
  ['TOKEN', /\bTOKEN\b/],
  ['PASSWORD', /PASSWORD|passwd/i],
  ['API_KEY', /API_KEY|apikey/i],
  ['BYPASS', /BYPASS/i],
  ['AUTH', /\bAUTH(ORIZATION)?\b/],
  ['.env reference', /\.env(\.|\b)/],
  ['sk-/ghp_/AKIA/xox style key', /\b(sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,})\b/],
  ['JWT-like', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],
  ['long hex >=48', /\b[0-9a-f]{48,}\b/i],
  ['npg_ (Neon password prefix)', /\bnpg_[A-Za-z0-9]{6,}/],
]
const SKIP = /\.(png|jpg|jpeg|webp|gif|mp3|wav|ogg|webm|woff2?|ico|zip|pdf)$/i
const tracked = execSync('git ls-files', { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean)
const hits = {}
const classify = (file) => (/^docs\//.test(file) ? 'docs(prose)' : /\.test\.tsx?$/.test(file) ? 'test' : /^scripts\//.test(file) ? 'script' : /^src\//.test(file) ? 'source' : /^public\//.test(file) ? 'public' : /^dist\//.test(file) ? 'build' : 'other')
const add = (where, kind, area) => { const k = kind + ' @ ' + where; hits[k] = hits[k] ?? { kind, where, area, n: 0 }; hits[k].n++ }

// 1. tracked files
for (const f of tracked) {
  if (SKIP.test(f)) continue
  let text
  try { text = readFileSync(f, 'utf8') } catch { continue }
  text.split(/\r?\n/).forEach((line, i) => { for (const [name, re] of PATTERNS) if (re.test(line)) add(f + ':' + (i + 1), name, classify(f)) })
}
// 2. git 履歴（RC ブランチが base から積んだ差分の追加行）
const diff = execSync('git log -p --format=commit:%h ' + baseRef + '..HEAD -- . ":(exclude)*.png" ":(exclude)*.webp" ":(exclude)*.mp3" ":(exclude)*.webm"', { encoding: 'utf8', maxBuffer: 1 << 28 })
let commit = '?', file = '?'
for (const line of diff.split(/\r?\n/)) {
  if (line.startsWith('commit:')) commit = line.slice(7)
  else if (line.startsWith('+++ b/')) file = line.slice(6)
  else if (line.startsWith('+') && !line.startsWith('+++')) for (const [name, re] of PATTERNS) if (re.test(line)) add('history ' + commit + ' ' + file, name, classify(file))
}
// 3. dist
if (existsSync('dist')) {
  const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p] })
  for (const f of walk('dist')) {
    if (SKIP.test(f)) continue
    const text = readFileSync(f, 'utf8')
    for (const [name, re] of PATTERNS) {
      const m = text.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))
      if (m) add(f.replace(/\\/g, '/') + ' (x' + m.length + ')', name, 'build')
    }
  }
}
// 4. .env ファイルが tracked に入っていないこと
const envTracked = tracked.filter((f) => /(^|\/)\.env(\..+)?$/.test(f))
console.log('tracked .env files: ' + envTracked.length + (envTracked.length ? ' ' + envTracked.join(',') : ''))
const rows = Object.values(hits).sort((a, b) => a.where.localeCompare(b.where))
const byArea = {}
for (const r of rows) byArea[r.area] = (byArea[r.area] ?? 0) + r.n
console.log('hits by area:', JSON.stringify(byArea))
for (const r of rows) console.log('  [' + r.area + '] ' + r.kind + ' @ ' + r.where + (r.n > 1 ? ' x' + r.n : ''))
const hard = rows.filter((r) => /postgres URL|style key|JWT-like|npg_/.test(r.kind))
console.log(hard.length ? 'RESULT: FAIL - credential-format hits: ' + hard.length : 'RESULT: PASS (no credential-format value found; remaining hits are identifiers/prose/hashes - review the list above)')
process.exit(hard.length ? 1 : 0)

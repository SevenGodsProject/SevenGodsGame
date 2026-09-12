// Clean Release Audit：Ranking Absence Gate（機械判定）。
//   node scripts/release-audit/ranking-absence.mjs [--dist dist]
// tracked files・依存・ビルド成果物に「ランキング backend／Neon／API／提出」が無いことを数える。
// すべて 0（kill switch は false）で PASS。
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const dist = process.argv.includes('--dist') ? process.argv[process.argv.indexOf('--dist') + 1] : 'dist'
const tracked = execSync('git ls-files', { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean)
const fail = []
const row = (label, count, expect = 0) => {
  const ok = count === expect
  if (!ok) fail.push(label)
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + label + ': ' + count + (expect ? ' (expect ' + expect + ')' : ''))
}
const grepLines = (re, files) => files.flatMap((f) => readFileSync(f, 'utf8').split(/\r?\n/).map((l, i) => (re.test(l) ? { where: f + ':' + (i + 1), line: l.trim() } : null)).filter(Boolean))
const grep = (re, files) => grepLines(re, files).map((h) => h.where)

// 1. ランキング backend／API／サーバーのファイル
row('ranking backend files (api/, src/server/, tsconfig.api.json)', tracked.filter((f) => /^(api\/|src\/server\/|tsconfig\.api\.json$)/.test(f)).length)
row('ranking client/ticket/leaderboard/identity files', tracked.filter((f) => /(rankingClient|rankingTicket|leaderboardClient|anonymousPlayerId|dailySessionStart|DailyRankingPanel|setup\/dailyRanking|core\/replay\/ranking|core\/identity)\./.test(f)).length)
row('Phase 4 ranking scripts/docs', tracked.filter((f) => /^(scripts\/phase4|docs\/PHASE4_)/.test(f)).length)
row('DB schema / migration files (*.sql, migrations/)', tracked.filter((f) => /\.sql$|migrations?\//i.test(f)).length)
// 2. 依存
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
row('Neon / postgres / pglite dependencies', Object.keys(deps).filter((d) => /neon|postgres|pglite|(^|\/)pg$|vercel\/node/i.test(d)).length)
const lock = existsSync('package-lock.json') ? readFileSync('package-lock.json', 'utf8') : ''
row('lockfile neon/pglite entries', (lock.match(/node_modules\/@(neondatabase|electric-sql)\//g) ?? []).length)
// 3. ソースの参照
const srcFiles = tracked.filter((f) => /^src\/.*\.(ts|tsx)$/.test(f))
const srcNonTest = srcFiles.filter((f) => !/\.test\./.test(f))
const netHits = grepLines(/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/, srcNonTest)
const assetOnly = netHits.filter((h) => /\/assets\/|\.wav|\.webm|\.mp3|SE_BASE_PATH/.test(h.line))
row('src: network calls other than same-origin asset loads (non-test)', netHits.length - assetOnly.length)
console.log('info  src: same-origin asset fetch (SE .wav; identical on master): ' + assetOnly.map((h) => h.where).join(', '))
row('src: /api/ URL literals', grep(/['"`]\/api\//, srcFiles).length)
row('src: ranking env vars (RANKING_*, DATABASE_URL, NEON_, VITE_RANKING) in non-test source', grep(/RANKING_[A-Z_]+|DATABASE_URL|NEON_|VITE_RANKING/, srcNonTest).length)
console.log('info  src: same words inside test token lists: ' + grep(/RANKING_[A-Z_]+|DATABASE_URL|NEON_|VITE_RANKING/, srcFiles.filter((f) => /\.test\./.test(f))).join(', '))
row('src: imports of removed ranking modules', grep(/from ['"].*(rankingClient|rankingTicketStorage|leaderboardClient|anonymousPlayerId|dailySessionStart|DailyRankingPanel|\/dailyRanking|replay\/ranking|core\/identity)['"]/, srcFiles).length)
// 4. kill switch
const rules = readFileSync('src/core/data/rules.ts', 'utf8')
const m = rules.match(/submissionEnabled:\s*(true|false)/)
row('RULES.ranking.submissionEnabled === false', m && m[1] === 'false' ? 1 : 0, 1)
row('submissionEnabled: true anywhere in tracked text files', grep(/submissionEnabled:\s*true/, tracked.filter((f) => /\.(ts|tsx|json|mjs|js)$/.test(f))).length)
// 5. ビルド成果物
if (existsSync(dist)) {
  const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p] })
  const files = walk(dist).filter((f) => /\.(js|css|html)$/.test(f))
  const text = files.map((f) => readFileSync(f, 'utf8')).join('\n')
  const count = (re) => (text.match(re) ?? []).length
  row('dist: "/api/" occurrences', count(/\/api\//g))
  row('dist: neon / postgres / pglite', count(/neondatabase|postgres|pglite/gi))
  row('dist: DATABASE_URL / RANKING_ / NEON_', count(/DATABASE_URL|RANKING_[A-Z_]+|NEON_/g))
  const fetchCalls = text.match(/.{0,60}\bfetch\(.{0,60}/g) ?? []
  const benignFetch = fetchCalls.filter((c) => /fetch\(e\.href,n\)|\.wav|assets/.test(c))
  row('dist: fetch( calls other than Vite modulepreload polyfill / SE .wav', fetchCalls.length - benignFetch.length)
  console.log('info  dist: benign fetch( = ' + benignFetch.length + ' (Vite modulepreload polyfill, SE .wav)')
  row('dist: api/ranking or /ranking/ paths', count(/api\/ranking|\/ranking\//g))
  row('dist: submissionEnabled:!0 (=true)', count(/submissionEnabled:!0/g))
  console.log('info  dist: submissionEnabled:!1 (=false) = ' + count(/submissionEnabled:!1/g) + '; word ランキング = ' + count(/ランキング/g) + ' (RecordScreen の「ランキングやオンライン通信はありません」文言のみ想定)')
} else console.log('info  dist not found; skip bundle checks')
console.log(fail.length ? 'RESULT: FAIL (' + fail.length + ')' : 'RESULT: PASS (ranking absence)')
process.exit(fail.length ? 1 : 0)

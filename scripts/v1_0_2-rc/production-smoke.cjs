// v1.0.2 Production Smoke S1〜S7 ＋ bundle 一致（決定282 条件 5）。v1.0.1 の run-summary.json と同じ段取りを 1 本で直列実行する。
//   node scripts/v1_0_2-rc/production-smoke.cjs --sha <merge 7hex> [--base https://seven-gods-game.vercel.app] [--master-dir <v1.0.1 dist を持つ worktree>] [--rc-build-sha 32f7f77]
// 出力：docs/evidence/v1_0_2-production-smoke/（各 step の json・stdout・run-summary.json・bundle-match.json）
// S7（旧セーブ互換）は master（v1.0.1）の dist を :4182 で preview し、Production URL を rc 側として save-migration.mjs に渡す。
const { spawn, spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const https = require('node:https')
const crypto = require('node:crypto')

const opts = process.argv.slice(2)
const arg = (k, d) => (opts.includes(k) ? opts[opts.indexOf(k) + 1] : d)
const sha = arg('--sha', null)
const base = arg('--base', 'https://seven-gods-game.vercel.app')
const masterDir = arg('--master-dir', 'C:/Users/kimi1/SevenGodsGame-integ')
const rcBuildSha = arg('--rc-build-sha', '32f7f77')
const version = arg('--version', JSON.parse(fs.readFileSync('package.json', 'utf8')).version)
if (!sha) { console.error('usage: --sha <merge 7hex>'); process.exit(2) }
const PW = path.resolve('node_modules/playwright/index.mjs')
const OUT = arg('--out', 'docs/evidence/v1_0_2-production-smoke')
fs.mkdirSync(OUT, { recursive: true })
const results = []
const log = (s) => process.stdout.write(`[smoke ${new Date().toISOString()}] ${s}\n`)

function run(step, cmd, extraEnv = {}) {
  const logFile = path.join(OUT, `${step}-stdout.txt`)
  log(`run [${step}]: ${cmd}`)
  const r = spawnSync(cmd, { shell: true, encoding: 'utf8', env: { ...process.env, PLAYWRIGHT_MODULE: PW, ...extraEnv } })
  fs.writeFileSync(logFile, (r.stdout ?? '') + (r.stderr ?? ''))
  const code = r.status == null ? 1 : r.status
  log(`exit ${code} [${step}]`)
  results.push({ step, exit: code, log: logFile })
  return code
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    mod.get(url, (res) => {
      const chunks = []
      res.on('data', (d) => chunks.push(d))
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }))
    }).on('error', reject)
  })
}

async function bundleMatch() {
  const html = (await fetchText(base + '/')).body.toString('utf8')
  const js = html.match(/\/assets\/(index-[A-Za-z0-9_-]+\.js)/)?.[1]
  const css = html.match(/\/assets\/(index-[A-Za-z0-9_-]+\.css)/)?.[1]
  const out = { base, productionJs: js, productionCss: css, rcBuildSha, mergeSha: sha, checks: [] }
  const check = (name, pass, detail) => out.checks.push({ name, pass: !!pass, detail })
  if (!js || !css) { check('production index.html references assets', false, { js, css }); return out }
  const prodJs = (await fetchText(`${base}/assets/${js}`)).body
  const prodCss = (await fetchText(`${base}/assets/${css}`)).body
  const distDir = 'dist/assets'
  const rcJsName = fs.readdirSync(distDir).find((f) => /^index-.*\.js$/.test(f))
  const rcCssName = fs.readdirSync(distDir).find((f) => /^index-.*\.css$/.test(f))
  const rcJs = fs.readFileSync(path.join(distDir, rcJsName))
  const rcCss = fs.readFileSync(path.join(distDir, rcCssName))
  const norm = (buf, from) => buf.toString('utf8').split(from).join('<SHA>')
  const a = norm(prodJs, sha)
  const b = norm(rcJs, rcBuildSha)
  out.productionJsBytes = prodJs.length
  out.rcJsName = rcJsName
  out.rcJsBytes = rcJs.length
  check('JS byte-equal after normalizing the embedded build sha', a === b, { prodBytes: prodJs.length, rcBytes: rcJs.length, prodSha256: crypto.createHash('sha256').update(prodJs).digest('hex').slice(0, 16), rcSha256: crypto.createHash('sha256').update(rcJs).digest('hex').slice(0, 16) })
  check('CSS sha256 equal', crypto.createHash('sha256').update(prodCss).digest('hex') === crypto.createHash('sha256').update(rcCss).digest('hex'), { prodCss: css, rcCss: rcCssName })
  check(`Production JS contains version ${version}`, a.includes(version))
  check('Production JS contains merge sha label', prodJs.toString('utf8').includes(sha))
  for (const token of ['/api/ranking', 'RANKING_DATABASE_URL', 'tadatsugu', 'card_common_guard_01_v2', 'voice/taiyo/crisis']) {
    check(`Production JS has no 混入 token: ${token}`, !a.includes(token))
  }
  return out
}

function startPreview(cwd, port) {
  const p = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
  return p
}
function ready(url, cb, tries = 0) {
  const req = http.get(url, (res) => { res.resume(); cb(true) })
  req.on('error', () => { if (tries > 180) return cb(false); setTimeout(() => ready(url, cb, tries + 1), 500) })
}

;(async () => {
  run('s1', `node scripts/release-audit/home-version-smoke.mjs ${OUT}/s1-home.json ${base} ${version} ${sha}`)
  run('s1b', `node ${arg('--acceptance', 'scripts/v1_0_1-rc/acceptance.mjs')} ${OUT}/s1b-acceptance.json ${base} --sha ${sha} --version ${version}`)
  run('s1c', `node scripts/v1_0_2-rc/vocab-check.mjs ${OUT}/s1c-vocab/result.json ${base}`)
  run('s24', `node scripts/release-audit/qa-flow.mjs ${OUT}/s2-s4-qa-flow.json ${base} --shots ${OUT}/qa-flow-shots`)
  run('s5', `node scripts/official-voice-pilot/acceptance.mjs ${OUT}/s5-official-voice.json ${base}`)
  run('s6', `node scripts/legal-credits/acceptance.mjs ${OUT}/s6-legal-credits.json ${base}`)
  const bm = await bundleMatch().catch((e) => ({ error: String(e), checks: [{ name: 'bundle-match ran', pass: false }] }))
  fs.writeFileSync(path.join(OUT, 'bundle-match.json'), JSON.stringify(bm, null, 2))
  const bmPass = bm.checks.every((c) => c.pass)
  log(`bundle-match ${bmPass ? 'PASS' : 'FAIL'}: ${bm.checks.filter((c) => !c.pass).map((c) => c.name).join('; ') || 'all'}`)
  results.push({ step: 'bundle-match', exit: bmPass ? 0 : 1, log: path.join(OUT, 'bundle-match.json') })
  // S7：master（v1.0.1）preview × Production
  log('start master preview :4182 for S7')
  const master = startPreview(masterDir, 4182)
  await new Promise((resolve) => ready('http://localhost:4182/', () => resolve()))
  run('s7', `node scripts/release-audit/save-migration.mjs ${OUT}/s7-old-save-migration.json http://localhost:4182 ${base}`)
  try { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(master.pid), '/T', '/F'], { stdio: 'ignore' }); else master.kill('SIGTERM') } catch {}
  fs.writeFileSync(path.join(OUT, 'run-summary.json'), JSON.stringify({ sha, at: new Date().toISOString(), base, results }, null, 2))
  const worst = Math.max(...results.map((r) => r.exit))
  log(`done worst exit ${worst}`)
  process.exit(worst)
})()

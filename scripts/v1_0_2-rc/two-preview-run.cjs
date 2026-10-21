// v1.0.2 RC Gate（Save Migration）：master（v1.0.1）の dist と RC の dist を別ポートで同時に vite preview し、
// 直列でコマンドを流してから両方を必ず終了する。gate-preview-run.cjs（1 本 preview）の 2 本版。
//   node scripts/v1_0_2-rc/two-preview-run.cjs --master-dir <dir> --master-port 4182 --rc-port 4181 --log <logFile> --cmds <cmds.json>
// cmds.json は [{ "name", "cmd", "env" }]（直列・失敗しても次へ進む）。終了コード＝最大の失敗コード。
const { spawn, spawnSync } = require('node:child_process')
const http = require('node:http')
const fs = require('node:fs')

const opts = process.argv.slice(2)
let masterDir = null
let masterPort = 4182
let rcPort = 4181
let logFile = null
let cmds = []
for (let i = 0; i < opts.length; i++) {
  if (opts[i] === '--master-dir') masterDir = opts[++i]
  if (opts[i] === '--master-port') masterPort = Number(opts[++i])
  if (opts[i] === '--rc-port') rcPort = Number(opts[++i])
  if (opts[i] === '--log') logFile = opts[++i]
  if (opts[i] === '--cmds') cmds = JSON.parse(fs.readFileSync(opts[++i], 'utf8'))
}
const log = (s) => {
  const line = `[two-preview ${new Date().toISOString()}] ${s}\n`
  process.stdout.write(line)
  if (logFile) fs.appendFileSync(logFile, line)
}
if (!masterDir || !cmds.length) { log('usage error'); process.exit(2) }

function startPreview(cwd, port, tag) {
  log(`start vite preview --port ${port} (cwd ${cwd})`)
  const p = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
  p.stdout.on('data', (d) => log(`[${tag}] ${String(d).trim()}`))
  p.stderr.on('data', (d) => log(`[${tag}:err] ${String(d).trim()}`))
  return p
}
function kill(p, tag) {
  try {
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(p.pid), '/T', '/F'], { stdio: 'ignore' })
    else p.kill('SIGTERM')
  } catch {}
  log(`${tag} killed`)
}
function ready(base, cb, tries = 0) {
  const req = http.get(base + '/', (res) => { res.resume(); cb(true) })
  req.on('error', () => {
    if (tries > 180) return cb(false)
    setTimeout(() => ready(base, cb, tries + 1), 500)
  })
}

const master = startPreview(masterDir, masterPort, 'master')
const rc = startPreview(process.cwd(), rcPort, 'rc')
const masterBase = `http://localhost:${masterPort}`
const rcBase = `http://localhost:${rcPort}`
ready(masterBase, (ok1) => {
  if (!ok1) { log('master preview not ready'); kill(master, 'master'); kill(rc, 'rc'); process.exit(97) }
  ready(rcBase, (ok2) => {
    if (!ok2) { log('rc preview not ready'); kill(master, 'master'); kill(rc, 'rc'); process.exit(97) }
    log(`ready master=${masterBase} rc=${rcBase}`)
    let worst = 0
    const report = []
    for (const c of cmds) {
      const t0 = Date.now()
      log(`run [${c.name}]: ${c.cmd} env=${JSON.stringify(c.env ?? {})}`)
      const r = spawnSync(c.cmd, { shell: true, stdio: 'inherit', env: { ...process.env, ...(c.env ?? {}), MASTER_BASE: masterBase, RC_BASE: rcBase } })
      const code = r.status == null ? 1 : r.status
      const sec = Math.round((Date.now() - t0) / 1000)
      log(`exit ${code} (${sec}s) [${c.name}]`)
      report.push({ name: c.name, cmd: c.cmd, env: c.env ?? {}, exit: code, seconds: sec })
      if (code > worst) worst = code
    }
    if (logFile) fs.appendFileSync(logFile, JSON.stringify({ masterBase, rcBase, report }, null, 2) + '\n')
    kill(master, 'master')
    kill(rc, 'rc')
    process.exit(worst)
  })
})

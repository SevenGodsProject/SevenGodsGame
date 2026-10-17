// 統合 RC Gate（G7／G8）：vite preview（dist）を 1 本だけ起動し、headless 受入／probe を直列に実行してから preview を必ず終了する。
// heavy-run.cjs 1 回の中で完結させる（RAM 6GB・同時 node 2 本禁止の運用）。
//   node scripts/combat-pilots-rc/gate-preview-run.cjs --port 4199 --log <logFile> --cmds <cmds.json>
// cmds.json は [{ "name": "...", "cmd": "<shell 文字列>", "env": { ... } }, ...]（直列・失敗しても次へ進む）。
// 引数で渡すと heavy-run.cjs（shell:true）経由で引用符が崩れるため JSON ファイルで渡す。終了コード＝最大の失敗コード。
// preview の終了は Windows では taskkill /T /F（子プロセスごと）。ready 判定は HTTP GET / が応答するまで最大 90 秒。
const { spawn, spawnSync } = require('node:child_process')
const http = require('node:http')
const fs = require('node:fs')

const opts = process.argv.slice(2)
let port = 4199
let logFile = null
let cmds = []
for (let i = 0; i < opts.length; i++) {
  if (opts[i] === '--port') port = Number(opts[++i])
  if (opts[i] === '--log') logFile = opts[++i]
  if (opts[i] === '--cmds') cmds = JSON.parse(fs.readFileSync(opts[++i], 'utf8'))
}
const log = (s) => {
  const line = `[gate-preview ${new Date().toISOString()}] ${s}\n`
  process.stdout.write(line)
  if (logFile) fs.appendFileSync(logFile, line)
}
if (!cmds.length) { log('no commands'); process.exit(2) }

const base = `http://localhost:${port}`
log(`start vite preview --port ${port} --strictPort`)
const preview = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
preview.stdout.on('data', (d) => log(`[preview] ${String(d).trim()}`))
preview.stderr.on('data', (d) => log(`[preview:err] ${String(d).trim()}`))

function killPreview() {
  try {
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(preview.pid), '/T', '/F'], { stdio: 'ignore' })
    else preview.kill('SIGTERM')
  } catch {}
  log('preview killed')
}

function ready(cb, tries = 0) {
  const req = http.get(base + '/', (res) => { res.resume(); cb(true) })
  req.on('error', () => {
    if (tries > 180) return cb(false)
    setTimeout(() => ready(cb, tries + 1), 500)
  })
}

ready((ok) => {
  if (!ok) { log('preview not ready in 90s'); killPreview(); process.exit(97) }
  log(`preview ready at ${base}`)
  let worst = 0
  const report = []
  for (const c of cmds) {
    const t0 = Date.now()
    log(`run [${c.name}]: ${c.cmd} env=${JSON.stringify(c.env ?? {})}`)
    const r = spawnSync(c.cmd, { shell: true, stdio: 'inherit', env: { ...process.env, ...(c.env ?? {}), GATE_BASE_URL: base } })
    const code = r.status == null ? 1 : r.status
    const sec = Math.round((Date.now() - t0) / 1000)
    log(`exit ${code} (${sec}s) [${c.name}]`)
    report.push({ name: c.name, cmd: c.cmd, env: c.env ?? {}, exit: code, seconds: sec })
    if (code > worst) worst = code
  }
  if (logFile) fs.appendFileSync(logFile, JSON.stringify({ base, report }, null, 2) + '\n')
  killPreview()
  process.exit(worst)
})

// Release Hygiene Gate：BGM の再エンコードと品質検証（配信容量の整理。曲の内容は変えない）。
//   node scripts/release-hygiene/audio.mjs probe            … 現状の実測
//   node scripts/release-hygiene/audio.mjs try <name>       … 候補コーデック/ビットレートの比較（1曲）
//   node scripts/release-hygiene/audio.mjs encode           … 採用設定で public/assets/bgm へ書き出し
//   node scripts/release-hygiene/audio.mjs verify           … 元音源と成果物の duration/音量/帯域を比較
//
// ffmpeg は devDependency にせず `npm i ffmpeg-static --no-save` で一時的に入れて使う
// （このスクリプトは監査・生成用で、アプリのビルドには関与しない）。
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const FFMPEG = require('ffmpeg-static')
const BGM_DIR = 'public/assets/bgm'
const SRC_DIR = 'audio-source/bgm'
const TMP = 'C:/Users/kimi1/AppData/Local/Temp/claude/release-hygiene-audio'
const NAMES = ['home', 'battle', 'victory', 'defeat']

/** 採用設定：Opus/WebM を主、MP3 を全ブラウザ向けのフォールバックにする */
export const ENCODE = {
  webm: (input, output) => ['-y', '-i', input, '-c:a', 'libopus', '-b:a', '48k', '-vbr', 'on', '-application', 'audio', '-ar', '48000', '-ac', '2', '-map_metadata', '-1', '-vn', output],
  // フォールバックは「容量より品質」を優先して 96kbps にした。実測で 80kbps は
  // 12〜16kHz が最大 -8.6dB 落ちたのに対し、96kbps は -0.6dB で元とほぼ同じ。
  // このファイルを取りに来るのは WebM/Opus を再生できない環境だけなので、
  // 配信容量の削減は主形式（Opus）側で達成する。
  mp3: (input, output) => ['-y', '-i', input, '-c:a', 'libmp3lame', '-b:a', '96k', '-ar', '44100', '-ac', '2', '-map_metadata', '-1', '-vn', output],
}

const ff = (args) => execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', ...args], { encoding: 'buffer' })
const mb = (n) => +(n / 1048576).toFixed(2)

/** 生PCM（f32le mono 44.1k）へ落とす。比較はここを基準にする */
function pcm(file) {
  const buf = execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', '44100', '-'], {
    maxBuffer: 1 << 30,
  })
  return new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4))
}

/** 実数FFT（radix-2）。依存を足さないための最小実装 */
function fft(re, im) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wr = Math.cos(ang)
    const wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1
      let ci = 0
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k]
        const ui = im[i + k]
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr
        re[i + k] = ur + vr
        im[i + k] = ui + vi
        re[i + k + len / 2] = ur - vr
        im[i + k + len / 2] = ui - vi
        const ncr = cr * wr - ci * wi
        ci = cr * wi + ci * wr
        cr = ncr
      }
    }
  }
}

const BANDS = [
  [20, 100], [100, 300], [300, 800], [800, 2000], [2000, 4000], [4000, 8000], [8000, 12000], [12000, 16000], [16000, 20000],
]

/** オクターブ帯ごとの平均エネルギー（dB）。位相ズレの影響を受けない比較にする */
function bandEnergies(samples, sr = 44100) {
  const N = 4096
  const hop = sr * 2 // 2秒おきに1フレーム
  const acc = new Float64Array(BANDS.length)
  let frames = 0
  const win = new Float64Array(N)
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1))
  for (let start = 0; start + N < samples.length; start += hop) {
    const re = new Float64Array(N)
    const im = new Float64Array(N)
    for (let i = 0; i < N; i++) re[i] = samples[start + i] * win[i]
    fft(re, im)
    for (let b = 0; b < BANDS.length; b++) {
      const [lo, hi] = BANDS[b]
      const k0 = Math.max(1, Math.round((lo * N) / sr))
      const k1 = Math.min(N / 2 - 1, Math.round((hi * N) / sr))
      let e = 0
      for (let k = k0; k <= k1; k++) e += re[k] * re[k] + im[k] * im[k]
      acc[b] += e / Math.max(1, k1 - k0 + 1)
    }
    frames++
  }
  return [...acc].map((e) => 10 * Math.log10(e / Math.max(1, frames) + 1e-20))
}

function levels(samples) {
  let peak = 0
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    const v = Math.abs(samples[i])
    if (v > peak) peak = v
    sum += samples[i] * samples[i]
  }
  return { peakDb: +(20 * Math.log10(peak + 1e-12)).toFixed(2), rmsDb: +(10 * Math.log10(sum / samples.length + 1e-20)).toFixed(2), samples: samples.length }
}

function compare(origFile, candFile) {
  const a = pcm(origFile)
  const b = pcm(candFile)
  const la = levels(a)
  const lb = levels(b)
  const ba = bandEnergies(a)
  const bb = bandEnergies(b)
  const diffs = ba.map((v, i) => +(bb[i] - v).toFixed(2))
  // 16kHz 未満の帯域だけを「聴感上の劣化」の指標にする（それ以上は元から可聴域外に近い）
  const audible = diffs.slice(0, 8)
  return {
    durationSec: { orig: +(la.samples / 44100).toFixed(2), cand: +(lb.samples / 44100).toFixed(2) },
    peakDb: { orig: la.peakDb, cand: lb.peakDb, delta: +(lb.peakDb - la.peakDb).toFixed(2) },
    rmsDb: { orig: la.rmsDb, cand: lb.rmsDb, delta: +(lb.rmsDb - la.rmsDb).toFixed(2) },
    bandDeltaDb: diffs,
    worstAudibleBandDb: +Math.min(...audible).toFixed(2),
    maxAudibleAbsDb: +Math.max(...audible.map(Math.abs)).toFixed(2),
  }
}

const cmd = process.argv[2] ?? 'probe'
mkdirSync(TMP, { recursive: true })

if (cmd === 'probe') {
  const rows = []
  for (const n of NAMES) {
    const f = join(BGM_DIR, `${n}.mp3`)
    if (!existsSync(f)) continue
    const s = pcm(f)
    rows.push({ name: n, bytes: statSync(f).size, mb: mb(statSync(f).size), sec: +(s.length / 44100).toFixed(2), kbps: Math.round((statSync(f).size * 8) / (s.length / 44100) / 1000), ...levels(s) })
  }
  console.log(JSON.stringify({ total: mb(rows.reduce((a, r) => a + r.bytes, 0)), rows }, null, 1))
}

if (cmd === 'try') {
  const name = process.argv[3] ?? 'home'
  const src = join(BGM_DIR, `${name}.mp3`)
  const candidates = [
    ['opus-40k', ['-c:a', 'libopus', '-b:a', '40k', '-vbr', 'on', '-application', 'audio', '-ar', '48000', '-ac', '2'], 'webm'],
    ['opus-48k', ['-c:a', 'libopus', '-b:a', '48k', '-vbr', 'on', '-application', 'audio', '-ar', '48000', '-ac', '2'], 'webm'],
    ['opus-64k', ['-c:a', 'libopus', '-b:a', '64k', '-vbr', 'on', '-application', 'audio', '-ar', '48000', '-ac', '2'], 'webm'],
    ['mp3-64k', ['-c:a', 'libmp3lame', '-b:a', '64k', '-ar', '44100', '-ac', '2'], 'mp3'],
    ['mp3-96k', ['-c:a', 'libmp3lame', '-b:a', '96k', '-ar', '44100', '-ac', '2'], 'mp3'],
    ['aac-64k', ['-c:a', 'aac', '-b:a', '64k', '-ar', '44100', '-ac', '2'], 'm4a'],
  ]
  const out = []
  for (const [id, args, ext] of candidates) {
    const dst = join(TMP, `${name}-${id}.${ext}`)
    ff(['-y', '-i', src, ...args, '-map_metadata', '-1', '-vn', dst])
    out.push({ id, mb: mb(statSync(dst).size), ...compare(src, dst) })
  }
  console.log(JSON.stringify({ name, origMb: mb(statSync(src).size), candidates: out }, null, 1))
}

if (cmd === 'encode') {
  mkdirSync(SRC_DIR, { recursive: true })
  const report = []
  for (const n of NAMES) {
    const orig = join(SRC_DIR, `${n}.mp3`)
    if (!existsSync(orig)) throw new Error(`原音源が ${orig} にありません（先に public/assets/bgm から移動してください）`)
    for (const [ext, build] of Object.entries(ENCODE)) {
      const dst = join(BGM_DIR, `${n}.${ext}`)
      ff(build(orig, dst))
      report.push({ name: n, ext, mb: mb(statSync(dst).size) })
    }
  }
  console.log(JSON.stringify(report, null, 1))
}

if (cmd === 'verify') {
  const out = []
  for (const n of NAMES) {
    const orig = join(SRC_DIR, `${n}.mp3`)
    for (const ext of ['webm', 'mp3']) {
      const dst = join(BGM_DIR, `${n}.${ext}`)
      if (!existsSync(dst)) continue
      out.push({ name: n, ext, mb: mb(statSync(dst).size), ...compare(orig, dst) })
    }
  }
  const total = readdirSync(BGM_DIR).reduce((a, f) => a + statSync(join(BGM_DIR, f)).size, 0)
  console.log(JSON.stringify({ totalMb: mb(total), files: out }, null, 1))
}

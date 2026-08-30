// 決定128（Game Feel Phase）：SE（効果音）を決定論的に合成して public/assets/se/*.wav へ書き出す。
//
// 権利：本スクリプトが数式から生成するオリジナル音源（サンプル・外部素材・録音物は一切使わない）。
// 出典・ライセンスは docs/SE_ASSETS.md を参照。再生成： node scripts/gen-se.mjs
//
// 設計方針（決定128）：
// - 役割別に音色を分ける：Impact（打撃）／Feedback（操作）／State Change（状態変化）／Reward／Warning
// - 同系統は同じ素材（ノイズ＋フィルタ＋サブ）を強度だけ変えて4段階（L1〜L4）にし、統一感を保つ
// - 22.05kHz mono 16-bit、1音 0.1〜1.0 秒、合計 ~400KB 以下
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SR = 22050
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets', 'se')

// ---------- deterministic noise ----------
let seed = 0x2f6e2b1
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 0x100000000
}
function noise(n) {
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = rand() * 2 - 1
  return out
}

// ---------- oscillators ----------
function osc(freqStartHz, freqEndHz, n, type = 'sine', phase = 0) {
  const out = new Float32Array(n)
  let ph = phase
  for (let i = 0; i < n; i++) {
    const t = i / n
    const f = freqStartHz + (freqEndHz - freqStartHz) * t
    ph += (2 * Math.PI * f) / SR
    const s = Math.sin(ph)
    out[i] = type === 'sine' ? s : type === 'square' ? (s >= 0 ? 1 : -1) * 0.6 : type === 'saw' ? ((ph / Math.PI) % 2) - 1 : type === 'tri' ? (2 / Math.PI) * Math.asin(s) : s
  }
  return out
}

// ---------- envelopes ----------
function env(n, attackMs, decayMs, sustain = 0, releaseMs = 0, curve = 2) {
  const a = Math.max(1, Math.round((attackMs / 1000) * SR))
  const d = Math.max(1, Math.round((decayMs / 1000) * SR))
  const r = Math.max(1, Math.round((releaseMs / 1000) * SR))
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    let v
    if (i < a) v = i / a
    else if (i < a + d) v = 1 - (1 - sustain) * Math.pow((i - a) / d, 1 / curve)
    else if (i < n - r) v = sustain
    else v = sustain * (1 - (i - (n - r)) / r)
    out[i] = Math.max(0, v)
  }
  return out
}

// ---------- filters ----------
function lowpass(x, cutoffStartHz, cutoffEndHz = cutoffStartHz) {
  const out = new Float32Array(x.length)
  let y = 0
  for (let i = 0; i < x.length; i++) {
    const fc = cutoffStartHz + (cutoffEndHz - cutoffStartHz) * (i / x.length)
    const a = 1 - Math.exp((-2 * Math.PI * fc) / SR)
    y += a * (x[i] - y)
    out[i] = y
  }
  return out
}
function highpass(x, cutoffHz) {
  const out = new Float32Array(x.length)
  const a = Math.exp((-2 * Math.PI * cutoffHz) / SR)
  let yPrev = 0
  let xPrev = 0
  for (let i = 0; i < x.length; i++) {
    const y = a * (yPrev + x[i] - xPrev)
    out[i] = y
    yPrev = y
    xPrev = x[i]
  }
  return out
}
function bandpass(x, centerStartHz, centerEndHz, q = 2) {
  // simple state-variable filter sweep
  const out = new Float32Array(x.length)
  let low = 0
  let band = 0
  for (let i = 0; i < x.length; i++) {
    const fc = centerStartHz + (centerEndHz - centerStartHz) * (i / x.length)
    const f = 2 * Math.sin((Math.PI * Math.min(fc, SR / 4)) / SR)
    const high = x[i] - low - band / q
    band += f * high
    low += f * band
    out[i] = band
  }
  return out
}

// ---------- utils ----------
const ms = (v) => Math.round((v / 1000) * SR)
function mul(a, b) {
  const out = new Float32Array(a.length)
  for (let i = 0; i < a.length; i++) out[i] = a[i] * (b[i] ?? 0)
  return out
}
function gain(a, g) {
  const out = new Float32Array(a.length)
  for (let i = 0; i < a.length; i++) out[i] = a[i] * g
  return out
}
function mix(...parts) {
  const n = Math.max(...parts.map((p) => p.offset + p.buf.length))
  const out = new Float32Array(n)
  for (const p of parts) for (let i = 0; i < p.buf.length; i++) out[p.offset + i] += p.buf[i]
  return out
}
const at = (buf, offsetMs = 0) => ({ buf, offset: ms(offsetMs) })
function softclip(x) {
  const out = new Float32Array(x.length)
  for (let i = 0; i < x.length; i++) out[i] = Math.tanh(x[i] * 1.2)
  return out
}
function normalize(x, peak = 0.9) {
  let m = 0
  for (const v of x) m = Math.max(m, Math.abs(v))
  return m > 0 ? gain(x, peak / m) : x
}
function writeWav(name, samples) {
  const n = samples.length
  const buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + n * 2, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(SR, 24)
  buf.writeUInt32LE(SR * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2)
  writeFileSync(join(OUT, name + '.wav'), buf)
  return buf.length
}

// ---------- sound designs ----------
const chime = (freqs, decayMs, stepMs, harmonic = 0.35) =>
  mix(...freqs.flatMap((f, i) => [at(mul(osc(f, f, ms(decayMs)), env(ms(decayMs), 4, decayMs - 8, 0, 4)), i * stepMs), at(gain(mul(osc(f * 2.01, f * 2.01, ms(decayMs * 0.6)), env(ms(decayMs * 0.6), 2, decayMs * 0.6 - 4, 0, 4)), harmonic), i * stepMs)]))

const SOUNDS = {
  // Feedback（操作）
  card_play: () => mix(at(gain(lowpass(mul(noise(ms(45)), env(ms(45), 1, 40)), 2600), 0.7)), at(gain(mul(osc(520, 380, ms(60)), env(ms(60), 2, 50)), 0.5))),
  card_draw: () => gain(bandpass(mul(noise(ms(110)), env(ms(110), 10, 90, 0, 8)), 1800, 4200, 3), 0.9),
  divination: () => chime([660, 990], 220, 70, 0.3),
  // Impact（自分→敵）L1〜L4：同じ素材（ノイズ斬撃＋サブ）を強度で階層化
  hit_l1: () => mix(at(bandpass(mul(noise(ms(120)), env(ms(120), 2, 110)), 3200, 1200, 2.5)), at(gain(mul(osc(260, 180, ms(70)), env(ms(70), 1, 60)), 0.4))),
  hit_l2: () => mix(at(bandpass(mul(noise(ms(170)), env(ms(170), 2, 160)), 2800, 900, 2.2)), at(gain(mul(osc(180, 110, ms(140)), env(ms(140), 1, 130)), 0.7))),
  hit_l3: () => mix(at(gain(lowpass(mul(noise(ms(240)), env(ms(240), 2, 230)), 3000, 500), 0.9)), at(gain(mul(osc(90, 55, ms(260)), env(ms(260), 1, 250)), 1.0)), at(gain(mul(osc(130, 130, ms(120)), env(ms(120), 1, 110)), 0.3))),
  hit_l4: () => mix(at(gain(lowpass(mul(noise(ms(420)), env(ms(420), 2, 400)), 4000, 300), 1.0)), at(gain(mul(osc(64, 40, ms(460)), env(ms(460), 1, 440)), 1.2)), at(gain(mul(osc(220, 110, ms(200)), env(ms(200), 1, 190)), 0.5)), at(gain(bandpass(mul(noise(ms(500)), env(ms(500), 60, 420, 0, 20)), 6000, 2000, 4), 0.35), 80)),
  // 自分の被弾（敵→自分）：鈍い音、強度2段（通常／必殺）
  self_hit: () => mix(at(gain(lowpass(mul(noise(ms(150)), env(ms(150), 2, 140)), 900), 0.8)), at(gain(mul(osc(140, 90, ms(140)), env(ms(140), 1, 130)), 0.8))),
  self_hit_heavy: () => mix(at(gain(lowpass(mul(noise(ms(360)), env(ms(360), 2, 340)), 1200, 300), 1.0)), at(gain(mul(osc(58, 38, ms(420)), env(ms(420), 1, 400)), 1.2)), at(gain(mul(osc(96, 96, ms(180), 'saw'), env(ms(180), 1, 170)), 0.35))),
  block: () => mix(at(gain(mul(osc(900, 900, ms(90)), env(ms(90), 1, 85, 0, 0, 5)), 0.6)), at(gain(mul(osc(1350, 1350, ms(70)), env(ms(70), 1, 65, 0, 0, 5)), 0.35)), at(gain(highpass(mul(noise(ms(30)), env(ms(30), 1, 28)), 2000), 0.5))),
  heal: () => chime([660, 990, 1320], 260, 90, 0.3),
  // State Change
  resonance_gain: () => chime([1200, 1800], 110, 40, 0.25),
  burst_ready: () => mix(at(gain(mul(osc(400, 1600, ms(380)), env(ms(380), 20, 340, 0, 20)), 0.7)), at(gain(mul(osc(800, 3200, ms(380)), env(ms(380), 20, 340, 0, 20)), 0.3)), at(gain(bandpass(mul(noise(ms(420)), env(ms(420), 80, 320, 0, 20)), 3000, 8000, 3), 0.35))),
  evolve: () => chime([523, 659, 784, 1047], 320, 110, 0.35),
  // Warning
  enemy_turn: () => mix(at(gain(mul(osc(110, 110, ms(150), 'square'), env(ms(150), 2, 140)), 0.5)), at(gain(highpass(mul(noise(ms(40)), env(ms(40), 1, 36)), 1500), 0.4))),
  enemy_charge: () => mix(at(gain(mul(osc(80, 160, ms(500)), env(ms(500), 40, 440, 0, 20)), 0.6)), at(gain(bandpass(mul(noise(ms(500)), env(ms(500), 40, 440, 0, 20)), 400, 2400, 3), 0.4))),
  // Big moments
  boss_entrance: () => mix(at(gain(mul(osc(64, 38, ms(600)), env(ms(600), 1, 580)), 1.0)), at(gain(lowpass(mul(noise(ms(300)), env(ms(300), 2, 290)), 2500, 200), 0.7)), at(chime([520, 780, 1170], 900, 0, 0.4), 60), at(gain(mul(osc(196, 196, ms(900)), env(ms(900), 5, 880, 0, 0, 5)), 0.25), 60)),
  reward: () => chime([784, 1175], 380, 130, 0.35),
  victory_sting: () => mix(at(chime([523, 659, 784], 420, 120, 0.4)), at(gain(mul(osc(1047, 1047, ms(500)), env(ms(500), 5, 480, 0, 0, 4)), 0.35), 360), at(gain(bandpass(mul(noise(ms(600)), env(ms(600), 100, 480, 0, 20)), 4000, 9000, 3), 0.25), 300)),
  defeat_sting: () => mix(at(gain(lowpass(mul(osc(330, 247, ms(700), 'tri'), env(ms(700), 10, 660, 0, 30)), 1200, 500), 0.8)), at(gain(mul(osc(165, 124, ms(700)), env(ms(700), 10, 660, 0, 30)), 0.6)), at(gain(lowpass(mul(noise(ms(500)), env(ms(500), 30, 460, 0, 10)), 600, 200), 0.3))),
}

mkdirSync(OUT, { recursive: true })
let total = 0
const manifest = []
for (const [name, make] of Object.entries(SOUNDS)) {
  const samples = normalize(softclip(make()), 0.9)
  const bytes = writeWav(name, samples)
  total += bytes
  manifest.push({ name, ms: Math.round((samples.length / SR) * 1000), bytes })
}
for (const m of manifest) console.log(`${m.name}.wav ${m.ms}ms ${m.bytes}B`)
console.log(`TOTAL ${manifest.length} files ${total}B`)

// Enemy Visual Quality Audit：背景付き（非透過）の生成画像の中から、Production の敵 art の元絵を探す第2パス（監査用）。
//   node scripts/enemy-visual-audit/match-sources-bg.mjs [downloadsDir]
// 透過 art の本体 bbox と同じ縦横比で候補画像の中央を数段階のスケールで切り出し、
// 勾配（エッジ）マップの相関で近さを出す（背景の影響を減らす）。画像の中身は表示しない。
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const dir = process.argv[2] ?? 'C:/Users/kimi1/Downloads'
const TARGETS = { oni: 'public/assets/enemies/oni/art.png', onryo: 'public/assets/enemies/onryo/art.png', juuma: 'public/assets/enemies/juuma/art.png', ryujin: 'public/assets/enemies/ryujin/art.png' }
const T = 40

async function bbox(path) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let x0 = info.width, y0 = info.height, x1 = 0, y1 = 0
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }
}
async function gradThumb(pipeline) {
  const g = await pipeline.flatten({ background: '#808080' }).resize(T, T, { fit: 'fill' }).greyscale().raw().toBuffer()
  const out = []
  for (let y = 1; y < T - 1; y++) for (let x = 1; x < T - 1; x++) { const i = y * T + x; out.push(Math.abs(g[i + 1] - g[i - 1]) + Math.abs(g[i + T] - g[i - T])) }
  const mean = out.reduce((a, b) => a + b, 0) / out.length
  const sd = Math.sqrt(out.reduce((a, b) => a + (b - mean) ** 2, 0) / out.length) || 1
  return out.map((v) => (v - mean) / sd)
}
const corr = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0) / a.length

const cands = readdirSync(dir).filter((f) => /\.png$/i.test(f)).map((f) => ({ f, st: statSync(join(dir, f)) })).filter((x) => x.st.size > 500000 && x.st.mtime >= new Date('2026-08-01') && x.st.mtime < new Date('2026-08-31'))
const metas = []
for (const c of cands) { try { const m = await sharp(join(dir, c.f)).metadata(); if (!m.hasAlpha) metas.push({ f: c.f, w: m.width, h: m.height }) } catch { /* skip */ } }

for (const [e, path] of Object.entries(TARGETS)) {
  const bb = await bbox(path)
  const target = await gradThumb(sharp(path).extract(bb))
  const aspect = bb.width / bb.height
  const results = []
  for (const m of metas) {
    let best = -1, bestTag = ''
    for (const frac of [1.0, 0.9, 0.8, 0.7, 0.6]) {
      let h = Math.round(m.h * frac), w = Math.round(h * aspect)
      if (w > m.w) { w = m.w; h = Math.round(w / aspect) }
      for (const [ox, oy] of [[0.5, 0.5], [0.5, 0.45], [0.5, 0.55]]) {
        const left = Math.max(0, Math.min(m.w - w, Math.round(m.w * ox - w / 2))), top = Math.max(0, Math.min(m.h - h, Math.round(m.h * oy - h / 2)))
        const r = corr(target, await gradThumb(sharp(join(dir, m.f)).extract({ left, top, width: w, height: h })))
        if (r > best) { best = r; bestTag = `${Math.round(frac * 100)}%@${ox},${oy}` }
      }
    }
    results.push({ f: m.f, w: m.w, h: m.h, r: best, tag: bestTag })
  }
  results.sort((a, b) => b.r - a.r)
  console.log(e.padEnd(7), results.slice(0, 3).map((r) => `${r.r.toFixed(3)} ${r.w}x${r.h} ${r.tag} "${r.f}"`).join(' | '))
}

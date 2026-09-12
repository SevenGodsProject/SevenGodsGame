// Enemy Visual Quality Audit：Production の敵 art と、ローカル（Downloads）にある生成画像の対応を探す（監査用）。
//   node scripts/enemy-visual-audit/match-sources.mjs [downloadsDir]
// 画像の中身は表示しない。alpha bbox で切り出し → 48×48 グレースケール → 相関で近さを出す。
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const dir = process.argv[2] ?? 'C:/Users/kimi1/Downloads'
const ENEMIES = { datenshi: 'art.webp', oni: 'art_hq.webp', onryo: 'art_hq.webp', karakuri: 'art.webp', juuma: 'art_hq.webp', ryujin: 'art_hq.webp', doukeshi: 'art.webp' }

async function thumb(path, useAlphaBbox) {
  let img = sharp(path).ensureAlpha()
  if (useAlphaBbox) {
    // 透過画像は本体の bbox で切る
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
    let x0 = info.width, y0 = info.height, x1 = 0, y1 = 0
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    }
    if (x1 > x0 && y1 > y0) img = sharp(path).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
  }
  const g = await img.flatten({ background: '#000000' }).resize(48, 48, { fit: 'fill' }).greyscale().raw().toBuffer()
  const arr = [...g]
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length
  const sd = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length) || 1
  return arr.map((v) => (v - mean) / sd)
}
const corr = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0) / a.length

const cands = readdirSync(dir).filter((f) => /\.(png|webp)$/i.test(f)).map((f) => ({ f, st: statSync(join(dir, f)) }))
  .filter((x) => x.st.size > 100000 && x.st.mtime >= new Date('2026-08-01') && x.st.mtime < new Date('2026-09-01'))
const candThumbs = []
for (const c of cands) {
  try {
    const meta = await sharp(join(dir, c.f)).metadata()
    candThumbs.push({ f: c.f, dim: meta.width + 'x' + meta.height, alpha: !!meta.hasAlpha, t: await thumb(join(dir, c.f), !!meta.hasAlpha) })
  } catch { /* skip unreadable */ }
}
for (const [e, file] of Object.entries(ENEMIES)) {
  const t = await thumb('public/assets/enemies/' + e + '/' + file, true)
  const scored = candThumbs.map((c) => ({ ...c, r: corr(t, c.t) })).sort((a, b) => b.r - a.r).slice(0, 3)
  console.log(e.padEnd(9), scored.map((s) => `${s.r.toFixed(3)} ${s.dim} alpha=${s.alpha} "${s.f}"`).join(' | '))
  // 旧 art.png（datenshi/karakuri/doukeshi は旧デザイン）との相関も出す
  const tp = await thumb('public/assets/enemies/' + e + '/art.png', true)
  console.log('   vs art.png', corr(t, tp).toFixed(3))
}

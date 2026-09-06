/**
 * Visual QA（2026-09-06）：画像アセットの実測。ヘッダだけを読んで
 * format / pixel size / alpha / file size を出す（依存ライブラリなし・読み取り専用）。
 * 使い方: node scripts/phase3-audit/imgdim.mjs public/assets/gods ...
 */
import fs from 'node:fs'
import path from 'node:path'

function dims(buf) {
  if (buf.length > 26 && buf.readUInt32BE(0) === 0x89504e47) {
    const w = buf.readUInt32BE(16)
    const h = buf.readUInt32BE(20)
    const bitDepth = buf[24]
    const colorType = buf[25]
    let alpha = colorType === 4 || colorType === 6
    if (!alpha) alpha = buf.includes(Buffer.from('tRNS'))
    return { fmt: 'PNG', w, h, alpha, bitDepth, colorType }
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let o = 2
    while (o < buf.length - 9) {
      if (buf[o] !== 0xff) { o++; continue }
      const m = buf[o + 1]
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { fmt: 'JPEG', h: buf.readUInt16BE(o + 5), w: buf.readUInt16BE(o + 7), alpha: false }
      }
      o += 2 + buf.readUInt16BE(o + 2)
    }
    return { fmt: 'JPEG', w: 0, h: 0, alpha: false }
  }
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') {
    const type = buf.slice(12, 16).toString('ascii')
    if (type === 'VP8X') {
      const w = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16))
      const h = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16))
      return { fmt: 'WebP/VP8X', w, h, alpha: Boolean(buf[20] & 0x10) }
    }
    if (type === 'VP8L') {
      const b = buf.readUInt32LE(21)
      return { fmt: 'WebP-lossless', w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1, alpha: Boolean((b >> 28) & 1) }
    }
    if (type === 'VP8 ') {
      return { fmt: 'WebP-lossy', w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff, alpha: false }
    }
  }
  return { fmt: 'unknown', w: 0, h: 0, alpha: null }
}

const rows = []
for (const root of process.argv.slice(2)) {
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.(png|jpe?g|webp|avif)$/i.test(e.name)) {
        const buf = fs.readFileSync(p)
        rows.push({ path: p.split(path.sep).join('/'), ...dims(buf), kb: Math.round(buf.length / 1024) })
      }
    }
  }
  walk(root)
}
rows.sort((a, b) => a.path.localeCompare(b.path))
fs.writeFileSync('scripts/phase3-audit/out/assets_dims.json', JSON.stringify(rows, null, 2))
for (const r of rows) {
  console.log(`${r.path.replace('public/assets/', '')}\t${r.fmt}\t${r.w}x${r.h}\talpha=${r.alpha}\t${r.kb}KB`)
}
console.log(`\n${rows.length} files`)

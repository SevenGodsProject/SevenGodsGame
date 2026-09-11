// Phase 6 監査用：public/assets 配下の画像寸法・容量の一覧（読み取り専用。ゲームコードには触れない）
// 使い方: node scripts/phase6-audit/assetInventory.mjs [outJson]
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, extname } from 'node:path'

function dims(buf, ext) {
  if (ext === '.png' && buf.readUInt32BE(0) === 0x89504e47) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
  if (ext === '.webp' && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buf.toString('ascii', 12, 16)
    if (chunk === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff }
    if (chunk === 'VP8L') {
      const b = buf.readUInt32LE(21)
      return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 }
    }
    if (chunk === 'VP8X') {
      return { w: (buf.readUIntLE(24, 3)) + 1, h: (buf.readUIntLE(27, 3)) + 1 }
    }
  }
  if (ext === '.jpg' || ext === '.jpeg') {
    let i = 2
    while (i < buf.length) {
      if (buf[i] !== 0xff) { i++; continue }
      const m = buf[i + 1]
      if (m >= 0xc0 && m <= 0xc3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) }
      i += 2 + buf.readUInt16BE(i + 2)
    }
  }
  return null
}
const root = 'public/assets'
const rows = []
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) { walk(p); continue }
    const ext = extname(name).toLowerCase()
    if (!['.png', '.webp', '.jpg', '.jpeg'].includes(ext)) continue
    const buf = readFileSync(p)
    const d = dims(buf, ext)
    rows.push({ file: relative(root, p).split(String.fromCharCode(92)).join("/"), bytes: st.size, w: d?.w ?? null, h: d?.h ?? null })
  }
}
walk(root)
const out = process.argv[2]
if (out) writeFileSync(out, JSON.stringify(rows, null, 1))
for (const r of rows) console.log(`${r.file}\t${r.w}x${r.h}\t${(r.bytes / 1024).toFixed(0)}KB`)

// CM-01 Public Face Pack v1：ブランド favicon／apple-touch-icon／manifest icon を決定論的に生成する。
//   node scripts/public-face/gen-icons.mjs [outDir=public]
//
// - 「七」モチーフ（2 画）＋ 夜の藍の円＋金の細い輪。外部素材・生成 AI・フォント描画を使わない
//   （同じ幾何から SVG と PNG を書き出すので、favicon と apple-touch-icon の絵柄が一致する）
// - PNG は依存ライブラリなしで書く（zlib + CRC32）。アンチエイリアスは線分への距離で 1px 幅
// - 何度実行しても同じバイト列になる（台帳 Evidence の sha256 が安定する）
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.argv[2] ?? 'public'

/** 幾何（0..1 の正規化座標）。七：横画は右上がり、縦画は下で右へ曲がり跳ねる */
const BG = { r: 0x14, g: 0x12, b: 0x30 } // 夜の藍（theme-color と同じ）
const RING = { r: 0xe8, g: 0xc1, b: 0x5a } // 金
const INK = { r: 0xf3, g: 0xd9, b: 0x8a } // 明るい金
const STROKES = [
  [[0.2, 0.44], [0.8, 0.3]], // 横画
  [[0.44, 0.12], [0.42, 0.66], [0.47, 0.78], [0.6, 0.84], [0.76, 0.82], [0.82, 0.68]], // 縦画→曲がり→跳ね
]
const STROKE_W = 0.105
const RING_R = 0.47
const RING_W = 0.025

function svg() {
  const p = (pts) => pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${(x * 512).toFixed(1)} ${(y * 512).toFixed(1)}`).join(' ')
  const hex = (c) => `#${[c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">`,
    `<circle cx="256" cy="256" r="${(0.5 * 512).toFixed(1)}" fill="${hex(BG)}"/>`,
    `<circle cx="256" cy="256" r="${(RING_R * 512).toFixed(1)}" fill="none" stroke="${hex(RING)}" stroke-width="${(RING_W * 512).toFixed(1)}"/>`,
    `<g fill="none" stroke="${hex(INK)}" stroke-width="${(STROKE_W * 512).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round">`,
    ...STROKES.map((s) => `<path d="${p(s)}"/>`),
    `</g>`,
    `</svg>`,
    '',
  ].join('\n')
}

/** 点 (x,y) から折れ線 pts への最短距離 */
function distPolyline(x, y, pts) {
  let best = Infinity
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1]
    const vx = bx - ax, vy = by - ay
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)))
    const dx = x - (ax + t * vx), dy = y - (ay + t * vy)
    best = Math.min(best, Math.hypot(dx, dy))
  }
  return best
}

/** 0..1 のカバレッジ（距離 d が半径 r の内側＝1、外側＝0、境界 1px で線形） */
const cover = (d, r, px) => Math.max(0, Math.min(1, (r - d) / px + 0.5))

function raster(size) {
  const px = 1 / size
  const rgba = Buffer.alloc(size * size * 4)
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = (i + 0.5) / size, y = (j + 0.5) / size
      const dc = Math.hypot(x - 0.5, y - 0.5)
      let r = 0, g = 0, b = 0, a = cover(dc, 0.5, px)
      // 背景の円
      r = BG.r; g = BG.g; b = BG.b
      // 金の輪
      const ring = cover(Math.abs(dc - RING_R), RING_W / 2, px)
      r += (RING.r - r) * ring; g += (RING.g - g) * ring; b += (RING.b - b) * ring
      // 七
      let ink = 0
      for (const s of STROKES) ink = Math.max(ink, cover(distPolyline(x, y, s), STROKE_W / 2, px))
      r += (INK.r - r) * ink; g += (INK.g - g) * ink; b += (INK.b - b) * ink
      const o = (j * size + i) * 4
      rgba[o] = Math.round(r); rgba[o + 1] = Math.round(g); rgba[o + 2] = Math.round(b); rgba[o + 3] = Math.round(a * 255)
    }
  }
  return rgba
}

const CRC_TABLE = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c })
function crc32(buf) { let c = -1; for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0 }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(size) {
  const rgba = raster(size)
  const rows = Buffer.alloc((size * 4 + 1) * size)
  for (let j = 0; j < size; j++) { rows[j * (size * 4 + 1)] = 0; rgba.copy(rows, j * (size * 4 + 1) + 1, j * size * 4, (j + 1) * size * 4) }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

mkdirSync(OUT, { recursive: true })
const files = [
  ['favicon.svg', Buffer.from(svg(), 'utf8')],
  ['apple-touch-icon.png', png(180)],
  ['icon-192.png', png(192)],
  ['icon-512.png', png(512)],
]
for (const [name, buf] of files) {
  writeFileSync(join(OUT, name), buf)
  console.log(`${name}\t${buf.length}B`)
}

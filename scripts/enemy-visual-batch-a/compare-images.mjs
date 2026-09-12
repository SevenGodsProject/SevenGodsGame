// Enemy Visual Upgrade Batch A：Before / After の目視比較画像を作る（監査用）。
//   node scripts/enemy-visual-batch-a/compare-images.mjs <outDir> [--before-ref HEAD]
//
// Before は git の指定 ref から取り出す（作業ツリーは既に After なので）。
// 出力：敵ごとに「全身 100%」「顔まわり 150%」「顔まわり 200%」の Before|After 2 列。
// 拡大は nearest（にじませずに画素をそのまま見るため。加工ではなく検査用の表示）。
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
sharp.cache(false)
import { PROD, analyze } from '../enemy-visual-audit/metrics.mjs'

const outDir = process.argv[2] ?? 'batch-a-compare'
const beforeRef = process.argv.includes('--before-ref') ? process.argv[process.argv.indexOf('--before-ref') + 1] : 'HEAD'
mkdirSync(outDir, { recursive: true })
const TARGETS = ['datenshi', 'karakuri', 'doukeshi']
const BG = { r: 24, g: 12, b: 40, alpha: 1 }
const BASE = 285 // PC1366 DPR1 の表示 px＝100%

for (const e of TARGETS) {
  const afterPath = PROD[e]
  const beforeBuf = execFileSync('git', ['show', `${beforeRef}:${afterPath}`], { maxBuffer: 1 << 28 })
  const beforePath = join(outDir, `${e}-before.webp`)
  writeFileSync(beforePath, beforeBuf)

  const rows = []
  for (const zoom of [1, 1.5, 2]) {
    const dev = Math.round(BASE * zoom)
    const render = async (p) => sharp(p).resize(dev, dev, { fit: 'inside', kernel: 'cubic' }).flatten({ background: BG }).png().toBuffer()
    let b = await render(beforePath), a = await render(afterPath)
    if (zoom > 1) {
      // 顔まわり（本体上部 1/3 の中央）を切り出して等倍で並べる
      const m = await analyze(afterPath)
      const bb = m.mainBbox ?? m.bbox
      const s = dev / m.w
      const cw = Math.round(Math.min(bb.w * s * 0.62, dev)), ch = cw
      const cx = Math.round((bb.x + bb.w / 2) * s - cw / 2), cy = Math.round((bb.y + bb.h * 0.17) * s - ch / 2)
      const clamp = (v, max) => Math.max(0, Math.min(max, v))
      const crop = (buf) => sharp(buf).extract({ left: clamp(cx, dev - cw), top: clamp(cy, dev - ch), width: cw, height: ch }).png().toBuffer()
      b = await crop(b); a = await crop(a)
    }
    const bm = await sharp(b).metadata()
    rows.push({ zoom, b, a, w: bm.width, h: bm.height })
  }
  const gap = 12
  const width = Math.max(...rows.map((r) => r.w * 2 + gap))
  const height = rows.reduce((s, r) => s + r.h + gap, 0)
  const comps = []
  let y = 0
  for (const r of rows) { comps.push({ input: r.b, left: 0, top: y }, { input: r.a, left: r.w + gap, top: y }); y += r.h + gap }
  await sharp({ create: { width, height, channels: 4, background: BG } }).composite(comps).png()
    .toFile(join(outDir, `${e}-before-after.png`))
  console.log(`${e}: ${rows.map((r) => `${Math.round(r.zoom * 100)}% ${r.w}x${r.h}`).join(' / ')} → ${e}-before-after.png（左=Before 右=After）`)
}
console.log('done', outDir)

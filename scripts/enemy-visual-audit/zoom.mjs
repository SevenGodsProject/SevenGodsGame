// Enemy Visual Quality Audit：目視用の拡大比較画像を作る（監査用）。
//   node scripts/enemy-visual-audit/zoom.mjs <outDir> <sourcesJson>
// ① 現行 Production asset の本体中心 160×160 を 3 倍（nearest）で拡大したもの ／ source を同寸法にクリーン縮小したもの ／ 差分
// ② 敵（Production asset を PC1366 表示倍率 0.557 に縮小）と神 taiyo（front_640 を 0.373 に縮小）を同じ背景色で並べたもの
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { PROD, analyze } from './metrics.mjs'

const [outDir = 'enemy-zoom', sourcesJson] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const SOURCES = JSON.parse(readFileSync(sourcesJson, 'utf8'))
const BG = { r: 24, g: 12, b: 40, alpha: 1 }

for (const [e, prodPath] of Object.entries(PROD)) {
  const pm = await analyze(prodPath)
  const sm = await analyze(SOURCES[e])
  const pb = pm.bbox, sb = sm.bbox
  // source を production 本体寸法にクリーン縮小
  const clean = await sharp(SOURCES[e]).extract({ left: sb.x, top: sb.y, width: sb.w, height: sb.h }).resize(pb.w, pb.h, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer()
  const prod = await sharp(prodPath).extract({ left: pb.x, top: pb.y, width: pb.w, height: pb.h }).png().toBuffer()
  // 本体の上 1/3（顔付近）中央 160×160 を切って 3 倍
  const cw = Math.min(160, pb.w), ch = Math.min(160, pb.h)
  const cx = Math.max(0, Math.round(pb.w / 2 - cw / 2)), cy = Math.max(0, Math.round(pb.h * 0.22 - ch / 2))
  const crop = (buf) => sharp(buf).extract({ left: cx, top: cy, width: cw, height: ch }).resize(cw * 3, ch * 3, { kernel: 'nearest' }).flatten({ background: BG }).png().toBuffer()
  const a = await crop(prod), b = await crop(clean)
  await sharp({ create: { width: cw * 6 + 12, height: ch * 3, channels: 4, background: BG } })
    .composite([{ input: a, left: 0, top: 0 }, { input: b, left: cw * 3 + 12, top: 0 }]).png().toFile(join(outDir, `${e}-zoom3x-prod-vs-cleandown.png`))
  // 表示倍率での敵 vs 神（PC1366 DPR1 / DPR2）
  for (const [tag, dpr] of [['dpr1', 1], ['dpr2', 2]]) {
    const es = 0.557 * dpr, gs = 0.373 * dpr
    const en = await sharp(prodPath).resize(Math.round(pm.w * es), Math.round(pm.h * es), { kernel: 'lanczos3' }).png().toBuffer()
    const god = await sharp('public/assets/gods/taiyo/front_640.webp').resize(Math.round(640 * gs), Math.round(640 * gs), { kernel: 'lanczos3' }).png().toBuffer()
    const em = await sharp(en).metadata(), gm = await sharp(god).metadata()
    const H = Math.max(em.height, gm.height)
    await sharp({ create: { width: em.width + gm.width + 24, height: H, channels: 4, background: BG } })
      .composite([{ input: en, left: 0, top: H - em.height }, { input: god, left: em.width + 24, top: H - gm.height }]).png().toFile(join(outDir, `${e}-vs-god-pc1366-${tag}.png`))
  }
  console.log('zoom', e)
}
console.log('done', outDir)

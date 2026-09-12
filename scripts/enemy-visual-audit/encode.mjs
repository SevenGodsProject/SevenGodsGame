// Enemy Visual Quality Audit：解像度 × フォーマット × 品質の候補を「ローカルの一時ファイル」として作り、容量と画質を測る（監査用）。
//   node scripts/enemy-visual-audit/encode.mjs <outDir> <sourcesJson> [--sizes 512,640,768,1024]
// 本番 asset には触れない。候補は Production と同じ構図（本体の高さ比・位置比）で N×N の透過キャンバスに置く。
// 参照 = その N での可逆 PNG。各候補について bytes / PSNR / SSIM / 輪郭エネルギー比 を出す。
import { mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { PROD, analyze, compare } from './metrics.mjs'

const args = process.argv.slice(2)
const outDir = args[0] ?? 'enemy-encode'
const SOURCES = JSON.parse(readFileSync(args[1], 'utf8'))
const SIZES = (args.includes('--sizes') ? args[args.indexOf('--sizes') + 1] : '512,640,768,1024').split(',').map(Number)
mkdirSync(outDir, { recursive: true })

const FORMATS = [
  ['webp-q80', (s) => s.webp({ quality: 80, alphaQuality: 100, effort: 6 })],
  ['webp-q85', (s) => s.webp({ quality: 85, alphaQuality: 100, effort: 6 })],
  ['webp-q90', (s) => s.webp({ quality: 90, alphaQuality: 100, effort: 6 })],
  ['webp-q95', (s) => s.webp({ quality: 95, alphaQuality: 100, effort: 6 })],
  ['webp-lossless', (s) => s.webp({ lossless: true, effort: 6 })],
  ['avif-q60', (s) => s.avif({ quality: 60, effort: 4 })],
  ['avif-q75', (s) => s.avif({ quality: 75, effort: 4 })],
  ['png', (s) => s.png({ compressionLevel: 9, palette: false })],
]

const result = {}
for (const [e, prodPath] of Object.entries(PROD)) {
  const src = SOURCES[e]
  const pm = await analyze(prodPath)
  const sm = await analyze(src)
  const pb = pm.mainBbox ?? pm.bbox, sb = sm.mainBbox ?? sm.bbox
  // Production の構図：本体高さ／キャンバス、本体中心 x／幅、本体下端 y／高さ
  const ratioH = pb.h / pm.h, cx = (pb.x + pb.w / 2) / pm.w, bottom = (pb.y + pb.h) / pm.h
  const srcMaxH = sb.h
  result[e] = { source: src, sourceBody: `${sb.w}x${sb.h}`, prodBody: `${pb.w}x${pb.h}@${pm.w}`, sizes: {} }
  for (const N of SIZES) {
    const canvasW = e === 'onryo' ? Math.round(N * 384 / 512) : N // onryo は 384×512 の縦長キャンバス
    const bodyH = Math.round(N * ratioH)
    if (bodyH > srcMaxH * 1.02) { result[e].sizes[N] = { skipped: `source body ${srcMaxH}px < needed ${bodyH}px（拡大になるので除外）` }; continue }
    const bodyW = Math.round(sb.w * bodyH / sb.h)
    const left = Math.round(canvasW * cx - bodyW / 2), top = Math.round(N * bottom - bodyH)
    const body = await sharp(src).extract({ left: sb.x, top: sb.y, width: sb.w, height: sb.h }).resize(bodyW, bodyH, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer()
    const refPath = join(outDir, `${e}-${N}-ref.png`)
    await sharp({ create: { width: canvasW, height: N, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: body, left: Math.max(0, Math.min(canvasW - bodyW, left)), top: Math.max(0, Math.min(N - bodyH, top)) }]).png().toFile(refPath)
    const ref = await analyze(refPath)
    const row = { canvas: `${canvasW}x${N}`, body: `${bodyW}x${bodyH}`, refLapVar: ref.lapVar, formats: {} }
    for (const [name, enc] of FORMATS) {
      const ext = name.split('-')[0]
      const out = join(outDir, `${e}-${N}-${name}.${ext}`)
      await enc(sharp(refPath)).toFile(out)
      const bytes = statSync(out).size
      const q = name === 'png' ? { psnr: Infinity, ssim: 1 } : await compare(refPath, out, null)
      const a = name === 'png' ? ref : await analyze(out)
      row.formats[name] = { bytes, kb: +(bytes / 1024).toFixed(0), psnr: q.psnr, ssim: q.ssim, sharpRatio: +(a.lapVar / Math.max(1, ref.lapVar)).toFixed(3), semiPx: a.semiPx }
    }
    result[e].sizes[N] = row
    console.log(e.padEnd(9), N, row.canvas, 'body', row.body, Object.entries(row.formats).map(([k, v]) => `${k} ${v.kb}KB ${v.psnr === Infinity ? '∞' : v.psnr}dB s${v.sharpRatio}`).join(' | '))
  }
  // 現行 Production ファイルの位置づけ（同じ指標）
  const cur = await analyze(prodPath)
  result[e].current = { file: prodPath, kb: +(statSync(prodPath).size / 1024).toFixed(0), lapVar: cur.lapVar }
}
writeFileSync(join(outDir, 'encode.json'), JSON.stringify(result, null, 2))
console.log('written', join(outDir, 'encode.json'))

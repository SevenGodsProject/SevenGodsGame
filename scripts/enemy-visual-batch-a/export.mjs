// Enemy Visual Upgrade Batch A：高解像度 source から Production asset を再書き出しする。
//   node scripts/enemy-visual-batch-a/export.mjs <sourcesJson> [--out <dir>] [--size 768] [--quality 90] [--apply]
//
// やること（これだけ）：
//   ① 現行 Production asset から構図（本体 bbox）を読む
//   ② source の本体だけを取り出し、その構図へ **倍率どおり** に置き直す（768/512 = 1.5 倍）
//   ③ WebP q90 / alphaQuality 100 / effort 6 で書き出す
// やらないこと：AI upscale・生成補完・顔や線の修正・シャープ強調・彩度/色調変更・glow/outline/背景の追加。
// `--apply` を付けたときだけ public/ の実ファイルを置き換える（既定は out ディレクトリへ書くだけ）。
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
sharp.cache(false)
import { PROD, analyze, compare } from '../enemy-visual-audit/metrics.mjs'

const args = process.argv.slice(2)
const SOURCES = JSON.parse(readFileSync(args[0], 'utf8'))
const outDir = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'batch-a-out'
const SIZE = Number(args.includes('--size') ? args[args.indexOf('--size') + 1] : 768)
const QUALITY = Number(args.includes('--quality') ? args[args.indexOf('--quality') + 1] : 90)
const APPLY = args.includes('--apply')
const TARGETS = ['datenshi', 'karakuri', 'doukeshi']
mkdirSync(outDir, { recursive: true })

/** 透明境界のフリンジ検査：半透明画素の「非乗算 RGB」と、隣接する不透明画素の RGB の輝度差 */
async function fringe(path) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height
  let n = 0, sumDelta = 0, white = 0, black = 0
  const lum = (i) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = (y * W + x) * 4, a = data[i + 3]
    if (a < 40 || a > 215) continue // 中間の帯だけ見る
    let best = -1
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const j = ((y + dy) * W + (x + dx)) * 4
      if (data[j + 3] >= 250) { best = j; break }
    }
    if (best < 0) continue
    const d = lum(i) - lum(best)
    sumDelta += d; n++
    if (d > 40) white++
    else if (d < -40) black++
  }
  return { samples: n, meanDelta: n ? +(sumDelta / n).toFixed(2) : 0, whitePct: n ? +(100 * white / n).toFixed(1) : 0, blackPct: n ? +(100 * black / n).toFixed(1) : 0 }
}

const report = {}
for (const e of TARGETS) {
  const prodPath = PROD[e]
  const src = SOURCES[e]
  const pm = await analyze(prodPath)
  const sm = await analyze(src)
  const pb = pm.mainBbox ?? pm.bbox, sb = sm.mainBbox ?? sm.bbox

  // 構図ロック：現行キャンバス→新キャンバスは相似。本体の寸法も位置も同じ倍率で写す
  const k = SIZE / pm.w
  const canvasW = Math.round(pm.w * k), canvasH = Math.round(pm.h * k)
  const bodyW = Math.round(pb.w * k), bodyH = Math.round(pb.h * k)
  const left = Math.round(pb.x * k), top = Math.round(pb.y * k)

  const body = await sharp(src).extract({ left: sb.x, top: sb.y, width: sb.w, height: sb.h })
    .resize(bodyW, bodyH, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer()
  const outPath = join(outDir, `${e}${prodPath.endsWith('art_hq.webp') ? '-art_hq' : '-art'}.webp`)
  const canvas = () => sharp({ create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: body, left, top }])
  // 可逆参照（この構図そのもの）。符号化ロスだけを測るための基準
  const refPath = join(outDir, `${e}-reference.png`)
  await canvas().png({ compressionLevel: 9 }).toFile(refPath)
  // 品質は q90 を既定とし、監査の受け入れ基準（可逆参照比 PSNR >= 33dB）を満たす **最小の品質** まで上げる。
  // 同じファイルを上書きしながら読み返すと Windows で掴んだままになるため、候補ごとに別ファイルへ書く。
  let quality = QUALITY, encode = null, chosen = null
  for (const q of [QUALITY, 92, 94, 95].filter((q) => q >= QUALITY)) {
    const cand = join(outDir, `${e}-q${q}.webp`)
    await canvas().webp({ quality: q, alphaQuality: 100, effort: 6 }).toFile(cand)
    const m = await compare(refPath, cand, null)
    quality = q; encode = m; chosen = cand
    if (m.psnr >= 33) break
  }
  copyFileSync(chosen, outPath)

  const nm = await analyze(outPath)
  const nb = nm.mainBbox ?? nm.bbox
  // 構図差を「現行 asset 基準の 512 座標」に戻して比較 → さらに PC1366 の 285 CSS px 換算
  const toProd = (v) => v / k
  const cssPerAsset = 285 / pm.w
  const d = {
    bodyW: +(toProd(nb.w) - pb.w).toFixed(2), bodyH: +(toProd(nb.h) - pb.h).toFixed(2),
    left: +(toProd(nb.x) - pb.x).toFixed(2), top: +(toProd(nb.y) - pb.y).toFixed(2),
    centerX: +(toProd(nb.x + nb.w / 2) - (pb.x + pb.w / 2)).toFixed(2),
    bottom: +(toProd(nb.y + nb.h) - (pb.y + pb.h)).toFixed(2),
  }
  const cssDiff = Math.max(...Object.values(d).map(Math.abs)) * cssPerAsset
  const sizeDiffPct = Math.max(Math.abs(toProd(nb.w) / pb.w - 1), Math.abs(toProd(nb.h) / pb.h - 1)) * 100

  const fProd = await fringe(prodPath), fNew = await fringe(outPath)
  report[e] = {
    quality, encodeVsLossless: encode, referencePng: refPath,
    intended: { canvasW, canvasH, bodyW, bodyH, left, top, scale: k },
    source: src, prodFile: prodPath.replace('public', ''), outFile: outPath,
    canvas: { before: `${pm.w}x${pm.h}`, after: `${canvasW}x${canvasH}` },
    body: { before: `${pb.w}x${pb.h}@(${pb.x},${pb.y})`, after: `${nb.w}x${nb.h}@(${nb.x},${nb.y})`, afterInProdScale: `${toProd(nb.w).toFixed(1)}x${toProd(nb.h).toFixed(1)}@(${toProd(nb.x).toFixed(1)},${toProd(nb.y).toFixed(1)})` },
    ratios: {
      beforeBodyH: +(pb.h / pm.h).toFixed(4), afterBodyH: +(nb.h / canvasH).toFixed(4),
      beforeCenterX: +((pb.x + pb.w / 2) / pm.w).toFixed(4), afterCenterX: +((nb.x + nb.w / 2) / canvasW).toFixed(4),
      beforeBottom: +((pb.y + pb.h) / pm.h).toFixed(4), afterBottom: +((nb.y + nb.h) / canvasH).toFixed(4),
      beforeMarginL: +(pb.x / pm.w).toFixed(4), afterMarginL: +(nb.x / canvasW).toFixed(4),
      beforeMarginR: +((pm.w - pb.x - pb.w) / pm.w).toFixed(4), afterMarginR: +((canvasW - nb.x - nb.w) / canvasW).toFixed(4),
      beforeMarginT: +(pb.y / pm.h).toFixed(4), afterMarginT: +(nb.y / canvasH).toFixed(4),
    },
    compositionDeltaInProdPx: d, compositionDeltaCssPx: +cssDiff.toFixed(2), sizeDiffPct: +sizeDiffPct.toFixed(2),
    bytes: { before: statSync(prodPath).size, after: statSync(outPath).size },
    edge: { beforeBand: pm.edgeBand, afterBand: nm.edgeBand, beforeFringe: fProd, afterFringe: fNew },
    sharpness: { beforeLapVar: pm.lapVar, afterLapVar: nm.lapVar },
    colors: { before: pm.colors, after: nm.colors },
    style: { before: pm.style, after: nm.style },
  }
  console.log(`${e.padEnd(9)} q${quality} ${pm.w}→${canvasW}px  body ${pb.w}x${pb.h} → ${nb.w}x${nb.h} (prod換算 ${toProd(nb.w).toFixed(1)}x${toProd(nb.h).toFixed(1)}) 位置差 ${cssDiff.toFixed(2)}css px / サイズ差 ${sizeDiffPct.toFixed(2)}% | ${(statSync(prodPath).size / 1024).toFixed(0)}KB → ${(statSync(outPath).size / 1024).toFixed(0)}KB | edge ${pm.edgeBand}→${nm.edgeBand}px fringe Δ${fProd.meanDelta}→${fNew.meanDelta} (white ${fProd.whitePct}%→${fNew.whitePct}%) | lapVar ${pm.lapVar}→${nm.lapVar}`)

  if (APPLY) { copyFileSync(outPath, prodPath); console.log(`  applied → ${prodPath}`) }
}
writeFileSync(join(outDir, 'export.json'), JSON.stringify(report, null, 2))
console.log('written', join(outDir, 'export.json'), APPLY ? '(applied to public/)' : '(dry run)')

// Enemy Visual Upgrade Batch A：書き出した asset を「実表示サイズ」で検証する。
//   node scripts/enemy-visual-batch-a/verify-export.mjs <outDir> [--before-dir <dir>]
//
// ① 実表示の device px ごとの輪郭エネルギー（Before / After / 理想）
// ② 透明境界の帯を表示 px に正規化（asset の px 数ではなく目に見える太さで比べる）
// ③ 画風統計（明度・コントラスト・彩度・色温度）が変わっていないこと＝色調/彩度をいじっていない証拠
// ④ 同一性：(a) 現行 asset との勾配相関＝構図・絵柄が同じこと、(b) 可逆参照との PSNR＝符号化が忠実なこと
//
// 注意：現行 asset は書き出し時にシャープ処理が入っている（監査：輪郭比 1.6〜2.8）。
// そのため「現行 vs 新規」を PSNR/SSIM で直接測るとシャープのハロー分だけ数値が落ちる。
// 絵が変わっていないことは **勾配相関** で、符号化の忠実さは **可逆参照との PSNR** で見る。
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { analyze, compare } from '../enemy-visual-audit/metrics.mjs'

const outDir = process.argv[2] ?? 'batch-a-out'
const beforeDir = process.argv.includes('--before-dir') ? process.argv[process.argv.indexOf('--before-dir') + 1] : null
const exported = JSON.parse(readFileSync(join(outDir, 'export.json'), 'utf8'))

// 実測済みの表示条件（Production 計測より）：CSS 箱 → device px
const CONDS = [
  ['PC1366 DPR1', 285, 1], ['PC1366 DPR2', 285, 2],
  ['PC1508 DPR1', 194, 1], ['PC1508 DPR2', 194, 2],
  ['Mobile390 DPR2', 130, 2], ['Mobile390 DPR3', 130, 3],
]
const STYLE_TOL = { meanLum: 3, contrast: 3, meanSat: 0.02, warmth: 4 }

let fail = 0
const report = {}
for (const [e, row] of Object.entries(exported)) {
  const beforePath = beforeDir ? join(beforeDir, e + '.webp') : 'public' + row.prodFile
  const afterPath = row.outFile
  if (!existsSync(beforePath)) { console.log(`FAIL ${e}: before file missing ${beforePath}`); fail++; continue }
  const bm = await analyze(beforePath), am = await analyze(afterPath)
  const r = { conditions: {}, style: { before: bm.style, after: am.style }, edge: {}, identity: null }

  for (const [tag, cssPx, dpr] of CONDS) {
    const dev = Math.round(cssPx * dpr)
    const b = (await analyze(await sharp(beforePath).resize(dev, dev, { fit: 'inside', kernel: 'cubic' }).png().toBuffer())).lapVar
    const a = (await analyze(await sharp(afterPath).resize(dev, dev, { fit: 'inside', kernel: 'cubic' }).png().toBuffer())).lapVar
    r.conditions[tag] = { devPx: dev, before: b, after: a, gain: +(a / b).toFixed(3) }
  }
  // 透明境界：asset px の帯 → 表示（PC1366 DPR2）での device px に換算
  const scaleB = 570 / bm.w, scaleA = 570 / am.w
  r.edge = {
    beforeBandAsset: bm.edgeBand, afterBandAsset: am.edgeBand,
    beforeBandAtDpr2: +(bm.edgeBand * scaleB).toFixed(2), afterBandAtDpr2: +(am.edgeBand * scaleA).toFixed(2),
    beforeFringe: row.edge.beforeFringe, afterFringe: row.edge.afterFringe,
  }
  // (a) 構図・絵柄の同一性：本体 bbox を 128×128 に正規化した勾配マップの相関
  const gradFp = async (path, m) => {
    const b = m.mainBbox ?? m.bbox
    const g = await sharp(path).extract({ left: b.x, top: b.y, width: b.w, height: b.h })
      .flatten({ background: '#000000' }).resize(128, 128, { fit: 'fill' }).greyscale().raw().toBuffer()
    const arr = []
    for (let y = 1; y < 127; y++) for (let x = 1; x < 127; x++) { const i = y * 128 + x; arr.push(Math.abs(g[i + 1] - g[i - 1]) + Math.abs(g[i + 128] - g[i - 128])) }
    const mean = arr.reduce((s, v) => s + v, 0) / arr.length
    const sd = Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length) || 1
    return arr.map((v) => (v - mean) / sd)
  }
  const fpB = await gradFp(beforePath, bm), fpA = await gradFp(afterPath, am)
  const gradCorr = +(fpA.reduce((s, v, i) => s + v * fpB[i], 0) / fpA.length).toFixed(4)
  // (b) 符号化の忠実さ：export が書いた可逆参照（同じ構図そのもの）との PSNR/SSIM
  const encode = row.encodeVsLossless ?? await compare(row.referencePng, afterPath, null)
  // (c) 透明境界の基準：可逆参照（＝元の絵そのもの）のフリンジ。ここと同じなら「元絵の輪郭」であり artifact ではない
  const refFringe = await (async () => {
    const { data, info } = await sharp(row.referencePng).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const W = info.width, H = info.height
    const lum = (i) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    let n = 0, sum = 0, white = 0, black = 0
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = (y * W + x) * 4, a = data[i + 3]
      if (a < 40 || a > 215) continue
      let best = -1
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const j = ((y + dy) * W + (x + dx)) * 4; if (data[j + 3] >= 250) { best = j; break } }
      if (best < 0) continue
      const d = lum(i) - lum(best); sum += d; n++
      if (d > 40) white++; else if (d < -40) black++
    }
    return { samples: n, meanDelta: n ? +(sum / n).toFixed(2) : 0, whitePct: n ? +(100 * white / n).toFixed(1) : 0, blackPct: n ? +(100 * black / n).toFixed(1) : 0 }
  })()
  r.identity = { gradCorrVsCurrent: gradCorr, encodeVsLossless: encode, quality: row.quality }
  r.edge.losslessReferenceFringe = refFringe

  const styleProblems = []
  for (const [k, tol] of Object.entries(STYLE_TOL)) {
    const d = Math.abs(am.style[k] - bm.style[k])
    if (d > tol) styleProblems.push(`${k} Δ${d.toFixed(2)} > ${tol}`)
  }
  const edgeProblem = r.edge.afterBandAtDpr2 > r.edge.beforeBandAtDpr2 + 0.3 ? ['edge band at DPR2 widened'] : []
  // フリンジは絶対値ではなく「現行より悪化していないか」で見る（元の絵が持つ暗い輪郭線は artifact ではない）
  const fB = row.edge.beforeFringe, fA = row.edge.afterFringe
  const fringeProblem = []
  if (fA.whitePct > refFringe.whitePct + 2) fringeProblem.push(`white fringe added by encode: ref ${refFringe.whitePct}% → ${fA.whitePct}%`)
  if (fA.blackPct > refFringe.blackPct + 5) fringeProblem.push(`black fringe added by encode: ref ${refFringe.blackPct}% → ${fA.blackPct}%`)
  if (Math.abs(fA.meanDelta - refFringe.meanDelta) > 8) fringeProblem.push(`edge luminance shifted by encode: ref ${refFringe.meanDelta} → ${fA.meanDelta}`)
  const gainProblem = r.conditions['PC1366 DPR2'].gain < 1.10 ? ['PC1366 DPR2 sharpness gain < 1.10'] : []
  const idProblem = []
  if (gradCorr < 0.95) idProblem.push(`gradient corr vs current ${gradCorr} < 0.95（絵が変わっている疑い）`)
  if (encode.psnr < 33) idProblem.push(`encode PSNR ${encode.psnr}dB < 33`)
  const problems = [...styleProblems, ...edgeProblem, ...fringeProblem, ...gainProblem, ...idProblem]
  if (problems.length) fail++
  r.problems = problems
  report[e] = r

  console.log(`${problems.length ? 'FAIL' : 'PASS'} ${e.padEnd(9)} ` +
    Object.entries(r.conditions).map(([t, v]) => `${t.replace('Mobile', 'SP').replace(' DPR', '/')} ${v.gain}x`).join(' ') +
    ` | edge@DPR2 ${r.edge.beforeBandAtDpr2}→${r.edge.afterBandAtDpr2}px fringe white ${fB.whitePct}%→${fA.whitePct}%(ref ${refFringe.whitePct}%) black ${fB.blackPct}%→${fA.blackPct}%(ref ${refFringe.blackPct}%)` +
    ` | gradCorr ${gradCorr} encode ${encode.psnr}dB/${encode.ssim}` +
    ` | style lum ${bm.style.meanLum}→${am.style.meanLum} sat ${bm.style.meanSat}→${am.style.meanSat} warm ${bm.style.warmth}→${am.style.warmth} contrast ${bm.style.contrast}→${am.style.contrast}` +
    (problems.length ? ` :: ${problems.join('; ')}` : ''))
}
writeFileSync(join(outDir, 'verify.json'), JSON.stringify(report, null, 2))
console.log(fail ? `RESULT: FAIL (${fail})` : 'RESULT: PASS (export verified)')
process.exit(fail ? 1 : 0)

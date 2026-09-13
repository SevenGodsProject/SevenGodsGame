// Final Visual Acceptance Gate：OLD / NEW を「可逆参照（元の絵そのもの）」と突き合わせて判定する。
//   node scripts/enemy-visual-batch-a/acceptance-metrics.mjs <oldDir> <newDir> <sourcesJson> <outJson>
//
// 目的：旧 asset に焼き込まれたシャープの **halo（オーバーシュート）を「高品質」と誤認しない** こと。
// そのために、数値は「どちらが参照に近いか」と「参照に無い輪郭を足していないか」で測る。
//
//  fidelity        … 参照との PSNR / SSIM（±2px のずれを許して最良を採る）
//  structAgreement … 勾配マップの相関。参照に無い輪郭（halo）を足すと下がる
//  gradRatio       … 参照比の勾配強度。1.0 が忠実、>1.15 は過剰輪郭、<0.85 は軟らかい
//  riseWidth       … エッジ断面の 10–90% 立ち上がり幅（px）。小さいほど鋭い＝知覚シャープネス
//  ringingPct      … 断面が全体の向きに逆行した割合＝halo の直接検出（参照に依存しない）。参照値も併記
//  localContrast   … 5×5 の局所 RMS コントラスト（参照比）
//  edgeRetention   … 参照のエッジ位置で候補も十分な勾配を持つ割合＝detail separation
//  hfError         … （候補−参照）の Laplacian RMS＝高周波の誤差（aliasing / ringing）
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
sharp.cache(false)

const [oldDir, newDir, sourcesJson, outJson] = process.argv.slice(2)
const SOURCES = JSON.parse(readFileSync(sourcesJson, 'utf8'))
const capOld = JSON.parse(readFileSync(join(oldDir, 'capture.json'), 'utf8'))
const capNew = JSON.parse(readFileSync(join(newDir, 'capture.json'), 'utf8'))
const FLAT = { r: 0x10, g: 0x10, b: 0x18 }
// enemy key（URL）→ source key
const SRC_KEY = { trial: 'datenshi', karakuri: 'karakuri', doukeshi: 'doukeshi' }

async function gray(path) {
  const { data, info } = await sharp(path).flatten({ background: FLAT }).greyscale().raw().toBuffer({ resolveWithObject: true })
  return { d: Float32Array.from(data), w: info.width, h: info.height }
}
function grad(g) {
  const { d, w, h } = g
  const mag = new Float32Array(w * h), gx = new Float32Array(w * h), gy = new Float32Array(w * h)
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x
    const dx = d[i + 1] - d[i - 1], dy = d[i + w] - d[i - w]
    gx[i] = dx; gy[i] = dy; mag[i] = Math.hypot(dx, dy)
  }
  return { mag, gx, gy }
}
/** 参照に対する候補の最良整数シフト（±2px）を探す */
function bestShift(ref, cand, mask) {
  let best = null
  for (let sy = -2; sy <= 2; sy++) for (let sx = -2; sx <= 2; sx++) {
    let se = 0, n = 0
    for (let y = 3; y < ref.h - 3; y++) for (let x = 3; x < ref.w - 3; x++) {
      const i = y * ref.w + x
      if (!mask[i]) continue
      const j = (y + sy) * cand.w + (x + sx)
      const e = ref.d[i] - cand.d[j]
      se += e * e; n++
    }
    const mse = se / Math.max(1, n)
    if (!best || mse < best.mse) best = { sx, sy, mse }
  }
  return best
}
function stats(ref, cand, shift, mask, gRef, gCand) {
  const { w, h } = ref
  const S = (x, y) => (y + shift.sy) * cand.w + (x + shift.sx)
  let se = 0, n = 0
  let ma = 0, mb = 0
  const A = [], B = []
  let gSumRef = 0, gSumCand = 0, gN = 0, retained = 0
  const GA = [], GB = []
  let lcRef = 0, lcCand = 0, lcN = 0
  let lapErr = 0, lapN = 0
  const EDGE = 18 // 参照側で「エッジ」とみなす勾配のしきい値
  for (let y = 3; y < h - 3; y++) for (let x = 3; x < w - 3; x++) {
    const i = y * w + x
    if (!mask[i]) continue
    const j = S(x, y)
    const e = ref.d[i] - cand.d[j]
    se += e * e; n++
    A.push(ref.d[i]); B.push(cand.d[j]); ma += ref.d[i]; mb += cand.d[j]
    GA.push(gRef.mag[i]); GB.push(gCand.mag[j])
    // 局所コントラスト（5×5 RMS）
    let sr = 0, sc = 0, sr2 = 0, sc2 = 0, k = 0
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const ii = (y + dy) * w + (x + dx), jj = (y + dy + shift.sy) * cand.w + (x + dx + shift.sx)
      sr += ref.d[ii]; sr2 += ref.d[ii] * ref.d[ii]; sc += cand.d[jj]; sc2 += cand.d[jj] * cand.d[jj]; k++
    }
    lcRef += Math.sqrt(Math.max(0, sr2 / k - (sr / k) ** 2)); lcCand += Math.sqrt(Math.max(0, sc2 / k - (sc / k) ** 2)); lcN++
    // 高周波誤差：差分の Laplacian
    const lap = 4 * (ref.d[i] - cand.d[j]) - (ref.d[i - 1] - cand.d[S(x - 1, y)]) - (ref.d[i + 1] - cand.d[S(x + 1, y)]) - (ref.d[i - w] - cand.d[S(x, y - 1)]) - (ref.d[i + w] - cand.d[S(x, y + 1)])
    lapErr += lap * lap; lapN++
    if (gRef.mag[i] >= EDGE) { gSumRef += gRef.mag[i]; gSumCand += gCand.mag[j]; gN++; if (gCand.mag[j] >= gRef.mag[i] * 0.5) retained++ }
  }
  const mse = se / Math.max(1, n)
  const psnr = mse === 0 ? Infinity : 10 * Math.log10(255 * 255 / mse)
  ma /= A.length; mb /= B.length
  let va = 0, vb = 0, cov = 0
  for (let i = 0; i < A.length; i++) { va += (A[i] - ma) ** 2; vb += (B[i] - mb) ** 2; cov += (A[i] - ma) * (B[i] - mb) }
  va /= A.length; vb /= B.length; cov /= A.length
  const c1 = (0.01 * 255) ** 2, c2 = (0.03 * 255) ** 2
  const ssim = ((2 * ma * mb + c1) * (2 * cov + c2)) / ((ma * ma + mb * mb + c1) * (va + vb + c2))
  const mgA = GA.reduce((s, v) => s + v, 0) / GA.length, mgB = GB.reduce((s, v) => s + v, 0) / GB.length
  let ga = 0, gb = 0, gc = 0
  for (let i = 0; i < GA.length; i++) { ga += (GA[i] - mgA) ** 2; gb += (GB[i] - mgB) ** 2; gc += (GA[i] - mgA) * (GB[i] - mgB) }
  const structAgreement = gc / Math.sqrt(Math.max(1e-9, ga * gb))
  return {
    psnr: +psnr.toFixed(2), ssim: +ssim.toFixed(4),
    gradRatio: +(gSumCand / Math.max(1e-9, gSumRef)).toFixed(3),
    structAgreement: +structAgreement.toFixed(4),
    edgeRetention: +(retained / Math.max(1, gN)).toFixed(3),
    localContrastRatio: +(lcCand / Math.max(1e-9, lcRef)).toFixed(3),
    hfError: +Math.sqrt(lapErr / Math.max(1, lapN)).toFixed(2),
    edgePixels: gN, pixels: n,
  }
}
/** エッジ断面の 10–90% 立ち上がり幅と、参照の min/max を突き抜けた割合（halo） */
function profiles(ref, cand, shift, mask, gRef) {
  const { w, h } = ref
  const S = (x, y) => (y + shift.sy) * cand.w + (x + shift.sx)
  let riseRef = 0, riseCand = 0, nRise = 0, over = 0, nOver = 0, overMag = 0, overRef = 0, overRefMag = 0
  for (let y = 4; y < h - 4; y++) for (let x = 4; x < w - 4; x++) {
    const i = y * w + x
    if (!mask[i] || gRef.mag[i] < 26) continue
    const horiz = Math.abs(gRef.gx[i]) >= Math.abs(gRef.gy[i])
    const pr = [], pc = []
    for (let t = -3; t <= 3; t++) {
      const xx = horiz ? x + t : x, yy = horiz ? y : y + t
      pr.push(ref.d[yy * w + xx]); pc.push(cand.d[S(xx, yy)])
    }
    const lo = Math.min(...pr), hi = Math.max(...pr)
    if (hi - lo < 26) continue
    const band = (p) => { const l = Math.min(...p), g = Math.max(...p); return p.filter((v) => v > l + (g - l) * 0.1 && v < l + (g - l) * 0.9).length }
    riseRef += band(pr)
    riseCand += band(pc)
    nRise++
    // halo（参照に依存しない検出）：断面が全体の向きに逆行した量＝オーバーシュート／アンダーシュート
    const ringOf = (p) => {
      const dir = Math.sign(p[6] - p[0]) || 1
      let worst = 0
      for (let k = 1; k < p.length; k++) { const step = (p[k] - p[k - 1]) * dir; if (step < 0) worst = Math.max(worst, -step) }
      return worst
    }
    const wr = ringOf(pr), wc = ringOf(pc)
    nOver++
    if (wr > 6) { overRef++; overRefMag += wr }
    if (wc > 6) { over++; overMag += wc }
  }
  return {
    riseWidthRef: +(riseRef / Math.max(1, nRise)).toFixed(2),
    riseWidthCand: +(riseCand / Math.max(1, nRise)).toFixed(2),
    ringingPctRef: +(100 * overRef / Math.max(1, nOver)).toFixed(1),
    ringingPct: +(100 * over / Math.max(1, nOver)).toFixed(1),
    ringingMeanLevels: +(overMag / Math.max(1, over)).toFixed(1),
    ringingMeanLevelsRef: +(overRefMag / Math.max(1, overRef)).toFixed(1),
    samples: nRise,
  }
}

const out = { conditions: {} }
for (const rowNew of capNew) {
  if (rowNew.error) continue
  const rowOld = capOld.find((r) => r.cond === rowNew.cond && r.enemy === rowNew.enemy && !r.error)
  if (!rowOld) continue
  const key = `${rowNew.cond}|${rowNew.enemy}`
  const oldPath = join(oldDir, `${rowNew.cond}-${rowNew.enemy}-isolated.png`)
  const newPath = join(newDir, `${rowNew.cond}-${rowNew.enemy}-isolated.png`)
  if (!existsSync(oldPath) || !existsSync(newPath)) continue
  const gOld = await gray(oldPath), gNew = await gray(newPath)
  if (gOld.w !== gNew.w || gOld.h !== gNew.h) { out.conditions[key] = { error: `size mismatch ${gOld.w}x${gOld.h} vs ${gNew.w}x${gNew.h}` }; continue }

  // 参照：source の本体を、NEW と同じ描画寸法へ Lanczos3 で落として平坦色に載せる
  const srcKey = SRC_KEY[rowNew.enemy]
  const srcPath = SOURCES[srcKey]
  const newAsset = `public/assets/enemies/${srcKey}/art${srcKey === 'oni' || srcKey === 'onryo' || srcKey === 'juuma' || srcKey === 'ryujin' ? '_hq' : ''}.webp`
  const am = await sharp(newAsset).metadata()
  const { data: aData, info: aInfo } = await sharp(newAsset).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let x0 = aInfo.width, y0 = aInfo.height, x1 = 0, y1 = 0
  for (let y = 0; y < aInfo.height; y++) for (let x = 0; x < aInfo.width; x++) if (aData[(y * aInfo.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  const bb = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
  // contain：正方 asset を box に収める
  const boxW = gNew.w, boxH = gNew.h
  const s = Math.min(boxW / am.width, boxH / am.height)
  const drawW = am.width * s, drawH = am.height * s
  const offX = (boxW - drawW) / 2, offY = boxH - drawH // center bottom
  const bodyW = Math.max(1, Math.round(bb.w * s)), bodyH = Math.max(1, Math.round(bb.h * s))
  const bodyX = Math.round(offX + bb.x * s), bodyY = Math.round(offY + bb.y * s)
  const sMeta = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let sx0 = sMeta.info.width, sy0 = sMeta.info.height, sx1 = 0, sy1 = 0
  for (let y = 0; y < sMeta.info.height; y++) for (let x = 0; x < sMeta.info.width; x++) if (sMeta.data[(y * sMeta.info.width + x) * 4 + 3] > 8) { if (x < sx0) sx0 = x; if (x > sx1) sx1 = x; if (y < sy0) sy0 = y; if (y > sy1) sy1 = y }
  const refBody = await sharp(srcPath).extract({ left: sx0, top: sy0, width: sx1 - sx0 + 1, height: sy1 - sy0 + 1 })
    .resize(bodyW, bodyH, { fit: 'fill', kernel: 'mitchell' }).png().toBuffer()
  const refPath = join(newDir, `_ref-${rowNew.cond}-${rowNew.enemy}.png`)
  await sharp({ create: { width: boxW, height: boxH, channels: 4, background: { ...FLAT, alpha: 1 } } })
    .composite([{ input: refBody, left: Math.max(0, Math.min(boxW - bodyW, bodyX)), top: Math.max(0, Math.min(boxH - bodyH, bodyY)) }])
    .png().toFile(refPath)
  const gRef = await gray(refPath)

  // 本体マスク（参照の不透明部分を 2px 収縮）
  const { data: rData } = await sharp(refPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const rawMask = new Uint8Array(boxW * boxH)
  for (let i = 0; i < boxW * boxH; i++) {
    const dr = rData[i * 4] - FLAT.r, dg = rData[i * 4 + 1] - FLAT.g, db = rData[i * 4 + 2] - FLAT.b
    rawMask[i] = Math.hypot(dr, dg, db) > 14 ? 1 : 0
  }
  const mask = new Uint8Array(boxW * boxH)
  for (let y = 2; y < boxH - 2; y++) for (let x = 2; x < boxW - 2; x++) {
    let ok = 1
    for (let dy = -2; dy <= 2 && ok; dy++) for (let dx = -2; dx <= 2; dx++) if (!rawMask[(y + dy) * boxW + (x + dx)]) { ok = 0; break }
    mask[y * boxW + x] = ok
  }
  const maskPx = mask.reduce((s2, v) => s2 + v, 0)
  if (maskPx < 200) { out.conditions[key] = { error: `mask too small (${maskPx}px)` }; continue }

  const gg = { ref: grad(gRef), old: grad(gOld), new: grad(gNew) }
  const shOld = bestShift(gRef, gOld, mask), shNew = bestShift(gRef, gNew, mask)
  const sOld = stats(gRef, gOld, shOld, mask, gg.ref, gg.old)
  const sNew = stats(gRef, gNew, shNew, mask, gg.ref, gg.new)
  const pOld = profiles(gRef, gOld, shOld, mask, gg.ref)
  const pNew = profiles(gRef, gNew, shNew, mask, gg.ref)
  out.conditions[key] = {
    box: `${boxW}x${boxH}`, bodyRendered: `${bodyW}x${bodyH}`, maskPx,
    shift: { old: shOld, new: shNew },
    old: { ...sOld, ...pOld }, new: { ...sNew, ...pNew },
  }
  const o = out.conditions[key].old, nw = out.conditions[key].new
  console.log(`${key.padEnd(26)} body ${String(bodyW).padStart(3)}x${String(bodyH).padStart(3)} | PSNR ${o.psnr}→${nw.psnr} SSIM ${o.ssim}→${nw.ssim} | struct ${o.structAgreement}→${nw.structAgreement} | gradRatio ${o.gradRatio}→${nw.gradRatio} | rise ${o.riseWidthCand}→${nw.riseWidthCand} (ref ${o.riseWidthRef}) | ring ${o.ringingPct}%→${nw.ringingPct}% (ref ${o.ringingPctRef}%) | edgeRet ${o.edgeRetention}→${nw.edgeRetention} | lc ${o.localContrastRatio}→${nw.localContrastRatio} | hfErr ${o.hfError}→${nw.hfError}`)
}
writeFileSync(outJson, JSON.stringify(out, null, 2))
console.log('written', outJson)

// juuma Identity-Preserving Restoration Pilot / Metrics + Identity Gate。
//   node scripts/juuma-restoration/evaluate.mjs <restoreDir> <outJson>
//
// 画質：white fringe / jagged reversal / alpha edge / halo・ringing / gradient / local contrast / edge retention
// 同一性：silhouette IoU / landmark position difference / color-region difference
//   （画素の一致率ではなく「形・位置・色域」で見る。拡大方式が違えば画素は必ずずれるため）
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
sharp.cache(false)

const [restoreDir, outJson] = process.argv.slice(2)
const PROD = 'public/assets/enemies/juuma/art_hq.webp'
const GENB = { datenshi: 'public/assets/enemies/datenshi/art.webp', karakuri: 'public/assets/enemies/karakuri/art.webp', doukeshi: 'public/assets/enemies/doukeshi/art.webp' }

async function rgba(p) {
  const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { d: data, w: info.width, h: info.height }
}
function mainBbox(img, thr = 8) {
  const { d, w: W, h: H } = img
  const seen = new Uint8Array(W * H)
  let main = null
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = y * W + x
    if (seen[s] || d[s * 4 + 3] <= thr) continue
    const st = [s]; seen[s] = 1
    let n = 0, x0 = W, y0 = H, x1 = 0, y1 = 0
    while (st.length) {
      const i = st.pop(); n++
      const px = i % W, py = (i - px) / W
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = px + dx, ny = py + dy
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
        const ni = ny * W + nx
        if (!seen[ni] && d[ni * 4 + 3] > thr) { seen[ni] = 1; st.push(ni) }
      }
    }
    if (!main || n > main.count) main = { count: n, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
  }
  return main
}
/** 白フチ／黒フチ：半透明の縁と隣接する不透明画素の輝度差 */
function fringe(img) {
  const { d, w: W, h: H } = img
  const lum = (i) => 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]
  let n = 0, sum = 0, white = 0, black = 0
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, a = d[i * 4 + 3]
    if (a < 40 || a > 215) continue
    let j = -1
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const k = (y + dy) * W + (x + dx)
      if (d[k * 4 + 3] >= 250) { j = k; break }
    }
    if (j < 0) continue
    const diff = lum(i) - lum(j); sum += diff; n++
    if (diff > 40) white++; else if (diff < -40) black++
  }
  return { samples: n, meanDelta: +(sum / Math.max(1, n)).toFixed(2), whitePct: +(100 * white / Math.max(1, n)).toFixed(1), blackPct: +(100 * black / Math.max(1, n)).toFixed(1) }
}
/** シルエットの階段度：各行の左端 x の増減が反転する回数 */
function jagged(img) {
  const { d, w: W, h: H } = img
  const seq = []
  for (let y = 0; y < H; y++) {
    let x = 0
    while (x < W && d[(y * W + x) * 4 + 3] <= 8) x++
    if (x < W) seq.push(x)
  }
  let rev = 0, prev = 0
  for (let i = 1; i < seq.length; i++) {
    const dd = seq[i] - seq[i - 1]
    if (dd === 0) continue
    const dir = Math.sign(dd)
    if (prev !== 0 && dir !== prev) rev++
    prev = dir
  }
  return { rows: seq.length, reversals: rev, per100: +(100 * rev / Math.max(1, seq.length)).toFixed(1) }
}
function edgeBand(img) {
  const { d, w: W, h: H } = img
  let semi = 0, perim = 0
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, a = d[i * 4 + 3]
    if (a > 8 && a < 250) semi++
    if (a <= 8) continue
    if (d[(i - 1) * 4 + 3] <= 8 || d[(i + 1) * 4 + 3] <= 8 || d[(i - W) * 4 + 3] <= 8 || d[(i + W) * 4 + 3] <= 8) perim++
  }
  return +(semi / Math.max(1, perim)).toFixed(2)
}
/** 本体のグレースケール（黒に合成）と勾配 */
function grayOf(img) {
  const { d, w, h } = img
  const g = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) { const a = d[i * 4 + 3] / 255; g[i] = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) * a }
  return { g, w, h }
}
function gradStats(gy) {
  const { g, w, h } = gy
  let sum = 0, n = 0, lap = 0, lapN = 0, lapSum = 0
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x
    sum += Math.hypot(g[i + 1] - g[i - 1], g[i + w] - g[i - w]); n++
    const l = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w]
    lap += l * l; lapSum += l; lapN++
  }
  return { meanGrad: +(sum / n).toFixed(2), lapVar: +(lap / lapN - (lapSum / lapN) ** 2).toFixed(1) }
}
/** 局所コントラスト（本体内 5×5 RMS） */
function localContrast(img) {
  const { d, w: W, h: H } = img
  const gy = grayOf(img).g
  let s = 0, n = 0
  for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
    if (d[(y * W + x) * 4 + 3] < 250) continue
    let a = 0, a2 = 0, k = 0
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const v = gy[(y + dy) * W + (x + dx)]; a += v; a2 += v * v; k++ }
    s += Math.sqrt(Math.max(0, a2 / k - (a / k) ** 2)); n++
  }
  return +(s / Math.max(1, n)).toFixed(2)
}
/** ringing：エッジ断面が全体の向きに逆行した割合（参照不要） */
function ringing(img) {
  const { g, w, h } = grayOf(img)
  let n = 0, ring = 0
  for (let y = 4; y < h - 4; y++) for (let x = 4; x < w - 4; x++) {
    const i = y * w + x
    const gx = g[i + 1] - g[i - 1], gyy = g[i + w] - g[i - w]
    if (Math.hypot(gx, gyy) < 26) continue
    const horiz = Math.abs(gx) >= Math.abs(gyy)
    const p = []
    for (let t = -3; t <= 3; t++) p.push(horiz ? g[i + t] : g[i + t * w])
    const lo = Math.min(...p), hi = Math.max(...p)
    if (hi - lo < 26) continue
    n++
    const dir = Math.sign(p[6] - p[0]) || 1
    let worst = 0
    for (let k = 1; k < p.length; k++) { const st = (p[k] - p[k - 1]) * dir; if (st < 0) worst = Math.max(worst, -st) }
    if (worst > 6) ring++
  }
  return { samples: n, pct: +(100 * ring / Math.max(1, n)).toFixed(1) }
}
/** 同一性：本体を同じ寸法へ正規化して、シルエット IoU / ランドマークずれ / 色域差 */
async function identity(candPath, refPath) {
  const cand = await rgba(candPath), ref = await rgba(refPath)
  const cb = mainBbox(cand), rb = mainBbox(ref)
  const N = 256
  const norm = async (p, bb) => {
    const { data, info } = await sharp(p).extract({ left: bb.x, top: bb.y, width: bb.w, height: bb.h })
      .resize(N, N, { fit: 'fill', kernel: 'mitchell' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    return { d: data, w: info.width, h: info.height }
  }
  const A = await norm(candPath, cb), B = await norm(refPath, rb)
  // silhouette IoU
  let inter = 0, uni = 0
  for (let i = 0; i < N * N; i++) {
    const a = A.d[i * 4 + 3] > 127, b = B.d[i * 4 + 3] > 127
    if (a && b) inter++
    if (a || b) uni++
  }
  const iou = inter / Math.max(1, uni)
  // landmark：4 象限ごとに ±6px の相互相関で最良ずれを探す
  const gA = grayOf(A).g, gB = grayOf(B).g
  const quads = [[0, 0], [1, 0], [0, 1], [1, 1]]
  const shifts = []
  for (const [qx, qy] of quads) {
    const x0 = qx * (N / 2) + 16, y0 = qy * (N / 2) + 16, x1 = x0 + N / 2 - 32, y1 = y0 + N / 2 - 32
    let best = null
    for (let sy = -6; sy <= 6; sy++) for (let sx = -6; sx <= 6; sx++) {
      let se = 0, n = 0
      for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
        const j = (y + sy) * N + (x + sx)
        if (j < 0 || j >= N * N) continue
        const e = gB[y * N + x] - gA[j]; se += e * e; n++
      }
      const mse = se / Math.max(1, n)
      if (!best || mse < best.mse) best = { sx, sy, mse }
    }
    shifts.push(Math.hypot(best.sx, best.sy))
  }
  // color-region：色相環 12 分割 × 明度 4 分割のヒストグラム交差
  const hist = (img) => {
    const h = new Float64Array(48)
    let n = 0
    for (let i = 0; i < N * N; i++) {
      if (img.d[i * 4 + 3] < 250) continue
      const r = img.d[i * 4] / 255, g2 = img.d[i * 4 + 1] / 255, b = img.d[i * 4 + 2] / 255
      const mx = Math.max(r, g2, b), mn = Math.min(r, g2, b), dl = mx - mn
      let hue = 0
      if (dl > 0) {
        if (mx === r) hue = ((g2 - b) / dl + 6) % 6
        else if (mx === g2) hue = (b - r) / dl + 2
        else hue = (r - g2) / dl + 4
      }
      const hb = Math.min(11, Math.floor(hue * 2))
      const vb = Math.min(3, Math.floor(mx * 4))
      h[vb * 12 + hb]++; n++
    }
    for (let i = 0; i < 48; i++) h[i] /= Math.max(1, n)
    return h
  }
  const ha = hist(A), hb = hist(B)
  let interH = 0
  for (let i = 0; i < 48; i++) interH += Math.min(ha[i], hb[i])
  return {
    silhouetteIoU: +iou.toFixed(4),
    landmarkShiftPx: shifts.map((v) => +v.toFixed(1)),
    landmarkShiftMax: +Math.max(...shifts).toFixed(1),
    colorHistIntersection: +interH.toFixed(4),
    bodyCand: `${cb.w}x${cb.h}`, bodyRef: `${rb.w}x${rb.h}`,
    aspectCand: +(cb.w / cb.h).toFixed(4), aspectRef: +(rb.w / rb.h).toFixed(4),
  }
}

const files = readdirSync(restoreDir).filter((f) => f.endsWith('.webp')).sort()
const out = { reference: PROD, candidates: {}, genB: {} }
for (const [name, p] of Object.entries({ 'PRODUCTION (現行)': PROD, ...GENB })) {
  const img = await rgba(p)
  const bb = mainBbox(img)
  const rec = { file: p, canvas: `${img.w}x${img.h}`, body: `${bb.w}x${bb.h}`, fringe: fringe(img), jagged: jagged(img), edgeBand: edgeBand(img), localContrast: localContrast(img), ringing: ringing(img), ...gradStats(grayOf(img)) }
  if (name.startsWith('PRODUCTION')) out.candidates[name] = rec; else out.genB[name] = rec
}
for (const f of files) {
  const p = join(restoreDir, f)
  const img = await rgba(p)
  const bb = mainBbox(img)
  out.candidates[f.replace('.webp', '')] = {
    file: p, canvas: `${img.w}x${img.h}`, body: `${bb.w}x${bb.h}`, bytes: (await sharp(p).toBuffer()).length,
    fringe: fringe(img), jagged: jagged(img), edgeBand: edgeBand(img), localContrast: localContrast(img), ringing: ringing(img),
    ...gradStats(grayOf(img)), identity: await identity(p, PROD),
  }
}
writeFileSync(outJson, JSON.stringify(out, null, 2))
console.log('候補'.padEnd(24), '白フチ%  ジャギー/100行  縁px  ringing%  局所Ct  勾配   | IoU     landmark  色域一致')
for (const [k, v] of Object.entries(out.candidates)) {
  const id = v.identity
  console.log(k.padEnd(24), String(v.fringe.whitePct).padStart(6), String(v.jagged.per100).padStart(11), String(v.edgeBand).padStart(7), String(v.ringing.pct).padStart(8), String(v.localContrast).padStart(8), String(v.meanGrad).padStart(7),
    id ? ` | ${id.silhouetteIoU}  ${String(id.landmarkShiftMax).padStart(4)}px    ${id.colorHistIntersection}` : ' | （基準）')
}
console.log('--- 世代 B（目標水準） ---')
for (const [k, v] of Object.entries(out.genB)) console.log(k.padEnd(24), String(v.fringe.whitePct).padStart(6), String(v.jagged.per100).padStart(11), String(v.edgeBand).padStart(7), String(v.ringing.pct).padStart(8), String(v.localContrast).padStart(8), String(v.meanGrad).padStart(7))
console.log('written', outJson)

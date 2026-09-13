// juuma Restoration Pilot：残った数値が「汚染」なのか「元の絵の白」なのか、
// そして 359px という native 解像度が上限を決めているのかを切り分ける。
//   node scripts/juuma-restoration/limits.mjs <restoreDir> <outJson>
//
// ① 輪郭のうち「内側も白い」場所の割合 … 爪・毛皮・髑髏・牙。ここは白フチと区別できない
// ② 対照実験：世代 B の doukeshi を juuma と同じ 359px まで落としてから同じ手順で戻す。
//    そこで出る白フチ／ジャギーが「この解像度でのパイプラインの限界値」になる。
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
sharp.cache(false)

const [restoreDir, outJson] = process.argv.slice(2)

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
function fringeSplit(img) {
  const { d, w: W, h: H } = img
  const lum = (i) => 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]
  let n = 0, white = 0, whiteOnWhiteInterior = 0, whiteOnDarkInterior = 0
  for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) {
    const i = y * W + x, a = d[i * 4 + 3]
    if (a < 40 || a > 215) continue
    let j = -1
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const k = (y + dy) * W + (x + dx)
      if (d[k * 4 + 3] >= 250) { j = k; break }
    }
    if (j < 0) continue
    n++
    if (lum(i) - lum(j) <= 40) continue
    white++
    // 内側 3px の色が白寄り（輝度 190 超）なら「元の絵が白い場所」＝爪・毛皮・髑髏
    let inner = -1
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = (y + dy * 3) * W + (x + dx * 3)
      if (k >= 0 && k < W * H && d[k * 4 + 3] >= 250) { inner = k; break }
    }
    if (inner >= 0 && lum(inner) > 190) whiteOnWhiteInterior++
    else whiteOnDarkInterior++
  }
  return {
    edgeSamples: n,
    whitePct: +(100 * white / Math.max(1, n)).toFixed(1),
    genuineWhiteContentPct: +(100 * whiteOnWhiteInterior / Math.max(1, n)).toFixed(1),
    contaminationPct: +(100 * whiteOnDarkInterior / Math.max(1, n)).toFixed(1),
  }
}
function jagged(img) {
  const { d, w: W, h: H } = img
  const seq = []
  for (let y = 0; y < H; y++) { let x = 0; while (x < W && d[(y * W + x) * 4 + 3] <= 8) x++; if (x < W) seq.push(x) }
  let rev = 0, prev = 0
  for (let i = 1; i < seq.length; i++) {
    const dd = seq[i] - seq[i - 1]
    if (dd === 0) continue
    const dir = Math.sign(dd)
    if (prev !== 0 && dir !== prev) rev++
    prev = dir
  }
  return +(100 * rev / Math.max(1, seq.length)).toFixed(1)
}

const out = { fringeSplit: {}, resolutionControl: {} }

// ① 各候補の白フチを「本物の白」と「汚染」に分ける
for (const f of ['M6_kbm_2step-1024.webp', 'M5_kbm-1024.webp', 'M5_kbm-768.webp', 'M1_unmatte-1024.webp', 'M0_baseline-1024.webp']) {
  const img = await rgba(join(restoreDir, f))
  out.fringeSplit[f] = fringeSplit(img)
}
out.fringeSplit['PRODUCTION'] = fringeSplit(await rgba('public/assets/enemies/juuma/art_hq.webp'))
for (const [n, p] of Object.entries({ datenshi: 'public/assets/enemies/datenshi/art.webp', karakuri: 'public/assets/enemies/karakuri/art.webp', doukeshi: 'public/assets/enemies/doukeshi/art.webp' })) {
  out.fringeSplit['genB:' + n] = fringeSplit(await rgba(p))
}

// ② 解像度の対照実験：世代 B を juuma と同じ本体 359px へ落として、同じ手順で 1024 へ戻す
for (const [name, p] of Object.entries({ doukeshi: 'public/assets/enemies/doukeshi/art.webp', datenshi: 'public/assets/enemies/datenshi/art.webp' })) {
  const img = await rgba(p)
  const bb = mainBbox(img)
  const tmpSmall = outJson + `.small-${name}.png`
  // juuma の native と同じ本体高さ 359px へ（世代 B の情報量をわざと juuma 並みに落とす）
  const smallH = 359, smallW = Math.round(bb.w * smallH / bb.h)
  await sharp(p).extract({ left: bb.x, top: bb.y, width: bb.w, height: bb.h })
    .resize(smallW, smallH, { fit: 'fill', kernel: 'mitchell' }).png().toFile(tmpSmall)
  const small = await rgba(tmpSmall)
  // juuma と同じ構図で 1024 へ戻す
  const canvas = 1024, bodyH = Math.round(canvas * 432 / 512), bodyW = Math.round(smallW * bodyH / smallH)
  const tmpBack = outJson + `.back-${name}.png`
  const mid = await sharp(tmpSmall).resize(smallW * 2, smallH * 2, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer()
  const body = await sharp(mid).resize(bodyW, bodyH, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer()
  await sharp({ create: { width: canvas, height: canvas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: body, left: Math.round(canvas * 0.5059 - bodyW / 2), top: Math.round(canvas * 0.9238 - bodyH) }])
    .png().toFile(tmpBack)
  const back = await rgba(tmpBack)
  out.resolutionControl[name] = {
    originalJagged: jagged(img), originalFringe: fringeSplit(img).whitePct,
    at359Jagged: jagged(small), at359Fringe: fringeSplit(small).whitePct,
    restoredTo1024Jagged: jagged(back), restoredTo1024Fringe: fringeSplit(back).whitePct,
  }
}
writeFileSync(outJson, JSON.stringify(out, null, 2))

console.log('--- 白フチの内訳（>40 明るい縁を「元の絵が白い」と「汚染」に分ける） ---')
console.log('対象'.padEnd(26), '白フチ%  うち元の絵の白%  うち汚染%')
for (const [k, v] of Object.entries(out.fringeSplit)) console.log(k.padEnd(26), String(v.whitePct).padStart(6), String(v.genuineWhiteContentPct).padStart(14), String(v.contaminationPct).padStart(10))
console.log('--- 解像度の対照実験：世代 B を 359px に落として同じ手順で 1024 へ戻す ---')
for (const [k, v] of Object.entries(out.resolutionControl)) {
  console.log(k.padEnd(10), `元: ジャギー ${v.originalJagged} / 白フチ ${v.originalFringe}%  →  359px: ${v.at359Jagged} / ${v.at359Fringe}%  →  1024 へ復元: ${v.restoredTo1024Jagged} / ${v.restoredTo1024Fringe}%`)
}
console.log('written', outJson)

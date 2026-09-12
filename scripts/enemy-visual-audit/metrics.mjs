// Enemy Visual Quality Audit：敵 art の画質指標（監査用・ゲームコードではない）。
//   node scripts/enemy-visual-audit/metrics.mjs <outJson> [--sources <json>]
//
// 各 Production asset について：寸法・本体 bbox・半透明縁（alpha edge）・色数・輪郭エネルギー（Laplacian）・
// 高周波比・ブロックノイズ指標を出す。source（可逆 PNG）がある敵は PSNR / SSIM（本体 bbox 内）も出す。
// 神（front_640.webp）にも同じ指標を出して比較する。
import { writeFileSync, existsSync, readFileSync } from 'node:fs'
import sharp from 'sharp'

const args = process.argv.slice(2)
const outJson = args[0] ?? 'enemy-metrics.json'
const sourcesPath = args.includes('--sources') ? args[args.indexOf('--sources') + 1] : null
const SOURCES = sourcesPath && existsSync(sourcesPath) ? JSON.parse(readFileSync(sourcesPath, 'utf8')) : {}

export const PROD = {
  datenshi: 'public/assets/enemies/datenshi/art.webp',
  oni: 'public/assets/enemies/oni/art_hq.webp',
  onryo: 'public/assets/enemies/onryo/art_hq.webp',
  karakuri: 'public/assets/enemies/karakuri/art.webp',
  juuma: 'public/assets/enemies/juuma/art_hq.webp',
  ryujin: 'public/assets/enemies/ryujin/art_hq.webp',
  doukeshi: 'public/assets/enemies/doukeshi/art.webp',
}
const GODS = ['taiyo', 'ebisu', 'sobi', 'saika', 'juraku', 'fukuei', 'shouren']

export async function analyze(path) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height
  let x0 = W, y0 = H, x1 = -1, y1 = -1, opaque = 0, semi = 0
  const colors = new Set()
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, a = data[i + 3]
    if (a > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    if (a >= 250) { opaque++; if (colors.size < 200000) colors.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]) }
    else if (a > 8) semi++
  }
  // 最大連結成分の bbox（破片・飛沫を除いた「本体」）
  const seen = new Uint8Array(W * H)
  let main = null
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const s = y * W + x
    if (seen[s] || data[s * 4 + 3] <= 8) continue
    const stack = [s]; seen[s] = 1
    let cnt = 0, cx0 = W, cy0 = H, cx1 = 0, cy1 = 0
    while (stack.length) {
      const i = stack.pop(); cnt++
      const px = i % W, py = (i - px) / W
      if (px < cx0) cx0 = px; if (px > cx1) cx1 = px; if (py < cy0) cy0 = py; if (py > cy1) cy1 = py
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = px + dx, ny = py + dy
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
        const ni = ny * W + nx
        if (!seen[ni] && data[ni * 4 + 3] > 8) { seen[ni] = 1; stack.push(ni) }
      }
    }
    if (!main || cnt > main.count) main = { count: cnt, x: cx0, y: cy0, w: cx1 - cx0 + 1, h: cy1 - cy0 + 1 }
  }
  // 画風の統計（不透明画素）：明度・コントラスト・彩度・色温度（R−B）
  let lum = 0, lum2 = 0, sat = 0, rb = 0, opq = 0
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = (y * W + x) * 4
    if (data[i + 3] < 250) continue
    const r = data[i], gg = data[i + 1], b = data[i + 2]
    const l = 0.299 * r + 0.587 * gg + 0.114 * b
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b)
    lum += l; lum2 += l * l; sat += mx ? (mx - mn) / mx : 0; rb += r - b; opq++
  }
  const style = opq ? { meanLum: +(lum / opq).toFixed(1), contrast: +Math.sqrt(lum2 / opq - (lum / opq) ** 2).toFixed(1), meanSat: +(sat / opq).toFixed(3), warmth: +(rb / opq).toFixed(1) } : null
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1
  // 輪郭（本体の境界）画素数：alpha が 8〜250 の帯の太さの目安 = semi / 周長
  let perim = 0
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const a = data[(y * W + x) * 4 + 3]
    if (a <= 8) continue
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const xx = x + dx, yy = y + dy; return xx < 0 || yy < 0 || xx >= W || yy >= H || data[(yy * W + xx) * 4 + 3] <= 8 })
    if (n) perim++
  }
  // グレースケール（premultiplied on black）で Laplacian variance と高周波比
  const g = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) { const a = data[i * 4 + 3] / 255; g[i] = (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) * a }
  let lapSum = 0, lapSq = 0, n = 0, gradSum = 0
  let blockDiff = 0, blockN = 0, innerDiff = 0, innerN = 0
  for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) {
    if (data[(y * W + x) * 4 + 3] <= 8) continue
    const i = y * W + x
    const lap = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - W] - g[i + W]
    lapSum += lap; lapSq += lap * lap; n++
    const gx = g[i + 1] - g[i - 1], gy = g[i + W] - g[i - W]
    gradSum += Math.sqrt(gx * gx + gy * gy)
    // 8px ブロック境界の段差 vs 内部の段差（ブロックノイズの目安）
    const d = Math.abs(g[i] - g[i - 1])
    if (x % 8 === 0) { blockDiff += d; blockN++ } else { innerDiff += d; innerN++ }
  }
  const lapVar = n ? lapSq / n - (lapSum / n) ** 2 : 0
  return {
    w: W, h: H, bbox: { x: x0, y: y0, w: bw, h: bh }, mainBbox: main, bodyFill: +((bw * bh) / (W * H)).toFixed(3), style,
    opaquePx: opaque, semiPx: semi, edgeBand: +(semi / Math.max(1, perim)).toFixed(2), perimeterPx: perim,
    colors: colors.size, lapVar: +lapVar.toFixed(1), meanGrad: +(gradSum / Math.max(1, n)).toFixed(2),
    blockiness: +((blockDiff / Math.max(1, blockN)) / Math.max(1e-6, innerDiff / Math.max(1, innerN))).toFixed(3),
  }
}

/** 同一サイズの 2 画像（RGBA raw）の PSNR と簡易 SSIM（グレースケール、alpha>8 の画素のみ） */
export async function compare(pathA, pathB, size) {
  const load = async (p) => { let s = sharp(p).ensureAlpha(); if (size) s = s.resize(size.w, size.h, { fit: 'fill', kernel: 'lanczos3' }); return s.raw().toBuffer({ resolveWithObject: true }) }
  const A = await load(pathA), B = await load(pathB)
  if (A.info.width !== B.info.width || A.info.height !== B.info.height) throw new Error('size mismatch ' + pathA + ' ' + pathB)
  const N = A.info.width * A.info.height
  let se = 0, cnt = 0, ga = [], gb = []
  for (let i = 0; i < N; i++) {
    const aa = A.data[i * 4 + 3], ab = B.data[i * 4 + 3]
    if (aa <= 8 && ab <= 8) continue
    for (let c = 0; c < 4; c++) { const d = A.data[i * 4 + c] - B.data[i * 4 + c]; se += d * d }
    cnt += 4
    ga.push((0.299 * A.data[i * 4] + 0.587 * A.data[i * 4 + 1] + 0.114 * A.data[i * 4 + 2]) * aa / 255)
    gb.push((0.299 * B.data[i * 4] + 0.587 * B.data[i * 4 + 1] + 0.114 * B.data[i * 4 + 2]) * ab / 255)
  }
  const mse = se / Math.max(1, cnt)
  const psnr = mse === 0 ? Infinity : 10 * Math.log10(255 * 255 / mse)
  const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length
  const ma = mean(ga), mb = mean(gb)
  let va = 0, vb = 0, cov = 0
  for (let i = 0; i < ga.length; i++) { va += (ga[i] - ma) ** 2; vb += (gb[i] - mb) ** 2; cov += (ga[i] - ma) * (gb[i] - mb) }
  va /= ga.length; vb /= gb.length; cov /= ga.length
  const c1 = (0.01 * 255) ** 2, c2 = (0.03 * 255) ** 2
  const ssim = ((2 * ma * mb + c1) * (2 * cov + c2)) / ((ma * ma + mb * mb + c1) * (va + vb + c2))
  return { psnr: +psnr.toFixed(2), ssim: +ssim.toFixed(4), px: ga.length }
}

if (process.argv[1] && process.argv[1].endsWith('metrics.mjs')) {
  const out = { enemies: {}, gods: {} }
  for (const [e, p] of Object.entries(PROD)) {
    const m = await analyze(p)
    const row = { file: p.replace('public', ''), bytes: (await sharp(p).toBuffer()).length, ...m }
    const src = SOURCES[e]
    if (src && existsSync(src)) {
      const sm = await analyze(src)
      row.source = { file: src, w: sm.w, h: sm.h, colors: sm.colors, lapVar: sm.lapVar, meanGrad: sm.meanGrad, edgeBand: sm.edgeBand }
      // 同一寸法なら直接、違えば「本体 bbox 同士」を揃えて比較（production は bbox 抽出→再配置されているため）
      if (sm.w === m.w && sm.h === m.h) row.vsSource = await compare(src, p, null)
      else {
        const tmpS = outJson + '.src-bbox.png', tmpP = outJson + '.prod-bbox.png'
        // 位置合わせは「全体 bbox 同士」と「最大連結成分 bbox 同士」の両方を試し、PSNR の高い方を採る
        let best = null
        for (const [sb, pb, tag] of [[sm.bbox, m.bbox, 'bbox'], [sm.mainBbox ?? sm.bbox, m.mainBbox ?? m.bbox, 'mainBbox']]) {
          await sharp(src).extract({ left: sb.x, top: sb.y, width: sb.w, height: sb.h }).resize(pb.w, pb.h, { fit: 'fill', kernel: 'lanczos3' }).png().toFile(tmpS)
          await sharp(p).extract({ left: pb.x, top: pb.y, width: pb.w, height: pb.h }).png().toFile(tmpP)
          const c = await compare(tmpS, tmpP, null)
          if (!best || c.psnr > best.psnr) best = { ...c, align: tag }
        }
        row.vsSource = best
        row.vsSource.note = 'source 本体 → production 本体寸法に Lanczos 縮小して比較（縮小＋圧縮＋加工の合計差）'
      }
      row.sourceSharpnessRatio = +(m.lapVar / Math.max(1, sm.lapVar)).toFixed(3)
    }
    out.enemies[e] = row
    console.log(e.padEnd(9), `${m.w}x${m.h} body ${m.bbox.w}x${m.bbox.h} fill ${m.bodyFill} colors ${m.colors} lapVar ${m.lapVar} grad ${m.meanGrad} edgeBand ${m.edgeBand} block ${m.blockiness}` + (row.vsSource ? ` | vs source PSNR ${row.vsSource.psnr} SSIM ${row.vsSource.ssim} sharp×${row.sourceSharpnessRatio}` : ''))
  }
  for (const g of GODS) {
    const p = `public/assets/gods/${g}/front_640.webp`
    if (!existsSync(p)) continue
    const m = await analyze(p)
    out.gods[g] = { file: p.replace('public', ''), bytes: (await sharp(p).toBuffer()).length, ...m }
    console.log('god ' + g.padEnd(8), `${m.w}x${m.h} body ${m.bbox.w}x${m.bbox.h} colors ${m.colors} lapVar ${m.lapVar} grad ${m.meanGrad} edgeBand ${m.edgeBand} block ${m.blockiness}`)
  }
  writeFileSync(outJson, JSON.stringify(out, null, 2))
  console.log('written', outJson)
}

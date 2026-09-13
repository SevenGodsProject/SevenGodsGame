// Enemy Batch B-1（juuma）：弱点 A〜F を数値で裏取りする（SPEC 用）。
//   node scripts/enemy-batch-b1-juuma/weakness.mjs <outJson>
//
// A 低解像度      … native 本体高さと Production 本体高さの比（拡大率）
// B ドット調/jagged … シルエット境界の方向反転回数（階段状の度合い）
// C 白フチ        … 半透明の縁が隣の不透明画素より明るい割合
// D 細部潰れ      … source を Production 寸法へクリーン縮小したものとの輪郭エネルギー比
// E 陰影不足      … 明度ヒストグラム（影/中間/ハイライト）と局所コントラスト
// F 質感不足      … 本体内の局所 SD 分布
// すべて世代 B の 3 体を基準として並べる。
import { writeFileSync } from 'node:fs'
import sharp from 'sharp'
sharp.cache(false)
import { analyze } from '../enemy-visual-audit/metrics.mjs'

const outJson = process.argv[2] ?? 'juuma-weakness.json'
const SET = {
  juuma: { prod: 'public/assets/enemies/juuma/art_hq.webp', src: 'public/assets/enemies/juuma/art.png', gen: 'A' },
  oni: { prod: 'public/assets/enemies/oni/art_hq.webp', src: 'public/assets/enemies/oni/art.png', gen: 'A' },
  onryo: { prod: 'public/assets/enemies/onryo/art_hq.webp', src: 'public/assets/enemies/onryo/art.png', gen: 'A' },
  ryujin: { prod: 'public/assets/enemies/ryujin/art_hq.webp', src: 'public/assets/enemies/ryujin/art.png', gen: 'A' },
  datenshi: { prod: 'public/assets/enemies/datenshi/art.webp', src: null, gen: 'B' },
  karakuri: { prod: 'public/assets/enemies/karakuri/art.webp', src: null, gen: 'B' },
  doukeshi: { prod: 'public/assets/enemies/doukeshi/art.webp', src: null, gen: 'B' },
}

/** C：白フチ／黒フチ。半透明の縁と、隣接する不透明画素の輝度差 */
async function fringe(path) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height
  const lum = (i) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  let n = 0, sum = 0, white = 0, black = 0
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = (y * W + x) * 4, a = data[i + 3]
    if (a < 40 || a > 215) continue
    let best = -1
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const j = ((y + dy) * W + (x + dx)) * 4
      if (data[j + 3] >= 250) { best = j; break }
    }
    if (best < 0) continue
    const d = lum(i) - lum(best); sum += d; n++
    if (d > 40) white++; else if (d < -40) black++
  }
  return { samples: n, meanDelta: +(sum / Math.max(1, n)).toFixed(2), whitePct: +(100 * white / Math.max(1, n)).toFixed(1), blackPct: +(100 * black / Math.max(1, n)).toFixed(1) }
}

/**
 * B：シルエットの階段状（jagged）度合い。
 * 各行で本体の左端 x を追い、行ごとの差分の符号が反転する回数を数える。
 * 滑らかな輪郭なら反転は少なく、ドット調・ジャギーだと増える。
 */
async function jaggedness(path) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height
  const leftEdge = []
  for (let y = 0; y < H; y++) {
    let x = 0
    while (x < W && data[(y * W + x) * 4 + 3] <= 8) x++
    leftEdge.push(x < W ? x : null)
  }
  const seq = leftEdge.filter((v) => v !== null)
  let rev = 0, prevDir = 0, steps = 0
  for (let i = 1; i < seq.length; i++) {
    const d = seq[i] - seq[i - 1]
    if (d === 0) continue
    steps++
    const dir = Math.sign(d)
    if (prevDir !== 0 && dir !== prevDir) rev++
    prevDir = dir
  }
  return { rows: seq.length, steps, reversals: rev, reversalsPer100Rows: +(100 * rev / Math.max(1, seq.length)).toFixed(1) }
}

const out = {}
for (const [name, cfg] of Object.entries(SET)) {
  const p = await analyze(cfg.prod)
  const pb = p.mainBbox ?? p.bbox
  const row = { gen: cfg.gen, prod: cfg.prod, prodBody: `${pb.w}x${pb.h}`, canvas: `${p.w}x${p.h}` }
  if (cfg.src) {
    const s = await analyze(cfg.src)
    const sb = s.mainBbox ?? s.bbox
    row.sourceBody = `${sb.w}x${sb.h}`
    row.A_upscaleFactor = +(pb.h / sb.h).toFixed(3)
    // D：source をクリーンに Production 本体寸法へ落としたものとの輪郭エネルギー比
    const tmp = outJson + `.clean-${name}.png`
    await sharp(cfg.src).extract({ left: sb.x, top: sb.y, width: sb.w, height: sb.h })
      .resize(pb.w, pb.h, { fit: 'fill', kernel: 'mitchell' }).png().toFile(tmp)
    const clean = await analyze(tmp)
    const tmp2 = outJson + `.prod-${name}.png`
    await sharp(cfg.prod).extract({ left: pb.x, top: pb.y, width: pb.w, height: pb.h }).png().toFile(tmp2)
    const prodBody = await analyze(tmp2)
    row.D_edgeEnergyVsCleanDownscale = +(prodBody.lapVar / Math.max(1, clean.lapVar)).toFixed(3)
  } else {
    row.sourceBody = '（高解像度 source あり：Batch A で 768px 化済み）'
    row.A_upscaleFactor = null
  }
  row.B_jagged = await jaggedness(cfg.prod)
  row.C_fringe = await fringe(cfg.prod)
  row.E_tone = { contrast: p.style.contrast, meanLum: p.style.meanLum }
  row.F_edgeBandPx = p.edgeBand
  row.colors = p.colors
  out[name] = row
  console.log(`${name.padEnd(9)} gen${row.gen} body ${row.prodBody.padEnd(8)} src ${String(row.sourceBody).padEnd(8)} | A 拡大 ${row.A_upscaleFactor ?? '-'} | B 反転/100行 ${row.B_jagged.reversalsPer100Rows} | C 白フチ ${row.C_fringe.whitePct}% (Δ${row.C_fringe.meanDelta}) | D 輪郭比 ${row.D_edgeEnergyVsCleanDownscale ?? '-'} | E contrast ${row.E_tone.contrast} | F 縁 ${row.F_edgeBandPx}px | colors ${row.colors}`)
}
writeFileSync(outJson, JSON.stringify(out, null, 2))
console.log('written', outJson)

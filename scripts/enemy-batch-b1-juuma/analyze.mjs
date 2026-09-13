// Enemy Batch B-1（juuma）：現行 asset の視覚分析（SPEC 用・ゲームコードには触れない）。
//   node scripts/enemy-batch-b1-juuma/analyze.mjs <outJson> [--sheet <path>]
//
// 現行 Production asset・その source（art.png）・元シート（あれば）を同じ物差しで測る。
// 出力：canvas / bbox / 各比率 / 頭身 / 主要色 / 輪郭 / 陰影 / ハイライト / 質感 / alpha 縁。
// 比較のため世代 B の 3 体（datenshi・karakuri・doukeshi）にも同じ計測を当てる。
import { writeFileSync, existsSync } from 'node:fs'
import sharp from 'sharp'
sharp.cache(false)
import { analyze } from '../enemy-visual-audit/metrics.mjs'

const outJson = process.argv[2] ?? 'juuma-analysis.json'
const sheet = process.argv.includes('--sheet') ? process.argv[process.argv.indexOf('--sheet') + 1] : null

const TARGETS = {
  'juuma (production)': 'public/assets/enemies/juuma/art_hq.webp',
  'juuma (old webp)': 'public/assets/enemies/juuma/art.webp',
  'juuma (source png)': 'public/assets/enemies/juuma/art.png',
  'datenshi (gen B)': 'public/assets/enemies/datenshi/art.webp',
  'karakuri (gen B)': 'public/assets/enemies/karakuri/art.webp',
  'doukeshi (gen B)': 'public/assets/enemies/doukeshi/art.webp',
  'oni (gen A)': 'public/assets/enemies/oni/art_hq.webp',
  'ryujin (gen A)': 'public/assets/enemies/ryujin/art_hq.webp',
  'onryo (gen A)': 'public/assets/enemies/onryo/art_hq.webp',
}

/** 不透明画素の主要色（32 段階に量子化して上位を返す） */
async function dominantColors(path, topN = 8) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const bins = new Map()
  let opaque = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 250) continue
    opaque++
    const key = ((data[i] >> 5) << 10) | ((data[i + 1] >> 5) << 5) | (data[i + 2] >> 5)
    const b = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
    b.n++; b.r += data[i]; b.g += data[i + 1]; b.b += data[i + 2]
    bins.set(key, b)
  }
  return [...bins.values()].sort((a, b) => b.n - a.n).slice(0, topN).map((b) => ({
    hex: '#' + [b.r / b.n, b.g / b.n, b.b / b.n].map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''),
    pct: +(100 * b.n / opaque).toFixed(1),
  }))
}

/** 明度ヒストグラムから陰影・ハイライトの持ち方を見る */
async function toneProfile(path) {
  const { data } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const hist = new Array(16).fill(0)
  let n = 0, lumSum = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 250) continue
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    hist[Math.min(15, Math.floor(l / 16))]++; n++; lumSum += l
  }
  const pct = hist.map((v) => +(100 * v / n).toFixed(1))
  return {
    histogram16: pct,
    shadowPct: +(pct.slice(0, 4).reduce((a, b) => a + b, 0)).toFixed(1),   // 0–63
    midPct: +(pct.slice(4, 12).reduce((a, b) => a + b, 0)).toFixed(1),     // 64–191
    highlightPct: +(pct.slice(12).reduce((a, b) => a + b, 0)).toFixed(1),  // 192–255
    meanLum: +(lumSum / n).toFixed(1),
  }
}

/** 質感：局所分散の分布。細かい粒（ドット調）と滑らかな塗り（painterly）を区別する */
async function textureProfile(path) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height
  const lum = (i) => 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
  const vars = []
  for (let y = 2; y < H - 2; y += 2) for (let x = 2; x < W - 2; x += 2) {
    let s = 0, s2 = 0, k = 0, allOpaque = true
    for (let dy = -1; dy <= 1 && allOpaque; dy++) for (let dx = -1; dx <= 1; dx++) {
      const idx = (y + dy) * W + (x + dx)
      if (data[idx * 4 + 3] < 250) { allOpaque = false; break }
      const v = lum(idx)
      s += v; s2 += v * v; k++
    }
    if (!allOpaque) continue
    const varr = s2 / k - (s / k) ** 2
    vars.push(varr)
  }
  vars.sort((a, b) => a - b)
  const q = (p) => +Math.sqrt(vars[Math.floor(vars.length * p)] ?? 0).toFixed(1)
  return { localSdMedian: q(0.5), localSdP90: q(0.9), localSdP99: q(0.99), samples: vars.length }
}

const out = {}
for (const [label, path] of Object.entries(TARGETS)) {
  if (!existsSync(path)) continue
  const m = await analyze(path)
  const bb = m.mainBbox ?? m.bbox
  out[label] = {
    file: path,
    canvas: `${m.w}x${m.h}`,
    bboxAll: `${m.bbox.w}x${m.bbox.h}@(${m.bbox.x},${m.bbox.y})`,
    bodyMain: `${bb.w}x${bb.h}@(${bb.x},${bb.y})`,
    fragments: m.bbox.w !== bb.w || m.bbox.h !== bb.h,
    ratios: {
      bodyHeight: +(bb.h / m.h).toFixed(4),
      bodyWidth: +(bb.w / m.w).toFixed(4),
      centerX: +((bb.x + bb.w / 2) / m.w).toFixed(4),
      centerY: +((bb.y + bb.h / 2) / m.h).toFixed(4),
      bottom: +((bb.y + bb.h) / m.h).toFixed(4),
      aspect: +(bb.w / bb.h).toFixed(4),
    },
    colorsUnique: m.colors,
    edge: { bandPx: m.edgeBand, semiPx: m.semiPx, perimeterPx: m.perimeterPx },
    sharpness: { lapVar: m.lapVar, meanGrad: m.meanGrad, blockiness: m.blockiness },
    style: m.style,
    tone: await toneProfile(path),
    texture: await textureProfile(path),
    dominantColors: await dominantColors(path),
  }
  const o = out[label]
  console.log(`${label.padEnd(20)} ${o.canvas} body ${o.bodyMain.padEnd(16)} hRatio ${o.ratios.bodyHeight} aspect ${o.ratios.aspect} | colors ${o.colorsUnique} lapVar ${o.sharpness.lapVar} grad ${o.sharpness.meanGrad} | edge ${o.edge.bandPx}px | shadow ${o.tone.shadowPct}% mid ${o.tone.midPct}% high ${o.tone.highlightPct}% | localSd p50 ${o.texture.localSdMedian} p90 ${o.texture.localSdP90}`)
}

if (sheet && existsSync(sheet)) {
  const m = await sharp(sheet).metadata()
  out['_sheet'] = { file: sheet, size: `${m.width}x${m.height}`, note: '決定32 の 7 体シート。juuma はこの中の 1 体で、単体の高解像度原画は存在しない' }
  console.log(`sheet ${sheet} ${m.width}x${m.height}`)
}
writeFileSync(outJson, JSON.stringify(out, null, 2))
console.log('written', outJson)

// juuma Identity-Preserving Restoration Pilot / Step 1：source の情報量を突き合わせる。
//   node scripts/juuma-restoration/source-audit.mjs <outJson> --sheet <7体シート.png>
//
// 比較するのは 3 つ：
//   ① 元シートのセル（白背景・アルファ無し＝キー抜き前の生の画素）
//   ② repo の art.png（①から白を抜いてアルファを付けたもの）
//   ③ Production の art_hq.webp（②を 1.203 倍に拡大して WebP 化したもの）
// 調べること：
//   - ② の alpha が「輪郭の帯」だけに出ているか、それとも本体内部（牙・毛皮・髑髏などの白い部分）
//     まで半透明にしてしまっているか＝ alpha contamination
//   - ② の RGB が ① と一致するか（＝ ② は「白と合成済みの色」をそのまま持っているか）
//   - 白フチが「白背景との合成が残っている」ことで説明できるか
import { writeFileSync } from 'node:fs'
import sharp from 'sharp'
sharp.cache(false)

const outJson = process.argv[2] ?? 'juuma-source-audit.json'
const sheet = process.argv[process.argv.indexOf('--sheet') + 1]
const CELL = { left: 3 * 384, top: 0, width: 384, height: 512 } // 相関 1.0000 で確定済み

const raw = async (p, extract) => {
  let s = sharp(p).ensureAlpha()
  if (extract) s = sharp(p).extract(extract).ensureAlpha()
  const { data, info } = await s.raw().toBuffer({ resolveWithObject: true })
  return { d: data, w: info.width, h: info.height }
}

const cell = await raw(sheet, CELL)
const cut = await raw('public/assets/enemies/juuma/art.png')
const prod = await raw('public/assets/enemies/juuma/art_hq.webp')

// --- ① alpha の分布と、半透明画素が輪郭にあるのか内部にあるのか ---
const W = cut.w, H = cut.h
const A = (i) => cut.d[i * 4 + 3]
const alphaHist = new Array(17).fill(0)
for (let i = 0; i < W * H; i++) alphaHist[Math.min(16, Math.floor(A(i) / 16))]++
// 「本体の内側」判定：不透明画素だけで距離変換（近似：4 近傍を 6 回膨張させた内側）
const opaque = new Uint8Array(W * H)
for (let i = 0; i < W * H; i++) opaque[i] = A(i) >= 250 ? 1 : 0
let inner = Uint8Array.from(opaque)
for (let pass = 0; pass < 4; pass++) {
  const next = Uint8Array.from(inner)
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x
    if (!inner[i]) continue
    if (!inner[i - 1] || !inner[i + 1] || !inner[i - W] || !inner[i + W]) next[i] = 0
  }
  inner = next
}
// 半透明（8 < a < 250）が「内側から 4px 以上入った場所」に出ていれば alpha contamination
let semiTotal = 0, semiInside = 0
const insideSamples = []
for (let y = 5; y < H - 5; y++) for (let x = 5; x < W - 5; x++) {
  const i = y * W + x
  const a = A(i)
  if (a <= 8 || a >= 250) continue
  semiTotal++
  // 4px 内側に不透明が全周ある＝内部
  let surrounded = true
  for (const [dx, dy] of [[4, 0], [-4, 0], [0, 4], [0, -4]]) {
    if (!opaque[(y + dy) * W + (x + dx)]) { surrounded = false; break }
  }
  if (surrounded) { semiInside++; if (insideSamples.length < 12) insideSamples.push({ x, y, a, rgb: [cut.d[i * 4], cut.d[i * 4 + 1], cut.d[i * 4 + 2]] }) }
}

// --- ② art.png の RGB は シートセル（白背景）と一致するか ---
let same = 0, diff = 0, maxDiff = 0, cmpN = 0
let semiSame = 0, semiN = 0
for (let i = 0; i < W * H; i++) {
  const a = A(i)
  if (a <= 8) continue
  const d = Math.max(Math.abs(cut.d[i * 4] - cell.d[i * 4]), Math.abs(cut.d[i * 4 + 1] - cell.d[i * 4 + 1]), Math.abs(cut.d[i * 4 + 2] - cell.d[i * 4 + 2]))
  cmpN++
  if (d <= 2) same++; else { diff++; if (d > maxDiff) maxDiff = d }
  if (a < 250) { semiN++; if (d <= 2) semiSame++ }
}

// --- ③ 白フチは「白背景との合成が残っている」ことで説明できるか ---
// 半透明画素について、観測色 C と「白と合成した色 α·F+(1-α)·255」を比べる。
// F の推定に隣接する不透明画素を使う。誤差が小さいほど「白マット残留」で説明できる。
let matteErr = 0, matteN = 0, naiveErr = 0
for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
  const i = y * W + x
  const a = A(i)
  if (a <= 20 || a >= 250) continue
  let j = -1
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
    const k = (y + dy) * W + (x + dx)
    if (A(k) >= 250) { j = k; break }
  }
  if (j < 0) continue
  const al = a / 255
  for (let c = 0; c < 3; c++) {
    const pred = al * cut.d[j * 4 + c] + (1 - al) * 255
    matteErr += Math.abs(cut.d[i * 4 + c] - pred)
    naiveErr += Math.abs(cut.d[i * 4 + c] - cut.d[j * 4 + c]) // 白合成を考えない場合
  }
  matteN += 3
}

const out = {
  candidates: {
    'sheet cell (白背景・アルファ無し)': { size: `${cell.w}x${cell.h}`, hasAlpha: false, note: 'キー抜き前の生の画素。アルファは無いが色は未加工' },
    'art.png (切り出し)': { size: `${cut.w}x${cut.h}`, hasAlpha: true, note: '①から白を抜いたもの。色は白と合成済みのまま' },
    'art_hq.webp (Production)': { size: `${prod.w}x${prod.h}`, note: '②を 1.203 倍に拡大して WebP 化' },
  },
  alphaHistogram16: alphaHist,
  alphaContamination: {
    semiTransparentPx: semiTotal,
    insideBodyPx: semiInside,
    insidePct: +(100 * semiInside / Math.max(1, semiTotal)).toFixed(2),
    samples: insideSamples,
    verdict: semiInside / Math.max(1, semiTotal) > 0.1 ? '内部にも半透明が出ている＝白い部分が誤って抜かれている疑い' : '半透明はほぼ輪郭だけ＝内部の白は守られている',
  },
  rgbVsSheet: { comparedPx: cmpN, identicalPct: +(100 * same / cmpN).toFixed(2), maxDiff, semiPx: semiN, semiIdenticalPct: +(100 * semiSame / Math.max(1, semiN)).toFixed(2) },
  whiteMatteModel: {
    meanAbsErrorWithWhiteMatte: +(matteErr / Math.max(1, matteN)).toFixed(2),
    meanAbsErrorIgnoringMatte: +(naiveErr / Math.max(1, matteN)).toFixed(2),
    verdict: matteErr < naiveErr * 0.7 ? '白フチは「白背景との合成が残っている」で説明できる → un-matting で復元可能' : '白合成モデルでは説明しきれない',
  },
}
writeFileSync(outJson, JSON.stringify(out, null, 2))
console.log('alpha ヒストグラム(16分割):', alphaHist.join(','))
console.log('半透明画素', semiTotal, 'うち本体内部', semiInside, `(${out.alphaContamination.insidePct}%) →`, out.alphaContamination.verdict)
console.log('art.png の RGB が シートセルと一致:', out.rgbVsSheet.identicalPct + '%', '(半透明部だけでは', out.rgbVsSheet.semiIdenticalPct + '%)', 'max差', maxDiff)
console.log('白マット模型の残差:', out.whiteMatteModel.meanAbsErrorWithWhiteMatte, 'vs 白合成を無視した場合', out.whiteMatteModel.meanAbsErrorIgnoringMatte, '→', out.whiteMatteModel.verdict)
console.log('written', outJson)

// juuma Identity-Preserving Restoration Pilot / Step 2–4：非生成の修復パイプライン。
//   node scripts/juuma-restoration/restore.mjs <outDir>
//
// 元の画素から説明できる処理だけを行う。描き足し・生成・装飾追加は一切しない。
//
//  Step 2  白マット除去（alpha-aware edge decontamination）
//          白背景で合成された観測色 C = α·F + (1−α)·255 を F について解き直す。
//          α=1 の画素では (1−α)=0 なので **何も変わらない**＝牙・毛皮・髑髏の白は絶対に触れない。
//  Step 3  輪郭の作り直し（方式を複数用意して比較する）
//  Step 4  拡大（native 359px の本体を 512 / 768 / 1024 キャンバスへ）
//
// 構図は現行 juuma の実測比をそのまま使う：body height 0.8438 / center X 0.5059 / bottom 0.9238。
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
sharp.cache(false)

const outDir = process.argv[2] ?? 'juuma-restore'
mkdirSync(outDir, { recursive: true })
const SRC = 'public/assets/enemies/juuma/art.png'
const PROD = 'public/assets/enemies/juuma/art_hq.webp'
// 現行 Production の構図（512 キャンバス・本体 428×432@(45,41) の実測から）
const COMP = { bodyHeight: 432 / 512, centerX: (45 + 428 / 2) / 512, bottom: (41 + 432) / 512 }

async function readRGBA(p) {
  const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { d: Float32Array.from(data), w: info.width, h: info.height }
}
/**
 * 本体＝最大連結成分の bbox。juuma の source には左端に本体と繋がっていない破片があり、
 * Production もそれを含めずに書き出している（enemies.ts の STEP-VISUAL-ASSETS の記述どおり）。
 * 同じ構図にするため、ここでも破片は数えない。`removeFragments` を付けると実際に消す。
 */
function bboxOf(img, thr = 8, removeFragments = false) {
  const W = img.w, H = img.h
  const seen = new Uint8Array(W * H)
  let main = null
  const comps = []
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = y * W + x
    if (seen[s] || img.d[s * 4 + 3] <= thr) continue
    const stack = [s]; seen[s] = 1
    let cnt = 0, cx0 = W, cy0 = H, cx1 = 0, cy1 = 0
    const px = []
    while (stack.length) {
      const i = stack.pop(); cnt++; px.push(i)
      const x2 = i % W, y2 = (i - x2) / W
      if (x2 < cx0) cx0 = x2; if (x2 > cx1) cx1 = x2; if (y2 < cy0) cy0 = y2; if (y2 > cy1) cy1 = y2
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x2 + dx, ny = y2 + dy
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
        const ni = ny * W + nx
        if (!seen[ni] && img.d[ni * 4 + 3] > thr) { seen[ni] = 1; stack.push(ni) }
      }
    }
    const c = { count: cnt, x: cx0, y: cy0, w: cx1 - cx0 + 1, h: cy1 - cy0 + 1, px }
    comps.push(c)
    if (!main || cnt > main.count) main = c
  }
  if (removeFragments) {
    for (const c of comps) if (c !== main) for (const i of c.px) img.d[i * 4 + 3] = 0
  }
  return { x: main.x, y: main.y, w: main.w, h: main.h, count: main.count, components: comps.length }
}
const toBuf = (img) => Buffer.from(Uint8ClampedArray.from(img.d))

/**
 * Step 2：白マット除去。
 * alphaFloor 未満のごく薄い画素は除算でノイズが暴れるため、近傍の不透明画素の色へ寄せる
 * （色の由来は元画像のまま。新しい色は作らない）。
 */
function unmatte(img, { alphaFloor = 0.15, bg = 255 } = {}) {
  const out = { d: Float32Array.from(img.d), w: img.w, h: img.h }
  const W = img.w, H = img.h
  const nearestOpaque = (x, y) => {
    for (let r = 1; r <= 3; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue
        const xx = x + dx, yy = y + dy
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue
        const j = yy * W + xx
        if (img.d[j * 4 + 3] >= 250) return j
      }
    }
    return -1
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x
    const a = img.d[i * 4 + 3] / 255
    if (a <= 0 || a >= 1) continue // 完全透明と完全不透明は触らない
    if (a >= alphaFloor) {
      for (let c = 0; c < 3; c++) out.d[i * 4 + c] = Math.max(0, Math.min(255, (img.d[i * 4 + c] - (1 - a) * bg) / a))
    } else {
      const j = nearestOpaque(x, y)
      if (j >= 0) for (let c = 0; c < 3; c++) out.d[i * 4 + c] = img.d[j * 4 + c]
      else for (let c = 0; c < 3; c++) out.d[i * 4 + c] = Math.max(0, Math.min(255, (img.d[i * 4 + c] - (1 - a) * bg) / Math.max(a, 0.06)))
    }
  }
  return out
}

/**
 * Step 2-b：既知背景マッティング（alpha の推定し直し）。
 *
 * 白フチが残る理由は「α は与えられているのに、色が白と合成されたまま」だけでなく、
 * **与えられた α 自体が実際の被覆率と合っていない**ことにある（実測：半透明画素の平均輝度 240.8 /
 * 平均 α 122 で、白マット模型の残差が 34.9 も残る）。
 *
 * そこで境界付近の画素について、
 *   ① 内側の不透明画素から本来の色 F を推定し、
 *   ② 背景が白（B=255）と分かっているので C = α·F + (1−α)·B を α について最小二乗で解き、
 *   ③ その画素を (F, α) に置き換える。
 * 新しい色は作らず、**その場所の内側にある色をそのまま使う**。生成でも描き足しでもない。
 */
function knownBackgroundMatting(img, { bg = 255, radius = 3, innerMin = 2, innerMax = 4, den: denMin = 400 } = {}) {
  const W = img.w, H = img.h
  const out = { d: Float32Array.from(img.d), w: W, h: H }
  const a0 = (i) => img.d[i * 4 + 3]
  // 境界からの距離（透明までの最短距離）を粗く求める
  const nearBoundary = new Uint8Array(W * H)
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x
    if (a0(i) <= 8) continue
    let near = false
    for (let r = 1; r <= radius && !near; r++) {
      for (let dy = -r; dy <= r && !near; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue
        const xx = x + dx, yy = y + dy
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) { near = true; break }
        if (a0(yy * W + xx) <= 8) { near = true; break }
      }
    }
    if (near) nearBoundary[i] = 1
  }
  const med = (arr) => { arr.sort((p, q) => p - q); return arr[arr.length >> 1] }
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x
    if (!nearBoundary[i]) continue
    // 内側 innerMin〜innerMax px の不透明画素を集めて F を推定（中央値なのでノイズに強い）
    const R = [], G = [], B2 = []
    for (let dy = -innerMax; dy <= innerMax; dy++) for (let dx = -innerMax; dx <= innerMax; dx++) {
      const d2 = Math.max(Math.abs(dx), Math.abs(dy))
      if (d2 < innerMin || d2 > innerMax) continue
      const xx = x + dx, yy = y + dy
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue
      const j = yy * W + xx
      if (a0(j) < 250 || nearBoundary[j]) continue // 汚染されていない内側だけを使う
      R.push(img.d[j * 4]); G.push(img.d[j * 4 + 1]); B2.push(img.d[j * 4 + 2])
    }
    if (R.length < 4) continue // 推定できないので触らない
    const F = [med(R), med(G), med(B2)]
    const dF = [F[0] - bg, F[1] - bg, F[2] - bg]
    const den = dF[0] * dF[0] + dF[1] * dF[1] + dF[2] * dF[2]
    if (den < denMin) continue // F が白に近い（毛皮・牙・爪）＝白マットと区別できないので触らない
    const dC = [img.d[i * 4] - bg, img.d[i * 4 + 1] - bg, img.d[i * 4 + 2] - bg]
    let alpha = (dC[0] * dF[0] + dC[1] * dF[1] + dC[2] * dF[2]) / den
    alpha = Math.max(0, Math.min(1, alpha))
    // 元が完全不透明だった画素は、被覆率を下げすぎない（シルエットを痩せさせない）
    if (a0(i) >= 250) alpha = Math.max(alpha, 0.85)
    out.d[i * 4] = F[0]; out.d[i * 4 + 1] = F[1]; out.d[i * 4 + 2] = F[2]
    out.d[i * 4 + 3] = alpha * 255
  }
  return out
}

/**
 * Step 3-b：アルファの階段を均す（シルエットは動かさない）。
 * α に 3×3 の軽い平滑化をかけ、**元の α からの差を ±maxShift に制限**する。
 * さらに α≥250 の画素は不透明のまま固定し、本体が痩せないようにする。
 */
function smoothAlpha(img, { maxShift = 40 } = {}) {
  const out = { d: Float32Array.from(img.d), w: img.w, h: img.h }
  const W = img.w, H = img.h
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x
    const a0 = img.d[i * 4 + 3]
    if (a0 >= 250) continue // 不透明は固定（シルエットを痩せさせない）
    let s = 0
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += img.d[((y + dy) * W + (x + dx)) * 4 + 3]
    const avg = s / 9
    out.d[i * 4 + 3] = Math.max(a0 - maxShift, Math.min(a0 + maxShift, avg))
  }
  return out
}

/** 透明部分の色を近傍の不透明色で埋める（拡大時に色がにじみ出さないようにする保険） */
function solidify(img) {
  const out = { d: Float32Array.from(img.d), w: img.w, h: img.h }
  const W = img.w, H = img.h
  for (let pass = 0; pass < 4; pass++) {
    const src = Float32Array.from(out.d)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x
      if (src[i * 4 + 3] > 8) continue
      let r = 0, g = 0, b = 0, n = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue
        const j = yy * W + xx
        if (src[j * 4 + 3] <= 8) continue
        r += src[j * 4]; g += src[j * 4 + 1]; b += src[j * 4 + 2]; n++
      }
      if (n) { out.d[i * 4] = r / n; out.d[i * 4 + 1] = g / n; out.d[i * 4 + 2] = b / n }
    }
  }
  return out
}

/** 本体を bbox で切り出して指定サイズへ拡大し、構図比どおりにキャンバスへ置く */
async function composeTo(img, { canvas, kernel, twoStep }) {
  const bb = bboxOf(img, 8, true) // 破片を消して本体だけにする
  const bodyH = Math.round(canvas * COMP.bodyHeight)
  const bodyW = Math.round(bb.w * bodyH / bb.h)
  const left = Math.round(canvas * COMP.centerX - bodyW / 2)
  const top = Math.round(canvas * COMP.bottom - bodyH)
  let pipe = sharp(toBuf(img), { raw: { width: img.w, height: img.h, channels: 4 } })
    .extract({ left: bb.x, top: bb.y, width: bb.w, height: bb.h })
  if (twoStep && bodyH > bb.h * 1.6) {
    // 2 段拡大：一気に伸ばすより輪郭の破綻が小さいか検証するための方式
    const midW = Math.round(bb.w * 2), midH = Math.round(bb.h * 2)
    const mid = await pipe.resize(midW, midH, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer()
    pipe = sharp(mid).resize(bodyW, bodyH, { fit: 'fill', kernel })
  } else {
    pipe = pipe.resize(bodyW, bodyH, { fit: 'fill', kernel })
  }
  const body = await pipe.png().toBuffer()
  return sharp({ create: { width: canvas, height: canvas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: body, left: Math.max(0, left), top: Math.max(0, top) }])
}

const src = await readRGBA(SRC)
const srcBB = bboxOf(src)
console.log(`source ${src.w}x${src.h} | 連結成分 ${srcBB.components} 個 | 本体 ${srcBB.w}x${srcBB.h}@(${srcBB.x},${srcBB.y}) ${srcBB.count}px`)

// Step 2 の単体確認用：native 解像度のまま白マットだけ除去したもの
const unm = unmatte(src)
await sharp(toBuf(unm), { raw: { width: unm.w, height: unm.h, channels: 4 } }).png().toFile(join(outDir, 'step2-unmatted-native.png'))
await sharp(toBuf(src), { raw: { width: src.w, height: src.h, channels: 4 } }).png().toFile(join(outDir, 'step2-original-native.png'))

// Step 3/4：方式 × キャンバスの組合せ
const METHODS = {
  M0_baseline: { unmatte: false, aa: false, kernel: 'lanczos3', twoStep: false, note: '現行と同じ流儀（白マット残す・lanczos 拡大）＝対照群' },
  M1_unmatte: { unmatte: true, aa: false, kernel: 'lanczos3', twoStep: false, note: '白マット除去のみ' },
  M2_unmatte_aa: { unmatte: true, aa: true, kernel: 'lanczos3', twoStep: false, note: '白マット除去＋アルファの階段を均す' },
  M3_unmatte_mitchell: { unmatte: true, aa: false, kernel: 'mitchell', twoStep: false, note: '白マット除去＋リンギングの出ない拡大' },
  M4_unmatte_2step: { unmatte: true, aa: false, kernel: 'lanczos3', twoStep: true, note: '白マット除去＋2 段拡大' },
  M5_kbm: { unmatte: true, kbm: true, aa: false, kernel: 'lanczos3', twoStep: false, note: '白マット除去＋既知背景マッティング（alpha 推定し直し）' },
  M6_kbm_2step: { unmatte: true, kbm: true, aa: false, kernel: 'lanczos3', twoStep: true, note: 'M5＋2 段拡大' },
  M7_kbm_wide: { unmatte: true, kbm: { radius: 5, innerMin: 6, innerMax: 9, den: 250 }, aa: false, kernel: 'lanczos3', twoStep: true, note: 'KBM の帯を 5px へ広げ、F をもっと内側（6〜9px）から採る' },
  M8_kbm_twice: { unmatte: true, kbm: { radius: 4, innerMin: 5, innerMax: 8, den: 250 }, kbm2: true, aa: false, kernel: 'lanczos3', twoStep: true, note: 'KBM を 2 回かける' },
}
const CANVASES = [512, 768, 1024]
const made = []
for (const [name, cfg] of Object.entries(METHODS)) {
  let img = cfg.unmatte ? unmatte(src) : { d: Float32Array.from(src.d), w: src.w, h: src.h }
  if (cfg.kbm) img = knownBackgroundMatting(img, typeof cfg.kbm === 'object' ? cfg.kbm : {})
  if (cfg.kbm2) img = knownBackgroundMatting(img, typeof cfg.kbm === 'object' ? cfg.kbm : {})
  if (cfg.aa) img = smoothAlpha(img)
  img = solidify(img)
  for (const canvas of CANVASES) {
    const pipe = await composeTo(img, { canvas, kernel: cfg.kernel, twoStep: cfg.twoStep })
    const file = join(outDir, `${name}-${canvas}.webp`)
    await pipe.webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(file)
    const png = join(outDir, `${name}-${canvas}.png`)
    const pipe2 = await composeTo(img, { canvas, kernel: cfg.kernel, twoStep: cfg.twoStep })
    await pipe2.png({ compressionLevel: 9 }).toFile(png)
    made.push({ method: name, canvas, webp: file, png, note: cfg.note })
  }
  console.log(`${name.padEnd(22)} ${cfg.note}`)
}
writeFileSync(join(outDir, 'restore.json'), JSON.stringify({ source: SRC, prod: PROD, composition: COMP, methods: METHODS, made }, null, 2))
console.log('written', join(outDir, 'restore.json'), `(${made.length} 候補)`)

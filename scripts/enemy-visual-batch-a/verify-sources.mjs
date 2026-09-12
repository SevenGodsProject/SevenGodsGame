// Enemy Visual Upgrade Batch A：source が本当にその敵の元絵かを再確認する（差し替え前の門番）。
//   node scripts/enemy-visual-batch-a/verify-sources.mjs <sourcesJson>
//
// ① 完全デコードできるか（破損検出）② 透過を持つか ③ 実寸と本体 bbox
// ④ 現行 Production asset との相関（48×48 輝度・128×128 勾配の2系統）
// ⑤ 本体アスペクト比の一致（構図ロックが成立するか）
// どれか1つでも閾値を割ったら exit 1（STOP）。画像の中身は出力しない。
import { readFileSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { PROD, analyze } from '../enemy-visual-audit/metrics.mjs'

const TARGETS = ['datenshi', 'karakuri', 'doukeshi']
const SOURCES = JSON.parse(readFileSync(process.argv[2] ?? 'enemy-sources.json', 'utf8'))
const MIN_LUM_CORR = 0.95
const MIN_GRAD_CORR = 0.80
const MAX_ASPECT_DIFF = 0.02

/** 本体 bbox を size×size に正規化した配列（mode: 'lum' | 'grad'） */
async function fingerprint(path, bbox, size, mode) {
  const g = await sharp(path).extract({ left: bbox.x, top: bbox.y, width: bbox.w, height: bbox.h })
    .flatten({ background: '#000000' }).resize(size, size, { fit: 'fill' }).greyscale().raw().toBuffer()
  let arr
  if (mode === 'grad') {
    arr = []
    for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) {
      const i = y * size + x
      arr.push(Math.abs(g[i + 1] - g[i - 1]) + Math.abs(g[i + size] - g[i - size]))
    }
  } else arr = [...g]
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length
  const sd = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length) || 1
  return arr.map((v) => (v - mean) / sd)
}
const corr = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0) / a.length

let fail = 0
const out = {}
for (const e of TARGETS) {
  const src = SOURCES[e]
  const prodPath = PROD[e]
  const problems = []
  let sm, meta
  try {
    meta = await sharp(src).metadata()
    // 全画素デコード（破損していればここで例外）
    await sharp(src).raw().toBuffer()
    sm = await analyze(src)
  } catch (err) {
    console.log(`FAIL ${e}: source decode error ${String(err).slice(0, 80)}`)
    fail++
    continue
  }
  const pm = await analyze(prodPath)
  const sb = sm.mainBbox ?? sm.bbox, pb = pm.mainBbox ?? pm.bbox
  const lum = corr(await fingerprint(src, sb, 48, 'lum'), await fingerprint(prodPath, pb, 48, 'lum'))
  const grad = corr(await fingerprint(src, sb, 128, 'grad'), await fingerprint(prodPath, pb, 128, 'grad'))
  const srcAspect = sb.w / sb.h, prodAspect = pb.w / pb.h
  const aspectDiff = Math.abs(srcAspect - prodAspect) / prodAspect

  if (!meta.hasAlpha) problems.push('no alpha channel')
  if (sm.bbox.h < 900) problems.push(`source body height ${sm.bbox.h} < 900`)
  if (lum < MIN_LUM_CORR) problems.push(`luminance corr ${lum.toFixed(3)} < ${MIN_LUM_CORR}`)
  if (grad < MIN_GRAD_CORR) problems.push(`gradient corr ${grad.toFixed(3)} < ${MIN_GRAD_CORR}`)
  if (aspectDiff > MAX_ASPECT_DIFF) problems.push(`body aspect diff ${(aspectDiff * 100).toFixed(2)}% > ${MAX_ASPECT_DIFF * 100}%`)

  const sha = createHash('sha256').update(readFileSync(src)).digest('hex').slice(0, 16)
  out[e] = {
    source: src, sha256_16: sha, bytes: statSync(src).size, dim: `${sm.w}x${sm.h}`, format: meta.format, hasAlpha: !!meta.hasAlpha,
    sourceBody: `${sb.w}x${sb.h}`, prodBody: `${pb.w}x${pb.h}`, sourceAspect: +srcAspect.toFixed(4), prodAspect: +prodAspect.toFixed(4),
    aspectDiffPct: +(aspectDiff * 100).toFixed(2), lumCorr: +lum.toFixed(4), gradCorr: +grad.toFixed(4),
    semiPx: sm.semiPx, edgeBand: sm.edgeBand, ok: problems.length === 0,
  }
  if (problems.length) { fail++; console.log(`FAIL ${e}: ${problems.join('; ')}`) }
  console.log(`${problems.length ? 'FAIL' : 'PASS'} ${e.padEnd(9)} ${out[e].dim} ${meta.format} alpha=${out[e].hasAlpha} body ${out[e].sourceBody} (prod ${out[e].prodBody}) aspect ${out[e].sourceAspect}/${out[e].prodAspect} diff ${out[e].aspectDiffPct}% | corr lum ${out[e].lumCorr} grad ${out[e].gradCorr} | sha256 ${sha}… ${(out[e].bytes / 1e6).toFixed(2)}MB`)
}
console.log(fail ? `RESULT: STOP (${fail} source problem(s))` : 'RESULT: PASS (all sources verified)')
process.exit(fail ? 1 : 0)

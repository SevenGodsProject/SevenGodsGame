// Enemy Visual Upgrade Batch A：実ブラウザで撮った Before / After を突き合わせる（監査用）。
//   node scripts/enemy-visual-batch-a/compare-screens.mjs <beforeDir> <afterDir> <outDir>
//
// ① 敵要素クロップの輪郭エネルギー（＝実際に画面へ出た画質）
// ② Before/After の差分が「敵の立ち絵の内側」だけに出ているか（背景・HUD が動いていない証拠）
// ③ Before|After を並べた比較画像（PC1366 と Mobile390）
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
sharp.cache(false)
import { analyze } from '../enemy-visual-audit/metrics.mjs'

const [beforeDir, afterDir, outDir] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const CHANGED = ['trial', 'karakuri', 'doukeshi'] // trial = datenshi の art
const ALL = ['trial', 'oni', 'onryo', 'karakuri', 'juuma', 'ryujin', 'doukeshi']
const VPS = ['pc1366-dpr1', 'pc1366-dpr2', 'pc1508-dpr1', 'pc1508-dpr2', 'sp760-dpr1', 'sp760-dpr2', 'sp844-dpr1', 'sp844-dpr2']

const report = { crops: {}, fullDiff: {} }
for (const vp of VPS) {
  for (const e of ALL) {
    const b = join(beforeDir, `${vp}-${e}-enemy.png`), a = join(afterDir, `${vp}-${e}-enemy.png`)
    if (!existsSync(b) || !existsSync(a)) continue
    const bm = await analyze(b), am = await analyze(a)
    const bmeta = await sharp(b).metadata(), ameta = await sharp(a).metadata()
    let diffPx = 0, maxDiff = 0
    if (bmeta.width === ameta.width && bmeta.height === ameta.height) {
      const B = await sharp(b).ensureAlpha().raw().toBuffer(), A = await sharp(a).ensureAlpha().raw().toBuffer()
      for (let i = 0; i < B.length; i += 4) {
        const d = Math.max(Math.abs(B[i] - A[i]), Math.abs(B[i + 1] - A[i + 1]), Math.abs(B[i + 2] - A[i + 2]))
        if (d > 8) diffPx++
        if (d > maxDiff) maxDiff = d
      }
    }
    const k = `${vp}|${e}`
    report.crops[k] = {
      size: `${bmeta.width}x${bmeta.height}`, sameSize: bmeta.width === ameta.width && bmeta.height === ameta.height,
      lapVarBefore: bm.lapVar, lapVarAfter: am.lapVar, gain: +(am.lapVar / Math.max(1, bm.lapVar)).toFixed(3),
      changedPx: diffPx, changedPct: +(100 * diffPx / (bmeta.width * bmeta.height)).toFixed(2), maxChannelDiff: maxDiff,
      expectedChange: CHANGED.includes(e),
    }
  }
}
// 画面全体の差分（HUD・背景が動いていないこと）
for (const vp of ['pc1366-dpr1', 'sp760-dpr1']) {
  for (const e of ALL) {
    const b = join(beforeDir, `${vp}-${e}-full.png`), a = join(afterDir, `${vp}-${e}-full.png`)
    if (!existsSync(b) || !existsSync(a)) continue
    const B = await sharp(b).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const A = await sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    if (B.info.width !== A.info.width || B.info.height !== A.info.height) { report.fullDiff[`${vp}|${e}`] = { error: 'size mismatch' }; continue }
    let n = 0, minX = 1e9, minY = 1e9, maxX = -1, maxY = -1
    const W = B.info.width
    for (let i = 0; i < B.data.length; i += 4) {
      const d = Math.max(Math.abs(B.data[i] - A.data[i]), Math.abs(B.data[i + 1] - A.data[i + 1]), Math.abs(B.data[i + 2] - A.data[i + 2]))
      if (d <= 8) continue
      n++
      const p = i / 4, x = p % W, y = (p - x) / W
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y
    }
    report.fullDiff[`${vp}|${e}`] = { changedPx: n, changedPct: +(100 * n / (B.info.width * B.info.height)).toFixed(2), bbox: n ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } : null, expectedChange: CHANGED.includes(e) }
  }
}
// 比較画像
for (const vp of ['pc1366-dpr2', 'sp760-dpr2']) {
  for (const e of CHANGED) {
    const b = join(beforeDir, `${vp}-${e}-enemy.png`), a = join(afterDir, `${vp}-${e}-enemy.png`)
    if (!existsSync(b) || !existsSync(a)) continue
    const m = await sharp(b).metadata()
    await sharp({ create: { width: m.width * 2 + 12, height: m.height, channels: 4, background: { r: 16, g: 16, b: 16, alpha: 1 } } })
      .composite([{ input: b, left: 0, top: 0 }, { input: a, left: m.width + 12, top: 0 }]).png()
      .toFile(join(outDir, `${e}-${vp}-before-after.png`))
  }
}
writeFileSync(join(outDir, 'compare-screens.json'), JSON.stringify(report, null, 2))

console.log('--- 敵要素クロップ：実画面での輪郭エネルギー（変更した3体のみ gain>1 を期待） ---')
for (const vp of VPS) {
  const line = ALL.map((e) => { const r = report.crops[`${vp}|${e}`]; return r ? `${e.slice(0, 4)} ${r.gain}${r.expectedChange ? '*' : ''}` : '' }).filter(Boolean).join('  ')
  console.log(vp.padEnd(13), line)
}
console.log('--- 画面全体の差分（変更なしの敵は 0% であるべき） ---')
for (const [k, v] of Object.entries(report.fullDiff)) console.log(' ', k.padEnd(22), v.error ?? `${v.changedPct}% (${v.changedPx}px)${v.bbox ? ` bbox ${v.bbox.w}x${v.bbox.h}@(${v.bbox.x},${v.bbox.y})` : ''}${v.expectedChange ? ' *期待される変更' : ''}`)
console.log('written', join(outDir, 'compare-screens.json'))

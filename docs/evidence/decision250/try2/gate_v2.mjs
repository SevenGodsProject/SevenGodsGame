// 決定250 Gate v2 — 配信候補区間そのものを、入力板（front_640 由来）を参照に semantic identity で判定する。
// usage: node gate_v2.mjs <framesDir(1024² png)> <plate.png> <silhouette_1024.png> <out.json> [firstIdx lastIdx]
import { createRequire } from 'node:module'; import fs from 'node:fs';
const sharp = createRequire('C:/Users/kimi1/SevenGodsGame/package.json')('sharp');
const [dir, platePath, maskPath, outPath, a0, a1] = process.argv.slice(2);
const W = 1024;
// ROI（入力板 1024² 座標・plate_face_grid.png／plate_grid_512.png で実測）
const R = {
  face:   [370, 240, 190, 180],
  eyes:   [395, 285, 150, 65],    // 両目（バイザー越し）
  cheek:  [400, 345, 130, 30],    // 目の直下（本来はバイザー下縁の橙）
  brows:  [400, 262, 130, 28],
  mouth:  [440, 360, 80, 36],
  crest:  [340, 110, 180, 140],   // 頭巾の宝袋紋
  hood:   [300,  60, 420, 200],
  hand:   [290, 370, 140, 130],   // 砲の上に置いた手
  cannon: [150, 320, 250, 180],
  sack:   [640, 520, 290, 330],
};
const BG = { r: 0x2a, g: 0x1f, b: 0x08 };
const BURST = [0, 200, 330, 400];  // 砲口より左の発射域（新規物体の判定から除外）
const raw = async p => { const { data } = await sharp(p).resize(W, W).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return data; };
const px = (d, x, y) => { const i = (y * W + x) * 3; return [d[i], d[i + 1], d[i + 2]]; };
const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
function mae(a, b, [x0, y0, w, h], dx = 0, dy = 0) { let s = 0, n = 0; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const [r1, g1, b1] = px(a, x + dx, y + dy), [r2, g2, b2] = px(b, x, y); s += Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2); n += 3; } return s / n; }
function maeShift(a, b, roi, S = 8) { let best = Infinity, bd = [0, 0]; for (let dy = -S; dy <= S; dy += 2) for (let dx = -S; dx <= S; dx += 2) { const m = mae(a, b, roi, dx, dy); if (m < best) { best = m; bd = [dx, dy]; } } return { mae: best, d: bd }; }
function ncc(a, b, [x0, y0, w, h], dx = 0, dy = 0) { let sa = 0, sb = 0; const n = w * h; const A = [], B = []; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const la = luma(...px(a, x + dx, y + dy)), lb = luma(...px(b, x, y)); A.push(la); B.push(lb); sa += la; sb += lb; } const ma = sa / n, mb = sb / n; let num = 0, da = 0, db = 0; for (let i = 0; i < n; i++) { num += (A[i] - ma) * (B[i] - mb); da += (A[i] - ma) ** 2; db += (B[i] - mb) ** 2; } return num / Math.sqrt(da * db + 1e-9); }
function nccShift(a, b, roi, S = 8) { let best = -1; for (let dy = -S; dy <= S; dy += 2) for (let dx = -S; dx <= S; dx += 2) best = Math.max(best, ncc(a, b, roi, dx, dy)); return best; }
function tint(d, [x0, y0, w, h]) { let s = 0, n = 0; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const [r, , b] = px(d, x, y); s += r - b; n++; } return s / n; }
function charMask(d) { const m = new Uint8Array(W * W); for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const [r, g, b] = px(d, x, y); if (Math.abs(r - BG.r) + Math.abs(g - BG.g) + Math.abs(b - BG.b) > 60) m[y * W + x] = 1; } return m; }
function bbox(m, xmin = 300, xmax = 980) { let x0 = W, x1 = 0, y0 = W, y1 = 0; for (let y = 0; y < W; y++) { let c = 0; for (let x = xmin; x < xmax; x++) if (m[y * W + x]) c++; if (c > 12) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); } } for (let x = 0; x < W; x++) { let c = 0; for (let y = 0; y < W; y++) if (m[y * W + x]) c++; if (c > 12) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); } } return { x0, y0, x1, y1, h: y1 - y0, w: x1 - x0 }; }
function iou(m1, m2) { let i = 0, u = 0; for (let k = 0; k < m1.length; k++) { const a = m1[k], b = m2[k]; if (a && b) i++; if (a || b) u++; } return i / u; }
function newObjects(d, plate, sil) { let n = 0, c = 0; for (let y = 0; y < W; y += 2) for (let x = 0; x < W; x += 2) { if (x >= BURST[0] && x < BURST[0] + BURST[2] && y >= BURST[1] && y < BURST[1] + BURST[3]) continue; if (sil[y * W + x]) continue; n++; const l1 = luma(...px(d, x, y)), l2 = luma(...px(plate, x, y)); if (Math.abs(l1 - l2) > 40) c++; } return c / n; }
function glowX(d) { let sx = 0, sw = 0; for (let y = 200; y < 600; y += 2) for (let x = 0; x < W; x += 2) { const l = luma(...px(d, x, y)); if (l > 235) { sx += x; sw++; } } return sw ? sx / sw : NaN; }
async function dilate(p) { const { data, info } = await sharp(p).resize(W, W).blur(7).threshold(1).raw().toBuffer({ resolveWithObject: true }); const c = info.channels; const m = new Uint8Array(W * W); for (let k = 0; k < W * W; k++) m[k] = data[k * c] > 0 ? 1 : 0; return m; } // 2026-09-29 修正：raw は 3ch で返るため stride を info.channels に

const plate = await raw(platePath); const sil = await dilate(maskPath); const pm = charMask(plate); const pb = bbox(pm);
const refTint = { eyes: tint(plate, R.eyes), cheek: tint(plate, R.cheek) };
const files = fs.readdirSync(dir).filter(f => /\.png$/.test(f)).sort(); const i0 = a0 ? +a0 : 0, i1 = a1 ? +a1 : files.length - 1;
const rows = [];
for (let i = i0; i <= i1; i++) {
  const f = await raw(`${dir}/${files[i]}`); const fm = charMask(f); const fb = bbox(fm);
  const face = maeShift(f, plate, R.face), eyes = tint(f, R.eyes), cheek = tint(f, R.cheek);
  rows.push({ i, file: files[i], face: +face.mae.toFixed(1), faceShift: face.d,
    brows: +maeShift(f, plate, R.brows).mae.toFixed(1), mouth: +maeShift(f, plate, R.mouth).mae.toFixed(1),
    eyesTint: +eyes.toFixed(1), cheekTint: +cheek.toFixed(1), eyesTintDelta: +(eyes - refTint.eyes).toFixed(1), cheekTintDelta: +(cheek - refTint.cheek).toFixed(1),
    crestNcc: +nccShift(f, plate, R.crest).toFixed(3), crestMae: +maeShift(f, plate, R.crest).mae.toFixed(1), hood: +maeShift(f, plate, R.hood).mae.toFixed(1),
    hand: +maeShift(f, plate, R.hand).mae.toFixed(1), cannon: +maeShift(f, plate, R.cannon).mae.toFixed(1), sack: +maeShift(f, plate, R.sack).mae.toFixed(1),
    silIou: +iou(pm, fm).toFixed(3), scale: +(fb.h / pb.h).toFixed(3), bboxShift: [fb.x0 - pb.x0, fb.y0 - pb.y0], newObj: +(100 * newObjects(f, plate, sil)).toFixed(2), glowX: Math.round(glowX(f)) });
}
// 閾値（較正 2026-09-29：入力板＝全 PASS／Kling Try1 frame1＝全 PASS／Kling 候補 D 区間＝13 項目 FAIL）
const T = { face: 14, brows: 16, mouth: 16, eyesTintDelta: 15, cheekTintDelta: 20, crestNcc: 0.85, hood: 16, hand: 14, cannon: 20, sack: 14, silIou: 0.90, scale: 0.03, bboxShift: 12, newObj: 0.8 };
const mx = k => Math.max(...rows.map(r => Math.abs(r[k]))), mn = k => Math.min(...rows.map(r => r[k]));
const verdict = {
  face: mx('face') <= T.face, eyebrows: mx('brows') <= T.brows, mouth: mx('mouth') <= T.mouth,
  eyes_through_visor: mx('eyesTintDelta') <= T.eyesTintDelta && mx('cheekTintDelta') <= T.cheekTintDelta,
  hood_emblem: mn('crestNcc') >= T.crestNcc, hood: mx('hood') <= T.hood,
  hand: mx('hand') <= T.hand, cannon_body: mx('cannon') <= T.cannon, treasure_bag: mx('sack') <= T.sack,
  silhouette: mn('silIou') >= T.silIou, camera_zoom: Math.max(...rows.map(r => Math.abs(r.scale - 1))) <= T.scale,
  camera_movement: Math.max(...rows.map(r => Math.max(Math.abs(r.bboxShift[0]), Math.abs(r.bboxShift[1])))) <= T.bboxShift,
  new_objects: mx('newObj') <= T.newObj, orientation: rows.every(r => Number.isNaN(r.glowX) || r.glowX < 512),
};
const summary = { frames: [i0, i1], thresholds: T, refTint, plateBbox: pb,
  max: Object.fromEntries(['face', 'brows', 'mouth', 'eyesTintDelta', 'cheekTintDelta', 'crestMae', 'hood', 'hand', 'cannon', 'sack', 'newObj'].map(k => [k, mx(k)])),
  min: { crestNcc: mn('crestNcc'), silIou: mn('silIou') }, scaleRange: [mn('scale'), Math.max(...rows.map(r => r.scale))], verdict, PASS: Object.values(verdict).every(Boolean) };
fs.writeFileSync(outPath, JSON.stringify({ summary, rows }, null, 2));
console.log('max', JSON.stringify(summary.max)); console.log('min', JSON.stringify(summary.min), 'scale', JSON.stringify(summary.scaleRange));
console.log('verdict', JSON.stringify(verdict)); console.log('PASS', summary.PASS);

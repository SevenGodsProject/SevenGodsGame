// 決定250 Gate v2 Recalibrated（768 baseline 分離・形状／位置／semantic 優先）
// usage: node gate_v2r.mjs <framesDir> <plate768.png> <silhouette_1024.png> <out.json> <baselineIdx list "1,5,9,13,17,21"> <first> <last>
// すべて 1024² 空間で評価（frames と plate は同じ経路で 1024 へ resize）。閾値は本ファイルで事前固定。
import { createRequire } from 'node:module'; import fs from 'node:fs';
const sharp = createRequire('C:/Users/kimi1/SevenGodsGame/package.json')('sharp');
const [dir, platePath, maskPath, outPath, baseList, a0, a1] = process.argv.slice(2);
const W = 1024;
const R = {
  face:   [370, 240, 190, 180], eyes: [395, 285, 150, 65], visor: [400, 345, 130, 30], brows: [400, 262, 130, 28], mouth: [440, 360, 80, 36],
  hood:   [300,  60, 420, 200], crest: [340, 110, 180, 140], hand: [290, 370, 140, 130], cannonBody: [230, 330, 170, 170], sack: [640, 520, 290, 330],
};
const SHAPE_ROIS = ['face', 'eyes', 'visor', 'brows', 'mouth', 'hood', 'crest', 'hand', 'cannonBody', 'sack'];
const BG = { r: 0x2a, g: 0x1f, b: 0x08 };
const BURST = [0, 200, 330, 400];
// 事前固定の閾値（追加 drift＝candidate − baseline）
const T = { lineNccDrop: 0.15, edgeNccDrop: 0.25, lumaNccDrop: 0.25, posDrift: 4, orangeDrop: 15, erosion: 1.0, panPx: 4, zoomPx: 5, newDarkObj: 0.3 };

const raw = async p => (await sharp(p).resize(W, W).removeAlpha().raw().toBuffer({ resolveWithObject: true })).data;
const px = (d, x, y) => { const i = (y * W + x) * 3; return [d[i], d[i + 1], d[i + 2]]; };
const lumaOf = d => { const L = new Float32Array(W * W); for (let i = 0; i < W * W; i++) L[i] = 0.299 * d[i * 3] + 0.587 * d[i * 3 + 1] + 0.114 * d[i * 3 + 2]; return L; };
let SILDIL = null;
const linesOf = L => { // 局所平均（15×15）との差が −20 未満＝線。滑らかな照明（黄金色の光）は局所平均に吸収される
  const I = new Float64Array((W + 1) * (W + 1)); for (let y = 1; y <= W; y++) { let row = 0; for (let x = 1; x <= W; x++) { row += L[(y - 1) * W + (x - 1)]; I[y * (W + 1) + x] = I[(y - 1) * (W + 1) + x] + row; } }
  const R2 = 7, M = new Float32Array(W * W);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const y0 = Math.max(0, y - R2), y1 = Math.min(W, y + R2 + 1), x0 = Math.max(0, x - R2), x1 = Math.min(W, x + R2 + 1); const sum = I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0]; const mean = sum / ((y1 - y0) * (x1 - x0)); M[y * W + x] = (SILDIL[y * W + x] && L[y * W + x] - mean < -20) ? 1 : 0; }
  return M; };
const edgesOf = L => { const E = new Float32Array(W * W); for (let y = 1; y < W - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; const gx = -L[i - W - 1] - 2 * L[i - 1] - L[i + W - 1] + L[i - W + 1] + 2 * L[i + 1] + L[i + W + 1]; const gy = -L[i - W - 1] - 2 * L[i - W] - L[i - W + 1] + L[i + W - 1] + 2 * L[i + W] + L[i + W + 1]; E[i] = Math.sqrt(gx * gx + gy * gy); } return E; };
function nccMap(A, B, [x0, y0, w, h], dx, dy) { const n = w * h; let sa = 0, sb = 0; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { sa += A[(y + dy) * W + x + dx]; sb += B[y * W + x]; } const ma = sa / n, mb = sb / n; let num = 0, da = 0, db = 0; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const a = A[(y + dy) * W + x + dx] - ma, b = B[y * W + x] - mb; num += a * b; da += a * a; db += b * b; } return num / Math.sqrt(da * db + 1e-9); }
function bestNcc(A, B, roi, S = 8) { let best = -1, bd = [0, 0]; for (let dy = -S; dy <= S; dy += 1) for (let dx = -S; dx <= S; dx += 1) { const v = nccMap(A, B, roi, dx, dy); if (v > best) { best = v; bd = [dx, dy]; } } return { ncc: best, d: bd }; }
function tint(d, [x0, y0, w, h]) { let s = 0, n = 0; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const [r, , b] = px(d, x, y); s += r - b; n++; } return s / n; }
const isLight = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b) > 200 && r >= g - 8 && g >= b - 8;   // 明るく暖色＝光
function bodyMask(d) { const m = new Uint8Array(W * W); for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const [r, g, b] = px(d, x, y); const nb = Math.abs(r - BG.r) + Math.abs(g - BG.g) + Math.abs(b - BG.b) > 60; if (nb && !isLight(r, g, b)) m[y * W + x] = 1; } return m; }
const inBurst = (x, y) => x >= BURST[0] && x < BURST[0] + BURST[2] && y >= BURST[1] && y < BURST[1] + BURST[3];
function iouNonBurst(m1, m2) { let i = 0, u = 0; for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { if (inBurst(x, y)) continue; const k = y * W + x; if (m1[k] && m2[k]) i++; if (m1[k] || m2[k]) u++; } return i / u; }
function erosion(plateSil, d) { // 板の silhouette 画素のうち、候補で背景色に戻った割合（本体の欠損）
  let n = 0, c = 0; for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { if (!plateSil[y * W + x] || inBurst(x, y)) continue; n++; const [r, g, b] = px(d, x, y); if (Math.abs(r - BG.r) + Math.abs(g - BG.g) + Math.abs(b - BG.b) <= 40) c++; } return 100 * c / n; }
function head(m) { // 頭部：x 340〜700 の最上端と、その 60px 下の幅
  let top = -1; for (let y = 0; y < W && top < 0; y++) { let c = 0; for (let x = 340; x < 700; x++) if (m[y * W + x]) c++; if (c > 8) top = y; } const yy = Math.min(W - 1, top + 60); let x0 = W, x1 = 0; for (let x = 200; x < 900; x++) if (m[yy * W + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); } return { top, width: x1 - x0 }; }
function newDarkObjects(d, plate, silDil) { // silhouette（膨張）外・発射域外で、板と大きく違い「光でない」画素の割合
  let n = 0, c = 0; for (let y = 0; y < W; y += 2) for (let x = 0; x < W; x += 2) { if (inBurst(x, y) || silDil[y * W + x]) continue; n++; const [r, g, b] = px(d, x, y), [pr, pg, pb] = px(plate, x, y); const lc = 0.299 * r + 0.587 * g + 0.114 * b, lp = 0.299 * pr + 0.587 * pg + 0.114 * pb; const warmBrighter = lc > lp && r >= g - 8 && g >= b - 8; if (Math.abs(lc - lp) > 40 && !warmBrighter) c++; } return 100 * c / n; }
function glowX(L) { let l = 0, rr = 0; for (let y = 200; y < 600; y += 2) { for (let x = 0; x < 330; x += 2) if (L[y * W + x] > 235) l++; for (let x = 694; x < W; x += 2) if (L[y * W + x] > 235) rr++; } if (l + rr < 50) return NaN; return rr > l ? 700 : 300; }
async function dilate(p) { const { data, info } = await sharp(p).resize(W, W).blur(7).threshold(1).raw().toBuffer({ resolveWithObject: true }); const c = info.channels; const m = new Uint8Array(W * W); for (let k = 0; k < W * W; k++) m[k] = data[k * c] > 0 ? 1 : 0; return m; }
async function silRaw(p) { const { data, info } = await sharp(p).resize(W, W).threshold(128).raw().toBuffer({ resolveWithObject: true }); const c = info.channels; const m = new Uint8Array(W * W); for (let k = 0; k < W * W; k++) m[k] = data[k * c] > 0 ? 1 : 0; return m; }

const silDil = await dilate(maskPath); SILDIL = silDil; const sil = await silRaw(maskPath);
const plate = await raw(platePath); const PL = lumaOf(plate), PE = edgesOf(PL), PM = linesOf(PL); const pMask = bodyMask(plate); const pHead = head(pMask);
const files = fs.readdirSync(dir).filter(f => /\.png$/.test(f)).sort();
async function measure(i) {
  const d = await raw(`${dir}/${files[i]}`); const L = lumaOf(d), E = edgesOf(L), LM = linesOf(L); const m = bodyMask(d); const h = head(m);
  const r = { i, file: files[i] };
  for (const k of SHAPE_ROIS) { const e = bestNcc(E, PE, R[k]), l = bestNcc(L, PL, R[k]), ln = bestNcc(LM, PM, R[k]); r[k] = { edgeNcc: +e.ncc.toFixed(3), lumaNcc: +l.ncc.toFixed(3), lineNcc: +ln.ncc.toFixed(3), pos: ln.d }; }
  r.eyesOrange = +tint(d, R.eyes).toFixed(1); r.visorOrange = +tint(d, R.visor).toFixed(1);
  r.silIou = +iouNonBurst(pMask, m).toFixed(3); r.erosion = +erosion(sil, d).toFixed(2);
  r.headTop = h.top - pHead.top; r.headWidthRatio = +(h.width / pHead.width).toFixed(3);
  r.newDarkObj = +newDarkObjects(d, plate, silDil).toFixed(2); r.glowX = Math.round(glowX(L));
  return r;
}
const baseIdx = baseList.split(',').map(Number); const base = []; for (const i of baseIdx) base.push(await measure(i));
const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
const B = {}; for (const k of SHAPE_ROIS) B[k] = { edgeNcc: +avg(base.map(r => r[k].edgeNcc)).toFixed(3), lumaNcc: +avg(base.map(r => r[k].lumaNcc)).toFixed(3), lineNcc: +avg(base.map(r => r[k].lineNcc)).toFixed(3), pos: [Math.round(avg(base.map(r => r[k].pos[0]))), Math.round(avg(base.map(r => r[k].pos[1])))] };
B.eyesOrange = +avg(base.map(r => r.eyesOrange)).toFixed(1); B.visorOrange = +avg(base.map(r => r.visorOrange)).toFixed(1); B.plateEyesOrange = +tint(plate, R.eyes).toFixed(1); B.plateVisorOrange = +tint(plate, R.visor).toFixed(1);
B.silIou = +avg(base.map(r => r.silIou)).toFixed(3); B.erosion = +avg(base.map(r => r.erosion)).toFixed(2); B.headTop = Math.round(avg(base.map(r => r.headTop))); B.headWidthRatio = +avg(base.map(r => r.headWidthRatio)).toFixed(3); B.newDarkObj = +avg(base.map(r => r.newDarkObj)).toFixed(2);

const i0 = +a0, i1 = +a1; const rows = []; for (let i = i0; i <= i1; i++) rows.push(await measure(i));
const drift = rows.map(r => { const o = { i: r.i }; for (const k of SHAPE_ROIS) o[k] = { edgeDrop: +(B[k].edgeNcc - r[k].edgeNcc).toFixed(3), lumaDrop: +(B[k].lumaNcc - r[k].lumaNcc).toFixed(3), lineDrop: +(B[k].lineNcc - r[k].lineNcc).toFixed(3), posDrift: Math.max(Math.abs(r[k].pos[0] - B[k].pos[0]), Math.abs(r[k].pos[1] - B[k].pos[1])) };
  o.eyesOrangeDelta = +(r.eyesOrange - B.eyesOrange).toFixed(1); o.visorOrangeDelta = +(r.visorOrange - B.visorOrange).toFixed(1); o.silIouDrop = +(B.silIou - r.silIou).toFixed(3); o.erosionDelta = +(r.erosion - B.erosion).toFixed(2);
  o.headTopShift = r.headTop - B.headTop; o.headWidthDev = +Math.abs(r.headWidthRatio / B.headWidthRatio - 1).toFixed(3); o.newDarkObjDelta = +(r.newDarkObj - B.newDarkObj).toFixed(2); o.glowX = r.glowX; return o; });
const mx = f => Math.max(...drift.map(f));
const verdict = {};
for (const k of SHAPE_ROIS) verdict[k + '_shape'] = mx(o => o[k].lineDrop) <= T.lineNccDrop && mx(o => o[k].edgeDrop) <= T.edgeNccDrop && mx(o => o[k].lumaDrop) <= T.lumaNccDrop;
for (const k of ['visor', 'crest', 'hand', 'cannonBody', 'face']) verdict[k + '_position'] = mx(o => o[k].posDrift) <= T.posDrift;
verdict.eyes_through_visor = Math.min(...drift.map(o => o.eyesOrangeDelta)) >= -T.orangeDrop && Math.min(...drift.map(o => o.visorOrangeDelta)) >= -T.orangeDrop;
verdict.silhouette_body = mx(o => o.erosionDelta) <= T.erosion && mx(o => o.newDarkObjDelta) <= T.newDarkObj;
// カメラ：光に影響されない線画ランドマーク（紋・バイザー・手・砲本体・宝袋）の最良シフトから。pan＝中央値、zoom＝上下ランドマーク間距離の変化
const lm = ['crest', 'visor', 'hand', 'cannonBody', 'sack'];
for (const o of drift) { const r = rows.find(x => x.i === o.i); const sh = lm.map(k => r[k].pos); const med = a => { const s2 = [...a].sort((p, q) => p - q); return s2[Math.floor(s2.length / 2)]; }; o.pan = [med(sh.map(v => v[0])), med(sh.map(v => v[1]))]; o.zoomPx = Math.abs((r.hand.pos[1] - r.crest.pos[1]) - (B.hand.pos[1] - B.crest.pos[1])); }
verdict.camera_pan = mx(o => Math.max(Math.abs(o.pan[0]), Math.abs(o.pan[1]))) <= T.panPx; verdict.camera_zoom = mx(o => o.zoomPx) <= T.zoomPx;
verdict.new_objects = mx(o => o.newDarkObjDelta) <= T.newDarkObj; verdict.orientation = drift.every(o => Number.isNaN(o.glowX) || o.glowX < 512);
const worst = {}; for (const k of SHAPE_ROIS) worst[k] = { lineDrop: mx(o => o[k].lineDrop), edgeDrop: mx(o => o[k].edgeDrop), lumaDrop: mx(o => o[k].lumaDrop), posDrift: mx(o => o[k].posDrift) };
const summary = { window: [i0, i1], baselineFrames: baseIdx, thresholds: T, baseline: B, worst, minEyesOrangeDelta: Math.min(...drift.map(o => o.eyesOrangeDelta)), minVisorOrangeDelta: Math.min(...drift.map(o => o.visorOrangeDelta)), maxSilIouDrop: mx(o => o.silIouDrop), maxErosionDelta: mx(o => o.erosionDelta), maxPan: mx(o => Math.max(Math.abs(o.pan[0]), Math.abs(o.pan[1]))), maxZoomPx: mx(o => o.zoomPx), maxNewDarkObjDelta: mx(o => o.newDarkObjDelta), verdict, PASS: Object.values(verdict).every(Boolean) };
fs.writeFileSync(outPath, JSON.stringify({ summary, baselineRows: base, rows, drift }, null, 2));
console.log('baseline', JSON.stringify(B)); console.log('worst', JSON.stringify(worst)); console.log('semantic', JSON.stringify({ eyes: summary.minEyesOrangeDelta, visor: summary.minVisorOrangeDelta, silIouDrop: summary.maxSilIouDrop, erosion: summary.maxErosionDelta, pan: summary.maxPan, zoomPx: summary.maxZoomPx, newObj: summary.maxNewDarkObjDelta }));
console.log('verdict', JSON.stringify(verdict)); console.log('PASS', summary.PASS);

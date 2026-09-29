// 決定250 Try2 — CEO 承認条件（2026-09-29）を固定した 1 回限りの生成スクリプト。
//   MODEL minimax/h3-max/image-to-video ／ 768P ／ 5s ／ 1 回 ／ 上限 $0.40 ／ fallback 禁止 ／ 再送禁止
//   FAL_KEY は環境変数からのみ読み、値を表示・保存しない。
import fs from 'node:fs';
import crypto from 'node:crypto';

const MODEL_ID = 'minimax/h3-max/image-to-video';          // ← CEO 承認 ID。実行前に grep で完全一致を確認する
const RESOLUTION = '768P';
const DURATION = 5;
const MAX_COST_USD = 0.40;
const PRICE_PER_S = 0.08;                                    // 768P の通常単価（promo 中は 0.04）。上限判定は通常単価で行う
const OUT = process.argv[2];                                 // 出力フォルダ
const PLATE = process.argv[3];                               // 入力板 PNG（front_640 由来・1024²）
const SEED = Number(process.argv[4]);                        // 記録用に固定
if (!OUT || !PLATE || !Number.isInteger(SEED)) { console.error('usage: node gen_try2.mjs <outDir> <plate.png> <seed>'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

// --- guards（課金前に止まる） ---
if (fs.existsSync(`${OUT}/submitted.json`)) { console.error('STOP: already submitted once (submitted.json exists). Try2 is ONE generation only.'); process.exit(3); }
if (MODEL_ID !== 'minimax/h3-max/image-to-video') { console.error('STOP: model id mismatch'); process.exit(4); }
const est = PRICE_PER_S * DURATION;
if (est > MAX_COST_USD + 1e-9) { console.error(`STOP: estimated cost ${est} > cap ${MAX_COST_USD}`); process.exit(5); }
const KEY = process.env.FAL_KEY;
if (!KEY) { console.error('STOP: FAL_KEY is not set'); process.exit(6); }

const png = fs.readFileSync(PLATE);
const sha = crypto.createHash('sha256').update(png).digest('hex');
if (sha !== '57eabb31856d18702e1bb8695a5ebde3d935dabca02db662aef4dc49d29836ff') { console.error('STOP: plate sha256 mismatch', sha); process.exit(7); }
const dataUrl = 'data:image/png;base64,' + png.toString('base64');

const prompt = fs.readFileSync(new URL('./prompt_try2.txt', import.meta.url), 'utf8').replace(/\s+/g, ' ').trim();
const input = {
  prompt,
  image_url: dataUrl,
  end_image_url: dataUrl,           // 先頭と同じ入力板＝「同じ画に戻る」拘束
  duration: DURATION,
  resolution: RESOLUTION,
  prompt_expansion_mode: 'disabled',
  seed: SEED,
  enable_safety_checker: true,
};
const redacted = { ...input, image_url: `<data:image/png;base64 1024x1024 sha256 ${sha}>`, end_image_url: '<same as image_url>' };
fs.writeFileSync(`${OUT}/try2_request.json`, JSON.stringify({ model_id: MODEL_ID, approved: { resolution: RESOLUTION, duration: DURATION, count: 1, max_cost_usd: MAX_COST_USD }, est_cost_usd_regular: est, submitted_at: new Date().toISOString(), input: redacted }, null, 2));

const H = { Authorization: 'Key ' + KEY, 'Content-Type': 'application/json' };
// --- the ONE billable call ---
const submit = await fetch(`https://queue.fal.run/${MODEL_ID}`, { method: 'POST', headers: H, body: JSON.stringify(input) });
const sub = await submit.json().catch(() => ({}));
fs.writeFileSync(`${OUT}/submitted.json`, JSON.stringify({ http: submit.status, at: new Date().toISOString(), body: sub }, null, 2));
if (!submit.ok || !sub.request_id) { console.error('submit failed (NO retry):', submit.status, JSON.stringify(sub).slice(0, 400)); process.exit(8); }
console.log('submitted request_id', sub.request_id);

// --- polling（課金を伴わない状態取得。再送は一切しない） ---
const statusUrl = sub.status_url, responseUrl = sub.response_url;
let status = null;
for (let i = 0; i < 240; i++) {
  await new Promise(r => setTimeout(r, 5000));
  const s = await fetch(statusUrl + '?logs=1', { headers: { Authorization: 'Key ' + KEY } });
  status = await s.json().catch(() => ({}));
  if (i % 6 === 0) console.log('status', status.status, 'queue', status.queue_position ?? '-');
  if (status.status === 'COMPLETED' || status.status === 'FAILED' || status.status === 'ERROR') break;
}
fs.writeFileSync(`${OUT}/status.json`, JSON.stringify(status, null, 2));
if (status?.status !== 'COMPLETED') { console.error('not completed (NO retry):', status?.status); process.exit(9); }
const r = await fetch(responseUrl, { headers: { Authorization: 'Key ' + KEY } });
const res = await r.json();
fs.writeFileSync(`${OUT}/try2_response.json`, JSON.stringify({ http: r.status, request_id: sub.request_id, status, result: res }, null, 2));
const url = res?.video?.url;
if (!url) { console.error('no video url in response'); process.exit(10); }
const bin = Buffer.from(await (await fetch(url)).arrayBuffer());
fs.writeFileSync(`${OUT}/taiyo_god_strike_try2_raw_h3max.mp4`, bin);
console.log('saved', bin.length, 'bytes; seed', res?.seed ?? SEED);

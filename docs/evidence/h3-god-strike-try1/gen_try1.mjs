import fs from 'node:fs';
const KEY = process.env.FAL_KEY;
if (!KEY) { console.error('FAL_KEY missing — STOP'); process.exit(2); }
if (fs.existsSync('try1_request.json')) { console.error('Try1 already submitted — refusing to run twice'); process.exit(3); }
const ENDPOINT = 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video';
const png = fs.readFileSync('input_taiyo_1024.png');
const image_url = 'data:image/png;base64,' + png.toString('base64');
const body = {
  prompt: [
    'The exact same chibi character from the input image, unchanged: a boy seated on a large white treasure sack,',
    'holding a golden mallet-shaped cannon pointed to the left, camo hood with a golden treasure-bag crest, orange goggles,',
    'orange armor, black fingerless gloves. Face, hood crest, outfit, body proportions and seated pose stay identical to the input.',
    'Static camera, no zoom, no pan, no rotation, plain dark background.',
    'Motion: the red glow inside the cannon muzzle grows brighter, energy lines run along the barrel, the body leans forward very slightly,',
    'then the cannon fires a bright burst of golden light to the left with a slight recoil, then the screen flashes bright white-gold.',
    '2D anime illustration style, clean lines, flat colors.'
  ].join(' '),
  image_url,
  duration: '5',
  negative_prompt: 'camera movement, zoom, pan, rotation, turning around, new objects, bullets, text, extra characters, background scenery, outfit change, face change, different face, mouth movement, talking, hair color change, missing cannon, missing sack, blur, distort, low quality, 3D render, realistic',
  cfg_scale: 0.6,
};
const t0 = Date.now();
const submit = await fetch('https://queue.fal.run/' + ENDPOINT, {
  method: 'POST', headers: { Authorization: 'Key ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const sub = await submit.json();
fs.writeFileSync('try1_request.json', JSON.stringify({ endpoint: ENDPOINT, submitted_at: new Date().toISOString(), http: submit.status, body: { ...body, image_url: '<data:image/png;base64 1024x1024 sha256 ' + process.argv[2] + '>' }, submit_response: sub }, null, 2));
console.log('submit HTTP', submit.status, JSON.stringify(sub));
if (!submit.ok || !sub.request_id) process.exit(4);
let status;
for (let i = 0; i < 240; i++) {
  await new Promise(r => setTimeout(r, 5000));
  const s = await fetch(sub.status_url + '?logs=1', { headers: { Authorization: 'Key ' + KEY } });
  status = await s.json();
  process.stdout.write(`[${Math.round((Date.now()-t0)/1000)}s] ${status.status} q=${status.queue_position ?? '-'}\n`);
  if (status.status === 'COMPLETED') break;
  if (status.status === 'FAILED' || status.status === 'ERROR') break;
}
const r = await fetch(sub.response_url, { headers: { Authorization: 'Key ' + KEY } });
const res = await r.json();
fs.writeFileSync('try1_response.json', JSON.stringify({ http: r.status, elapsed_s: Math.round((Date.now()-t0)/1000), status, result: res }, null, 2));
console.log('response HTTP', r.status, JSON.stringify(res).slice(0, 800));
if (res.video?.url) {
  const v = await fetch(res.video.url); const buf = Buffer.from(await v.arrayBuffer());
  fs.writeFileSync('try1_raw.mp4', buf); console.log('saved try1_raw.mp4', buf.length, 'bytes');
}

import { createRequire } from 'node:module'; import fs from 'node:fs';
const sharp = createRequire('C:/Users/kimi1/SevenGodsGame/package.json')('sharp');
const W = 1024;
const R = { face:[370,240,190,180], crest:[340,110,180,140], cannon:[150,320,250,180], sack:[640,520,290,330], full:[0,0,1024,1024] };
const files = fs.readdirSync('frames').filter(f=>f.endsWith('.png')).sort();
const load = async p => (await sharp(p).removeAlpha().raw().toBuffer());
const px = (buf,x,y,c) => buf[(y*W+x)*3+c];
function mae(a,b,[x0,y0,w,h]){ let s=0; for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++)for(let c=0;c<3;c++) s+=Math.abs(px(a,x,y,c)-px(b,x,y,c)); return s/(w*h*3); }
function lum(a,[x0,y0,w,h]){ let s=0; for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++) s+=0.299*px(a,x,y,0)+0.587*px(a,x,y,1)+0.114*px(a,x,y,2); return s/(w*h); }
const input = await load('input_taiyo_1024.png');
const f0 = await load('frames/'+files[0]);
console.log('frame0 vs INPUT plate MAE: face', mae(f0,input,R.face).toFixed(1),'crest',mae(f0,input,R.crest).toFixed(1),'cannon',mae(f0,input,R.cannon).toFixed(1),'sack',mae(f0,input,R.sack).toFixed(1),'full',mae(f0,input,R.full).toFixed(1));
const rows=[]; let prev=f0;
for (let i=0;i<files.length;i++){ const f=i?await load('frames/'+files[i]):f0;
  rows.push({i,t:+(i/24).toFixed(3),face:mae(f,f0,R.face),crest:mae(f,f0,R.crest),cannon:mae(f,f0,R.cannon),sack:mae(f,f0,R.sack),full:mae(f,f0,R.full),motion:mae(f,prev,R.full),lum:lum(f,R.full),lumL:lum(f,[0,200,300,500])}); prev=f; }
fs.writeFileSync('metrics.json', JSON.stringify(rows,null,1));
console.log('\n i    t   face  crest cannon sack  full  motion  lum  lumL');
for (const r of rows) if (r.i<=12 || r.i%4===0) console.log(String(r.i).padStart(3), r.t.toFixed(2).padStart(5), r.face.toFixed(1).padStart(5), r.crest.toFixed(1).padStart(5), r.cannon.toFixed(1).padStart(6), r.sack.toFixed(1).padStart(5), r.full.toFixed(1).padStart(5), r.motion.toFixed(2).padStart(6), r.lum.toFixed(0).padStart(4), r.lumL.toFixed(0).padStart(4));
const g04 = rows.filter(r=>r.t<=0.4); console.log('\nGATE 0-0.4s: max face MAE', Math.max(...g04.map(r=>r.face)).toFixed(1), '(<=8)', ' max crest', Math.max(...g04.map(r=>r.crest)).toFixed(1), ' max cannon', Math.max(...g04.map(r=>r.cannon)).toFixed(1), ' max sack', Math.max(...g04.map(r=>r.sack)).toFixed(1));
console.log('ALL: max face MAE', Math.max(...rows.map(r=>r.face)).toFixed(1), '(<=14)  argmax t', rows.reduce((a,b)=>b.face>a.face?b:a).t);
// best 1.2s window (29 frames): motion sum, identity within window vs window start and vs frame0
const N=29, cands=[];
for (let s=0;s+N<=rows.length;s++){ const w=rows.slice(s,s+N); const wf=w[0]; cands.push({s,t0:wf.t,t1:w[N-1].t, motion:w.reduce((a,r)=>a+r.motion,0), faceMaxVs0:Math.max(...w.map(r=>r.face)), face04vs0:Math.max(...w.slice(0,10).map(r=>r.face)), lumPeakEnd:Math.max(...w.slice(17).map(r=>r.lum))-w[0].lum, lumLpeak:Math.max(...w.map(r=>r.lumL))-w[0].lumL}); }
cands.sort((a,b)=>b.motion-a.motion);
console.log('\nTop windows by motion (29f=1.2s):'); for (const c of cands.slice(0,8)) console.log(JSON.stringify(c, (k,v)=>typeof v==='number'?+v.toFixed(2):v));
console.log('\nWindows starting at 0 / with lum peak at end:'); for (const c of cands.filter(c=>c.s===0||c.lumPeakEnd>15).slice(0,8)) console.log(JSON.stringify(c,(k,v)=>typeof v==='number'?+v.toFixed(2):v));

import { createRequire } from 'node:module'; import fs from 'node:fs';
const sharp = createRequire('C:/Users/kimi1/SevenGodsGame/package.json')('sharp'); const W=1024;
const files = fs.readdirSync('frames').filter(f=>f.endsWith('.png')).sort();
const load = p => sharp(p).removeAlpha().raw().toBuffer();
const boxes={face:[370,240,190,180],crest:[340,110,180,140],cannonBody:[230,330,170,150],sack:[640,560,280,280]};
const f0=await load('frames/'+files[0]);
function best(f,[x0,y0,w,h],R=8){ let m=1e9,bd=[0,0]; for(let dy=-R;dy<=R;dy+=2)for(let dx=-R;dx<=R;dx+=2){ let s=0; for(let y=y0;y<y0+h;y+=2)for(let x=x0;x<x0+w;x+=2){const i=(y*W+x)*3,j=((y+dy)*W+x+dx)*3; s+=Math.abs(f[j]-f0[i])+Math.abs(f[j+1]-f0[i+1])+Math.abs(f[j+2]-f0[i+2]);} s/= (w*h*3/4); if(s<m){m=s;bd=[dx,dy];} } return {m,bd}; }
const out=[]; for(let i=0;i<files.length;i++){ const f=i?await load('frames/'+files[i]):f0; const r={i,t:i/24}; for(const k in boxes){const b=best(f,boxes[k]); r[k]=b.m; r[k+'_d']=b.bd;} out.push(r); }
fs.writeFileSync('metrics_shift.json',JSON.stringify(out));
const mx=(k,a,b)=>Math.max(...out.filter(r=>r.t>=a&&r.t<=b).map(r=>r[k])).toFixed(1);
console.log('shift-compensated MAE (±8px search) vs frame0');
console.log('range      face  crest cannonBody sack');
for(const [a,b] of [[0,0.4],[0,1.2],[1.2,2.5],[2.5,3.5],[3.5,4.5],[4.5,4.71],[4.75,5.0]]) console.log(`${a}-${b}s`.padEnd(10), mx('face',a,b).padStart(5), mx('crest',a,b).padStart(6), mx('cannonBody',a,b).padStart(10), mx('sack',a,b).padStart(5));
console.log('shift at 1.33s / 2.5s / 4.0s (dx,dy):', JSON.stringify(out[32].face_d), JSON.stringify(out[60].face_d), JSON.stringify(out[96].face_d));

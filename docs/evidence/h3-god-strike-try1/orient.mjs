import { createRequire } from 'node:module'; import fs from 'node:fs';
const sharp = createRequire('C:/Users/kimi1/SevenGodsGame/package.json')('sharp'); const W=1024;
const files = fs.readdirSync('frames').filter(f=>f.endsWith('.png')).sort(); let flips=0, none=0; const rows=[];
for (let i=0;i<files.length;i++){ const b=await sharp('frames/'+files[i]).removeAlpha().raw().toBuffer(); let sx=0,n=0; // yellow/white bright pixels (muzzle light) centroid
  for(let y=0;y<W;y+=2)for(let x=0;x<W;x+=2){const j=(y*W+x)*3; if(b[j]>235&&b[j+1]>200&&b[j+2]<200){sx+=x;n++;}}
  const cx=n?sx/n:NaN; rows.push({i,t:i/24,cx,n}); if(!n)none++; else if(cx>512)flips++; }
fs.writeFileSync('orient.json',JSON.stringify(rows));
console.log('frames',rows.length,'| frames with muzzle light',rows.length-none,'| light centroid right of center (flip):',flips);
console.log('centroid x at t=0.5/1.5/2.5/3.5/4.5:',[12,36,60,84,108].map(i=>Math.round(rows[i].cx)).join(', '), '(face box x=370-560, cannon x=150-400)');

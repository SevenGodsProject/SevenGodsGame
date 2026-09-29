import { createRequire } from 'node:module'; import fs from 'node:fs';
const sharp = createRequire('C:/Users/kimi1/SevenGodsGame/package.json')('sharp');
const W=1024, PL=[0x2a,0x1f,0x08];
const files = fs.readdirSync('frames').filter(f=>f.endsWith('.png')).sort();
const load = async p => sharp(p).removeAlpha().raw().toBuffer();
// character bbox from non-plate pixels (ignore left 35% where sparks live for top/bottom/right edges)
function bbox(b){ let top=1e9,bot=-1,right=-1; for(let y=0;y<W;y++)for(let x=Math.floor(W*0.35);x<W;x++){const i=(y*W+x)*3; if(Math.abs(b[i]-PL[0])+Math.abs(b[i+1]-PL[1])+Math.abs(b[i+2]-PL[2])>60){ if(y<top)top=y; if(y>bot)bot=y; if(x>right)right=x; }} return {top,bot,right}; }
const f0=await load('frames/'+files[0]); const b0=bbox(f0);
const face=[370,240,190,180], crest=[340,110,180,140], cannon=[150,320,250,180], sack=[640,520,290,330];
function maeAligned(f,b,box){ // map box in frame0 coords → frame coords via scale s and offsets
  const s=(b.bot-b.top)/(b0.bot-b0.top); const oy=b.top-b0.top*s; const ox=b.right-b0.right*s; let sum=0,n=0;
  for(let y=box[1];y<box[1]+box[3];y+=1)for(let x=box[0];x<box[0]+box[2];x+=1){ const X=Math.round(x*s+ox), Y=Math.round(y*s+oy); if(X<0||Y<0||X>=W||Y>=W)continue; const i=(y*W+x)*3,j=(Y*W+X)*3; sum+=Math.abs(f[j]-f0[i])+Math.abs(f[j+1]-f0[i+1])+Math.abs(f[j+2]-f0[i+2]); n+=3; } return {mae:sum/n,s,ox,oy}; }
console.log(' i    t  scale   ox   oy  face crest cannon sack');
const out=[];
for(let i=0;i<files.length;i++){ const f=i?await load('frames/'+files[i]):f0; const b=bbox(f); const r=maeAligned(f,b,face); const c=maeAligned(f,b,crest).mae, cn=maeAligned(f,b,cannon).mae, sk=maeAligned(f,b,sack).mae; out.push({i,t:i/24,s:r.s,face:r.mae,crest:c,cannon:cn,sack:sk});
  if(i<=10||i%6===0) console.log(String(i).padStart(3),(i/24).toFixed(2).padStart(5),r.s.toFixed(3).padStart(6),r.ox.toFixed(0).padStart(5),r.oy.toFixed(0).padStart(5),r.mae.toFixed(1).padStart(5),c.toFixed(1).padStart(5),cn.toFixed(1).padStart(6),sk.toFixed(1).padStart(5)); }
fs.writeFileSync('metrics_aligned.json',JSON.stringify(out,null,1));
const upTo=(t)=>out.filter(r=>r.t<=t);
console.log('\nALIGNED face MAE max: 0-0.4s',Math.max(...upTo(0.4).map(r=>r.face)).toFixed(1),'| 0-1.2s',Math.max(...upTo(1.2).map(r=>r.face)).toFixed(1),'| 0-4.5s',Math.max(...upTo(4.5).map(r=>r.face)).toFixed(1));
console.log('ALIGNED crest MAE max 0-4.5s',Math.max(...upTo(4.5).map(r=>r.crest)).toFixed(1),'| sack',Math.max(...upTo(4.5).map(r=>r.sack)).toFixed(1));
console.log('zoom scale at 1.2s',out[29].s.toFixed(3),'2.0s',out[48].s.toFixed(3),'3.0s',out[72].s.toFixed(3),'4.0s',out[96].s.toFixed(3),'4.5s',out[108].s.toFixed(3));

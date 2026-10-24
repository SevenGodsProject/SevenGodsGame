// 証跡ポリシー（docs/evidence/README_EVIDENCE_POLICY.md）：500KB 超の PNG を同名 .webp（quality 82）へ変換して PNG を外す。
//   node scripts/shogunate-pilot/webp-evidence.mjs <dir> [thresholdKB=500]
// Lane 1 の acceptance.mjs は変換を持たないため、PM Gate の証跡フォルダ全体に後からかける（読み取り専用の docs 作業・runtime 無関係）。
import sharp from 'sharp'
import { readdirSync, statSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

const [dir = 'docs/evidence/shogunate-pilot-v04', thresholdKB = '500'] = process.argv.slice(2)
const limit = Number(thresholdKB) * 1024
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]))
let converted = 0
for (const p of walk(dir)) {
  if (!p.endsWith('.png')) continue
  const size = statSync(p).size
  if (size <= limit) continue
  const out = p.replace(/\.png$/, '.webp')
  await sharp(p).webp({ quality: 82 }).toFile(out)
  unlinkSync(p)
  converted++
  console.log(`${p} ${Math.round(size / 1024)}KB -> ${out} ${Math.round(statSync(out).size / 1024)}KB`)
}
console.log(`converted ${converted} file(s) in ${dir}`)

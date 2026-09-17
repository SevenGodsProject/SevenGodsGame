// Phase 7 Entrance E1（決定193・仕様 §14-3）：Home 用の高画質版キービジュアルを、既存の原本から**非生成で再エンコード**する。
//
//   node scripts/entrance-e1/encode-hero.mjs [--check]
//
// - 対象は高 DPI（PC 1508×660・DPR2）で 1 画像ピクセルが 2 倍以上に引き伸ばされ、線の甘さが目視で分かった 5 柱だけ
//   （大耀・蒼毘・才華・寿楽・福永）。恵比寿は既存の keyvisual-hero.webp（1.44 倍）、笑蓮は 900×900 の軽量版（1.74 倍）で足りる。
// - 元データ：art-source/reference/gods/{id}-keyvisual.png（読み取りのみ。原本は変更しない）
// - 出力：public/assets/gods/{id}/keyvisual-home.webp（新規ファイル。既存の keyvisual.webp は変更しない）
// - 幅 1086px（拡大はしない）・縦横比は原本のまま・WebP quality 82（350KB を超えたら 78）
// 生成・補正・加筆は一切しない（リサイズとエンコードのみ）。--check は書き出さずに容量だけ表示する。
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const GODS = ['taiyo', 'sobi', 'saika', 'juraku', 'fukuei']
const WIDTH = 1086
const check = process.argv.includes('--check')
const sha = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16)

for (const id of GODS) {
  const srcPath = `art-source/reference/gods/${id}-keyvisual.png`
  const src = readFileSync(srcPath)
  const meta = await sharp(src).metadata()
  let quality = 82
  let out = await sharp(src).resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality, effort: 6 }).toBuffer()
  if (out.length > 350 * 1024) {
    quality = 78
    out = await sharp(src).resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality, effort: 6 }).toBuffer()
  }
  const outMeta = await sharp(out).metadata()
  const dest = `public/assets/gods/${id}/keyvisual-home.webp`
  if (!check) writeFileSync(dest, out)
  console.log(JSON.stringify({ id, source: `${meta.width}x${meta.height}`, sourceSha: sha(src), out: `${outMeta.width}x${outMeta.height}`, quality, kb: Math.round(out.length / 1024), sha: sha(out), dest: check ? '(check only)' : dest }))
}

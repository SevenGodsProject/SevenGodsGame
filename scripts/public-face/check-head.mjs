// CM-01 Public Face Pack v1：ビルド済み dist/index.html の <head> を OGP バリデータ相当に静的検査する。
//   node scripts/public-face/check-head.mjs [distDir=dist] [outJson]
// - 必須タグの存在・空でない値・og:image の絶対 URL・参照しているローカルファイル（icon／manifest／og:image）の実在
// - og:image の寸法が宣言と一致（WebP の VP8/VP8L/VP8X ヘッダを読む）・サイズ ≤5MB（X の制限）
// - description の長さ（検索結果で切れにくい 160 字以内の目安）・manifest の JSON 妥当性
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dist = process.argv[2] ?? 'dist'
const out = process.argv[3]
const html = readFileSync(join(dist, 'index.html'), 'utf8')

const attr = (tag, key, val) => {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${key}=["']${val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'i')
  const m = html.match(re)
  if (!m) return null
  const c = m[0].match(/\b(?:content|href)=["']([^"']*)["']/i)
  return c ? c[1] : ''
}

const checks = []
const need = (name, value, ok, note = '') => checks.push({ name, value, pass: !!ok, note })

const title = (html.match(/<title>([^<]*)<\/title>/i) ?? [])[1] ?? ''
need('title', title, title.length > 0 && title.length <= 60)
const desc = attr('meta', 'name', 'description')
need('meta description', desc, desc && desc.length > 0 && desc.length <= 160)
for (const p of ['og:type', 'og:site_name', 'og:locale', 'og:title', 'og:description', 'og:url', 'og:image', 'og:image:type', 'og:image:width', 'og:image:height', 'og:image:alt']) {
  const v = attr('meta', 'property', p)
  need(p, v, v && v.length > 0)
}
for (const n of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt', 'theme-color', 'viewport']) {
  const v = attr('meta', 'name', n)
  need(n, v, v && v.length > 0)
}
need('twitter:card value', attr('meta', 'name', 'twitter:card'), attr('meta', 'name', 'twitter:card') === 'summary_large_image')
need('og:url absolute https', attr('meta', 'property', 'og:url'), /^https:\/\/[^/]+\/?$/.test(attr('meta', 'property', 'og:url') ?? ''))
const ogImage = attr('meta', 'property', 'og:image') ?? ''
need('og:image absolute https', ogImage, /^https:\/\//.test(ogImage))
need('twitter:image == og:image', attr('meta', 'name', 'twitter:image'), attr('meta', 'name', 'twitter:image') === ogImage)

/** og:image のローカル実体（同一オリジンのパス部分を dist から探す） */
const localImg = join(dist, ogImage.replace(/^https?:\/\/[^/]+/, ''))
need('og:image exists in dist', localImg, existsSync(localImg))
if (existsSync(localImg)) {
  const b = readFileSync(localImg)
  const t = b.subarray(12, 16).toString()
  let w = 0, h = 0
  if (t === 'VP8X') { w = 1 + b.readUIntLE(24, 3); h = 1 + b.readUIntLE(27, 3) }
  else if (t === 'VP8 ') { w = b.readUInt16LE(26) & 0x3fff; h = b.readUInt16LE(28) & 0x3fff }
  else if (t === 'VP8L') { const x = b.readUInt32LE(21); w = (x & 0x3fff) + 1; h = ((x >> 14) & 0x3fff) + 1 }
  need('og:image is webp', t, ['VP8X', 'VP8 ', 'VP8L'].includes(t))
  need('og:image:width matches', `${w}`, String(w) === attr('meta', 'property', 'og:image:width'))
  need('og:image:height matches', `${h}`, String(h) === attr('meta', 'property', 'og:image:height'))
  need('og:image ≤ 5MB (X limit)', `${b.length}B`, b.length <= 5 * 1024 * 1024)
  need('og:image ≥ 600px wide (X/Discord large card)', `${w}`, w >= 600)
}

for (const [rel, extra] of [['icon', 'image/svg+xml'], ['icon', 'image/png'], ['apple-touch-icon', null], ['manifest', null], ['canonical', null]]) {
  const esc = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`<link\\b[^>]*\\brel=["']${rel}["'][^>]*${extra ? `type=["']${esc(extra)}["'][^>]*` : ''}>`, 'i')
  const m = html.match(re)
  const href = m ? (m[0].match(/href=["']([^"']*)["']/i) ?? [])[1] : null
  const local = href && href.startsWith('/') ? join(dist, href) : null
  need(`link rel=${rel}${extra ? ` (${extra})` : ''}`, href, href && (local ? existsSync(local) : /^https:\/\//.test(href)))
  if (local && existsSync(local) && rel === 'manifest') {
    try {
      const mf = JSON.parse(readFileSync(local, 'utf8'))
      need('manifest icons exist', mf.icons?.map((i) => i.src).join(','), Array.isArray(mf.icons) && mf.icons.every((i) => existsSync(join(dist, i.src))))
      need('manifest theme_color == meta theme-color', mf.theme_color, mf.theme_color === attr('meta', 'name', 'theme-color'))
    } catch (e) {
      need('manifest JSON valid', String(e), false)
    }
  }
  if (local && existsSync(local) && rel === 'apple-touch-icon') {
    const b = readFileSync(local)
    need('apple-touch-icon is PNG 180x180', `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`, b.subarray(1, 4).toString() === 'PNG' && b.readUInt32BE(16) === 180 && b.readUInt32BE(20) === 180)
  }
}
need('favicon.svg size small', `${statSync(join(dist, 'favicon.svg')).size}B`, statSync(join(dist, 'favicon.svg')).size < 4096)

const summary = { dist, allPass: checks.every((c) => c.pass), failed: checks.filter((c) => !c.pass).map((c) => c.name), checks }
if (out) writeFileSync(out, JSON.stringify(summary, null, 2))
console.log(JSON.stringify(summary, null, 2))
process.exit(summary.allPass ? 0 : 1)

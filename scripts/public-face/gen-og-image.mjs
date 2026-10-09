// CM-01 Public Face Pack v1：OGP 用 1200×630 画像を既存素材だけから作る（新規生成 AI・外部素材 0）。
//   PLAYWRIGHT_MODULE=<playwright/index.mjs> node scripts/public-face/gen-og-image.mjs [out=public/og-image.jpg]
// - 右側：既存の `public/assets/gods/ebisu/keyvisual-hero.webp`（1086×1448）を**切らずに**高さ 630 に収める（object-fit: contain）
// - 左側：正式名称「SEVEN GODS：共鳴カードバトル」・タグライン・「SEVENGODS（SGG）二次創作」の文字（HTML/CSS・OS フォント）
// - Chromium（Playwright）で 1200×630 を描画し JPEG（品質 86）で書き出す。sha256 は台帳に記録する（OS フォント依存のため
//   バイト列の決定論は保証しない。再生成したら sha256 を更新する）
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const out = process.argv[2] ?? 'public/og-image.jpg'
const pwPath = process.env.PLAYWRIGHT_MODULE
const { chromium } = pwPath ? await import(pathToFileURL(pwPath).href) : await import('playwright')

// about:blank からは file:// を読めないので data URI で埋め込む（既存ファイルをそのまま base64 にするだけ）
const dataUri = (path, mime) => `data:${mime};base64,${readFileSync(resolve(path)).toString('base64')}`
const hero = dataUri('public/assets/gods/ebisu/keyvisual-hero.webp', 'image/webp')
const icon = dataUri('public/favicon.svg', 'image/svg+xml')

const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>
  html,body{margin:0;width:1200px;height:630px;overflow:hidden}
  body{position:relative;font-family:"BIZ UDPGothic","Meiryo","Yu Gothic UI","Segoe UI",sans-serif;color:#f3e9d2;
    background:
      radial-gradient(ellipse 900px 520px at 18% -10%, #2c2f68 0%, transparent 60%),
      radial-gradient(ellipse 700px 500px at 100% 100%, #16294f66 0%, transparent 55%),
      linear-gradient(180deg,#0a0b1e 0%,#141230 55%,#070711 100%)}
  .hero{position:absolute;top:0;right:0;width:600px;height:630px;display:flex;justify-content:flex-end}
  .hero img{height:630px;width:auto;object-fit:contain;display:block}
  .fade{position:absolute;top:0;left:560px;width:140px;height:630px;background:linear-gradient(90deg,#141230 0%,rgba(20,18,48,.6) 55%,transparent 100%)}
  .text{position:absolute;left:72px;top:0;height:630px;width:560px;display:flex;flex-direction:column;justify-content:center;gap:14px}
  .eyebrow{display:flex;align-items:center;gap:12px;font-size:20px;letter-spacing:.32em;color:#b6b9d2}
  .eyebrow img{width:34px;height:34px}
  .title{font-family:"Segoe UI","Yu Gothic UI",sans-serif;font-weight:800;font-size:92px;line-height:1;letter-spacing:.02em;color:#fff;text-shadow:0 6px 30px rgba(0,0,0,.6)}
  .title b{color:#e8c15a}
  .genre{font-size:40px;font-weight:700;letter-spacing:.18em;color:#f3d98a;margin-top:2px}
  .tag{font-size:26px;color:#d7d9e8;margin-top:10px;letter-spacing:.06em}
  .credit{position:absolute;left:72px;bottom:28px;font-size:18px;color:#8e92ad;letter-spacing:.08em}
  .url{position:absolute;left:72px;bottom:58px;font-size:17px;color:#8e92ad;letter-spacing:.06em;font-family:"Segoe UI",sans-serif}
</style></head><body>
  <div class="hero"><img src="${hero}" alt=""></div><div class="fade"></div>
  <div class="text">
    <div class="eyebrow"><img src="${icon}" alt="">SEVENDAO GAMES</div>
    <div class="title">SEVEN <b>GODS</b></div>
    <div class="genre">共鳴カードバトル</div>
    <div class="tag">七柱の神と挑む、七日間の物語。</div>
  </div>
  <div class="credit">SEVENGODS（SGG）二次創作</div>
  <div class="url">seven-gods-game.vercel.app</div>
</body></html>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
await page.setContent(html, { waitUntil: 'load' })
await page.evaluate(() => Promise.all(Array.from(document.images).map((i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r })))))
await page.evaluate(() => document.fonts.ready)
const loaded = await page.evaluate(() => Array.from(document.images).map((i) => ({ src: i.src.slice(0, 24), w: i.naturalWidth, h: i.naturalHeight })))
if (loaded.some((i) => i.w === 0)) throw new Error('image failed to load: ' + JSON.stringify(loaded))
const buf = await page.screenshot({ type: 'jpeg', quality: 86, clip: { x: 0, y: 0, width: 1200, height: 630 } })
await browser.close()
writeFileSync(out, buf)
const sha = createHash('sha256').update(readFileSync(out)).digest('hex')
console.log(JSON.stringify({ out, bytes: buf.length, sha256: sha, images: loaded }, null, 1))

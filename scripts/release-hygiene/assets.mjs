// Release Hygiene Gate：public/assets（＝そのまま配信される）の参照状況を監査する。
//   node scripts/release-hygiene/assets.mjs            … 参照/未参照の一覧
//   node scripts/release-hygiene/assets.mjs --json out … JSON で書き出す
//
// 「ソースのどこからも参照されていないファイル」を洗い出す。テンプレートリテラルで
// 組み立てるパス（`/assets/se/${name}.wav` や `/assets/otomo/${id}/doji_320.webp`）も
// 拾えるよう、ディレクトリ＋ファイル名の断片でも突き合わせる。
// 元画像を消すためではなく、**配信対象から外してよいか**を判断するための監査。
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, basename, relative } from 'node:path'

const SRC_DIRS = ['src']
const EXTRA_FILES = ['index.html']
const ASSET_ROOT = 'public/assets'

function collect(dir, filter, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) collect(p, filter, out)
    else if (filter(name)) out.push(p)
  }
  return out
}

const sources = [
  ...SRC_DIRS.flatMap((d) => collect(d, (f) => /\.(ts|tsx|css|json|html)$/.test(f))),
  ...EXTRA_FILES,
]
const hay = sources.map((f) => readFileSync(f, 'utf8')).join('\n')

const files = collect(ASSET_ROOT, () => true).map((p) => p.split('\\').join('/'))

/** 参照判定：フルパス・ファイル名・（動的組み立て用に）ディレクトリ＋末尾要素 */
function isReferenced(file) {
  const url = '/' + relative('public', file).split('\\').join('/')
  if (hay.includes(url)) return 'url'
  const base = basename(file)
  // コメント内の言及は参照ではないので、コード上の出現だけを見る（引用符/バッククォートの内側）
  const quoted = new RegExp(`['"\`][^'"\`]*${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
  if (quoted.test(hay)) return 'name'
  // `/assets/<dir>/${id}/<suffix>` のような動的パス：ディレクトリ名と末尾の断片が両方出るか
  const parts = url.split('/')
  const tail = parts[parts.length - 1]
  const parentDir = parts[parts.length - 2]
  const dynamic = new RegExp(`\\$\\{[^}]+\\}/${tail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
  if (dynamic.test(hay)) return 'dynamic'
  const dirDynamic = new RegExp(`/${parentDir}/\\$\\{[^}]+\\}\\.${tail.split('.').pop()}`)
  if (dirDynamic.test(hay)) return 'dynamic-dir'
  // 拡張子まで変数のケース（`/assets/bgm/${name}.${AUDIO_EXT}`）：
  // そのディレクトリ直下のファイルはすべて配信対象とみなす
  const dirAnyExt = new RegExp(`/${parentDir}/\\$\\{[^}]+\\}\\.\\$\\{`)
  if (dirAnyExt.test(hay)) return 'dynamic-ext'
  // ディレクトリ自体を base 文字列として持つケース（`SE_BASE_PATH = '/assets/se/'`）。
  // 「引用符で閉じている」または直後が `${` のときだけ base とみなす
  // （`'/assets/cards/card_xxx.webp'` のような full path は base ではないので対象外）
  const dirUrl = parts.slice(0, -1).join('/') + '/'
  const esc = dirUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (new RegExp(`['"\`]${esc}(['"\`]|\\$\\{)`).test(hay)) return 'dynamic-base'
  return null
}

const rows = files.map((f) => ({ file: f, size: statSync(f).size, ref: isReferenced(f) }))
const mb = (n) => +(n / 1048576).toFixed(2)
const used = rows.filter((r) => r.ref)
const unused = rows.filter((r) => !r.ref)
const byDir = {}
for (const r of unused) {
  const d = r.file.split('/').slice(0, -1).join('/')
  byDir[d] = byDir[d] ?? { files: 0, size: 0, examples: [] }
  byDir[d].files++
  byDir[d].size += r.size
  if (byDir[d].examples.length < 3) byDir[d].examples.push(basename(r.file))
}

const summary = {
  totalMb: mb(rows.reduce((a, r) => a + r.size, 0)),
  referenced: { files: used.length, mb: mb(used.reduce((a, r) => a + r.size, 0)) },
  unreferenced: { files: unused.length, mb: mb(unused.reduce((a, r) => a + r.size, 0)) },
  unreferencedByDir: Object.fromEntries(
    Object.entries(byDir)
      .sort((a, b) => b[1].size - a[1].size)
      .map(([d, v]) => [d, { files: v.files, mb: mb(v.size), examples: v.examples }]),
  ),
}
const outIdx = process.argv.indexOf('--json')
if (outIdx > 0 && process.argv[outIdx + 1]) writeFileSync(process.argv[outIdx + 1], JSON.stringify({ summary, rows }, null, 1))
console.log(JSON.stringify(summary, null, 1))

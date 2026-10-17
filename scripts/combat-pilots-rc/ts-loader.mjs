// 統合 RC Gate 用：src/core の TS を node 単体（type stripping・Node 24）で読むための resolve hook。
// src/core は import 指定子が `.js`（tsc 流儀）なので、相対 `.js` が無ければ同名の `.ts` へ振り替える。
// 使い方：node --import ./scripts/combat-pilots-rc/ts-loader.mjs <script.mjs>
// vitest・ブラウザ・build には一切関係しない（Gate の機械確認専用・runtime 変更 0）。
import { register } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

register(
  'data:text/javascript,' +
    encodeURIComponent(`
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
export async function resolve(specifier, context, next) {
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && specifier.endsWith('.js') && context.parentURL) {
    const url = new URL(specifier, context.parentURL)
    const p = fileURLToPath(url)
    if (!existsSync(p)) {
      const ts = p.slice(0, -3) + '.ts'
      if (existsSync(ts)) return next(specifier.slice(0, -3) + '.ts', context)
    }
  }
  return next(specifier, context)
}
`),
  pathToFileURL(fileURLToPath(import.meta.url)),
)
void existsSync

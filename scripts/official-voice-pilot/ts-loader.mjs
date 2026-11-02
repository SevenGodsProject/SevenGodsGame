// Crisis Pilot v1 Gate 用：src の TS を node 単体（type stripping・Node 24）で読む resolve hook。
// scripts/combat-pilots-rc/ts-loader.mjs（相対 `.js` → `.ts`）に加えて、拡張子なしの相対指定子
// （`./reducer`・`../../core/types`＝vite 流儀）を `.ts` → `.tsx` → `/index.ts` の順で振り替える。
// 使い方：node --import ./scripts/official-voice-pilot/ts-loader.mjs <script.mjs>
// vitest・ブラウザ・build には一切関係しない（Gate の機械確認専用・runtime 変更 0）。
import { register } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

register(
  'data:text/javascript,' +
    encodeURIComponent(`
import { existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const isFile = (p) => existsSync(p) && statSync(p).isFile()
export async function resolve(specifier, context, next) {
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL) {
    const p = fileURLToPath(new URL(specifier, context.parentURL))
    if (specifier.endsWith('.js')) {
      if (!isFile(p)) {
        const ts = p.slice(0, -3) + '.ts'
        if (isFile(ts)) return next(specifier.slice(0, -3) + '.ts', context)
      }
    } else if (!/\\.[a-z]+$/i.test(specifier) && !isFile(p)) {
      for (const suffix of ['.ts', '.tsx', '/index.ts']) {
        if (isFile(p + suffix)) return next(specifier + suffix, context)
      }
    }
  }
  return next(specifier, context)
}
`),
  pathToFileURL(fileURLToPath(import.meta.url)),
)

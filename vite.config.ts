import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * CM-01 Public Face Pack v1：アプリ内 version 表示（`src/buildInfo.ts`）に使う 2 つの文字列をビルド時に埋め込む。
 * - `__APP_VERSION__`：`package.json` の version
 * - `__BUILD_SHA__`：Vercel の `VERCEL_GIT_COMMIT_SHA`（本番）→ `VITE_COMMIT_SHA`（手動指定）→ ローカル git → `local`
 * 実行時に環境変数は読まない（クライアントへ出るのはこの 2 文字列だけ）。
 */
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

function shortSha(): string {
  const env = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VITE_COMMIT_SHA || process.env.GITHUB_SHA
  if (env) return env.slice(0, 7)
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || 'local'
  } catch {
    return 'local'
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_SHA__: JSON.stringify(shortSha()),
  },
})

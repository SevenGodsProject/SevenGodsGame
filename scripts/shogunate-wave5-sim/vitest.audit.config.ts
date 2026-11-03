import { defineConfig } from 'vitest/config'
import path from 'node:path'

// W5 将軍家 最終（康虎 Boss）Preflight sim 専用 config（enemy-star-audit・W4 と同じ流儀）。`npm test` の既定 include（*.test）には含まれない。
//   npx vitest run --config scripts/shogunate-wave5-sim/vitest.audit.config.ts
export default defineConfig({
  root: path.resolve(__dirname, '../..'),
  test: {
    include: ['scripts/shogunate-wave5-sim/**/*.audit.ts'],
    testTimeout: 60 * 60 * 1000,
    hookTimeout: 60 * 60 * 1000,
    fileParallelism: false,
    maxWorkers: 1,
    pool: 'forks',
  },
})

import { defineConfig } from 'vitest/config'
import path from 'node:path'

// W4 将軍家 第四陣 Preflight sim 専用 config（enemy-star-audit と同じ流儀）。`npm test` の既定 include（*.test）には含まれない。
//   npx vitest run --config scripts/shogunate-wave4-sim/vitest.audit.config.ts
export default defineConfig({
  root: path.resolve(__dirname, '../..'),
  test: {
    include: ['scripts/shogunate-wave4-sim/**/*.audit.ts'],
    testTimeout: 60 * 60 * 1000,
    hookTimeout: 60 * 60 * 1000,
    fileParallelism: false,
    maxWorkers: 1,
    pool: 'forks',
  },
})

import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Enemy ★ Difficulty Audit 専用 config（ranking-v1-1-fairness の流儀）。`npm test`（既定 include は *.test/*.spec）には含まれない。
//   npx vitest run --config scripts/enemy-star-audit/vitest.audit.config.ts
// 単一プロセス・直列（6GB RAM 配慮）。
export default defineConfig({
  root: path.resolve(__dirname, '../..'),
  test: {
    include: ['scripts/enemy-star-audit/**/*.audit.ts'],
    testTimeout: 60 * 60 * 1000,
    hookTimeout: 60 * 60 * 1000,
    fileParallelism: false,
    maxWorkers: 1,
    pool: 'forks',
  },
})

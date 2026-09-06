import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Phase 4.0 Daily Ranking Competitive Gate 専用config。
// `npm test`（既定config）には `.audit.ts` は含まれない。
export default defineConfig({
  root: path.resolve(__dirname, '../..'),
  test: {
    include: ['scripts/phase4-daily-gate/**/*.audit.ts'],
    testTimeout: 60 * 60 * 1000,
    hookTimeout: 60 * 60 * 1000,
  },
})

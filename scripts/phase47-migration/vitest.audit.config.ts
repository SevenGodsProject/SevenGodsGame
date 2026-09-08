import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Phase 4.7 DB Migration Gate 専用config（Dry Run）。
// `npm test`（既定config）には `.audit.ts` は含まれない。
export default defineConfig({
  root: path.resolve(__dirname, '../..'),
  test: {
    include: ['scripts/phase47-migration/**/*.audit.ts'],
    testTimeout: 10 * 60 * 1000,
    hookTimeout: 10 * 60 * 1000,
  },
})

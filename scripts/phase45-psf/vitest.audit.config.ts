import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Phase 4.5 Production Security & Fairness Gate 専用config。
// `npm test`（既定config）には `.audit.ts` は含まれない（Phase 4.0 harness と同じ流儀）。
export default defineConfig({
  root: path.resolve(__dirname, '../..'),
  test: {
    include: ['scripts/phase45-psf/**/*.audit.ts'],
    testTimeout: 30 * 60 * 1000,
    hookTimeout: 30 * 60 * 1000,
  },
})

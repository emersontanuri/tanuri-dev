import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 30_000,
    // The generated-output seam builds the site once before asserting.
    hookTimeout: 600_000,
  },
})

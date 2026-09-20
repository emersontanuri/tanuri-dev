import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // The content check under test reaches the content model through the
      // alias Nuxt gives it, so the test needs the same one.
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 30_000,
    // The generated-output seam builds the site once before asserting.
    hookTimeout: 600_000,
  },
})

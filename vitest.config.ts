/**
 * Vitest configuration — extends the main vite config so tests get the
 * same `@game/*`, `@engine/*`, `@three/*` etc. path aliases.
 *
 * Node environment by default since we're only unit-testing pure logic
 * modules (no DOM, no React). The day we start testing components, we
 * flip to `jsdom` per test file via `// @vitest-environment jsdom`.
 */
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      globals: false,
    },
  }),
)

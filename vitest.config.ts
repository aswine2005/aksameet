import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // tsconfig says `preserve` for Next's own compiler; tests need real JSX.
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // The store tests start a real mongod; the first run downloads it.
    testTimeout: 60_000,
    hookTimeout: 180_000,
  },
});

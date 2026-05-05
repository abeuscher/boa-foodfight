import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**', 'out/**'],
    globals: false,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['engine/**/*.ts', 'ai/**/*.ts', 'harness/**/*.ts', 'critics/**/*.ts'],
    },
  },
});

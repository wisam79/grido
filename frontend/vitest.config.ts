import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react({ fastRefresh: false })],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    css: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/.{idea,git,cache,output,temp}/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/wailsjs/**',
        '**/coverage/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
      ],
      thresholds: {
        statements: 35,
        branches: 28,
        functions: 35,
        lines: 35
      }
    },
  },
});

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react({ fastRefresh: false })],
  resolve: {
    mainFields: ['module', 'jsnext:main', 'jsnext', 'main'],
    alias: [
      { find: '@', replacement: resolve(__dirname, './src') },
      { find: /^konva$/, replacement: resolve(__dirname, './node_modules/konva/lib/index.js') }
    ]
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    css: true,
    pool: 'threads',
    server: {
      deps: {
        inline: ['konva', 'react-konva']
      }
    },
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
        '**/svg-paths.ts',
        '**/vision_bundle*',
      ],
      // 📊 الحدود تشمل الآن src/components بالكامل (كانت مستثناة سابقاً —
      // نقطة عمياء في القياس). ارفعها تدريجياً مع كل اختبارات جديدة.
      thresholds: {
        statements: 36,
        branches: 30,
        functions: 32,
        lines: 36
      }
    },
  },
});

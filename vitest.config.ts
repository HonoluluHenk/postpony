import { resolve } from 'path';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}', 'src/public/assets/js/*.js'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/public/assets/js/*.spec.js',
        'src/public/assets/vendor/**',
        'src/public/assets/js/main.js',
      ],
    },
    projects: [
      {
        test: {
          name: 'unit',
          typecheck: {enabled: true},
          globals: true,
          environment: 'node',
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['node_modules'],
        },
      },
      {
        test: {
          name: 'browser',
          globals: true,
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{browser: 'chromium'}],
          },
          include: ['src/public/assets/js/*.spec.js'],
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: [
        'hono',
        '@hono/node-server',
        'eta',
        'zod',
        'node:http',
        'node:path',
        'node:fs',
        'node:url'
      ],
    },
    ssr: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});

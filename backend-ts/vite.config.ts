import path from 'path';
import { defineConfig } from 'vite';

const resolvePath = (dir: string) => path.resolve(__dirname, dir);

export default defineConfig({
  build: {
    ssr: true,
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,

    // *** CRITICAL: target modern JS so esbuild won't downlevel top-level await ***
    target: 'es2022',     // or 'esnext'

    // library output as ESM
    lib: {
      entry: resolvePath('src/index.ts'),
      fileName: () => 'index.js',
      formats: ['es'],
    },

    // ensure rollup keeps ES module output semantics
    rollupOptions: {
      output: {
        format: 'es'
      },
      external: [
        'connect-redis',
        'cookie-parser',
        'cors',
        'dotenv',
        'express',
        'express-session',
        'mongoose',
        'pino',
        'redis',
      ],
    },
  },
  resolve: {
    alias: {
      '@root': resolvePath('src'),
      '@app': resolvePath('src/app'),
      '@libs': resolvePath('src/libs'),
      '@services': resolvePath('src/services'),
    },
  },
});

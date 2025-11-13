import path from 'path';
import { defineConfig } from 'vite';

const resolvePath = (dir: string) => path.resolve(__dirname, dir);

export default defineConfig({
  build: {
    ssr: true,
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: resolvePath('src/index.ts'),
      fileName: () => 'index.js',
      formats: ['es'],
    },
    rollupOptions: {
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

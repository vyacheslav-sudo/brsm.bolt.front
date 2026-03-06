import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  resolve: {
    alias: command === 'serve'
      ? {
          inferno: 'inferno/dist/index.dev.esm.js'
        }
      : {}
  },
  esbuild: {
    loader: 'jsx',
    include: /src[\\/].*\.[jt]sx?$/,
    exclude: []
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
        '.jsx': 'jsx'
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js']
  }
}));

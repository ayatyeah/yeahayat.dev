import { createRequire } from 'node:module';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const resolveModule = createRequire(import.meta.url).resolve;

export default defineConfig(({ command }) => ({
  // Keep animation and glTF-only Three modules in the on-demand folio chunk.
  resolve: command === 'build' ? {
    alias: [{ find: /^three$/, replacement: resolveModule('three/src/Three.js') }]
  } : undefined,
  optimizeDeps: { include: ['three/examples/jsm/loaders/GLTFLoader.js'] },
  plugins: [react()],
  server: {
    proxy: {
      // В dev-режиме фронт ходит в локальный Express за формой.
      '/api': 'http://localhost:8080'
    }
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom']
        }
      }
    }
  }
}));

import { createRequire } from 'node:module';
import { defineConfig } from 'vite';
import { PROJECTS } from './src/data/projects';
import react from '@vitejs/plugin-react';

const resolveModule = createRequire(import.meta.url).resolve;

export default defineConfig(({ command }) => ({
  // Keep animation and glTF-only Three modules in the on-demand folio chunk.
  resolve: command === 'build' ? {
    alias: [{ find: /^three$/, replacement: resolveModule('three/src/Three.js') }]
  } : undefined,
  optimizeDeps: { include: ['three/examples/jsm/loaders/GLTFLoader.js'] },
  plugins: [react(), {
    name: 'case-previews',
    enforce: 'post',
    generateBundle(_, bundle) {
      const index = bundle['index.html'];
      if (!index || index.type !== 'asset') this.error('Missing built HTML');
      const escape = (s: string) => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
      for (const project of PROJECTS) {
        const title = escape(project.title + ' · ' + project.label.ru + ' · YeahAyat');
        const description = escape(project.benefit.ru);
        const url = 'https://yeahayat.dev/work/' + project.slug;
        const html = String(index.source)
          .replace(/<title>.*?<\/title>/, '<title>' + title + '</title>')
          .replace(/(property="og:title" content=")[^"]*/, '$1' + title)
          .replace(/(property="og:description" content=")[^"]*/, '$1' + description)
          .replace(/(name="description"\s+content=")[^"]*/, '$1' + description)
          .replace('/logo_mark.png', 'https://yeahayat.dev/share/' + project.slug + '.jpg')
          .replace('</head>', '<meta property="og:url" content="' + url + '"><link rel="canonical" href="' + url + '"></head>');
        this.emitFile({type: 'asset', fileName: 'case-pages/' + project.slug + '.html', source: html});
      }
    }
  }],
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

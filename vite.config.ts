import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// import { crx } from '@crxjs/vite-plugin';
// import manifest from './public/manifest.json';

export default defineConfig({
  plugins: [
    react(),
    // crx({ manifest }) // 临时禁用Chrome扩展插件，以web模式运行
  ],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        background: 'src/background.ts'
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});

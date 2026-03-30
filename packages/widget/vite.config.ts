import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@bookify/shared': resolve(__dirname, '../shared/src'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/web-component.ts'),
      formats: ['es', 'iife'],
      name: 'BookifyWidget',
      fileName: (format) => {
        if (format === 'iife') return 'bookify-widget.js';
        return 'bookify-widget.esm.js';
      },
    },
    rollupOptions: {
      output: {
        assetFileNames: 'bookify-widget.[ext]',
      },
    },
    cssCodeSplit: false,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});

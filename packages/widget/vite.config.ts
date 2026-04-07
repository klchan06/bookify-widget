import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// SPA build for the widget preview AND the customer manage page.
// For embedding the widget on external sites, customers use an iframe
// pointing to this site, OR a separate library bundle (built via vite.lib.config.ts).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@bookify/shared': resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    port: 3002,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});

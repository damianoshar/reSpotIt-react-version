import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Android 7 devices can fall back to a factory Chrome 64 WebView, which
    // cannot parse `?.`/`??` (Chrome 80+). Targeting es2017 keeps the bundle
    // loadable there instead of rendering a black screen.
    target: 'es2017',
  },
  server: {
    host: true,
    port: 3002,
    strictPort: true,
  },
  // Ensure Capacitor assets resolve correctly
  base: './',
  optimizeDeps: {
    include: ['papaparse', 'jeep-sqlite/loader'],
  },
});

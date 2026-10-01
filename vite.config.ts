import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// The Laravel API (api/my-api). The dev server forwards API calls, the login cookie endpoint and uploaded
// files to it, so the browser sees one site and the secure session cookie just works.
const API_URL = process.env.API_URL || 'http://127.0.0.1:8000';
const proxy = {
  '/api': { target: API_URL },
  '/sanctum': { target: API_URL },
  '/storage': { target: API_URL }
};

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.')
      }
    },
    server: {
      port: 3000,
      strictPort: true,
      proxy,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {}
    },
    preview: {
      port: 3000,
      strictPort: true,
      proxy
    }
  };
});

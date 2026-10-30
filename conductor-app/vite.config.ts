import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: '/conductor-app/',
    plugins: [react()],
    // Prebundle the scanner dependency so mobile browsers behind the root
    // reverse proxy never have to fetch Vite's Windows @fs dynamic-import URL.
    optimizeDeps: { include: ['@zxing/browser'] },
    server: {
      host: '127.0.0.1', port: 5175, strictPort: true,
      proxy: { '/railbus-api': { target: env.VITE_RAILBUS_BACKEND_URL || 'http://127.0.0.1:8008', changeOrigin: true, rewrite: path => path.replace(/^\/railbus-api/, '') } },
    },
  };
});

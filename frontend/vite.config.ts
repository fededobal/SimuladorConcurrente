import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El backend Spring Boot corre en :8080. En desarrollo el frontend hace peticiones a
// /api/... y Vite las redirige, evitando CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});

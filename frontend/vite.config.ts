import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // API бэкенда (FastAPI на :8000)
      '/api': 'http://localhost:8000',
    },
  },
});

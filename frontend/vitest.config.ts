import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Конфиг тестов (Vitest + jsdom + Testing Library, стек из AGENTS.md).
// Отдельный файл, чтобы не смешивать с production-конфигом vite.config.ts.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});

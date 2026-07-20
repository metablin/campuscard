import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// vitest запускается без globals, поэтому авто-cleanup Testing Library
// не срабатывает — очищаем DOM после каждого теста вручную
afterEach(() => {
  cleanup();
});

// VKUI использует matchMedia (адаптивность, prefers-color-scheme) — в jsdom его нет,
// подменяем заглушкой
window.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
})) as typeof window.matchMedia;

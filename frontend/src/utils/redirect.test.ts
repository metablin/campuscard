import { describe, expect, it } from 'vitest';

import { safeFromPath } from './redirect';

describe('utils/redirect safeFromPath', () => {
  it('разрешает внутренние пути', () => {
    expect(safeFromPath('/app')).toBe('/app');
    expect(safeFromPath('/u/anna-smirnova')).toBe('/u/anna-smirnova');
    expect(safeFromPath('/app/edit?tab=links')).toBe('/app/edit?tab=links');
  });

  it('отсекает внешние URL и protocol-relative // (open redirect)', () => {
    expect(safeFromPath('https://evil.com')).toBe('/app');
    expect(safeFromPath('//evil.com')).toBe('/app');
    expect(safeFromPath('javascript:alert(1)')).toBe('/app');
    expect(safeFromPath('evil.com')).toBe('/app');
  });

  it('пустое/отсутствующее значение → /app', () => {
    expect(safeFromPath(null)).toBe('/app');
    expect(safeFromPath('')).toBe('/app');
  });
});

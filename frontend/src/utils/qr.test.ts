import { describe, expect, it } from 'vitest';

import { createQrSvg, qrSvgDataUrl } from './qr';

describe('utils/qr', () => {
  const url = 'https://example.com/u/anna-smirnova';

  it('createQrSvg возвращает SVG заданного размера', () => {
    const svg = createQrSvg(url);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('256');
  });

  it('createQrSvg включает логотип VK (isShowLogo)', () => {
    const svg = createQrSvg(url);
    // логотип встраивается в SVG: разметки заметно больше, чем у «голого» кода
    const MIN_SVG_LEN_WITH_LOGO = 1000;
    expect(svg.length).toBeGreaterThan(MIN_SVG_LEN_WITH_LOGO);
  });

  it('qrSvgDataUrl — data URL с utf-8 и url-encoded SVG', () => {
    const dataUrl = qrSvgDataUrl(url);
    expect(dataUrl.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    // SVG экранирован через encodeURIComponent: сырого "<svg" быть не должно
    expect(dataUrl).not.toContain('<svg');
    expect(dataUrl).toContain('%3Csvg');
    // декодируется обратно в валидный SVG
    const svg = decodeURIComponent(dataUrl.split(',')[1]);
    expect(svg).toContain('<svg');
  });
});

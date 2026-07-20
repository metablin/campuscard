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
    // vk-qr встраивает логотип как <use href="#vk_logo…"> — проверяем
    // конкретную разметку, а не косвенные признаки вроде длины SVG
    expect(svg).toMatch(/<use[^>]*href="#vk_logo/);
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

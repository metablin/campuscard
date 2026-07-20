import { createQR } from '@vkontakte/vk-qr';

/** Размер стороны QR в px (SVG квадратный). */
const QR_SIZE = 256;

/**
 * Генерация QR-кода визитки через открытый пакет VKCOM/vk-qr (MIT).
 * Возвращает SVG-строку с логотипом VK в центре.
 */
export function createQrSvg(url: string): string {
  return createQR(url, {
    qrSize: QR_SIZE,
    isShowLogo: true,
    isShowBackground: true,
    ecc: 2,
  });
}

/**
 * SVG → data URL для безопасного рендера через <img>
 * (без dangerouslySetInnerHTML).
 */
export function qrSvgDataUrl(url: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(createQrSvg(url))}`;
}

/**
 * Отрисовывает QR-SVG в canvas и скачивает результат как PNG.
 */
export function downloadQrPng(url: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth || QR_SIZE;
      canvas.height = image.naturalHeight || QR_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2d недоступен'));
        return;
      }
      ctx.drawImage(image, 0, 0);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = filename;
      link.click();
      resolve();
    };
    image.onerror = () => reject(new Error('Не удалось отрисовать QR-код'));
    image.src = qrSvgDataUrl(url);
  });
}

/** Проверка схем URL — зеркало правил бэкенда (см. frontend/src/pages/edit/validation.ts). */

const ALLOWED_URL_SCHEMES = ['https://', 'http://', 'mailto:', 'tel:'];

export function isValidUrlScheme(url: string): boolean {
  return ALLOWED_URL_SCHEMES.some((scheme) => url.startsWith(scheme));
}

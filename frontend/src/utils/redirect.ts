/**
 * Безопасный «куда вернуться после входа» из query-параметра ?from=.
 * Разрешены только внутренние пути (/app, /u/...): внешние URL и
 * protocol-relative //host отсекаются — защита от open redirect.
 */
export function safeFromPath(from: string | null): string {
  if (from && from.startsWith('/') && !from.startsWith('//')) {
    return from;
  }
  return '/app';
}

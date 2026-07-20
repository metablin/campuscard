import { apiFetch } from './client';
import type { PublicCardOut } from './types';

/** Публичные эндпоинты (без авторизации). */
export const publicApi = {
  /** GET /api/u/{slug} — публичная визитка (404, если нет или не опубликована). */
  getCard: (slug: string) => apiFetch<PublicCardOut>(`/u/${encodeURIComponent(slug)}`),
};

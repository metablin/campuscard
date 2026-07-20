import { apiFetch, apiJson, apiPost } from './client';
import type { CardIn, CardOut, SlugCheckOut } from './types';

/** Эндпоинты /api/cards/me* и /api/slug/* (docs/api-contract.md). */
export const cardsApi = {
  /** GET /api/cards/me — визитка владельца (404, если не создана). */
  getMy: () => apiFetch<CardOut>('/cards/me'),

  /** PUT /api/cards/me — создание/обновление (upsert). */
  update: (card: CardIn) => apiJson<CardOut>('/cards/me', 'PUT', card),

  /** POST /api/cards/me/publish — переключает публикацию. */
  togglePublish: () => apiPost<{ is_published: boolean }>('/cards/me/publish'),

  /** DELETE /api/cards/me — удаляет визитку. */
  deleteMy: () => apiFetch<{ ok: true }>('/cards/me', { method: 'DELETE' }),

  /** GET /api/slug/check?slug=… — доступность slug. */
  checkSlug: (slug: string) =>
    apiFetch<SlugCheckOut>(`/slug/check?slug=${encodeURIComponent(slug)}`),

  /** GET /api/slug/generate?full_name=… — свободный slug из ФИО. */
  generateSlug: (fullName: string) =>
    apiFetch<{ slug: string }>(
      `/slug/generate?full_name=${encodeURIComponent(fullName)}`,
    ),
};

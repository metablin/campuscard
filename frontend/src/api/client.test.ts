/* eslint-disable @typescript-eslint/no-magic-numbers -- HTTP-статусы в моках */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiFetch } from './client';

/** Подмена глобального fetch ответом с заданным статусом и телом. */
function mockFetch(status: number, body: string, contentType = 'application/json') {
  return vi.fn().mockResolvedValue(
    new Response(body, { status, headers: { 'Content-Type': contentType } }),
  );
}

describe('api/client apiFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('успешный ответ — распарсенный JSON', async () => {
    vi.stubGlobal('fetch', mockFetch(200, '{"status":"ok"}'));
    await expect(apiFetch<{ status: string }>('/health')).resolves.toEqual({ status: 'ok' });
  });

  it('ошибка с {"detail": "..."} — ApiError с текстом detail', async () => {
    vi.stubGlobal('fetch', mockFetch(404, '{"detail":"Визитка не найдена"}'));
    const err = await apiFetch('/u/nope').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(404);
    expect((err as ApiError).message).toBe('Визитка не найдена');
  });

  it('ошибка с не-JSON телом — дефолтный текст «Ошибка <status>»', async () => {
    vi.stubGlobal('fetch', mockFetch(502, 'Bad Gateway', 'text/plain'));
    const err = await apiFetch('/u/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toBe('Ошибка 502');
  });

  it('пустое тело при успехе — undefined, а не исключение', async () => {
    // 204 не допускает тело, поэтому мок без mockFetch
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(apiFetch('/cards/me')).resolves.toBeUndefined();
  });

  it('401 на /auth/me — ApiError без редиректа на /login', async () => {
    vi.stubGlobal('fetch', mockFetch(401, '{"detail":"Не авторизован"}'));
    const err = await apiFetch('/auth/me').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
    expect(window.location.pathname).not.toBe('/login');
  });
});

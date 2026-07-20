/**
 * Базовый fetch-клиент для API CampusCard.
 *
 * - сессия передаётся httpOnly-кукой, поэтому всегда credentials: 'include';
 * - 401 на любом запросе (кроме /api/auth/*) означает протухшую сессию →
 *   редирект на /login (возврат — на текущую страницу через ?from=);
 * - тело ошибки по контракту: { "detail": "текст на русском" }.
 */
export class ApiError extends Error {
  public constructor(
    public readonly status: number,
    detail: string,
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

const HTTP_UNAUTHORIZED = 401;

const AUTH_PATHS = ['/auth/dev', '/auth/vkid', '/auth/me', '/auth/logout'];

function redirectToLogin(): void {
  const { pathname, search } = window.location;
  if (pathname === '/login') {
    return;
  }
  const from = encodeURIComponent(pathname + search);
  window.location.assign(`/login?from=${from}`);
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    ...init,
  });

  if (response.status === HTTP_UNAUTHORIZED && !AUTH_PATHS.includes(path)) {
    redirectToLogin();
    // запрос не будет выполнен повторно — страница уходит на /login
    throw new ApiError(HTTP_UNAUTHORIZED, 'Не авторизован');
  }

  if (!response.ok) {
    let detail = `Ошибка ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === 'string') {
        detail = body.detail;
      }
    } catch {
      // тело не JSON — оставляем текст по умолчанию
    }
    throw new ApiError(response.status, detail);
  }

  // 204/пустое тело — не ошибка, хотя JSON там нет
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** POST без тела (dev-логин, publish, logout). */
export function apiPost<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'POST' });
}

/** POST/PUT с JSON-телом. */
export function apiJson<T>(path: string, method: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Базовый fetch-клиент для публичного API CampusCard.
 * Мини-приложение использует только публичный эндпоинт (без авторизации).
 * Тело ошибки по контракту: { "detail": "текст на русском" }.
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

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, init);

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

  return (await response.json()) as T;
}

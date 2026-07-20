import { apiFetch, apiJson, apiPost } from './client';
import type { MeOut, UserOut } from './types';

/** Эндпоинты /api/auth/* (docs/api-contract.md). */
export const authApi = {
  /** GET /api/auth/me — текущий пользователь и его визитка. */
  me: () => apiFetch<MeOut>('/auth/me'),

  /** POST /api/auth/dev — вход демо-пользователем (только при DEV_AUTH=true). */
  loginDev: () => apiPost<UserOut>('/auth/dev'),

  /** POST /api/auth/vkid — обмен кода VK ID на сессию. */
  loginVkid: (code: string, codeVerifier: string, deviceId: string) =>
    apiJson<UserOut>('/auth/vkid', 'POST', {
      code,
      code_verifier: codeVerifier,
      device_id: deviceId,
    }),

  /** POST /api/auth/logout — удаляет сессионную куку. */
  logout: () => apiPost<{ ok: true }>('/auth/logout'),
};

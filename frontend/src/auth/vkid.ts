import * as VKID from '@vkid/sdk';

/**
 * Авторизация через VK ID (OAuth 2.1 + PKCE).
 *
 * SDK сам генерирует code_verifier/state и кладёт их в куки
 * `vkid_sdk:codeVerifier` / `vkid_sdk:state` (см. utils/cookie в @vkid/sdk).
 * После редиректа на id.vk.com пользователь возвращается на
 * VITE_VK_REDIRECT_URI с ?code=&state=&device_id= — обмен кода на сессию
 * выполняет бэкенд (POST /api/auth/vkid).
 */

let configured = false;

/** APP_ID из .env фронта; пустая строка — VK ID не настроен. */
export const VK_APP_ID = import.meta.env.VITE_VK_APP_ID ?? '';

export function isVkAuthEnabled(): boolean {
  return VK_APP_ID !== '';
}

/** Инициализация конфига SDK (идемпотентно). */
export function initVkAuth(): void {
  if (configured || !isVkAuthEnabled()) {
    return;
  }
  VKID.Config.init({
    app: Number(VK_APP_ID),
    redirectUrl: import.meta.env.VITE_VK_REDIRECT_URI,
    // codeVerifier и state генерирует сам SDK (см. README @vkid/sdk)
  });
  configured = true;
}

/** Редирект на страницу авторизации id.vk.com. */
export function loginWithVkId(): Promise<unknown> {
  initVkAuth();
  return VKID.Auth.login();
}

/** Чтение куки SDK по имени (state / codeVerifier). */
function readSdkCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )vkid_sdk:${name}=([^;]*)`),
  );
  const VALUE_GROUP = 1;
  return match ? decodeURIComponent(match[VALUE_GROUP]) : null;
}

/** code_verifier, сгенерированный SDK перед редиректом. */
export function getVkCodeVerifier(): string | null {
  return readSdkCookie('codeVerifier');
}

/** state, сгенерированный SDK (для сверки с ответом id.vk.com). */
export function getVkState(): string | null {
  return readSdkCookie('state');
}

/** Очистка служебных куки SDK после завершения входа. */
export function clearVkSdkCookies(): void {
  for (const name of ['state', 'codeVerifier']) {
    document.cookie = `vkid_sdk:${name}=; max-age=0; path=/`;
  }
}

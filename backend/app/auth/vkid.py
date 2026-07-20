"""HTTP-клиент VK ID: обмен кода на токен и получение профиля.

Endpoint'ы и параметры — строго по официальной документации VK ID:
https://id.vk.com/about/business/go/docs/ru/vkid/latest/vk-id/connection/api-description
- обмен кода:  POST https://id.vk.ru/oauth2/auth
- профиль:     POST https://id.vk.ru/oauth2/user_info
Оба запроса — application/x-www-form-urlencoded (httpx сам ставит заголовок
при передаче данных через параметр `data`).
"""
from typing import Any, AsyncIterator

import httpx

from app.config import settings

VK_AUTH_URL = "https://id.vk.ru/oauth2/auth"
VK_USER_INFO_URL = "https://id.vk.ru/oauth2/user_info"


class VKIDError(Exception):
    """Ошибка обращения к VK ID (сеть, не-200 статус или error в ответе)."""


async def get_vk_client() -> AsyncIterator[httpx.AsyncClient]:
    """Зависимость FastAPI: httpx-клиент на время запроса.

    В тестах переопределяется клиентом с httpx.MockTransport,
    поэтому реальных запросов к VK ID не выполняется.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        yield client


async def _post(client: httpx.AsyncClient, url: str, data: dict) -> dict:
    """POST form-urlencoded к VK ID с единой обработкой ошибок."""
    try:
        response = await client.post(url, data=data)
    except httpx.HTTPError as exc:
        raise VKIDError(f"сетевая ошибка: {exc}") from exc
    try:
        payload = response.json()
    except ValueError as exc:
        raise VKIDError(f"не-JSON ответ (HTTP {response.status_code})") from exc
    # VK ID отвечает {"error": ..., "error_description": ...} при ошибке
    if response.status_code != 200 or "error" in payload:
        description = payload.get("error_description") or payload.get("error")
        raise VKIDError(str(description or f"HTTP {response.status_code}"))
    return payload


async def exchange_code(
    client: httpx.AsyncClient,
    *,
    code: str,
    code_verifier: str,
    device_id: str,
) -> dict[str, Any]:
    """Обмен authorization code на access_token (OAuth 2.1 + PKCE).

    Возвращает ответ VK ID: access_token, refresh_token, id_token,
    expires_in, user_id. При ошибке — VKIDError.
    """
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "code_verifier": code_verifier,
        "redirect_uri": settings.VK_REDIRECT_URI,
        "client_id": settings.VK_CLIENT_ID,
        "device_id": device_id,
    }
    # Для конфиденциального приложения секрет передаётся параметром
    # service_token (отдельного client_secret в API VK ID нет)
    if settings.VK_CLIENT_SECRET:
        data["service_token"] = settings.VK_CLIENT_SECRET
    payload = await _post(client, VK_AUTH_URL, data)
    if "access_token" not in payload:
        raise VKIDError("в ответе нет access_token")
    return payload


async def fetch_user_info(
    client: httpx.AsyncClient, *, access_token: str
) -> dict[str, Any]:
    """Профиль пользователя VK ID: user_id, first_name, last_name, avatar."""
    payload = await _post(
        client,
        VK_USER_INFO_URL,
        {"access_token": access_token, "client_id": settings.VK_CLIENT_ID},
    )
    user = payload.get("user")
    if not isinstance(user, dict) or "user_id" not in user:
        raise VKIDError("в ответе нет объекта user")
    return user

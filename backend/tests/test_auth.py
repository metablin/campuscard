"""Тесты эндпоинтов /api/auth/* (dev-логин, VK ID, me, logout)."""
from datetime import datetime, timedelta, timezone

from jose import jwt

from app.auth.security import SESSION_COOKIE
from app.config import settings

VKID_PAYLOAD = {
    "code": "vk2.a.test-code",
    "code_verifier": "a" * 43,  # минимальная длина по PKCE
    "device_id": "test-device-id",
}


def test_dev_login_sets_cookie(client):
    """Dev-логин создаёт пользователя и выдаёт httpOnly-куку."""
    response = client.post("/api/auth/dev")
    assert response.status_code == 200
    body = response.json()
    assert body["display_name"] == "Демо-пользователь"
    assert body["is_vk"] is False
    assert body["avatar_url"] is None

    set_cookie = response.headers["set-cookie"]
    assert SESSION_COOKIE in set_cookie
    assert "HttpOnly" in set_cookie
    assert client.cookies.get(SESSION_COOKIE)


def test_dev_login_forbidden_when_disabled(client, monkeypatch):
    """При DEV_AUTH=false dev-логин возвращает 403."""
    monkeypatch.setattr(settings, "DEV_AUTH", False)
    response = client.post("/api/auth/dev")
    assert response.status_code == 403


def test_me_unauthorized(client):
    """Без куки /api/auth/me отдаёт 401."""
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.json() == {"detail": "Не авторизован"}


def test_me_authorized(client):
    """С кукой /api/auth/me отдаёт профиль и card=null."""
    client.post("/api/auth/dev")
    response = client.get("/api/auth/me")
    assert response.status_code == 200
    body = response.json()
    assert body["user"]["display_name"] == "Демо-пользователь"
    assert body["user"]["is_vk"] is False
    assert body["card"] is None


def test_me_expired_token(client):
    """Просроченный JWT → 401."""
    expired = jwt.encode(
        {"sub": "1", "exp": datetime.now(timezone.utc) - timedelta(days=1)},
        settings.JWT_SECRET,
        algorithm="HS256",
    )
    client.cookies.set(SESSION_COOKIE, expired)
    assert client.get("/api/auth/me").status_code == 401


def test_logout(client):
    """Logout удаляет куку, /api/auth/me снова отдаёт 401."""
    client.post("/api/auth/dev")
    assert client.get("/api/auth/me").status_code == 200

    response = client.post("/api/auth/logout")
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert client.get("/api/auth/me").status_code == 401


def test_vkid_login_creates_and_finds_user(client, vk_client_mock):
    """Обмен кода VK ID: создаётся пользователь, повторный вход — тот же id."""
    response = client.post("/api/auth/vkid", json=VKID_PAYLOAD)
    assert response.status_code == 200
    body = response.json()
    assert body["display_name"] == "Иван Петров"
    assert body["is_vk"] is True
    assert body["avatar_url"] == "https://example.com/avatar.jpg"
    assert client.cookies.get(SESSION_COOKIE)

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["user"]["display_name"] == "Иван Петров"

    again = client.post("/api/auth/vkid", json=VKID_PAYLOAD)
    assert again.status_code == 200
    assert again.json()["id"] == body["id"]


def test_vkid_exchange_error(client, vk_client_error):
    """Ошибка обмена в VK ID → 502."""
    response = client.post("/api/auth/vkid", json=VKID_PAYLOAD)
    assert response.status_code == 502
    assert "detail" in response.json()


def test_vkid_validation_error(client, vk_client_mock):
    """Невалидное тело запроса → 400 (по контракту)."""
    response = client.post(
        "/api/auth/vkid",
        json={"code": "", "code_verifier": "short", "device_id": ""},
    )
    assert response.status_code == 400
    assert "detail" in response.json()

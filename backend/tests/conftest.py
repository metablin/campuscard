"""Общие фикстуры: изолированная SQLite-БД и мок HTTP-клиента VK ID."""
import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.auth import vkid
from app.config import settings
from app.database import Base, get_db
from app.main import app


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """TestClient с временной БД и включённым DEV_AUTH."""
    engine = create_engine(
        f"sqlite:///{tmp_path}/test.db", connect_args={"check_same_thread": False}
    )
    TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr(settings, "DEV_AUTH", True)
    monkeypatch.setattr(settings, "VK_CLIENT_ID", "test-client-id")
    yield TestClient(app)
    app.dependency_overrides.clear()


def _make_vk_override(handler):
    """Подменяет зависимость get_vk_client клиентом с MockTransport."""
    mock_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    app.dependency_overrides[vkid.get_vk_client] = lambda: mock_client


@pytest.fixture()
def vk_client_mock():
    """Успешные ответы VK ID (реальных запросов нет — только MockTransport)."""

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/oauth2/auth":
            return httpx.Response(
                200,
                json={
                    "access_token": "vk2.a.test-access-token",
                    "refresh_token": "vk2.a.test-refresh-token",
                    "id_token": "test-id-token",
                    "token_type": "Bearer",
                    "expires_in": 3600,
                    "user_id": 12345,
                },
            )
        if request.url.path == "/oauth2/user_info":
            return httpx.Response(
                200,
                json={
                    "user": {
                        "user_id": "12345",
                        "first_name": "Иван",
                        "last_name": "Петров",
                        "avatar": "https://example.com/avatar.jpg",
                    }
                },
            )
        return httpx.Response(404, json={"error": "not_found"})

    _make_vk_override(handler)
    yield
    app.dependency_overrides.pop(vkid.get_vk_client, None)


@pytest.fixture()
def vk_client_error():
    """VK ID отвечает ошибкой обмена кода."""

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            400,
            json={
                "error": "invalid_request",
                "error_description": "code is missing or invalid",
            },
        )

    _make_vk_override(handler)
    yield
    app.dependency_overrides.pop(vkid.get_vk_client, None)

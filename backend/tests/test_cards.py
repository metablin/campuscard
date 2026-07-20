"""Тесты эндпоинтов визитки владельца и публичного доступа.

Покрывают: /api/cards/me (GET/PUT/DELETE), /api/cards/me/publish,
/api/slug/check и /api/u/{slug}.
"""
import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.security import SESSION_COOKIE, create_session_token
from app.database import get_db
from app.main import app
from app.models import User
from app.schemas import RESERVED_SLUGS as SCHEMAS_RESERVED

# Валидное тело PUT /api/cards/me — база для всех тестов
VALID_CARD = {
    "slug": "ivan-petrov",
    "full_name": "Иван Петров",
    "university": "МГУ",
    "specialty": "Прикладная математика",
    "graduation_year": 2027,
    "about": "Студент",
    "skills": ["Python", "React"],
    "links": [{"type": "telegram", "label": "@ivan", "url": "https://t.me/ivan"}],
    "theme": "default",
}

# Публичный whitelist полей по контракту (docs/api-contract.md)
PUBLIC_FIELDS = {
    "slug",
    "full_name",
    "university",
    "specialty",
    "graduation_year",
    "about",
    "skills",
    "links",
    "theme",
    "avatar_url",
}

# зеркало app.schemas.RESERVED_SLUGS — берём из кода, а не дублируем литерал
RESERVED_SLUGS = sorted(SCHEMAS_RESERVED)


def _login(client):
    """Dev-логин: создаёт dev-пользователя и ставит сессионную куку."""
    response = client.post("/api/auth/dev")
    assert response.status_code == 200
    return response


def _create_second_user(client) -> User:
    """Создаёт второго пользователя напрямую в БД и логинит его JWT-кукой.

    Dev-логин всегда возвращает одного и того же пользователя (vk_id=NULL),
    поэтому второго пользователя добавляем через сессию БД из dependency
    override, а куку ставим вручную.
    """
    override = app.dependency_overrides[get_db]
    db = next(override())
    try:
        user = User(vk_id="999999", display_name="Второй Пользователь")
        db.add(user)
        db.commit()
        db.refresh(user)
        user_id = user.id
    finally:
        db.close()
    client.cookies.set(SESSION_COOKIE, create_session_token(user_id))
    return user


# ---------------------------------------------------------------------------
# CRUD визитки
# ---------------------------------------------------------------------------


def test_get_card_not_found(client):
    """GET /api/cards/me без созданной визитки → 404."""
    _login(client)
    response = client.get("/api/cards/me")
    assert response.status_code == 404


def test_put_creates_card(client):
    """PUT /api/cards/me создаёт визитку: поля совпадают, служебные — по умолчанию."""
    _login(client)
    response = client.put("/api/cards/me", json=VALID_CARD)
    assert response.status_code == 200
    body = response.json()
    # входные поля сохранены как есть
    for key, value in VALID_CARD.items():
        assert body[key] == value
    # служебные поля по умолчанию
    assert body["public_url"] == f"/u/{VALID_CARD['slug']}"
    assert body["is_published"] is False
    assert body["views_count"] == 0
    assert body["id"] >= 1


def test_put_updates_same_card(client):
    """Повторный PUT обновляет ту же визитку (id не меняется)."""
    _login(client)
    created = client.put("/api/cards/me", json=VALID_CARD).json()

    updated_payload = {**VALID_CARD, "about": "Обновлённое описание"}
    response = client.put("/api/cards/me", json=updated_payload)
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == created["id"]
    assert body["about"] == "Обновлённое описание"


def test_get_card_after_create(client):
    """GET /api/cards/me после создания → 200 и те же данные."""
    _login(client)
    created = client.put("/api/cards/me", json=VALID_CARD).json()
    response = client.get("/api/cards/me")
    assert response.status_code == 200
    assert response.json() == created


def test_delete_card(client):
    """DELETE /api/cards/me → 200 {"ok": true}, после удаления GET → 404."""
    _login(client)
    client.put("/api/cards/me", json=VALID_CARD)

    response = client.delete("/api/cards/me")
    assert response.status_code == 200
    assert response.json() == {"ok": True}

    assert client.get("/api/cards/me").status_code == 404


def test_delete_card_twice(client):
    """Повторный DELETE /api/cards/me → 404 (визитки уже нет)."""
    _login(client)
    client.put("/api/cards/me", json=VALID_CARD)
    assert client.delete("/api/cards/me").status_code == 200
    assert client.delete("/api/cards/me").status_code == 404


def test_publish_without_card(client):
    """POST /api/cards/me/publish без визитки → 404."""
    _login(client)
    response = client.post("/api/cards/me/publish")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Уникальность slug
# ---------------------------------------------------------------------------


def test_slug_conflict_between_users(client):
    """Slug, занятый другим пользователем, → 409; свой slug — 200."""
    _login(client)
    assert client.put("/api/cards/me", json=VALID_CARD).status_code == 200

    # второй пользователь пытается занять тот же slug
    _create_second_user(client)
    response = client.put("/api/cards/me", json=VALID_CARD)
    assert response.status_code == 409

    # первый пользователь повторно сохраняет свой же slug — без конфликта
    # (dev-логин не перезаписывает вручную установленную куку в httpx,
    # поэтому сначала очищаем куки)
    client.cookies.clear()
    _login(client)
    response = client.put("/api/cards/me", json=VALID_CARD)
    assert response.status_code == 200


# ---------------------------------------------------------------------------
# Публикация и публичный доступ
# ---------------------------------------------------------------------------


def test_unpublished_card_not_public(client):
    """Неопубликованная визитка → 404; publish → 200; снятие → снова 404."""
    _login(client)
    client.put("/api/cards/me", json=VALID_CARD)
    slug = VALID_CARD["slug"]

    # is_published=false — публичный доступ закрыт
    assert client.get(f"/api/u/{slug}").status_code == 404

    # публикуем
    response = client.post("/api/cards/me/publish")
    assert response.status_code == 200
    assert response.json() == {"is_published": True}
    assert client.get(f"/api/u/{slug}").status_code == 200

    # повторный publish снимает публикацию
    response = client.post("/api/cards/me/publish")
    assert response.status_code == 200
    assert response.json() == {"is_published": False}
    assert client.get(f"/api/u/{slug}").status_code == 404


def test_public_card_not_found(client):
    """GET /api/u/{slug} для несуществующего slug → 404."""
    response = client.get("/api/u/no-such-card")
    assert response.status_code == 404


def test_public_card_only_whitelist_fields(client):
    """Публичный ответ содержит РОВНО whitelist полей, без служебных."""
    _login(client)
    client.put("/api/cards/me", json=VALID_CARD)
    client.post("/api/cards/me/publish")

    response = client.get(f"/api/u/{VALID_CARD['slug']}")
    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == PUBLIC_FIELDS
    # приватные/служебные поля не утекают
    for private in (
        "user_id",
        "id",
        "is_published",
        "views_count",
        "created_at",
        "updated_at",
        "public_url",
    ):
        assert private not in body
    # значения публичных полей совпадают с созданными
    assert body["slug"] == VALID_CARD["slug"]
    assert body["full_name"] == VALID_CARD["full_name"]
    assert body["skills"] == VALID_CARD["skills"]
    assert body["links"] == VALID_CARD["links"]


def test_public_card_increments_views_count(client):
    """Каждый GET /api/u/{slug} увеличивает views_count на 1."""
    _login(client)
    client.put("/api/cards/me", json=VALID_CARD)
    client.post("/api/cards/me/publish")

    slug = VALID_CARD["slug"]
    assert client.get(f"/api/u/{slug}").status_code == 200
    assert client.get(f"/api/u/{slug}").status_code == 200

    me = client.get("/api/cards/me")
    assert me.status_code == 200
    assert me.json()["views_count"] == 2


# ---------------------------------------------------------------------------
# Проверка slug: /api/slug/check
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("slug", RESERVED_SLUGS)
def test_slug_check_reserved(client, slug):
    """Зарезервированные slug → available=false.

    reason="reserved", если slug проходит формат; "u" короче 3 символов,
    поэтому для него срабатывает более приоритетная проверка формата → "invalid".
    """
    _login(client)
    response = client.get("/api/slug/check", params={"slug": slug})
    assert response.status_code == 200
    expected_reason = "invalid" if slug == "u" else "reserved"
    assert response.json() == {
        "slug": slug,
        "available": False,
        "reason": expected_reason,
    }


@pytest.mark.parametrize("slug", RESERVED_SLUGS)
def test_put_reserved_slug_rejected(client, slug):
    """PUT с зарезервированным slug → 400."""
    _login(client)
    response = client.put("/api/cards/me", json={**VALID_CARD, "slug": slug})
    assert response.status_code == 400


@pytest.mark.parametrize("slug", ["AB", "a", "иван"])
def test_slug_check_invalid_format(client, slug):
    """Невалидный формат slug → available=false, reason="invalid"."""
    _login(client)
    response = client.get("/api/slug/check", params={"slug": slug})
    assert response.status_code == 200
    assert response.json() == {"slug": slug, "available": False, "reason": "invalid"}


def test_slug_check_taken_by_other(client):
    """Slug, занятый другим пользователем, → available=false, reason="taken"."""
    _login(client)
    client.put("/api/cards/me", json=VALID_CARD)

    _create_second_user(client)
    response = client.get("/api/slug/check", params={"slug": VALID_CARD["slug"]})
    assert response.status_code == 200
    assert response.json() == {
        "slug": VALID_CARD["slug"],
        "available": False,
        "reason": "taken",
    }


def test_slug_check_own_slug_available(client):
    """Свой текущий slug считается доступным."""
    _login(client)
    client.put("/api/cards/me", json=VALID_CARD)
    response = client.get("/api/slug/check", params={"slug": VALID_CARD["slug"]})
    assert response.status_code == 200
    assert response.json() == {
        "slug": VALID_CARD["slug"],
        "available": True,
        "reason": None,
    }


def test_slug_check_free_slug(client):
    """Свободный slug → available=true, reason=null."""
    _login(client)
    response = client.get("/api/slug/check", params={"slug": "free-slug-123"})
    assert response.status_code == 200
    assert response.json() == {
        "slug": "free-slug-123",
        "available": True,
        "reason": None,
    }


# ---------------------------------------------------------------------------
# Валидация CardIn
# ---------------------------------------------------------------------------


def test_validation_slug_uppercase(client):
    """Slug с заглавными буквами → 400."""
    _login(client)
    response = client.put("/api/cards/me", json={**VALID_CARD, "slug": "Ivan-Petrov"})
    assert response.status_code == 400


def test_validation_slug_too_short(client):
    """Slug короче 3 символов → 400."""
    _login(client)
    response = client.put("/api/cards/me", json={**VALID_CARD, "slug": "ab"})
    assert response.status_code == 400


def test_validation_too_many_skills(client):
    """Список skills из 16 элементов → 400 (максимум 15)."""
    _login(client)
    skills = [f"skill-{i}" for i in range(16)]
    response = client.put("/api/cards/me", json={**VALID_CARD, "skills": skills})
    assert response.status_code == 400


def test_validation_skill_too_long(client):
    """Навык длиной 41 символ → 400 (максимум 40)."""
    _login(client)
    response = client.put(
        "/api/cards/me", json={**VALID_CARD, "skills": ["x" * 41]}
    )
    assert response.status_code == 400


def test_validation_too_many_links(client):
    """Список links из 11 элементов → 400 (максимум 10)."""
    _login(client)
    links = [
        {"type": "site", "label": f"site-{i}", "url": f"https://example.com/{i}"}
        for i in range(11)
    ]
    response = client.put("/api/cards/me", json={**VALID_CARD, "links": links})
    assert response.status_code == 400


@pytest.mark.parametrize("url", ["ftp://x.com", "javascript:alert(1)"])
def test_validation_link_url_scheme(client, url):
    """Ссылка с недопустимой схемой url → 400."""
    _login(client)
    links = [{"type": "site", "label": "site", "url": url}]
    response = client.put("/api/cards/me", json={**VALID_CARD, "links": links})
    assert response.status_code == 400


def test_validation_graduation_year_too_early(client):
    """graduation_year=2019 → 400 (минимум 2020)."""
    _login(client)
    response = client.put(
        "/api/cards/me", json={**VALID_CARD, "graduation_year": 2019}
    )
    assert response.status_code == 400


def test_validation_unknown_theme(client):
    """Неизвестная тема theme="neon" → 400."""
    _login(client)
    response = client.put("/api/cards/me", json={**VALID_CARD, "theme": "neon"})
    assert response.status_code == 400


@pytest.mark.parametrize(
    "url",
    ["https://example.com", "http://example.com", "mailto:a@b.c", "tel:+79990001122"],
)
def test_validation_allowed_url_schemes(client, url):
    """Разрешённые схемы url (https, http, mailto, tel) → 200."""
    _login(client)
    links = [{"type": "site", "label": "site", "url": url}]
    response = client.put("/api/cards/me", json={**VALID_CARD, "links": links})
    assert response.status_code == 200
    assert response.json()["links"][0]["url"] == url


def test_upsert_integrity_error_returns_409(client, monkeypatch):
    """Гонка: slug занят параллельным запросом после предварительной проверки.

    Имитируем падением commit с IntegrityError → 409 (а не 500).
    """
    _login(client)

    def failing_commit(self):  # noqa: ARG001
        raise IntegrityError("INSERT INTO cards ...", {}, Exception("UNIQUE slug"))

    monkeypatch.setattr(Session, "commit", failing_commit)
    response = client.put("/api/cards/me", json=VALID_CARD)
    assert response.status_code == 409
    assert response.json()["detail"] == "Такой slug уже занят"

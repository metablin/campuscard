"""Граничная валидация CardIn и проверки авторизации защищённых эндпоинтов.

Дополняет test_cards.py: границы длин полей по docs/api-contract.md,
401 без куки, смена slug при повторном PUT.
"""
import pytest

# Валидное тело PUT /api/cards/me — база для всех тестов (как в test_cards.py)
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


def _login(client):
    """Dev-логин: создаёт dev-пользователя и ставит сессионную куку."""
    response = client.post("/api/auth/dev")
    assert response.status_code == 200
    return response


def _put(client, **overrides):
    """PUT /api/cards/me с валидным телом и переопределёнными полями."""
    return client.put("/api/cards/me", json={**VALID_CARD, **overrides})


# ---------------------------------------------------------------------------
# 401: защищённые эндпоинты без куки
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "method,url",
    [
        ("GET", "/api/cards/me"),
        ("PUT", "/api/cards/me"),
        ("DELETE", "/api/cards/me"),
        ("POST", "/api/cards/me/publish"),
        ("GET", "/api/slug/check?slug=ivan-petrov"),
        ("GET", "/api/slug/generate?full_name=Иван"),
    ],
)
def test_protected_endpoints_require_auth(client, method, url):
    """Без сессионной куки все эндпоинты владельца → 401."""
    kwargs = {"json": VALID_CARD} if method == "PUT" else {}
    response = client.request(method, url, **kwargs)
    assert response.status_code == 401
    assert response.json() == {"detail": "Не авторизован"}


# ---------------------------------------------------------------------------
# Границы slug: ^[a-z0-9-]{3,40}$
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("slug", ["abc", "a" * 40, "ivan-petrov-2027", "a1-2"])
def test_slug_valid_boundary_lengths(client, slug):
    """Slug длины 3 и 40 (границы), цифры и дефисы → 200."""
    _login(client)
    response = _put(client, slug=slug)
    assert response.status_code == 200
    assert response.json()["slug"] == slug


@pytest.mark.parametrize(
    "slug",
    [
        "ab",  # длина 2 — меньше минимума
        "a" * 41,  # длина 41 — больше максимума
        "ivan_petrov",  # подчёркивание недопустимо
        "ivan.petrov",  # точка недопустима
        "ivan petrov",  # пробел недопустим
        "иван-петров",  # кириллица недопустима
        "Ivan-Petrov",  # верхний регистр недопустим
    ],
)
def test_slug_invalid(client, slug):
    """Невалидные slug (длина, символы, регистр) → 400."""
    _login(client)
    assert _put(client, slug=slug).status_code == 400


# ---------------------------------------------------------------------------
# Границы full_name: 1–128, обязательное
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("name", ["Я", "а" * 128])
def test_full_name_valid_boundaries(client, name):
    """full_name длины 1 и 128 → 200."""
    _login(client)
    response = _put(client, full_name=name)
    assert response.status_code == 200
    assert response.json()["full_name"] == name


@pytest.mark.parametrize("name", ["", "а" * 129])
def test_full_name_invalid_boundaries(client, name):
    """full_name длины 0 и 129 → 400."""
    _login(client)
    assert _put(client, full_name=name).status_code == 400


# ---------------------------------------------------------------------------
# Границы university / specialty: ≤ 256
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("field", ["university", "specialty"])
def test_text_fields_256_ok(client, field):
    """university/specialty длины 256 → 200."""
    _login(client)
    assert _put(client, **{field: "у" * 256}).status_code == 200


@pytest.mark.parametrize("field", ["university", "specialty"])
def test_text_fields_257_rejected(client, field):
    """university/specialty длины 257 → 400."""
    _login(client)
    assert _put(client, **{field: "у" * 257}).status_code == 400


# ---------------------------------------------------------------------------
# Границы about: ≤ 1000
# ---------------------------------------------------------------------------


def test_about_1000_ok(client):
    """about длины 1000 → 200."""
    _login(client)
    assert _put(client, about="о" * 1000).status_code == 200


def test_about_1001_rejected(client):
    """about длины 1001 → 400."""
    _login(client)
    assert _put(client, about="о" * 1001).status_code == 400


# ---------------------------------------------------------------------------
# Границы skills: ≤ 15 строк по ≤ 40 символов
# ---------------------------------------------------------------------------


def test_skills_15_ok(client):
    """Ровно 15 навыков → 200."""
    _login(client)
    skills = [f"skill-{i}" for i in range(15)]
    response = _put(client, skills=skills)
    assert response.status_code == 200
    assert response.json()["skills"] == skills


def test_skill_40_chars_ok(client):
    """Навык длиной ровно 40 символов → 200."""
    _login(client)
    response = _put(client, skills=["н" * 40])
    assert response.status_code == 200


def test_skill_empty_rejected(client):
    """Пустой навык (0 символов) → 400."""
    _login(client)
    assert _put(client, skills=[""]).status_code == 400


# ---------------------------------------------------------------------------
# Границы links: ≤ 10, допустимые type и схема url
# ---------------------------------------------------------------------------


def test_links_10_ok(client):
    """Ровно 10 ссылок → 200."""
    _login(client)
    links = [
        {"type": "site", "label": f"site-{i}", "url": f"https://example.com/{i}"}
        for i in range(10)
    ]
    response = _put(client, links=links)
    assert response.status_code == 200
    assert len(response.json()["links"]) == 10


def test_link_unknown_type_rejected(client):
    """Недопустимый type ссылки (не из vk/telegram/email/phone/github/site) → 400."""
    _login(client)
    links = [{"type": "myspace", "label": "site", "url": "https://example.com"}]
    assert _put(client, links=links).status_code == 400


@pytest.mark.parametrize(
    "link_type", ["vk", "telegram", "email", "phone", "github", "site"]
)
def test_link_all_types_ok(client, link_type):
    """Все 6 допустимых типов ссылок → 200."""
    _login(client)
    url = "mailto:a@b.c" if link_type == "email" else (
        "tel:+79990001122" if link_type == "phone" else "https://example.com"
    )
    links = [{"type": link_type, "label": link_type, "url": url}]
    assert _put(client, links=links).status_code == 200


# ---------------------------------------------------------------------------
# Границы graduation_year: 2020–2035 или null
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("year", [2020, 2035, None])
def test_graduation_year_valid(client, year):
    """graduation_year 2020, 2035 и null → 200."""
    _login(client)
    response = _put(client, graduation_year=year)
    assert response.status_code == 200
    assert response.json()["graduation_year"] == year


@pytest.mark.parametrize("year", [2036])
def test_graduation_year_too_late(client, year):
    """graduation_year=2036 → 400 (максимум 2035)."""
    _login(client)
    assert _put(client, graduation_year=year).status_code == 400


# ---------------------------------------------------------------------------
# theme: только default / ocean / sunset / graphite
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("theme", ["default", "ocean", "sunset", "graphite"])
def test_theme_all_valid(client, theme):
    """Все 4 темы по контракту → 200."""
    _login(client)
    response = _put(client, theme=theme)
    assert response.status_code == 200
    assert response.json()["theme"] == theme


# ---------------------------------------------------------------------------
# Upsert: смена slug при повторном PUT
# ---------------------------------------------------------------------------


def test_put_change_slug(client):
    """Повторный PUT с новым slug: визитка та же (id), public_url обновлён,
    старый slug освобождается (slug/check → available)."""
    _login(client)
    created = client.put("/api/cards/me", json=VALID_CARD).json()

    response = _put(client, slug="ivan-petrov-new")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == created["id"]
    assert body["slug"] == "ivan-petrov-new"
    assert body["public_url"] == "/u/ivan-petrov-new"

    # старый slug свободен
    check = client.get("/api/slug/check", params={"slug": VALID_CARD["slug"]})
    assert check.json() == {
        "slug": VALID_CARD["slug"],
        "available": True,
        "reason": None,
    }


def test_put_slug_change_to_reserved_rejected(client):
    """Смена slug на зарезервированный → 400, старый slug сохраняется."""
    _login(client)
    client.put("/api/cards/me", json=VALID_CARD)

    assert _put(client, slug="admin").status_code == 400
    assert client.get("/api/cards/me").json()["slug"] == VALID_CARD["slug"]

"""Тесты генерации slug: юнит-тесты slugify/generate_slug и HTTP GET /api/slug/generate."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import Card, User
from app.services.slug import generate_slug, slugify


@pytest.fixture()
def db_session(tmp_path):
    """Изолированная SQLite-сессия для юнит-тестов сервиса slug."""
    engine = create_engine(
        f"sqlite:///{tmp_path}/slug.db", connect_args={"check_same_thread": False}
    )
    TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(bind=engine)
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


def _add_card(db, slug: str) -> Card:
    """Создаёт пользователя и визитку с заданным slug напрямую в БД."""
    user = User(vk_id=None, display_name=f"user-{slug}")
    db.add(user)
    db.flush()
    card = Card(user_id=user.id, slug=slug, full_name="Тест Тестов")
    db.add(card)
    db.commit()
    return card


# ---------------------------------------------------------------------------
# Юнит-тесты slugify
# ---------------------------------------------------------------------------


def test_slugify_transliterates_cyrillic():
    """Кириллица транслитерируется: «Иван Петров» → «ivan-petrov»."""
    assert slugify("Иван Петров") == "ivan-petrov"


def test_slugify_yo_becomes_e():
    """Буква «ё» → «e»: «Дёмкин» → «demkin»."""
    assert slugify("Дёмкин") == "demkin"


def test_slugify_lowercase():
    """Заглавные буквы приводятся к нижнему регистру."""
    assert slugify("IVAN PETROV") == "ivan-petrov"


def test_slugify_special_chars_become_hyphens():
    """Спецсимволы заменяются на дефисы, повторные дефисы схлопываются."""
    assert slugify("Иван   Петров!!!") == "ivan-petrov"
    assert slugify("a@b#c") == "a-b-c"


def test_slugify_strips_edge_hyphens():
    """Дефисы по краям обрезаются."""
    assert slugify("--Иван--") == "ivan"


def test_slugify_max_length():
    """Результат не длиннее 40 символов."""
    long_name = "а" * 100
    assert len(slugify(long_name)) <= 40


# ---------------------------------------------------------------------------
# Юнит-тесты generate_slug (конфликты)
# ---------------------------------------------------------------------------


def test_generate_slug_free(db_session):
    """Свободный slug возвращается без суффикса."""
    assert generate_slug(db_session, "Иван Петров") == "ivan-petrov"


def test_generate_slug_conflict_suffixes(db_session):
    """Занятый slug → суффикс -2, затем -3."""
    _add_card(db_session, "ivan-petrov")
    assert generate_slug(db_session, "Иван Петров") == "ivan-petrov-2"

    _add_card(db_session, "ivan-petrov-2")
    assert generate_slug(db_session, "Иван Петров") == "ivan-petrov-3"


def test_generate_slug_reserved(db_session):
    """Зарезервированный slug получает суффикс -2."""
    assert generate_slug(db_session, "admin") == "admin-2"


def test_generate_slug_short_name(db_session):
    """Слишком короткое имя дополняется до минимальной длины."""
    slug = generate_slug(db_session, "Я")
    assert len(slug) >= 3


# ---------------------------------------------------------------------------
# HTTP: GET /api/slug/generate
# ---------------------------------------------------------------------------


def test_http_generate_slug(client):
    """GET /api/slug/generate?full_name=Иван Петров → {"slug": "ivan-petrov"}."""
    client.post("/api/auth/dev")
    response = client.get("/api/slug/generate", params={"full_name": "Иван Петров"})
    assert response.status_code == 200
    assert response.json() == {"slug": "ivan-petrov"}


def test_http_generate_slug_unauthorized(client):
    """Без авторизации GET /api/slug/generate → 401."""
    response = client.get("/api/slug/generate", params={"full_name": "Иван Петров"})
    assert response.status_code == 401

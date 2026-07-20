"""Наполнение БД демо-данными: 3 опубликованные визитки для скриншотов и демо.

Запуск из backend/ (в активированном .venv):
    python -m app.seed

Идемпотентно: визитки с существующими slug обновляются, не дублируются.
Каждая визитка привязана к своему демо-пользователю (vk_id вида seed-*).
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.models import Card, User

# (slug, display_name, поля визитки)
DEMO_CARDS = [
    {
        "slug": "anna-smirnova",
        "display_name": "Анна Смирнова",
        "full_name": "Анна Смирнова",
        "university": "МГУ им. М. В. Ломоносова",
        "specialty": "Прикладная математика и информатика",
        "graduation_year": 2026,
        "about": (
            "ML-инженер в начале пути. Люблю данные, нейросети и хакатоны. "
            "Ищу стажировку в команде, где можно расти."
        ),
        "skills": ["Python", "PyTorch", "SQL", "Pandas", "Git"],
        "links": [
            {"type": "telegram", "label": "@anna_sm", "url": "https://t.me/anna_sm"},
            {"type": "github", "label": "anna-smirnova", "url": "https://github.com/anna-smirnova"},
            {"type": "email", "label": "anna@example.com", "url": "mailto:anna@example.com"},
        ],
        "theme": "ocean",
    },
    {
        "slug": "igor-volkov",
        "display_name": "Игорь Волков",
        "full_name": "Игорь Волков",
        "university": "СПбГУ",
        "specialty": "Программная инженерия",
        "graduation_year": 2027,
        "about": (
            "Фронтенд-разработчик. Делаю интерфейсы, которыми приятно пользоваться. "
            "В свободное время — вклад в open source."
        ),
        "skills": ["TypeScript", "React", "Vue", "CSS", "Figma"],
        "links": [
            {"type": "vk", "label": "vk.com/igor_volkov", "url": "https://vk.com/igor_volkov"},
            {"type": "telegram", "label": "@igor_dev", "url": "https://t.me/igor_dev"},
            {"type": "site", "label": "Портфолио", "url": "https://igorvolkov.dev"},
        ],
        "theme": "sunset",
    },
    {
        "slug": "maria-kim",
        "display_name": "Мария Ким",
        "full_name": "Мария Ким",
        "university": "НИУ ВШЭ",
        "specialty": "Бизнес-информатика",
        "graduation_year": 2025,
        "about": (
            "Аналитик данных и продакт-энтузиаст. Перевожу числа в решения. "
            "Организую студенческие конференции."
        ),
        "skills": ["SQL", "Excel", "Tableau", "Python", "A/B-тесты"],
        "links": [
            {"type": "telegram", "label": "@maria_kim", "url": "https://t.me/maria_kim"},
            {"type": "phone", "label": "+7 900 123-45-67", "url": "tel:+79001234567"},
            {"type": "email", "label": "maria.kim@example.com", "url": "mailto:maria.kim@example.com"},
        ],
        "theme": "graphite",
    },
]


def _get_or_create_user(db: Session, seed_id: str, display_name: str) -> User:
    user = db.scalar(select(User).where(User.vk_id == seed_id))
    if user is None:
        user = User(vk_id=seed_id, display_name=display_name, avatar_url=None)
        db.add(user)
        db.flush()
    return user


def seed(db: Session) -> None:
    for data in DEMO_CARDS:
        slug = data["slug"]
        user = _get_or_create_user(db, f"seed-{slug}", data["display_name"])
        card = db.scalar(select(Card).where(Card.slug == slug))
        if card is None:
            card = Card(user_id=user.id, slug=slug)
            db.add(card)
        for field in (
            "full_name", "university", "specialty", "graduation_year",
            "about", "skills", "links", "theme",
        ):
            setattr(card, field, data[field])
        card.is_published = True
    db.commit()


def main() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed(db)
    print(f"Готово: {len(DEMO_CARDS)} демо-визитки созданы/обновлены.")
    for data in DEMO_CARDS:
        print(f"  /u/{data['slug']}  ({data['full_name']}, {data['theme']})")


if __name__ == "__main__":
    main()

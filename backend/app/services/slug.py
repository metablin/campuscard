"""Сервис генерации slug из ФИО.

Транслитерация кириллицы, нижний регистр, конфликты решаются
суффиксом -2, -3, ...
"""
import re
import unicodedata

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Card
from app.schemas import RESERVED_SLUGS, SLUG_PATTERN

# Таблица транслитерации кириллицы (упрощённая)
_TRANSLIT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e",
    "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch",
    "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
}

_SLUG_MAX = 40
_SLUG_MIN = 3


def _transliterate(text: str) -> str:
    """Кириллица → латиница; прочие символы — через NFKD (диакритика срезается)."""
    result = []
    for char in text.lower():
        if char in _TRANSLIT:
            result.append(_TRANSLIT[char])
        else:
            # NFKD убирает диакритику (é → e), не-ASCII отбрасываем
            decomposed = unicodedata.normalize("NFKD", char)
            result.append(decomposed.encode("ascii", "ignore").decode("ascii"))
    return "".join(result)


def slugify(text: str) -> str:
    """Произвольная строка → slug-кандидат (может быть короче минимума)."""
    transliterated = _transliterate(text)
    # всё, кроме [a-z0-9], заменяем на дефис
    slug = re.sub(r"[^a-z0-9]+", "-", transliterated).strip("-")
    # схлопываем повторные дефисы
    slug = re.sub(r"-{2,}", "-", slug)
    return slug[:_SLUG_MAX].strip("-")


def generate_slug(db: Session, full_name: str) -> str:
    """Генерирует уникальный slug из ФИО.

    Конфликты (занят или зарезервирован) решаются суффиксом -2, -3, ...
    """
    base = slugify(full_name)
    if len(base) < _SLUG_MIN:
        base = (base + "-card").strip("-")[:_SLUG_MAX]
        if len(base) < _SLUG_MIN:
            base = "card"

    candidate = base
    suffix = 2
    while True:
        if (
            SLUG_PATTERN.match(candidate)
            and candidate not in RESERVED_SLUGS
            and db.scalar(select(Card.id).where(Card.slug == candidate)) is None
        ):
            return candidate
        # укорачиваем базу, чтобы суффикс поместился в лимит длины
        tail = f"-{suffix}"
        candidate = base[: _SLUG_MAX - len(tail)].rstrip("-") + tail
        suffix += 1

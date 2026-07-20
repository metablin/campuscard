"""Pydantic-схемы визитки: CardIn (вход), CardOut (выход), PublicCardOut.

Валидация строго по docs/api-contract.md.
"""
import re
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

SLUG_PATTERN = re.compile(r"^[a-z0-9-]{3,40}$")

# Зарезервированные slug'и (совпадают с frontend-маршрутами)
RESERVED_SLUGS: frozenset[str] = frozenset(
    {"admin", "api", "login", "u", "app", "edit", "auth"}
)

LinkType = Literal["vk", "telegram", "email", "phone", "github", "site"]
Theme = Literal["default", "ocean", "sunset", "graphite"]

ALLOWED_URL_SCHEMES = ("https://", "http://", "mailto:", "tel:")


class LinkIn(BaseModel):
    """Ссылка в визитке."""

    type: LinkType
    label: str = Field(min_length=1, max_length=64)
    url: str = Field(min_length=1, max_length=512)

    @field_validator("url")
    @classmethod
    def url_scheme_allowed(cls, value: str) -> str:
        if not value.startswith(ALLOWED_URL_SCHEMES):
            raise ValueError(
                "url должен начинаться с https://, http://, mailto: или tel:"
            )
        return value


class CardIn(BaseModel):
    """Входные данные визитки (PUT /api/cards/me)."""

    slug: str
    full_name: str = Field(min_length=1, max_length=128)
    university: str = Field(default="", max_length=256)
    specialty: str = Field(default="", max_length=256)
    graduation_year: Optional[int] = Field(default=None, ge=2020, le=2035)
    about: str = Field(default="", max_length=1000)
    skills: list[str] = Field(default_factory=list, max_length=15)
    links: list[LinkIn] = Field(default_factory=list, max_length=10)
    theme: Theme = "default"

    @field_validator("slug")
    @classmethod
    def slug_format(cls, value: str) -> str:
        if not SLUG_PATTERN.match(value):
            raise ValueError(
                "slug должен соответствовать ^[a-z0-9-]{3,40}$"
            )
        if value in RESERVED_SLUGS:
            raise ValueError("slug зарезервирован")
        return value

    @field_validator("skills")
    @classmethod
    def skills_item_length(cls, value: list[str]) -> list[str]:
        for skill in value:
            if not 1 <= len(skill) <= 40:
                raise ValueError("каждый навык — строка от 1 до 40 символов")
        return value


class CardOut(CardIn):
    """Визитка владельца: все поля CardIn + служебные."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    is_published: bool
    views_count: int
    public_url: str
    created_at: datetime
    updated_at: datetime


class PublicCardOut(BaseModel):
    """Публичное представление визитки (GET /api/u/{slug}).

    Только whitelist полей по контракту — никаких user_id/email.
    """

    slug: str
    full_name: str
    university: str
    specialty: str
    graduation_year: Optional[int]
    about: str
    skills: list[str]
    links: list[LinkIn]
    theme: str
    avatar_url: Optional[str]


class SlugCheckOut(BaseModel):
    """Ответ GET /api/slug/check."""

    slug: str
    available: bool
    reason: Optional[Literal["invalid", "reserved", "taken"]] = None

"""Pydantic-схемы эндпоинтов /api/auth/* (по docs/api-contract.md)."""
from datetime import datetime

from pydantic import BaseModel, Field

from app.models import Card, User


class VKIDLoginIn(BaseModel):
    """Тело POST /api/auth/vkid.

    state на бэкенд не передаётся — его проверяет @vkid/sdk на фронтенде.
    """

    code: str = Field(min_length=1, max_length=2048)
    # PKCE code_verifier: 43–128 символов (документация VK ID)
    code_verifier: str = Field(min_length=43, max_length=128)
    device_id: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    id: int
    display_name: str
    avatar_url: str | None
    is_vk: bool


class CardOut(BaseModel):
    """Полный набор полей визитки (нужен в ответе GET /api/auth/me)."""

    id: int
    slug: str
    full_name: str
    university: str
    specialty: str
    graduation_year: int | None
    about: str
    skills: list
    links: list
    theme: str
    is_published: bool
    views_count: int
    public_url: str
    created_at: datetime
    updated_at: datetime


class MeOut(BaseModel):
    user: UserOut
    card: CardOut | None


def user_to_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        is_vk=user.vk_id is not None,
    )


def card_to_out(card: Card) -> CardOut:
    return CardOut(
        id=card.id,
        slug=card.slug,
        full_name=card.full_name,
        university=card.university,
        specialty=card.specialty,
        graduation_year=card.graduation_year,
        about=card.about,
        skills=card.skills,
        links=card.links,
        theme=card.theme,
        is_published=card.is_published,
        views_count=card.views_count,
        public_url=f"/u/{card.slug}",
        created_at=card.created_at,
        updated_at=card.updated_at,
    )

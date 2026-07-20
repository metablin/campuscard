"""Pydantic-схемы эндпоинтов /api/auth/* (по docs/api-contract.md)."""
from pydantic import BaseModel, Field

from app.models import User
from app.schemas import CardOut


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

"""Эндпоинты /api/auth/*: dev-логин, VK ID, me, logout."""
import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import vkid
from app.auth.deps import get_current_user
from app.auth.schemas import MeOut, UserOut, VKIDLoginIn, user_to_out
from app.schemas import card_to_out
from app.auth.security import (
    clear_session_cookie,
    create_session_token,
    set_session_cookie,
)
from app.config import settings
from app.database import get_db
from app.models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

DEV_DISPLAY_NAME = "Демо-пользователь"  # логический логин: demo@campuscard.local


def _login_response(user: User, response: Response) -> UserOut:
    """Выдаёт JWT в httpOnly-куку и возвращает профиль пользователя."""
    set_session_cookie(response, create_session_token(user.id))
    return user_to_out(user)


@router.post("/dev", response_model=UserOut)
def login_dev(response: Response, db: Session = Depends(get_db)) -> UserOut:
    """Вход для разработки без VK ID. Доступен только при DEV_AUTH=true."""
    if not settings.DEV_AUTH:
        raise HTTPException(status_code=403, detail="Dev-логин отключён")
    # dev-пользователь единственный: vk_id всегда NULL
    user = db.scalar(select(User).where(User.vk_id.is_(None)))
    if user is None:
        user = User(vk_id=None, display_name=DEV_DISPLAY_NAME, avatar_url=None)
        db.add(user)
        try:
            db.commit()
        except IntegrityError:
            # параллельный dev-логин уже создал пользователя — берём его
            db.rollback()
            user = db.scalar(select(User).where(User.vk_id.is_(None)))
        db.refresh(user)
    return _login_response(user, response)


@router.post("/vkid", response_model=UserOut)
async def login_vkid(
    payload: VKIDLoginIn,
    response: Response,
    db: Session = Depends(get_db),
    client: httpx.AsyncClient = Depends(vkid.get_vk_client),
) -> UserOut:
    """Обмен кода VK ID на сессию (OAuth 2.1 + PKCE, обмен на бэкенде)."""
    try:
        tokens = await vkid.exchange_code(
            client,
            code=payload.code,
            code_verifier=payload.code_verifier,
            device_id=payload.device_id,
        )
        profile = await vkid.fetch_user_info(
            client, access_token=tokens["access_token"]
        )
    except vkid.VKIDError as exc:
        # детали интеграции — в лог, клиенту обобщённый текст
        logger.warning("VK ID exchange failed: %s", exc)
        raise HTTPException(status_code=502, detail="Ошибка авторизации VK ID") from exc

    vk_user_id = str(profile["user_id"])
    display_name = (
        f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip()
        or "Пользователь VK"
    )
    avatar_url = profile.get("avatar") or None

    user = db.scalar(select(User).where(User.vk_id == vk_user_id))
    if user is None:
        user = User(vk_id=vk_user_id, display_name=display_name, avatar_url=avatar_url)
        db.add(user)
    else:
        # обновляем имя и аватар актуальными данными из VK ID
        user.display_name = display_name
        user.avatar_url = avatar_url
    try:
        db.commit()
    except IntegrityError:
        # гонка двух логинов одного vk_id: пользователь уже создан
        db.rollback()
        user = db.scalar(select(User).where(User.vk_id == vk_user_id))
    db.refresh(user)
    return _login_response(user, response)


@router.get("/me", response_model=MeOut)
def get_me(user: User = Depends(get_current_user)) -> MeOut:
    """Текущий пользователь и его визитка (null, если не создана)."""
    card = card_to_out(user.card) if user.card is not None else None
    return MeOut(user=user_to_out(user), card=card)


@router.post("/logout")
def logout(
    response: Response, user: User = Depends(get_current_user)  # noqa: ARG001
) -> dict:
    """Удаляет сессионную куку."""
    clear_session_cookie(response)
    return {"ok": True}

"""Эндпоинты визитки владельца: /api/cards/me и /api/slug/check.

Авторизация обязательна (кука campuscard_session).
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database import get_db
from app.models import Card, User
from app.schemas import (
    RESERVED_SLUGS,
    SLUG_PATTERN,
    CardIn,
    CardOut,
    SlugCheckOut,
    card_to_out,
)
from app.services.slug import generate_slug

router = APIRouter(tags=["cards"])


def _get_own_card(db: Session, user: User) -> Card | None:
    return db.scalar(select(Card).where(Card.user_id == user.id))


@router.get("/cards/me", response_model=CardOut)
def get_my_card(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CardOut:
    """Визитка текущего пользователя. 404 — если не создана."""
    card = _get_own_card(db, user)
    if card is None:
        raise HTTPException(status_code=404, detail="Визитка не найдена")
    return card_to_out(card)


@router.put("/cards/me", response_model=CardOut)
def upsert_my_card(
    payload: CardIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CardOut:
    """Создание/обновление визитки (upsert, одна визитка на пользователя).

    409 — slug занят другим пользователем.
    """
    card = _get_own_card(db, user)

    owner_id = db.scalar(select(Card.user_id).where(Card.slug == payload.slug))
    if owner_id is not None and (card is None or owner_id != card.user_id):
        raise HTTPException(status_code=409, detail="Такой slug уже занят")

    fields = payload.model_dump()
    if card is None:
        card = Card(user_id=user.id, **fields)
        db.add(card)
    else:
        for key, value in fields.items():
            setattr(card, key, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # гонка: slug занят параллельным запросом после нашей проверки выше
        raise HTTPException(status_code=409, detail="Такой slug уже занят")
    db.refresh(card)
    return card_to_out(card)


@router.post("/cards/me/publish")
def toggle_publish(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Переключает публикацию визитки. 404 — если визитки нет."""
    card = _get_own_card(db, user)
    if card is None:
        raise HTTPException(status_code=404, detail="Визитка не найдена")
    card.is_published = not card.is_published
    db.commit()
    return {"is_published": card.is_published}


@router.delete("/cards/me")
def delete_my_card(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Удаляет визитку текущего пользователя. 404 — если визитки нет."""
    card = _get_own_card(db, user)
    if card is None:
        raise HTTPException(status_code=404, detail="Визитка не найдена")
    db.delete(card)
    db.commit()
    return {"ok": True}


@router.get("/slug/check", response_model=SlugCheckOut)
def check_slug(
    slug: str = Query(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SlugCheckOut:
    """Проверка доступности slug.

    reason: invalid (формат), reserved (зарезервирован), taken (занят).
    Свой текущий slug считается доступным.
    """
    if not SLUG_PATTERN.match(slug):
        return SlugCheckOut(slug=slug, available=False, reason="invalid")
    if slug in RESERVED_SLUGS:
        return SlugCheckOut(slug=slug, available=False, reason="reserved")
    owner_id = db.scalar(select(Card.user_id).where(Card.slug == slug))
    if owner_id is not None and owner_id != user.id:
        return SlugCheckOut(slug=slug, available=False, reason="taken")
    return SlugCheckOut(slug=slug, available=True, reason=None)


@router.get("/slug/generate")
def generate_slug_from_name(
    full_name: str = Query(..., min_length=1, max_length=128),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),  # noqa: ARG001 — только авторизация
) -> dict:
    """Генерирует свободный slug из ФИО (транслитерация, суффиксы -2, -3...)."""
    return {"slug": generate_slug(db, full_name)}

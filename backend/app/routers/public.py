"""Публичный доступ к визиткам: GET /api/u/{slug} — без авторизации."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Card, User
from app.schemas import PublicCardOut

router = APIRouter(tags=["public"])


@router.get("/u/{slug}", response_model=PublicCardOut)
def get_public_card(slug: str, db: Session = Depends(get_db)) -> PublicCardOut:
    """Публичная визитка по slug.

    404 — визитки нет ИЛИ is_published=false (без различения, чтобы не
    раскрывать существование). При успехе инкрементирует views_count.
    Отдаёт только публичный whitelist полей (никаких user_id/email).
    """
    row = db.execute(
        select(Card, User.avatar_url)
        .join(User, Card.user_id == User.id)
        .where(Card.slug == slug, Card.is_published.is_(True))
    ).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Визитка не найдена")

    card, avatar_url = row
    card.views_count += 1
    db.commit()

    return PublicCardOut(
        slug=card.slug,
        full_name=card.full_name,
        university=card.university,
        specialty=card.specialty,
        graduation_year=card.graduation_year,
        about=card.about,
        skills=card.skills,
        links=card.links,
        theme=card.theme,
        avatar_url=avatar_url,
    )

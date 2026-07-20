"""Модели User и Card — строго по docs/db-schema.md."""
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    """Временные метки в UTC (согласовано с exp в JWT)."""
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # NULL у dev-пользователя
    vk_id: Mapped[Optional[str]] = mapped_column(String(32), unique=True, nullable=True)
    display_name: Mapped[str] = mapped_column(String(128), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=_utcnow
    )

    # одна визитка на пользователя
    card: Mapped[Optional["Card"]] = relationship(back_populates="user", uselist=False)


class Card(Base):
    __tablename__ = "cards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), unique=True, nullable=False
    )
    slug: Mapped[str] = mapped_column(
        String(40), unique=True, nullable=False, index=True
    )
    full_name: Mapped[str] = mapped_column(String(128), nullable=False)
    university: Mapped[str] = mapped_column(String(256), nullable=False, default="")
    specialty: Mapped[str] = mapped_column(String(256), nullable=False, default="")
    graduation_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    about: Mapped[str] = mapped_column(Text, nullable=False, default="")
    skills: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    links: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    theme: Mapped[str] = mapped_column(String(32), nullable=False, default="default")
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    views_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=_utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=_utcnow, onupdate=_utcnow
    )

    user: Mapped[User] = relationship(back_populates="card")

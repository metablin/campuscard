"""Зависимости авторизации."""
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.auth.security import SESSION_COOKIE, decode_session_token
from app.database import get_db
from app.models import User


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """Читает JWT из куки campuscard_session.

    401 — куки нет, токен невалиден/просрочен или пользователь не найден.
    """
    token = request.cookies.get(SESSION_COOKIE)
    user_id = decode_session_token(token) if token else None
    if user_id is None:
        raise HTTPException(status_code=401, detail="Не авторизован")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Пользователь не найден")
    return user

"""JWT-сессии: выпуск/проверка токена и работа с httpOnly-кукой."""
from datetime import datetime, timedelta, timezone

from fastapi import Response
from jose import JWTError, jwt

from app.config import settings

ALGORITHM = "HS256"
SESSION_COOKIE = "campuscard_session"


def create_session_token(user_id: int) -> str:
    """Выпускает JWT: sub = user_id, срок жизни — JWT_EXPIRE_DAYS дней."""
    expires = datetime.now(timezone.utc) + timedelta(days=settings.JWT_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "exp": expires}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_session_token(token: str) -> int | None:
    """Декодирует JWT. Возвращает user_id или None (невалиден/просрочен)."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        return None


def set_session_cookie(response: Response, token: str) -> None:
    """Ставит httpOnly-куку campuscard_session на срок JWT_EXPIRE_DAYS."""
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=settings.JWT_EXPIRE_DAYS * 24 * 3600,
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,  # true только под https (ngrok)
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    """Удаляет сессионную куку (logout)."""
    response.delete_cookie(key=SESSION_COOKIE, path="/")

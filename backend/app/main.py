"""Точка входа FastAPI-приложения CampusCard."""
from fastapi import APIRouter, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import models  # noqa: F401 — регистрирует модели в метаданных Base
from app.auth.router import router as auth_router
from app.config import settings
from app.database import Base, engine
from app.routers import cards, public

api_router = APIRouter(prefix="/api")


@api_router.get("/health")
def health() -> dict:
    return {"status": "ok"}


api_router.include_router(auth_router)
api_router.include_router(cards.router)
api_router.include_router(public.router)


def create_app() -> FastAPI:
    app = FastAPI(title="CampusCard API")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_ORIGIN],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Content-Type"],
    )

    # По контракту ошибки валидации — 400 (FastAPI по умолчанию отдаёт 422)
    @app.exception_handler(RequestValidationError)
    async def validation_handler(
        request: Request, exc: RequestValidationError  # noqa: ARG001
    ) -> JSONResponse:
        return JSONResponse(status_code=400, content={"detail": "Ошибка валидации данных"})

    # Создание таблиц при старте; миграции не используем (docs/db-schema.md)
    Base.metadata.create_all(bind=engine)
    app.include_router(api_router)
    return app


app = create_app()

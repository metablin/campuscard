"""Настройки приложения. Читаются из backend/.env (образец — .env.example)."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "sqlite:///./campuscard.db"
    # Секрет без дефолта: приложение не стартует, пока он не задан в .env
    JWT_SECRET: str
    JWT_EXPIRE_DAYS: int = 7
    DEV_AUTH: bool = False
    # secure-флаг куки: true только при https (ngrok), для localhost — false
    COOKIE_SECURE: bool = False
    VK_CLIENT_ID: str = ""
    VK_CLIENT_SECRET: str = ""
    VK_REDIRECT_URI: str = ""
    FRONTEND_ORIGIN: str = "http://localhost:5173"


settings = Settings()

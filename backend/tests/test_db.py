from sqlalchemy import create_engine, inspect

from app import models  # noqa: F401 — регистрирует модели в метаданных Base
from app.database import Base


def test_create_tables(tmp_path):
    """Таблицы users и cards создаются по метаданным (на временной БД)."""
    engine = create_engine(f"sqlite:///{tmp_path}/test.db")
    Base.metadata.create_all(bind=engine)
    tables = set(inspect(engine).get_table_names())
    assert {"users", "cards"} <= tables

FROM python:3.12-slim

WORKDIR /app

# зависимости отдельным слоем — кешируются между сборками
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# non-root: приложению нужна запись только в /app (локальный SQLite)
# и /data (том compose; владелец каталога копируется в named volume)
RUN useradd --create-home app \
    && mkdir -p /data \
    && chown -R app:app /app /data
USER app

EXPOSE 8000

# SQLite-файл создаётся при старте (Base.metadata.create_all)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

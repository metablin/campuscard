FROM python:3.12-slim

WORKDIR /app

# зависимости отдельным слоем — кешируются между сборками
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000

# SQLite-файл создаётся при старте (Base.metadata.create_all)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

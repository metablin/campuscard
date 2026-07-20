#!/usr/bin/env bash
# Запуск CampusCard для локальной разработки: backend (uvicorn :8000) +
# frontend (vite :5173) одной командой. Остановка — Ctrl+C (гасит оба процесса).
set -euo pipefail

cd "$(dirname "$0")"

BACKEND_VENV="backend/.venv"
if [ -f "$BACKEND_VENV/Scripts/uvicorn.exe" ]; then
  UVICORN="$BACKEND_VENV/Scripts/uvicorn.exe"   # Windows (Git Bash)
elif [ -f "$BACKEND_VENV/bin/uvicorn" ]; then
  UVICORN="$BACKEND_VENV/bin/uvicorn"           # macOS/Linux
else
  echo "Ошибка: не найден backend/.venv. Создай окружение:" >&2
  echo "  cd backend && python -m venv .venv && pip install -r requirements.txt" >&2
  exit 1
fi

echo "→ backend:  http://localhost:8000 (docs: /docs)"
echo "→ frontend: http://localhost:5173"

(cd backend && "$UVICORN" app.main:app --reload --port 8000) &
BACK_PID=$!
(cd frontend && npm run dev) &
FRONT_PID=$!

cleanup() {
  kill "$BACK_PID" "$FRONT_PID" 2>/dev/null || true
}
# EXIT — чтобы дочерние процессы не остались сиротами при аварийном выходе
trap cleanup INT TERM EXIT

# plain wait: wait -n требует bash ≥ 4.3, а на macOS системный bash — 3.2
wait "$BACK_PID" "$FRONT_PID"

#!/usr/bin/env bash
# Boot do Render (plano gratuito — sem Shell interativo).
set -euo pipefail

echo "[start] migrate…"
python manage.py migrate --noinput

echo "[start] ensure_admin…"
python manage.py ensure_admin

echo "[start] load_banco_if_empty…"
python manage.py load_banco_if_empty

PORT="${PORT:-8000}"
echo "[start] gunicorn :${PORT}"
exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT}" \
  --workers "${WEB_CONCURRENCY:-1}" \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -

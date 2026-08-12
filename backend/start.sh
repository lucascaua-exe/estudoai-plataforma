#!/usr/bin/env bash
# Start no Render — sobe rápido para passar no health check.
set -euo pipefail

echo "[start] migrate (safety)…"
python manage.py migrate --noinput

PORT="${PORT:-8000}"
echo "[start] gunicorn :${PORT}"
exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT}" \
  --workers "${WEB_CONCURRENCY:-1}" \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -

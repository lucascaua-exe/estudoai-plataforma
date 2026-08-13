#!/usr/bin/env bash
# Start no Render — sobe rápido para passar no health check.
set -euo pipefail

echo "[start] migrate (safety)…"
python manage.py migrate --noinput

# Monitor de textos grudados (varredura periódica). Desligue com TEXT_MONITOR_LOOP=0.
# Intervalo em segundos: TEXT_MONITOR_INTERVAL (default 300).
TEXT_MONITOR_LOOP="${TEXT_MONITOR_LOOP:-1}"
TEXT_MONITOR_INTERVAL="${TEXT_MONITOR_INTERVAL:-300}"
if [ "${TEXT_MONITOR_LOOP}" = "1" ] || [ "${TEXT_MONITOR_LOOP}" = "true" ]; then
  echo "[start] text monitor loop (interval=${TEXT_MONITOR_INTERVAL}s)…"
  python manage.py monitor_question_texts --loop --interval "${TEXT_MONITOR_INTERVAL}" &
fi

PORT="${PORT:-8000}"
echo "[start] gunicorn :${PORT}"
exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT}" \
  --workers "${WEB_CONCURRENCY:-1}" \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -

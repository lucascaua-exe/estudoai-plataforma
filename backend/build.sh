#!/usr/bin/env bash
# Build no Render — migrate + fixture aqui para o health check não falhar no start.
set -euo pipefail

echo "[build] pip…"
python -m pip install --upgrade pip
pip install -r requirements.txt

echo "[build] collectstatic…"
python manage.py collectstatic --noinput

echo "[build] migrate…"
python manage.py migrate --noinput

echo "[build] ensure_admin…"
python manage.py ensure_admin || true

echo "[build] load_banco_if_empty…"
python manage.py load_banco_if_empty

echo "[build] import_dpe_eletrica…"
python manage.py import_dpe_eletrica --from-json || true

echo "[build] import_eaoear_eletrica…"
python manage.py import_eaoear_eletrica --from-json || true

echo "[build] import_provas_batch…"
python manage.py import_provas_batch || true

echo "[build] repair_question_images…"
python manage.py repair_question_images || true

echo "[build] clean_question_texts…"
python manage.py clean_question_texts || true

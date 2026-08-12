#!/usr/bin/env bash
# Build no Render — sem Shell interativo.
set -euo pipefail

python -m pip install --upgrade pip
pip install -r requirements.txt
python manage.py collectstatic --noinput

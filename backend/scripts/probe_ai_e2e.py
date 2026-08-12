"""E2E AI checks without printing secrets. Run: py -3.10 scripts/probe_ai_e2e.py"""
from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.ai.views import ChatView, GenerateQuestionsView
from apps.catalog.models import Assunto
from apps.ai.rag import ai_available


def main() -> int:
    print("ai_available:", ai_available())
    user = get_user_model().objects.filter(email="admin@estudoai.app").first()
    if not user:
        print("FAIL: no admin user")
        return 1

    factory = APIRequestFactory()

    # Chat
    req = factory.post(
        "/api/ai/chat/",
        {"message": "Em 3 frases, o que e a LGPD e para que serve?"},
        format="json",
    )
    force_authenticate(req, user=user)
    res = ChatView.as_view()(req)
    print("chat_status:", res.status_code)
    data = res.data if hasattr(res, "data") else {}
    conteudo = ((data.get("message") or {}).get("conteudo") or "")
    print("chat_ai_enabled:", data.get("ai_enabled"))
    print("chat_len:", len(conteudo))
    print("chat_preview:", conteudo[:280].replace("\n", " "))
    chat_ok = res.status_code == 200 and len(conteudo) > 40 and data.get("ai_enabled") is True

    # Generate questions
    assunto = Assunto.objects.select_related("disciplina").filter(nome__icontains="LGPD").first()
    if not assunto:
        assunto = Assunto.objects.select_related("disciplina").first()
    print("assunto:", assunto.id if assunto else None, getattr(assunto, "nome", None))
    gen_ok = False
    if assunto:
        req2 = factory.post(
            "/api/ai/generate-questions/",
            {"assunto_id": assunto.id, "quantidade": 1},
            format="json",
        )
        force_authenticate(req2, user=user)
        res2 = GenerateQuestionsView.as_view()(req2)
        print("generate_status:", res2.status_code)
        q = (res2.data or {}).get("questoes") or []
        print("generate_count:", len(q))
        if q:
            print("generate_preview:", (q[0].get("enunciado") or "")[:160])
        gen_ok = res2.status_code == 200 and len(q) >= 1
        if not gen_ok:
            print("generate_detail:", (res2.data or {}).get("detail"))

    print("RESULT:", "PASS" if chat_ok and gen_ok else "PARTIAL" if chat_ok else "FAIL")
    print("chat_ok:", chat_ok, "generate_ok:", gen_ok)
    return 0 if chat_ok else 2


if __name__ == "__main__":
    raise SystemExit(main())

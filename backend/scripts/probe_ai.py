"""Probe Gemini + RAG chat locally. Run: py -3 manage.py shell < scripts/probe_ai.py
Or: py -3 scripts/probe_ai.py from backend with DJANGO_SETTINGS_MODULE.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from django.conf import settings
from apps.ai.gemini import gemini_available, generate_text, _endpoint
from apps.ai.rag import chat, ai_available, explain_question_answer


def main() -> None:
    key = (settings.GEMINI_API_KEY or "").strip()
    print("=== AI PROBE ===")
    print("gemini_available:", gemini_available())
    print("ai_available:", ai_available())
    print("model:", settings.GEMINI_MODEL)
    print("endpoint:", _endpoint())
    print("key_len:", len(key), "prefix:", key[:4] if key else "(empty)")

    text = generate_text(
        "Responda em UMA frase curta em portugues: o que e Scrum?",
        system="Voce e tutor de TI para concurso. Seja objetivo.",
        temperature=0.2,
    )
    print("--- generate_text ---")
    print(text if text else "(EMPTY)")

    result = chat("Explique brevemente o que e controlador na LGPD.")
    print("--- chat ---")
    print("fontes:", len(result.get("fontes") or []))
    print((result.get("conteudo") or "")[:800])

    exp = explain_question_answer(
        enunciado="Qual abordagem de software usa sprints?",
        alternativas=[
            {"letra": "A", "texto": "Cascata"},
            {"letra": "B", "texto": "Big Bang"},
            {"letra": "C", "texto": "Scrum"},
        ],
        gabarito="C",
        letra_escolhida="A",
        correta=False,
        explicacao_existente="",
        disciplina="TI",
        assunto="Gestao de projetos",
    )
    print("--- explain ---")
    print(exp[:800] if exp else "(EMPTY)")
    print("=== END ===")


if __name__ == "__main__":
    main()

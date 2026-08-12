from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from apps.ai.rag import (
    GENERATE_QUESTIONS_SYSTEM,
    _llm_json,
    build_context,
    generate_questions,
    search_chunks,
)
from apps.catalog.models import Assunto
from apps.documents.models import DocumentoChunk


def main() -> None:
    a = Assunto.objects.select_related("disciplina").get(id=60)
    chunks = search_chunks(f"{a.disciplina.nome} {a.nome} acentuacao", k=8)
    print("search_chunks", len(chunks), "avg_len", sum(len(c.get("texto") or "") for c in chunks) // max(len(chunks), 1))
    long = list(DocumentoChunk.objects.filter(texto__icontains="acentua")[:5])
    print("direct_hits", len(long), [len(c.texto) for c in long])
    context = build_context(chunks)
    prompt = f"""Gere 1 questão de múltipla escolha (A-E) sobre:
Disciplina: {a.disciplina.nome}
Assunto: {a.nome}

Retorne JSON com chave questoes.
CONTEXTO:
{context[:4000]}
"""
    data = _llm_json(prompt, system=GENERATE_QUESTIONS_SYSTEM, temperature=0.35)
    print("raw_keys", list(data.keys()))
    print("questoes", len(data.get("questoes") or []))
    print(str(data)[:700])
    out = generate_questions(a.nome, a.disciplina.nome, 1)
    print("generate_questions", len(out))


if __name__ == "__main__":
    main()

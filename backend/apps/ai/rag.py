"""Serviço RAG restrito à base documental do usuário."""
from __future__ import annotations

from django.conf import settings

INSUFFICIENT_MSG = (
    "Não encontrei informações suficientes sobre este assunto na sua base de estudos."
)

SYSTEM_PROMPT = """Você é o Assistente de Estudos da plataforma pessoal do usuário.
REGRAS ABSOLUTAS:
1. Use APENAS o contexto fornecido dos PDFs do usuário.
2. NÃO invente fatos, leis, artigos ou conceitos que não estejam no contexto.
3. NÃO use conhecimento externo.
4. Se o contexto for insuficiente, responda exatamente: "Não encontrei informações suficientes sobre este assunto na sua base de estudos."
5. Sempre que possível cite a fonte no formato: Fonte: {documento} — Página {pagina}.
6. Responda em português do Brasil, de forma clara e didática.
"""


def openai_available() -> bool:
    return bool(settings.OPENAI_API_KEY)


def search_chunks(query: str, k: int = 6) -> list[dict]:
    """Busca lexical simples nos chunks; embeddings se API disponível."""
    from apps.documents.models import DocumentoChunk

    terms = [t.lower() for t in query.split() if len(t) > 3][:8]
    qs = DocumentoChunk.objects.select_related("documento", "pagina").all()
    if terms:
        from django.db.models import Q

        q_obj = Q()
        for t in terms:
            q_obj |= Q(texto__icontains=t)
        qs = qs.filter(q_obj)
    chunks = list(qs[:k])
    if not chunks:
        chunks = list(
            DocumentoChunk.objects.select_related("documento", "pagina").order_by("?")[:k]
        )

    # Optionally enrich with Chroma if key present
    if openai_available():
        try:
            chroma_hits = _chroma_search(query, k=k)
            if chroma_hits:
                return chroma_hits
        except Exception:
            pass

    return [
        {
            "texto": c.texto,
            "documento": c.documento.nome,
            "pagina": c.pagina.numero if c.pagina else None,
            "disciplina": c.disciplina,
            "assunto": c.assunto,
        }
        for c in chunks
    ]


def _chroma_search(query: str, k: int = 6) -> list[dict]:
    try:
        import chromadb
    except ImportError:
        return []
    from openai import OpenAI

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    emb = client.embeddings.create(model=settings.OPENAI_EMBEDDING_MODEL, input=query)
    vector = emb.data[0].embedding
    chroma = chromadb.PersistentClient(path=str(settings.CHROMA_DIR))
    try:
        col = chroma.get_collection("estudo_chunks")
    except Exception:
        return []
    res = col.query(query_embeddings=[vector], n_results=k)
    docs = res.get("documents", [[]])[0]
    metas = res.get("metadatas", [[]])[0]
    out = []
    for doc, meta in zip(docs, metas):
        out.append(
            {
                "texto": doc,
                "documento": meta.get("documento"),
                "pagina": meta.get("pagina"),
                "disciplina": meta.get("disciplina", ""),
                "assunto": meta.get("assunto", ""),
            }
        )
    return out


def build_context(chunks: list[dict]) -> str:
    parts = []
    for i, c in enumerate(chunks, 1):
        parts.append(
            f"[{i}] Documento: {c.get('documento')} | Página: {c.get('pagina')}\n{c.get('texto')}"
        )
    return "\n\n".join(parts)


def chat(user_message: str, history: list[dict] | None = None) -> dict:
    chunks = search_chunks(user_message)
    context = build_context(chunks)
    fontes = [
        {"documento": c.get("documento"), "pagina": c.get("pagina")}
        for c in chunks
        if c.get("documento")
    ]

    if not chunks or not context.strip():
        return {"conteudo": INSUFFICIENT_MSG, "fontes": []}

    if not openai_available():
        # Fallback: return relevant excerpts without generation
        preview = chunks[0]["texto"][:800]
        fonte = fontes[0] if fontes else {}
        return {
            "conteudo": (
                f"Com base na sua base de estudos:\n\n{preview}\n\n"
                f"Fonte: {fonte.get('documento')} — Página {fonte.get('pagina')}.\n\n"
                "(Configure OPENAI_API_KEY no .env para respostas geradas por IA.)"
            ),
            "fontes": fontes,
        }

    from openai import OpenAI

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.append(
        {
            "role": "system",
            "content": f"CONTEXTO DOS PDFs DO USUÁRIO:\n{context}",
        }
    )
    for h in history or []:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": user_message})

    resp = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=messages,
        temperature=0.2,
    )
    content = resp.choices[0].message.content or INSUFFICIENT_MSG
    return {"conteudo": content, "fontes": fontes}


def generate_questions(assunto_nome: str, disciplina_nome: str, quantidade: int = 3) -> list[dict]:
    chunks = search_chunks(f"{disciplina_nome} {assunto_nome}", k=8)
    if not chunks:
        return []
    context = build_context(chunks)
    if not openai_available():
        return []

    from openai import OpenAI
    import json

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    prompt = f"""Com base EXCLUSIVAMENTE no contexto abaixo, gere {quantidade} questões de múltipla escolha (A-E)
sobre "{assunto_nome}" / "{disciplina_nome}".
Cada questão deve ter: enunciado, alternativas A-E, gabarito (letra), justificativa, trecho_referencia.
Retorne JSON: {{"questoes": [...]}}
Se o contexto for insuficiente, retorne {{"questoes": []}}.

CONTEXTO:
{context}
"""
    resp = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        response_format={"type": "json_object"},
    )
    try:
        data = json.loads(resp.choices[0].message.content or "{}")
        return data.get("questoes", [])
    except Exception:
        return []

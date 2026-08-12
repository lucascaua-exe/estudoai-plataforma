"""Ingestão de PDFs IMPAR → banco de questões e chunks."""
from __future__ import annotations

import hashlib
import re
from pathlib import Path

from django.conf import settings
from django.db import transaction
from django.utils.text import slugify

from apps.catalog.models import Assunto, Disciplina
from apps.documents.models import Documento, DocumentoChunk, PaginaDocumento
from apps.documents.parser import parse_pages
from apps.questions.models import Alternativa, Questao

PDF_REGISTRY = [
    {
        "filename": "analista_tecnologia_informacao_impar_prefeitura_de_araguaina_to_2026_questoes.pdf",
        "tipo": Documento.Tipo.QUESTOES_ESPECIFICO,
        "nome": "Questões — Específico (TI / Legislação)",
    },
    {
        "filename": "analista_tecnologia_informacao_impar_prefeitura_de_araguaina_to_2026_basico_questoes.pdf",
        "tipo": Documento.Tipo.QUESTOES_BASICO,
        "nome": "Questões — Conhecimentos Básicos",
    },
    {
        "filename": "analista_tecnologia_informacao_impar_prefeitura_de_araguaina_to_2026_teoria.pdf",
        "tipo": Documento.Tipo.TEORIA_ESPECIFICO,
        "nome": "Teoria — Específico",
    },
    {
        "filename": "analista_tecnologia_informacao_impar_prefeitura_de_araguaina_to_2026_basico_teoria.pdf",
        "tipo": Documento.Tipo.TEORIA_BASICO,
        "nome": "Teoria — Básico",
    },
    {
        "filename": "analista_tecnologia_informacao_impar_prefeitura_de_araguaina_to_2026_resumo.pdf",
        "tipo": Documento.Tipo.RESUMO_ESPECIFICO,
        "nome": "Resumo — Específico",
    },
    {
        "filename": "analista_tecnologia_informacao_impar_prefeitura_de_araguaina_to_2026_basico_resumo.pdf",
        "tipo": Documento.Tipo.RESUMO_BASICO,
        "nome": "Resumo — Básico",
    },
]


def file_hash(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def get_or_create_disciplina(nome: str, doc_tipo: str = "") -> Disciplina | None:
    from apps.catalog.taxonomy import canonicalize_disciplina

    canonical = canonicalize_disciplina(nome, doc_tipo=doc_tipo)
    if not canonical:
        return None
    slug = slugify(canonical)[:250] or "disciplina"
    obj, _ = Disciplina.objects.get_or_create(
        slug=slug, defaults={"nome": canonical}
    )
    if obj.nome != canonical:
        obj.nome = canonical
        obj.save(update_fields=["nome"])
    return obj


def get_or_create_assunto(disciplina: Disciplina | None, nome: str) -> Assunto | None:
    from apps.catalog.taxonomy import normalize_assunto

    nome = normalize_assunto(nome or "")
    if not disciplina or not nome or len(nome) < 3:
        return None
    if ". ." in nome or "..." in nome:
        return None
    slug = slugify(nome)[:250] or "assunto"
    if not slug:
        return None
    obj, _ = Assunto.objects.get_or_create(
        disciplina=disciplina, slug=slug, defaults={"nome": nome}
    )
    return obj


def persist_questions(documento: Documento, parsed_list) -> int:
    count = 0
    doc_tipo = documento.tipo
    for pq in parsed_list:
        disciplina = get_or_create_disciplina(pq.disciplina, doc_tipo=doc_tipo)
        # Se o parser não capturou disciplina, inferir pelo tipo do PDF + assunto
        if not disciplina and doc_tipo == Documento.Tipo.QUESTOES_ESPECIFICO:
            disciplina = get_or_create_disciplina(
                pq.assunto or pq.disciplina or "Tecnologia da Informação",
                doc_tipo=doc_tipo,
            )
        if not disciplina and doc_tipo == Documento.Tipo.QUESTOES_BASICO:
            disciplina = get_or_create_disciplina(
                pq.disciplina or pq.assunto or "",
                doc_tipo=doc_tipo,
            )
        assunto = get_or_create_assunto(disciplina, pq.assunto)
        h = pq.content_hash()
        if Questao.objects.filter(hash_conteudo=h).exists():
            q = Questao.objects.get(hash_conteudo=h)
            if pq.gabarito and not q.gabarito:
                q.gabarito = pq.gabarito
                q.explicacao = pq.explicacao or q.explicacao
                q.save(update_fields=["gabarito", "explicacao"])
                Alternativa.objects.filter(questao=q).update(correta=False)
                Alternativa.objects.filter(questao=q, letra=pq.gabarito).update(correta=True)
            continue

        with transaction.atomic():
            q = Questao.objects.create(
                disciplina=disciplina,
                assunto=assunto,
                documento=documento,
                numero_origem=pq.numero,
                pagina=pq.pagina,
                enunciado=pq.enunciado,
                dificuldade=pq.dificuldade,
                gabarito=pq.gabarito,
                explicacao=pq.explicacao,
                origem=Questao.Origem.PDF,
                hash_conteudo=h,
            )
            seen_letters: set[str] = set()
            for alt in pq.alternativas:
                letra = (alt.letra or "").upper()[:1]
                if not letra or letra in seen_letters:
                    continue
                seen_letters.add(letra)
                Alternativa.objects.create(
                    questao=q,
                    letra=letra,
                    texto=alt.texto,
                    correta=bool(pq.gabarito) and letra == pq.gabarito,
                )
            count += 1
    return count


def chunk_text(text: str, size: int = 800, overlap: int = 100) -> list[str]:
    text = re.sub(r"\s+", " ", text or "").strip()
    if not text:
        return []
    chunks = []
    start = 0
    while start < len(text):
        end = start + size
        chunks.append(text[start:end])
        start = end - overlap
        if start < 0:
            start = 0
        if end >= len(text):
            break
    return chunks


def ingest_theory_document(documento: Documento, pages: list[tuple[int, str]]):
    DocumentoChunk.objects.filter(documento=documento).delete()
    idx = 0
    for page_num, text in pages:
        if not (text or "").strip():
            continue
        page_obj, _ = PaginaDocumento.objects.update_or_create(
            documento=documento,
            numero=page_num,
            defaults={"texto": text[:50000]},
        )
        for ch in chunk_text(text):
            DocumentoChunk.objects.create(
                documento=documento,
                pagina=page_obj,
                indice=idx,
                texto=ch,
            )
            idx += 1
    return idx


def extract_pages(path: Path, max_pages: int | None = None) -> list[tuple[int, str]]:
    import pdfplumber

    pages = []
    with pdfplumber.open(path) as pdf:
        total = len(pdf.pages)
        limit = min(total, max_pages) if max_pages else total
        for i in range(limit):
            text = pdf.pages[i].extract_text() or ""
            pages.append((i + 1, text))
    return pages


def ingest_file(
    path: Path,
    tipo: str,
    nome: str,
    stdout=None,
    max_pages: int | None = None,
    force: bool = False,
) -> Documento:
    def log(msg):
        if stdout:
            stdout.write(msg)

    if not path.exists():
        raise FileNotFoundError(str(path))

    h = file_hash(path)
    doc, created = Documento.objects.get_or_create(
        hash_arquivo=h,
        defaults={
            "nome": nome,
            "caminho_origem": str(path),
            "tipo": tipo,
            "status": Documento.Status.PENDENTE,
        },
    )
    if not created and doc.status == Documento.Status.CONCLUIDO and not force:
        log(f"Já processado: {nome}")
        return doc

    doc.nome = nome
    doc.caminho_origem = str(path)
    doc.tipo = tipo
    doc.status = Documento.Status.PROCESSANDO
    doc.progresso = 0
    doc.mensagem_erro = ""
    doc.save()

    try:
        log(f"Extraindo: {path.name} ...")
        pages = extract_pages(path, max_pages=max_pages)
        doc.total_paginas = len(pages)
        doc.progresso = 30
        doc.save(update_fields=["total_paginas", "progresso"])

        is_questions = tipo in (
            Documento.Tipo.QUESTOES_BASICO,
            Documento.Tipo.QUESTOES_ESPECIFICO,
        )

        if is_questions:
            log(f"Parseando questões ({len(pages)} páginas)...")
            parsed = parse_pages(pages)
            log(f"Encontradas {len(parsed)} questões candidatas.")
            created_count = persist_questions(doc, parsed)
            doc.questoes_extraidas = Questao.objects.filter(documento=doc).count()
            log(f"Novas questões salvas: {created_count} (total doc: {doc.questoes_extraidas})")
        else:
            log("Indexando conteúdo teórico/resumo...")
            n = ingest_theory_document(doc, pages)
            log(f"Chunks criados: {n}")

        doc.status = Documento.Status.CONCLUIDO
        doc.progresso = 100
        doc.save()
    except Exception as e:
        doc.status = Documento.Status.ERRO
        doc.mensagem_erro = str(e)
        doc.save()
        raise

    return doc


def ingest_all(stdout=None, only_questions: bool = False, max_pages: int | None = None, force: bool = False):
    source = Path(settings.PDF_SOURCE_DIR)
    docs = []
    for item in PDF_REGISTRY:
        if only_questions and "questoes" not in item["tipo"]:
            continue
        path = source / item["filename"]
        if not path.exists():
            if stdout:
                stdout.write(f"Arquivo não encontrado: {path}")
            continue
        docs.append(
            ingest_file(
                path,
                item["tipo"],
                item["nome"],
                stdout=stdout,
                max_pages=max_pages,
                force=force,
            )
        )
    return docs

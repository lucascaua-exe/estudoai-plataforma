"""
Importa questões de múltiplas provas (elétrica e afins) para o banco.

Fontes:
  - PROVA ANALISTA CONAB.pdf (objetiva a–d)
  - PROVA ANALISTA DPE.pdf (já parcial; completa o que faltar via JSON/script)
  - PROVA EXÉRCITO*.pdf (discursivas + figura da página)
  - PROVA TJ PA.pdf (Certo/Errado CEBRASPE)
  - PROVA MARINHA.pdf (escaneada — registra páginas/figuras quando possível)

Uso:
  py -3.10 scripts/import_provas_batch.py
  py -3.10 manage.py import_provas_batch
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import unicodedata
from pathlib import Path

import django

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")


def _ensure_django() -> None:
    try:
        from django.apps import apps

        if apps.ready:
            return
    except Exception:
        pass
    django.setup()


_ensure_django()

from django.core.files import File
from django.db import transaction
from django.utils.text import slugify

from apps.catalog.models import Assunto, Disciplina
from apps.documents.models import Documento
from apps.questions.models import Alternativa, Questao

PDF_DIR = ROOT / "data" / "pdfs"
OUT_DIR = ROOT / "data" / "pdfs" / "batch_extracted"
IMG_DIR = ROOT / "data" / "questoes_images" / "provas_batch"
JSON_PATH = OUT_DIR / "batch_questoes.json"


def polish(text: str) -> str:
    text = unicodedata.normalize("NFKC", text or "")
    text = re.sub(r"pcimarkpci\s+\S+", " ", text)
    text = re.sub(r"www\.pciconcursos\.com\.br", " ", text, flags=re.I)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def content_hash(origem: str, numero: int, enunciado: str) -> str:
    raw = f"{origem}|{numero}|{(enunciado or '')[:180]}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def get_disciplina(nome: str) -> Disciplina:
    slug = slugify(nome)[:240] or "disciplina"
    obj, _ = Disciplina.objects.get_or_create(slug=slug, defaults={"nome": nome, "ordem": 100})
    if obj.nome != nome:
        obj.nome = nome
        obj.save(update_fields=["nome"])
    return obj


def get_assunto(disciplina: Disciplina, nome: str) -> Assunto:
    nome = polish(nome)[:180] or "Geral"
    slug = slugify(nome)[:240] or "assunto"
    obj, _ = Assunto.objects.get_or_create(
        disciplina=disciplina, slug=slug, defaults={"nome": nome}
    )
    return obj


def persist_question(qdata: dict, doc: Documento) -> str:
    disciplina = get_disciplina(qdata["disciplina"])
    assunto = get_assunto(disciplina, qdata.get("assunto") or "Geral")
    gab = (qdata.get("gabarito") or "").upper()[:1]
    letras = list(qdata.get("alternativas", {}).keys()) or list("ABCD")
    h = content_hash(qdata["origem_key"], qdata["numero"], qdata["enunciado"])

    with transaction.atomic():
        q = Questao.objects.filter(hash_conteudo=h).first()
        if not q:
            q = Questao.objects.filter(
                documento=doc,
                numero_origem=qdata["numero"],
                origem=Questao.Origem.PDF,
            ).first()

        if q:
            q.enunciado = qdata["enunciado"]
            q.gabarito = gab
            q.assunto = assunto
            q.disciplina = disciplina
            q.documento = doc
            q.numero_origem = qdata["numero"]
            q.pagina = qdata.get("pagina")
            q.dificuldade = qdata.get("dificuldade") or Questao.Dificuldade.MEDIO
            q.save()
            status = "updated"
        else:
            q = Questao.objects.create(
                disciplina=disciplina,
                assunto=assunto,
                documento=doc,
                numero_origem=qdata["numero"],
                pagina=qdata.get("pagina"),
                enunciado=qdata["enunciado"],
                dificuldade=qdata.get("dificuldade") or Questao.Dificuldade.MEDIO,
                gabarito=gab,
                origem=Questao.Origem.PDF,
                hash_conteudo=h,
            )
            status = "created"

        Alternativa.objects.filter(questao=q).delete()
        for letra in letras:
            texto = (qdata["alternativas"].get(letra) or "").strip() or f"(alternativa {letra})"
            Alternativa.objects.create(
                questao=q,
                letra=letra,
                texto=texto,
                correta=bool(gab) and letra == gab,
            )

        img = qdata.get("imagem_path")
        if img:
            src = Path(img)
            if not src.is_absolute():
                src = ROOT / img
            if src.exists():
                with src.open("rb") as fh:
                    q.imagem.save(
                        f"{qdata['origem_key']}_q{q.numero_origem}.jpg",
                        File(fh),
                        save=True,
                    )
    return status


# ───────────────────── CONAB ─────────────────────


def extract_conab() -> list[dict]:
    import pdfplumber

    path = PDF_DIR / "PROVA ANALISTA CONAB.pdf"
    if not path.exists():
        return []

    pages_text: list[tuple[int, str]] = []
    with pdfplumber.open(path) as pdf:
        for i, pg in enumerate(pdf.pages):
            mid = pg.width / 2
            left = pg.crop((0, 45, mid - 3, pg.height - 28)).extract_text() or ""
            right = pg.crop((mid - 3, 45, pg.width, pg.height - 28)).extract_text() or ""
            pages_text.append((i + 1, polish(left) + "\n" + polish(right)))

    full = "\n\n".join(f"<<<P{p}>>>\n{t}" for p, t in pages_text)
    full = re.sub(r"(?m)^CONCURSO PÚBLICO.*$", " ", full)
    full = re.sub(r"(?m)^031\s*–.*$", " ", full)

    espec_pos = full.upper().find("CONHECIMENTOS ESPEC")
    splits = list(re.finditer(r"(?i)Quest[aã]o\s*(\d+)\b", full))
    out: list[dict] = []
    for idx, m in enumerate(splits):
        num = int(m.group(1))
        if num < 1 or num > 80:
            continue
        start = m.end()
        end = splits[idx + 1].start() if idx + 1 < len(splits) else len(full)
        block = full[start:end]
        page_m = re.search(r"<<<P(\d+)>>>", full[max(0, m.start() - 40) : m.start() + 5])
        pagina = int(page_m.group(1)) if page_m else None

        parts = re.split(r"(?m)^\s*([a-d])\)\s+", block)
        if len(parts) < 3:
            parts = re.split(r"\s+([a-d])\)\s+", block)
        enunciado = polish(parts[0])
        alts: dict[str, str] = {}
        i = 1
        while i + 1 < len(parts):
            letra = parts[i].upper()
            texto = polish(parts[i + 1])
            texto = re.sub(r"(?i)Quest[aã]o\s*\d+.*$", "", texto).strip()
            if letra in "ABCD":
                alts[letra] = texto
            i += 2
        if len(alts) < 4:
            for L in "ABCD":
                alts.setdefault(L, "")

        is_espec = espec_pos >= 0 and m.start() >= espec_pos
        if is_espec:
            disciplina = "Engenharia Elétrica"
            assunto = "Conhecimentos específicos — CONAB"
        else:
            # heurística básica
            low = enunciado.lower()
            if any(k in low for k in ("excel", "windows", "notebook", "planilha")):
                disciplina, assunto = "Informática", "Informática — CONAB"
            elif any(k in low for k in ("orçamento", "loa", "lei n", "administração")):
                disciplina, assunto = "Legislação", "Administração pública — CONAB"
            elif any(k in low for k in ("texto", "vírgula", "sintático", "metáfora", "discurso")):
                disciplina, assunto = "Língua Portuguesa", "Interpretação — CONAB"
            else:
                disciplina, assunto = "Raciocínio Lógico e Matemático", "Raciocínio — CONAB"

        out.append(
            {
                "origem_key": "conab",
                "numero": num,
                "disciplina": disciplina,
                "assunto": assunto,
                "enunciado": enunciado,
                "alternativas": {L: alts.get(L, "") for L in "ABCD"},
                "gabarito": "",
                "pagina": pagina,
                "dificuldade": "medio",
            }
        )
    # dedup
    by_n = {q["numero"]: q for q in out}
    return [by_n[n] for n in sorted(by_n)]


# ───────────────────── TJ PA (C/E) ─────────────────────


def extract_tj_pa() -> list[dict]:
    import pdfplumber

    path = PDF_DIR / "PROVA TJ PA.pdf"
    if not path.exists():
        return []

    pages_text: list[str] = []
    with pdfplumber.open(path) as pdf:
        for pg in pdf.pages:
            mid = pg.width / 2
            left = pg.crop((0, 40, mid - 4, pg.height - 30)).extract_text() or ""
            right = pg.crop((mid - 4, 40, pg.width, pg.height - 30)).extract_text() or ""
            pages_text.append(polish(left))
            pages_text.append(polish(right))

    full = "\n".join(pages_text)
    full = re.sub(r"\(cid:\d+\)", " ", full)
    full = re.sub(r"CEBRASPE.*?2025", " ", full, flags=re.I)
    full = re.sub(r"Espaço livre", " ", full, flags=re.I)

    out: list[dict] = []
    # itens 51–120 em linhas próprias após coluna
    matches = list(re.finditer(r"(?m)(?<![\d.])(\d{2,3})\s+([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ0-9].+?)(?=(?m)(?<![\d.])\d{2,3}\s+[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ0-9]|\Z)", full, re.S))
    for m in matches:
        num = int(m.group(1))
        if num < 51 or num > 120:
            continue
        enunciado = polish(m.group(2))
        if len(enunciado) < 30:
            continue
        # evita cabeçalhos
        if re.match(r"(?i)^(conhecimentos|julgue|com base)", enunciado):
            continue
        out.append(
            {
                "origem_key": "tjpa",
                "numero": num,
                "disciplina": "Engenharia Elétrica",
                "assunto": "Conhecimentos específicos — TJ/PA CEBRASPE",
                "enunciado": enunciado,
                "alternativas": {
                    "A": "Certo",
                    "B": "Errado",
                    "C": "—",
                    "D": "—",
                },
                "gabarito": "",
                "pagina": None,
                "dificuldade": "medio",
            }
        )
    by_n = {q["numero"]: q for q in out}
    return [by_n[n] for n in sorted(by_n)]


# ───────────────────── EXÉRCITO (discursiva) ─────────────────────


def _render_page(pdf_path: Path, page_index: int, dest: Path, zoom: float = 2.0) -> Path | None:
    import pymupdf

    dest.parent.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open(pdf_path)
    if page_index >= doc.page_count:
        return None
    pix = doc[page_index].get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False)
    pix.save(str(dest), jpg_quality=88)
    return dest


def extract_exercito(pdf_name: str, origem_key: str, ano: str) -> list[dict]:
    import pdfplumber

    path = PDF_DIR / pdf_name
    if not path.exists():
        return []

    with pdfplumber.open(path) as pdf:
        pages = [(i + 1, polish(p.extract_text() or "")) for i, p in enumerate(pdf.pages)]

    full = "\n\n".join(f"<<<P{p}>>>\n{t}" for p, t in pages)
    # QUESTA˜O / QUESTA ̃O / QUESTÃO / QUESTAO
    splits = list(re.finditer(r"(?mi)(\d+)\s*[ªaºo]?\s*QUEST(?:ÃO|AO|A\s*.{0,2}O)\b", full))
    if len(splits) < 3:
        splits = list(re.finditer(r"(?mi)(\d+)\s*a\s*QUESTA\s*.{0,2}O", full))
    out: list[dict] = []
    fig_dir = IMG_DIR / origem_key
    fig_dir.mkdir(parents=True, exist_ok=True)

    for idx, m in enumerate(splits):
        num = int(m.group(1))
        if num < 1 or num > 20:
            continue
        start = m.end()
        end = splits[idx + 1].start() if idx + 1 < len(splits) else len(full)
        block = full[start:end]
        page_m = re.search(r"<<<P(\d+)>>>", full[max(0, m.start() - 30) : m.start() + 10])
        pagina = int(page_m.group(1)) if page_m else 1

        enunciado_main = polish(re.split(r"(?m)^\s*[a-d]\)\s+", block)[0])
        enunciado_main = re.sub(r"Valor:\s*[\d,]+", "", enunciado_main).strip()
        items = re.findall(r"(?m)^\s*([a-d])\)\s+(.+?)(?=^\s*[a-d]\)\s+|\Z)", block, re.S)
        alts: dict[str, str] = {}
        for letra, texto in items:
            alts[letra.upper()] = polish(texto)
        if not alts:
            alts = {
                "A": "Questão discursiva — desenvolver a resposta",
                "B": "—",
                "C": "—",
                "D": "—",
            }
        else:
            for L in "ABCD":
                alts.setdefault(L, "—")

        img_path = fig_dir / f"q{num:02d}.jpg"
        try:
            _render_page(path, pagina - 1, img_path)
        except Exception:
            img_path = None

        out.append(
            {
                "origem_key": origem_key,
                "numero": num,
                "disciplina": "Engenharia Elétrica",
                "assunto": f"Prova discursiva Exército {ano}",
                "enunciado": enunciado_main,
                "alternativas": {L: alts.get(L, "—") for L in "ABCD"},
                "gabarito": "",
                "pagina": pagina,
                "dificuldade": "dificil",
                "imagem_path": str(img_path.relative_to(ROOT)).replace("\\", "/")
                if img_path and Path(img_path).exists()
                else None,
            }
        )
    by_n = {q["numero"]: q for q in out}
    return [by_n[n] for n in sorted(by_n)]


# ───────────────────── MARINHA (escaneada) ─────────────────────


def extract_marinha() -> list[dict]:
    """PDF 100% imagem: gera uma questão por página com a imagem da página (estudo visual)."""
    import pymupdf

    path = PDF_DIR / "PROVA MARINHA.pdf"
    if not path.exists():
        return []

    doc = pymupdf.open(path)
    fig_dir = IMG_DIR / "marinha"
    fig_dir.mkdir(parents=True, exist_ok=True)
    out: list[dict] = []
    # pular capas/instruções: usar páginas 2..n-1 tipicamente
    for i in range(doc.page_count):
        page_no = i + 1
        dest = fig_dir / f"page_{page_no:02d}.jpg"
        pix = doc[i].get_pixmap(matrix=pymupdf.Matrix(1.6, 1.6), alpha=False)
        # páginas quase em branco (rascunho) → pular
        if pix.width * pix.height < 1000:
            continue
        pix.save(str(dest), jpg_quality=80)
        # heuristic: skip very small files
        if dest.stat().st_size < 25_000:
            continue
        out.append(
            {
                "origem_key": "marinha",
                "numero": page_no,
                "disciplina": "Engenharia Elétrica",
                "assunto": "Prova Marinha — página escaneada",
                "enunciado": (
                    f"Prova Marinha (página {page_no}). "
                    "Analise a figura da página (PDF escaneado sem camada de texto). "
                    "Amplie a imagem para ler o enunciado e as alternativas originais."
                ),
                "alternativas": {
                    "A": "Ver figura da página",
                    "B": "Ver figura da página",
                    "C": "Ver figura da página",
                    "D": "Ver figura da página",
                },
                "gabarito": "",
                "pagina": page_no,
                "dificuldade": "medio",
                "imagem_path": str(dest.relative_to(ROOT)).replace("\\", "/"),
            }
        )
    return out


# ───────────────────── DPE remainder note ─────────────────────


def ensure_dpe_already_loaded() -> dict:
    """DPE Q41–70 já têm script dedicado; aqui só reporta status."""
    disc = Disciplina.objects.filter(slug="engenharia-eletrica").first()
    if not disc:
        return {"dpe": 0}
    n = Questao.objects.filter(
        disciplina=disc,
        documento__nome__icontains="DPE",
    ).count()
    return {"dpe_eletrica": n}


def run() -> dict:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    IMG_DIR.mkdir(parents=True, exist_ok=True)

    bundles: list[tuple[str, str, list[dict]]] = []
    print("Extraindo CONAB…")
    bundles.append(("PROVA ANALISTA CONAB.pdf", "CONAB — Analista Engenharia Elétrica", extract_conab()))
    print("Extraindo TJ PA…")
    bundles.append(("PROVA TJ PA.pdf", "TJ/PA — CEBRASPE Específicos", extract_tj_pa()))
    print("Extraindo Exército…")
    bundles.append(("PROVA EXÉRCITO.pdf", "Exército — Engenharia Elétrica 2025/2026", extract_exercito("PROVA EXÉRCITO.pdf", "exercito_2526", "2025/2026")))
    bundles.append(("PROVA EXÉRCITO 23.pdf", "Exército — Engenharia Elétrica 2023/2024", extract_exercito("PROVA EXÉRCITO 23.pdf", "exercito_2324", "2023/2024")))
    bundles.append(("PROVA EXÉRCITO 24.pdf", "Exército — Engenharia Elétrica 2024/2025", extract_exercito("PROVA EXÉRCITO 24.pdf", "exercito_2425", "2024/2025")))
    print("Extraindo Marinha (páginas)…")
    bundles.append(("PROVA MARINHA.pdf", "Marinha — Engenharia Elétrica (escaneada)", extract_marinha()))

    all_q: list[dict] = []
    stats = {"created": 0, "updated": 0, "by_source": {}, "dpe": ensure_dpe_already_loaded()}

    for filename, doc_nome, questions in bundles:
        print(f"  {filename}: {len(questions)} questões")
        stats["by_source"][filename] = len(questions)
        all_q.extend(questions)
        doc, _ = Documento.objects.get_or_create(
            nome=doc_nome,
            defaults={
                "caminho_origem": str(PDF_DIR / filename),
                "tipo": Documento.Tipo.QUESTOES_ESPECIFICO,
                "status": Documento.Status.CONCLUIDO,
            },
        )
        for q in questions:
            st = persist_question(q, doc)
            stats[st] = stats.get(st, 0) + 1
        doc.questoes_extraidas = Questao.objects.filter(documento=doc).count()
        doc.status = Documento.Status.CONCLUIDO
        doc.save(update_fields=["questoes_extraidas", "status"])

    # também roda DPE se JSON existir / script
    try:
        from scripts.import_dpe_eletrica import run as run_dpe

        print("Garantindo DPE elétrica…")
        dpe_stats = run_dpe(generate_ai=False, from_json=True)
        stats["dpe_import"] = dpe_stats
    except Exception as exc:  # noqa: BLE001
        stats["dpe_import_error"] = str(exc)

    payload = {
        "total": len(all_q),
        "by_source": stats["by_source"],
        "questoes": all_q,
    }
    JSON_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    stats["json"] = str(JSON_PATH)
    stats["total_extracted"] = len(all_q)
    print(json.dumps({k: v for k, v in stats.items() if k != "dpe_import"}, ensure_ascii=False, indent=2))
    return stats


if __name__ == "__main__":
    run()
    print("Concluído.")

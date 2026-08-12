"""
Importa questões de Engenharia Elétrica (EAOEAR 2026 – Versão A),
Q31–60, a partir do PDF escaneado: OCR multimodal + recorte de figuras.

Uso:
  py -3.10 scripts/import_eaoear_eletrica.py
  py -3.10 manage.py import_eaoear_eletrica
  py -3.10 manage.py import_eaoear_eletrica --from-json
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
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

PDF_PATH = ROOT / "data" / "pdfs" / "EAOEAR 2026.pdf"
JSON_PATH = ROOT / "data" / "pdfs" / "eaoear_2026_eletrica_q31_60.json"
IMG_DIR = ROOT / "data" / "questoes_images" / "eaoear_2026"
PAGES_DIR = IMG_DIR / "pages"
FIGS_DIR = IMG_DIR / "figuras"

# Páginas do PDF com questões de especialidade (índice 0-based)
SPECIALTY_PAGE_INDEXES = list(range(0, 8))  # p1–p8 ≈ Q31–60

SYSTEM = (
    "Você é um extrator preciso de provas brasileiras de Engenharia Elétrica. "
    "Transcreva fielmente enunciados e alternativas. Normalize unidades (Ω, μF, °C). "
    "Não invente texto. Responda somente JSON válido."
)

PROMPT = """
Extraia TODAS as questões de especialidade (Engenharia Elétrica) visíveis nesta página
do exame EAOEAR 2026 – Versão A.

Retorne JSON no formato:
{{
  "pagina_pdf": {page_num},
  "questoes": [
    {{
      "numero": 31,
      "assunto": "Resistência e coeficiente de temperatura",
      "enunciado": "texto completo sem alternativas",
      "alternativas": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
      "gabarito_sugerido": "A",
      "tem_figura": true,
      "bbox_figura": [0.08, 0.22, 0.92, 0.42]
    }}
  ]
}}

Regras:
- Alternativas são a,b,c,d → use A,B,C,D.
- enunciado: texto da pergunta SEM as alternativas; se houver figura, mantenha a frase
  que referencia o esquema/gráfico.
- tem_figura: true se houver circuito, gráfico, diagrama ou tabela ilustrativa da questão.
- bbox_figura: [x0, y0, x1, y1] em fração 0–1 da página (origem canto superior esquerdo),
  cobrindo APENAS a figura daquela questão (com pequena margem). null se tem_figura=false.
- assunto: tema técnico curto em português.
- gabarito_sugerido: melhor resposta (A–D) com base no enunciado/figura; se incerto, "".
- Ignore cabeçalhos ESPECIALIDADE, rodapés, marcas d'água PCI.
"""


def content_hash(numero: int, enunciado: str) -> str:
    raw = f"eaoear-2026-eletrica|{numero}|{(enunciado or '')[:160]}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def render_pages(pdf_path: Path, out_dir: Path, zoom: float = 2.2) -> list[Path]:
    import pymupdf

    out_dir.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open(pdf_path)
    paths: list[Path] = []
    mat = pymupdf.Matrix(zoom, zoom)
    for i in SPECIALTY_PAGE_INDEXES:
        if i >= doc.page_count:
            break
        page = doc[i]
        pix = page.get_pixmap(matrix=mat, alpha=False)
        path = out_dir / f"page_{i + 1:02d}.jpg"
        pix.save(str(path), jpg_quality=88)
        paths.append(path)
        print(f"  render page {i + 1} -> {path.name} ({pix.width}x{pix.height})")
    return paths


def crop_figure(page_img: Path, bbox: list[float], dest: Path) -> bool:
    from PIL import Image

    if not bbox or len(bbox) != 4:
        return False
    x0, y0, x1, y1 = [float(v) for v in bbox]
    # aceita ordem invertida / margem
    if x1 <= x0 or y1 <= y0:
        return False
    # clamp
    x0, y0 = max(0.0, x0), max(0.0, y0)
    x1, y1 = min(1.0, x1), min(1.0, y1)
    # margem leve
    pad = 0.008
    x0, y0 = max(0.0, x0 - pad), max(0.0, y0 - pad)
    x1, y1 = min(1.0, x1 + pad), min(1.0, y1 + pad)

    im = Image.open(page_img).convert("RGB")
    w, h = im.size
    box = (int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h))
    if box[2] - box[0] < 40 or box[3] - box[1] < 40:
        return False
    crop = im.crop(box)
    dest.parent.mkdir(parents=True, exist_ok=True)
    crop.save(dest, format="JPEG", quality=90, optimize=True)
    return dest.exists()


def polish_text(text: str) -> str:
    text = (text or "").replace("\u0000", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\s*\n\s*", " ", text)
    text = re.sub(r"\s{2,}", " ", text).strip()
    text = text.replace(" oC", " °C").replace("ºC", " °C")
    return text


def extract_from_pages(page_paths: list[Path]) -> list[dict]:
    from apps.ai.gemini import generate_json, gemini_available

    if not gemini_available():
        raise SystemExit("GEMINI_API_KEY ausente — necessário para OCR do PDF escaneado.")

    FIGS_DIR.mkdir(parents=True, exist_ok=True)
    by_num: dict[int, dict] = {}

    for path in page_paths:
        page_num = int(re.search(r"(\d+)", path.stem).group(1))
        print(f"OCR página {page_num}…")
        data = generate_json(
            PROMPT.format(page_num=page_num),
            system=SYSTEM,
            temperature=0.15,
            image_paths=[path],
        )
        questoes = data.get("questoes") if isinstance(data, dict) else None
        if not isinstance(questoes, list):
            print(f"  AVISO: sem questões em {path.name}")
            continue

        for raw in questoes:
            try:
                num = int(raw.get("numero"))
            except (TypeError, ValueError):
                continue
            if num < 31 or num > 60:
                continue

            alts_in = raw.get("alternativas") or {}
            alts = {}
            for letra in "ABCD":
                key = letra if letra in alts_in else letra.lower()
                alts[letra] = polish_text(str(alts_in.get(key) or alts_in.get(letra) or ""))

            enunciado = polish_text(str(raw.get("enunciado") or ""))
            assunto = polish_text(str(raw.get("assunto") or "Engenharia Elétrica"))
            gab = str(raw.get("gabarito_sugerido") or "").strip().upper()[:1]
            if gab not in "ABCD":
                gab = ""

            fig_path = None
            tem = bool(raw.get("tem_figura"))
            bbox = raw.get("bbox_figura")
            if tem and isinstance(bbox, list) and len(bbox) == 4:
                dest = FIGS_DIR / f"q{num:02d}.jpg"
                if crop_figure(path, bbox, dest):
                    fig_path = str(dest.relative_to(ROOT)).replace("\\", "/")
                    print(f"  Q{num}: figura -> {dest.name}")
                else:
                    print(f"  Q{num}: falha no crop da figura")

            by_num[num] = {
                "numero": num,
                "disciplina": "Engenharia Elétrica",
                "assunto": assunto or "Engenharia Elétrica",
                "enunciado": enunciado,
                "alternativas": alts,
                "gabarito": gab,
                "origem": "EAOEAR 2026 — Versão A — Especialidade Engenharia Elétrica",
                "pagina": page_num,
                "tem_figura": bool(fig_path),
                "imagem_relpath": fig_path,
            }

    return [by_num[n] for n in range(31, 61) if n in by_num]


def get_or_create_disciplina() -> Disciplina:
    nome = "Engenharia Elétrica"
    slug = slugify(nome)
    obj, _ = Disciplina.objects.get_or_create(
        slug=slug,
        defaults={"nome": nome, "ordem": 100},
    )
    return obj


def get_or_create_assunto(disciplina: Disciplina, nome: str) -> Assunto:
    slug = slugify(nome)[:240] or "assunto"
    obj, created = Assunto.objects.get_or_create(
        disciplina=disciplina,
        slug=slug,
        defaults={"nome": nome},
    )
    if not created and obj.nome != nome:
        obj.nome = nome
        obj.save(update_fields=["nome"])
    return obj


def attach_image(q: Questao, relpath: str | None) -> None:
    if not relpath:
        return
    src = ROOT / relpath
    if not src.exists():
        # fallback absoluto se veio path completo
        src = Path(relpath)
    if not src.exists():
        print(f"  imagem ausente: {relpath}")
        return
    with src.open("rb") as fh:
        q.imagem.save(f"eaoear_q{q.numero_origem or q.pk}.jpg", File(fh), save=True)


def persist(questions: list[dict]) -> dict:
    disciplina = get_or_create_disciplina()
    doc, _ = Documento.objects.get_or_create(
        nome="EAOEAR 2026 — Engenharia Elétrica (Q31–60)",
        defaults={
            "caminho_origem": str(PDF_PATH),
            "tipo": Documento.Tipo.QUESTOES_ESPECIFICO,
            "status": Documento.Status.CONCLUIDO,
            "total_paginas": 13,
        },
    )

    created = updated = with_img = 0
    for qdata in questions:
        assunto = get_or_create_assunto(disciplina, qdata["assunto"])
        gab = (qdata.get("gabarito") or "").upper()[:1]
        with transaction.atomic():
            q = Questao.objects.filter(
                disciplina=disciplina,
                numero_origem=qdata["numero"],
                documento=doc,
            ).first()
            if not q:
                q = Questao.objects.filter(
                    hash_conteudo=content_hash(qdata["numero"], qdata["enunciado"])
                ).first()

            if q:
                q.enunciado = qdata["enunciado"]
                q.gabarito = gab
                q.assunto = assunto
                q.disciplina = disciplina
                q.documento = doc
                q.numero_origem = qdata["numero"]
                q.pagina = qdata.get("pagina")
                q.save()
                updated += 1
            else:
                q = Questao.objects.create(
                    disciplina=disciplina,
                    assunto=assunto,
                    documento=doc,
                    numero_origem=qdata["numero"],
                    pagina=qdata.get("pagina"),
                    enunciado=qdata["enunciado"],
                    dificuldade=Questao.Dificuldade.MEDIO,
                    gabarito=gab,
                    origem=Questao.Origem.PDF,
                    hash_conteudo=content_hash(qdata["numero"], qdata["enunciado"]),
                )
                created += 1

            Alternativa.objects.filter(questao=q).delete()
            # EAOEAR usa A–D
            for letra in "ABCD":
                texto = (qdata.get("alternativas") or {}).get(letra) or f"(alternativa {letra})"
                Alternativa.objects.create(
                    questao=q,
                    letra=letra,
                    texto=texto,
                    correta=(letra == gab) if gab else False,
                )

            if qdata.get("imagem_relpath"):
                attach_image(q, qdata["imagem_relpath"])
                with_img += 1

    doc.questoes_extraidas = Questao.objects.filter(documento=doc).count()
    doc.status = Documento.Status.CONCLUIDO
    doc.save(update_fields=["questoes_extraidas", "status"])

    return {
        "disciplina": disciplina.nome,
        "created": created,
        "updated": updated,
        "with_images": with_img,
        "total": len(questions),
        "assuntos": sorted({q["assunto"] for q in questions}),
    }


def load_json() -> list[dict]:
    if not JSON_PATH.exists():
        return []
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    return data.get("questoes") or []


def run(*, from_json: bool = False, skip_render: bool = False) -> dict:
    IMG_DIR.mkdir(parents=True, exist_ok=True)

    if from_json:
        questions = load_json()
        if not questions:
            raise SystemExit(f"JSON vazio/ausente: {JSON_PATH}")
        print(f"Carregando {len(questions)} questões do JSON…")
    else:
        if not PDF_PATH.exists():
            raise SystemExit(f"PDF não encontrado: {PDF_PATH}")
        if skip_render and list(PAGES_DIR.glob("page_*.jpg")):
            page_paths = sorted(PAGES_DIR.glob("page_*.jpg"))
            print(f"Reusando {len(page_paths)} páginas renderizadas")
        else:
            print("Renderizando páginas de especialidade…")
            page_paths = render_pages(PDF_PATH, PAGES_DIR)
        questions = extract_from_pages(page_paths)
        print(f"Extraídas: {len(questions)}")
        missing = [n for n in range(31, 61) if n not in {q["numero"] for q in questions}]
        if missing:
            print("FALTANDO:", missing)

        payload = {
            "fonte": "EAOEAR 2026.pdf",
            "concurso": "EAOEAR 2026 — Versão A — Especialidade Engenharia Elétrica",
            "banca": "CIAAR / FAB",
            "disciplina": "Engenharia Elétrica",
            "faixa": "31-60",
            "nota_gabarito": "gabarito_sugerido pela IA a partir do enunciado/figura; validar com oficial quando disponível",
            "questoes": questions,
        }
        JSON_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"JSON salvo: {JSON_PATH}")

    stats = persist(questions)
    print(json.dumps(stats, ensure_ascii=False, indent=2))
    return stats


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--from-json", action="store_true")
    parser.add_argument("--skip-render", action="store_true")
    args = parser.parse_args()
    run(from_json=args.from_json, skip_render=args.skip_render)
    print("Concluído.")


if __name__ == "__main__":
    main()

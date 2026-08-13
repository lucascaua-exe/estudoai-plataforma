"""
Extrai questões 41–70 (Conhecimentos Específicos — Engenharia Elétrica)
da prova DPE/RS FGV 2023, grava JSON formatado e cadastra no banco com gabarito.

Uso:
  py -3.10 scripts/import_dpe_eletrica.py
  py -3.10 scripts/import_dpe_eletrica.py --no-ai
  py -3.10 manage.py import_dpe_eletrica
"""
from __future__ import annotations

import argparse
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

from django.db import transaction
from django.utils.text import slugify

from apps.catalog.models import Assunto, Disciplina
from apps.documents.models import Documento
from apps.questions.models import Alternativa, Questao

PDF_PATH = ROOT / "data" / "pdfs" / "PROVA ANALISTA DPE.pdf"
JSON_PATH = ROOT / "data" / "pdfs" / "dpe_rs_eletrica_q41_70.json"

GABARITO = {
    41: "D",
    42: "B",
    43: "B",
    44: "D",
    45: "A",
    46: "E",
    47: "D",
    48: "C",
    49: "B",
    50: "E",
    51: "D",
    52: "A",
    53: "C",
    54: "C",
    55: "B",
    56: "B",
    57: "D",
    58: "A",
    59: "E",
    60: "B",
    61: "A",
    62: "B",
    63: "B",
    64: "C",
    65: "E",
    66: "A",
    67: "E",
    68: "E",
    69: "C",
    70: "D",
}

ASSUNTO_POR_QUESTAO = {
    41: "Circuitos elétricos e leis de Kirchhoff",
    42: "Análise de malhas e circuitos",
    43: "Potência em corrente alternada",
    44: "Sistemas trifásicos equilibrados",
    45: "Transformadores e sistemas trifásicos",
    46: "Sistemas trifásicos desequilibrados",
    47: "Instalações elétricas e dimensionamento",
    48: "Aterramento e proteção contra choques",
    49: "Queda de tensão em circuitos",
    50: "Sistema por unidade (p.u.)",
    51: "Qualidade de energia e desbalanceamento",
    52: "SPDA e proteção contra descargas",
    53: "Iluminação de interiores",
    54: "Equipamentos de subestação",
    55: "Curto-circuito e reatância em p.u.",
    56: "Faltas e componentes simétricas",
    57: "Componentes simétricas",
    58: "Coordenação de proteção",
    59: "Correção do fator de potência",
    60: "Sistemas UPS / nobreak",
    61: "Eficiência energética em edificações",
    62: "Planejamento de obras — PERT/CPM",
    63: "Planejamento de obras — PERT/CPM",
    64: "Combate a incêndio em subestações",
    65: "Segurança e extinção de incêndio",
    66: "Sistemas de iluminação",
    67: "Eficiência energética e centro de carga",
    68: "NR-10 — segurança em eletricidade",
    69: "Tipos de manutenção",
    70: "Licitações — Lei nº 14.133/2021",
}

# Overrides manuais: PDF com frações/subíndices quebra no extract_text
OVERRIDES: dict[int, dict] = {
    42: {
        "enunciado": (
            "Um circuito formado por duas malhas possui em seu ramo central "
            "uma bateria de 20 V em série com um resistor de 10 Ω. A malha "
            "da esquerda é formada por uma bateria de 20 V em série com um "
            "resistor de 40 Ω e a malha da direita é formada por uma bateria "
            "de 10 V em série com um resistor de 10 Ω. Todas as baterias "
            "estão orientadas com os polos positivos para cima. "
            "A corrente elétrica no ramo central é igual a:"
        ),
        "alternativas": {
            "A": "6/9 A",
            "B": "4/9 A",
            "C": "4/10 A",
            "D": "6/10 A",
            "E": "8/10 A",
        },
    },
    45: {
        "enunciado": (
            "Um equipamento elétrico indutivo trifásico na configuração "
            "estrela atrasa a corrente elétrica em 30° em relação à tensão. "
            "A sua alimentação se dá por meio de um transformador na "
            "configuração estrela-delta, estando suas conexões no lado delta. "
            "Sabe-se ainda que as tensões de fases VAB, VBC e VCA, que "
            "alimentam o transformador no lado estrela, possuem ângulos de "
            "30°, −90° e +150°, respectivamente. "
            "As correntes nas fases do equipamento possuem ângulos iguais a:"
        ),
        "alternativas": {
            "A": "30°, −90° e +150°",
            "B": "zero, −120° e +120°",
            "C": "60°, −60° e +180°",
            "D": "90°, −30° e −150°",
            "E": "−90°, +30° e +150°",
        },
    },
    48: {
        "alternativas": {
            "A": "≥ 150 A",
            "B": "≤ 150 A",
            "C": "≥ 300 A",
            "D": "≤ 300 A",
            "E": "≥ 30 A",
        },
    },
    53: {
        "enunciado": (
            "Um ambiente de 15 × 15 m e 4,75 m de pé-direito, destinado a "
            "escritórios, necessita de uma iluminância de 300 lux. O local "
            "possui teto branco, paredes claras e piso escuro. "
            "A iluminação é direta e as luminárias estão embutidas no teto. "
            "O plano de trabalho está a um metro de altura do piso. "
            "Considerando o fator de depreciação igual à unidade e que as "
            "luminárias utilizadas para o projeto possuem 2.000 lumens "
            "(com fatores de utilização da tabela da prova), "
            "o número de luminárias é igual a:"
        ),
        "alternativas": {
            "A": "26",
            "B": "32",
            "C": "48",
            "D": "54",
            "E": "60",
        },
    },
    56: {
        "alternativas": {
            "A": "Ia1 = (1/2) Ia",
            "B": "Ia1 = 0",
            "C": "Ia1 = Ia",
            "D": "Ia1 = (1/3) Ia",
            "E": "Ia1 = 3 Ia",
        },
    },
    57: {
        "enunciado": (
            "As tensões de fase de um sistema trifásico podem ser "
            "representadas por suas componentes simétricas, juntamente "
            "com o número complexo 1∠120°, definido como operador α. "
            "Com base no exposto, a tensão VB, em função de suas "
            "componentes simétricas, é igual a:"
        ),
        "alternativas": {
            "A": "α·V0 + α²·V1 + α·V2",
            "B": "V0 + α·V1 + α²·V2",
            "C": "α·V0 + V1 + V2",
            "D": "V0 + α²·V1 + α·V2",
            "E": "α·V0 + α²·V1 + V2",
        },
    },
    59: {
        "alternativas": {
            "A": "(4,5√3)/6 kVAr",
            "B": "(4,5√3)/2 kVAr",
            "C": "4,5√3 kVAr",
            "D": "(3√3)/2 kVAr",
            "E": "3√3 kVAr",
        },
    },
    62: {
        "enunciado": (
            "O método PERT/CPM é uma ferramenta que permite o controle "
            "de uma obra ou projeto sob o ponto de vista do tempo utilizado "
            "na execução de diversas atividades. Considere uma atividade de "
            "uma obra que possui seus tempos de execução otimista, "
            "pessimista e mais provável iguais a 5, 14 e 8 unidades de tempo "
            "(u.t.), respectivamente. "
            "Para essa atividade, o tempo esperado de execução e a sua "
            "variância, em unidades de tempo, são iguais a:"
        ),
    },
}

FOOTER_RE = re.compile(
    r"(?m)^Analista\s*-\s*Área.*$|"
    r"^.*Tipo 1\s*[–-]\s*Branca.*$|"
    r"www\.pciconcursos\.com\.br|"
    r"^Defensoria Pública do Estado.*$|"
    r"pcimarkpci\s+\S+|"
    r"^Conhecimentos Específicos\s*$|"
    r"[\uF000-\uF8FF]",
    re.M | re.I,
)
Q_SPLIT = re.compile(r"(?m)^(?:(?P<num>4[1-9]|5\d|6\d|70)\s*$)")
ALT_SPLIT = re.compile(r"(?m)^\(([A-E])\)\s*")


def clean_text(text: str) -> str:
    text = FOOTER_RE.sub(" ", text or "")
    text = text.replace("\u0000", "")
    # Unicode math italics / fancy letters → ASCII-ish
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("𝑜", "°").replace("𝑜", "o")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


def polish_plain(text: str) -> str:
    text = unicodedata.normalize("NFKC", text or "")
    text = text.replace("𝐴", "A").replace("𝑎", "a").replace("𝑉", "V")
    text = text.replace("𝑥", "x").replace("𝑘", "k").replace("𝑟", "r")
    text = text.replace("", "α").replace("∠", "∠")
    text = re.sub(r"(\d+)\s*o\b", r"\1°", text)
    text = re.sub(r"(\d+)o([,\s]|$)", r"\1°\2", text)
    text = re.sub(r"\s*\n\s*", " ", text)
    text = re.sub(r"\s{2,}", " ", text)
    text = re.sub(r"[;.\s]+$", "", text).strip()
    text = text.replace("p.u.", "p.u.").replace("p.u", "p.u.")
    return text


def extract_column_pages(path: Path) -> list[tuple[int, str]]:
    import pdfplumber

    pages: list[tuple[int, str]] = []
    with pdfplumber.open(path) as pdf:
        for i in range(9, min(14, len(pdf.pages))):
            p = pdf.pages[i]
            mid = p.width / 2
            top, bottom = 50, p.height - 36
            left = p.crop((0, top, mid - 4, bottom)).extract_text() or ""
            right = p.crop((mid - 4, top, p.width, bottom)).extract_text() or ""
            combined = clean_text(left) + "\n\n" + clean_text(right)
            pages.append((i + 1, combined))
    return pages


def parse_alternatives(block: str) -> tuple[str, dict[str, str]]:
    parts = ALT_SPLIT.split(block.strip())
    if len(parts) < 3:
        return polish_plain(block), {}
    enunciado = polish_plain(parts[0])
    alts: dict[str, str] = {}
    i = 1
    while i + 1 < len(parts):
        letra = parts[i].strip().upper()
        texto = polish_plain(parts[i + 1])
        if letra in "ABCDE":
            alts[letra] = texto
        i += 2
    return enunciado, alts


def parse_questions(pages: list[tuple[int, str]]) -> list[dict]:
    full = "\n\n".join(t for _, t in pages)
    full = clean_text(full)
    full = re.sub(r"(?m)^(4[1-9]|5\d|6\d|70)\s+", r"\1\n", full)

    matches = list(Q_SPLIT.finditer(full))
    questions: list[dict] = []
    for idx, m in enumerate(matches):
        num = int(m.group("num"))
        if num < 41 or num > 70:
            continue
        start = m.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(full)
        block = full[start:end].strip()
        enunciado, alts = parse_alternatives(block)

        ov = OVERRIDES.get(num, {})
        if "enunciado" in ov:
            enunciado = ov["enunciado"]
        if "alternativas" in ov:
            alts = dict(ov["alternativas"])

        for letra in "ABCDE":
            alts.setdefault(letra, "")

        questions.append(
            {
                "numero": num,
                "disciplina": "Engenharia Elétrica",
                "assunto": ASSUNTO_POR_QUESTAO.get(num, "Engenharia Elétrica"),
                "enunciado": enunciado,
                "alternativas": {l: alts.get(l, "") for l in "ABCDE"},
                "gabarito": GABARITO[num],
                "origem": "DPE/RS 2023 — FGV — Analista Engenharia Elétrica — Tipo 1",
                "pagina": None,
            }
        )

    by_num = {q["numero"]: q for q in questions}
    return [by_num[n] for n in range(41, 71) if n in by_num]


def content_hash(numero: int, enunciado: str) -> str:
    raw = f"dpe-rs-eletrica|{numero}|{enunciado[:120]}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def get_or_create_disciplina() -> Disciplina:
    nome = "Engenharia Elétrica"
    slug = slugify(nome)
    obj, created = Disciplina.objects.get_or_create(
        slug=slug,
        defaults={"nome": nome, "ordem": 100},
    )
    if not created and obj.nome != nome:
        obj.nome = nome
        obj.save(update_fields=["nome"])
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


def persist(questions: list[dict], generate_ai: bool = False) -> dict:
    disciplina = get_or_create_disciplina()
    doc, _ = Documento.objects.get_or_create(
        nome="PROVA ANALISTA DPE — Engenharia Elétrica (Q41–70)",
        defaults={
            "caminho_origem": str(PDF_PATH),
            "tipo": Documento.Tipo.QUESTOES_ESPECIFICO,
            "status": Documento.Status.CONCLUIDO,
            "total_paginas": 18,
        },
    )

    created = 0
    updated = 0
    explained = 0
    errors: list[str] = []

    for qdata in questions:
        assunto = get_or_create_assunto(disciplina, qdata["assunto"])
        gab = qdata["gabarito"]
        with transaction.atomic():
            # Sempre amarra ao documento DPE — evita colidir com EAOEAR/outras provas
            # pelo mesmo numero_origem.
            q = Questao.objects.filter(
                documento=doc,
                numero_origem=qdata["numero"],
                origem=Questao.Origem.PDF,
            ).first()
            if not q:
                h = content_hash(qdata["numero"], qdata["enunciado"])
                q = Questao.objects.filter(hash_conteudo=h, documento=doc).first()

            if q:
                q.enunciado = qdata["enunciado"]
                q.gabarito = gab
                q.assunto = assunto
                q.disciplina = disciplina
                q.documento = doc
                q.numero_origem = qdata["numero"]
                # DPE não tem figuras — remove qualquer imagem herdada por bug antigo
                if q.imagem:
                    q.imagem.delete(save=False)
                    q.imagem = None
                q.save()
                updated += 1
            else:
                h = content_hash(qdata["numero"], qdata["enunciado"])
                # Se hash já existe em OUTRA prova, gera hash único para não falhar unique
                if Questao.objects.filter(hash_conteudo=h).exclude(documento=doc).exists():
                    h = content_hash(qdata["numero"], qdata["enunciado"] + f"|dpe|{doc.id}")
                q = Questao.objects.create(
                    disciplina=disciplina,
                    assunto=assunto,
                    documento=doc,
                    numero_origem=qdata["numero"],
                    enunciado=qdata["enunciado"],
                    dificuldade=Questao.Dificuldade.MEDIO,
                    gabarito=gab,
                    origem=Questao.Origem.PDF,
                    hash_conteudo=h,
                )
                created += 1

            Alternativa.objects.filter(questao=q).delete()
            for letra in "ABCDE":
                texto = (qdata["alternativas"].get(letra) or "").strip() or f"(alternativa {letra})"
                Alternativa.objects.create(
                    questao=q,
                    letra=letra,
                    texto=texto,
                    correta=(letra == gab),
                )

        if generate_ai:
            try:
                from apps.ai.rag import ai_available, explain_question_answer

                if not ai_available():
                    continue
                alts = [
                    {"letra": a.letra, "texto": a.texto}
                    for a in q.alternativas.order_by("letra")
                ]
                expl = explain_question_answer(
                    enunciado=q.enunciado,
                    alternativas=alts,
                    gabarito=gab,
                    letra_escolhida=gab,
                    correta=True,
                    explicacao_existente=q.explicacao or "",
                    disciplina=disciplina.nome,
                    assunto=assunto.nome,
                    force_rewrite=True,
                )
                if expl:
                    q.explicacao = expl
                    q.save(update_fields=["explicacao"])
                    explained += 1
                    qdata["explicacao_ia"] = expl
            except Exception as exc:  # noqa: BLE001
                errors.append(f"Q{qdata['numero']}: {exc}")

    doc.questoes_extraidas = Questao.objects.filter(documento=doc).count()
    doc.status = Documento.Status.CONCLUIDO
    doc.save(update_fields=["questoes_extraidas", "status"])

    return {
        "disciplina": disciplina.nome,
        "disciplina_id": disciplina.id,
        "created": created,
        "updated": updated,
        "explained": explained,
        "total": len(questions),
        "assuntos": sorted({q["assunto"] for q in questions}),
        "errors": errors,
    }


def load_from_json_if_no_pdf() -> list[dict] | None:
    if not JSON_PATH.exists():
        return None
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    return data.get("questoes") or []


def run(generate_ai: bool = False, from_json: bool = False) -> dict:
    questions: list[dict]
    if from_json or not PDF_PATH.exists():
        questions = load_from_json_if_no_pdf() or []
        if not questions:
            raise SystemExit("Sem PDF e sem JSON para importar.")
        # reaplicar overrides no JSON antigo
        for q in questions:
            ov = OVERRIDES.get(q["numero"], {})
            if "enunciado" in ov:
                q["enunciado"] = ov["enunciado"]
            if "alternativas" in ov:
                q["alternativas"] = dict(ov["alternativas"])
            q["gabarito"] = GABARITO[q["numero"]]
            q["assunto"] = ASSUNTO_POR_QUESTAO[q["numero"]]
            q["disciplina"] = "Engenharia Elétrica"
    else:
        print("Extraindo páginas (colunas)...")
        pages = extract_column_pages(PDF_PATH)
        questions = parse_questions(pages)
        print(f"Questões parseadas: {len(questions)}")
        missing = [n for n in range(41, 71) if n not in {q["numero"] for q in questions}]
        if missing:
            print("FALTANDO:", missing)
        incomplete = [
            q["numero"]
            for q in questions
            if sum(1 for v in q["alternativas"].values() if v) < 5
        ]
        if incomplete:
            print("Alternativas incompletas:", incomplete)

    payload = {
        "fonte": "PROVA ANALISTA DPE.pdf",
        "concurso": "DPE/RS 2023 — Analista Área de Apoio Especializado — Engenharia Elétrica",
        "banca": "FGV",
        "tipo": "1 — Branca",
        "disciplina": "Engenharia Elétrica",
        "faixa": "41-70",
        "gabarito_oficial": {str(k): v for k, v in GABARITO.items()},
        "assuntos": sorted(set(ASSUNTO_POR_QUESTAO.values())),
        "questoes": questions,
    }
    JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    JSON_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"JSON salvo em: {JSON_PATH}")

    print("Cadastrando no banco...")
    stats = persist(questions, generate_ai=generate_ai)
    # regrava com possíveis explicações
    payload["questoes"] = questions
    JSON_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(stats, ensure_ascii=False, indent=2))
    return stats


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-ai", action="store_true", help="Não gera explicações com IA")
    parser.add_argument("--ai", action="store_true", help="Gera explicações com IA")
    parser.add_argument("--from-json", action="store_true", help="Importa do JSON (sem PDF)")
    args = parser.parse_args()
    generate_ai = args.ai and not args.no_ai
    run(generate_ai=generate_ai, from_json=args.from_json)
    print("Concluído.")


if __name__ == "__main__":
    main()

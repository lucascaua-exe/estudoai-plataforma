"""Taxonomia oficial das apostilas IMPAR (somente o que existe nos PDFs)."""
from __future__ import annotations

import re
import unicodedata


# Nomes canônicos — exatamente as disciplinas dos sumários dos PDFs de questões
DISCIPLINAS_ESPECIFICO = [
    "Legislação",
    "Tecnologia da Informação",
    "Engenharia Elétrica",
]

DISCIPLINAS_BASICO = [
    "História e Geografia de Araguaína",
    "Informática",
    "Língua Portuguesa",
    "Raciocínio Lógico e Matemático",
]

TODAS_DISCIPLINAS = DISCIPLINAS_ESPECIFICO + DISCIPLINAS_BASICO


def _fold(text: str) -> str:
    text = unicodedata.normalize("NFKD", text or "")
    text = "".join(c for c in text if not unicodedata.category(c).startswith("M"))
    text = re.sub(r"[^a-zA-Z0-9]+", "", text.lower())
    return text


# Aliases compactados → nome canônico
_ALIAS_MAP: list[tuple[str, str]] = [
    ("legislacao", "Legislação"),
    ("lgpd", "Legislação"),
    ("lei13709", "Legislação"),
    ("tecnologiadainformacao", "Tecnologia da Informação"),
    ("tecnologiainformacao", "Tecnologia da Informação"),
    ("engenhariaeletrica", "Engenharia Elétrica"),
    ("eletrica", "Engenharia Elétrica"),
    ("informatica", "Informática"),
    ("linguaportuguesa", "Língua Portuguesa"),
    ("portuguesa", "Língua Portuguesa"),
    ("portugues", "Língua Portuguesa"),
    ("raciociniologicoematema", "Raciocínio Lógico e Matemático"),
    ("raciociniologico", "Raciocínio Lógico e Matemático"),
    ("matematico", "Raciocínio Lógico e Matemático"),
    ("conhecimentosbasicosdehistoria", "História e Geografia de Araguaína"),
    ("historiaegeografia", "História e Geografia de Araguaína"),
    ("araguaina", "História e Geografia de Araguaína"),
    ("municipiodearaguaina", "História e Geografia de Araguaína"),
]


def canonicalize_disciplina(raw: str, doc_tipo: str = "") -> str | None:
    """
    Converte cabeçalho extraído do PDF para o nome canônico da disciplina.
    Retorna None se não for possível mapear com segurança.
    """
    if not raw or not raw.strip():
        return None
    folded = _fold(raw)

    # rejeitar lixo
    junk = (
        "sumario",
        "guia",
        "anatomia",
        "questoe",
        "gabarito",
        "como usar",
        "entidaderelacionamento",  # assunto, não disciplina
        "fluencia",
        "mapa",
        "nivel",
    )
    if any(j in folded for j in junk) and "araguaina" not in folded and "legislacao" not in folded:
        # allow araguaina / legislacao even if partial junk
        if not any(k in folded for k in ("legislacao", "araguaina", "informatica", "portugues", "tecnologia", "raciocinio")):
            return None

    for alias, canonical in _ALIAS_MAP:
        if alias in folded:
            return canonical

    # match direto contra canônicos
    for nome in TODAS_DISCIPLINAS:
        if _fold(nome) in folded or folded in _fold(nome):
            return nome

    # fallback por tipo de documento
    if doc_tipo == "questoes_especifico":
        if "legis" in folded:
            return "Legislação"
        if "tecno" in folded or "inform" in folded:
            return "Tecnologia da Informação"
    if doc_tipo == "questoes_basico":
        if "portug" in folded or "lingua" in folded:
            return "Língua Portuguesa"
        if "racioc" in folded or "matem" in folded or "logico" in folded:
            return "Raciocínio Lógico e Matemático"
        if "informat" in folded:
            return "Informática"
        if "historia" in folded or "geograf" in folded or "aragu" in folded:
            return "História e Geografia de Araguaína"

    return None


def normalize_assunto(raw: str) -> str:
    if not raw:
        return ""
    text = re.sub(r"\s+", " ", raw).strip()
    text = re.sub(r"\s*\.+\s*\d*\s*$", "", text).strip()
    text = re.sub(r"(?<=[a-zà-ú])(?=[A-ZÁ-Ú])", " ", text)
    # common glued words
    replacements = [
        (r"LeiN[ºo°]", "Lei nº"),
        (r"TecnologiadaInformacao", "Tecnologia da Informação"),
        (r"BancodeDados", "Banco de Dados"),
        (r"SistemasOperacionais", "Sistemas Operacionais"),
        (r"ArquiteturadeComputadores", "Arquitetura de Computadores"),
    ]
    for pat, repl in replacements:
        text = re.sub(pat, repl, text, flags=re.I)
    if len(text) > 180:
        text = text[:177] + "…"
    return text

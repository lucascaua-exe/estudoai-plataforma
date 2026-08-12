"""Inferência de banca a partir do nome do documento / origem."""
from __future__ import annotations

import re

_BANCA_RULES: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"cebraspe|cespe", re.I), "CEBRASPE"),
    (re.compile(r"\bimpar\b", re.I), "IMPAR"),
    (re.compile(r"fcc\b|fundação\s+carlos\s+chagas", re.I), "FCC"),
    (re.compile(r"fgv\b", re.I), "FGV"),
    (re.compile(r"vunesp", re.I), "VUNESP"),
    (re.compile(r"ibfc", re.I), "IBFC"),
    (re.compile(r"ao[cç]p", re.I), "AOCP"),
    (re.compile(r"consulplan", re.I), "Consulplan"),
    (re.compile(r"quadra", re.I), "Quadrix"),
    (re.compile(r"eaoear|aeron[aá]utica|\bfab\b", re.I), "FAB / EAOEAR"),
    (re.compile(r"ex[eé]rcito", re.I), "Exército"),
    (re.compile(r"marinha", re.I), "Marinha"),
    (re.compile(r"\bdpe\b", re.I), "DPE"),
    (re.compile(r"\bconab\b", re.I), "CONAB"),
    (re.compile(r"\btj/?\s*pa\b|tribunal\s+de\s+justi[cç]a", re.I), "TJ/PA"),
    (re.compile(r"quest[oõ]es\s*[—\-–]|teoria\s*[—\-–]|resumo\s*[—\-–]", re.I), "Material base"),
]


def infer_banca(*parts: str | None) -> str:
    blob = " ".join(p for p in parts if p)
    if not blob.strip():
        return ""
    for pat, name in _BANCA_RULES:
        if pat.search(blob):
            return name
    # Fallback: prefixo do documento "NOME — detalhe"
    for part in parts:
        if not part:
            continue
        for sep in (" — ", " - ", " – "):
            if sep in part:
                prefix = part.split(sep, 1)[0].strip()
                if 2 <= len(prefix) <= 80:
                    return prefix
    return ""

"""Corrige enunciado gravado como alternativa A (lixo de sumário no enunciado)."""
from __future__ import annotations

import re

from apps.questions.models import Alternativa, Questao

_BREADCRUMB_RE = re.compile(
    r"^(?:\d+\.)?[A-Za-zÀ-ú\s]{0,40}[·•].{0,80}$|"
    r"^\d+\.[A-Za-zÀ-ú].{0,60}\d+\.\d+\.",
    re.IGNORECASE,
)
_QUESTIONISH_RE = re.compile(
    r"(?:\?|assinale|marque|indique|considere|analise|julgue|"
    r"incorreta|correta|segundo|de acordo|é\s+(?:um|uma|o|a)\b)",
    re.IGNORECASE,
)
_TOC_GLUE_RE = re.compile(r"[A-ZÁÉÍÓÚÃÕÂÊÔÇ]{8,}")


def enunciado_parece_sumario(enunciado: str) -> bool:
    text = (enunciado or "").strip()
    if not text:
        return True
    if len(text) < 90 and ("·" in text or "•" in text):
        return True
    if _BREADCRUMB_RE.search(text):
        return True
    if len(text) < 140 and _TOC_GLUE_RE.search(text.replace(" ", "")):
        return True
    # Só trilha de disciplina/assunto, sem pergunta
    if len(text) < 160 and not _QUESTIONISH_RE.search(text) and (
        "tecnologia da informação" in text.lower()
        or "língua portuguesa" in text.lower()
        or "lingua portuguesa" in text.lower()
        or "legislação" in text.lower()
    ):
        return True
    return False


def alternativa_parece_enunciado(texto: str) -> bool:
    t = (texto or "").strip()
    if len(t) < 60:
        return False
    return bool(_QUESTIONISH_RE.search(t))


def precisa_reparar_enunciado_em_alternativa(questao: Questao) -> bool:
    alts = list(questao.alternativas.all())
    if len(alts) < 2:
        return False
    by_letra = {a.letra.upper(): a for a in alts}
    alt_a = by_letra.get("A")
    if not alt_a:
        return False
    return enunciado_parece_sumario(questao.enunciado) and alternativa_parece_enunciado(
        alt_a.texto
    )


def _shift_letra(letra: str, delta: int = -1) -> str:
    code = ord(letra.upper()) + delta
    if code < ord("A") or code > ord("E"):
        return ""
    return chr(code)


def reparar_enunciado_em_alternativa(questao: Questao, *, dry_run: bool = False) -> bool:
    """
    Move o texto da alternativa A para o enunciado e reindexa B–E → A–D.
    Ajusta gabarito e flags `correta` (-1 letra).
    """
    if not precisa_reparar_enunciado_em_alternativa(questao):
        return False

    alts = sorted(questao.alternativas.all(), key=lambda a: a.letra)
    by_letra = {a.letra.upper(): a for a in alts}
    alt_a = by_letra["A"]
    rest = [by_letra[L] for L in "BCDE" if L in by_letra]
    if not rest:
        return False

    new_enunciado = alt_a.texto.strip()
    old_gab = (questao.gabarito or "").upper().strip()
    new_gab = _shift_letra(old_gab, -1) if old_gab else ""

    payload = []
    for i, src in enumerate(rest):
        letra = chr(ord("A") + i)
        correta = bool(src.correta)
        if new_gab and src.letra.upper() == old_gab:
            correta = True
        elif new_gab and letra == new_gab:
            correta = True
        elif old_gab and src.letra.upper() != old_gab:
            # Se gabarito antigo era A (o enunciado), nenhuma restava correta
            if old_gab == "A":
                correta = False
        payload.append({"letra": letra, "texto": src.texto, "correta": correta})

    if new_gab:
        for p in payload:
            p["correta"] = p["letra"] == new_gab
    elif old_gab == "A":
        for p in payload:
            p["correta"] = False

    if dry_run:
        return True

    questao.enunciado = new_enunciado
    update_fields = ["enunciado"]
    if new_gab:
        questao.gabarito = new_gab
        update_fields.append("gabarito")
    questao.save(update_fields=update_fields)

    questao.alternativas.all().delete()
    Alternativa.objects.bulk_create(
        [
            Alternativa(
                questao=questao,
                letra=p["letra"],
                texto=p["texto"],
                correta=p["correta"],
            )
            for p in payload
        ]
    )
    return True

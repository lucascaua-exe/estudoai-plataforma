"""Normalização contínua de textos grudados / lixo de PDF em questões."""
from __future__ import annotations

import re
import threading
from contextlib import contextmanager
from typing import Iterator

from apps.questions.banca import infer_banca
from apps.questions.models import Alternativa, Questao
from apps.questions.structure_repair import reparar_enunciado_em_alternativa
from apps.questions.text_cleanup import (
    clean_alternativa,
    clean_enunciado,
    clean_explicacao,
    clean_study_text,
)

_tls = threading.local()

_CAMEL_GLUE_RE = re.compile(r"[a-zà-öø-ÿãõâêôç][A-ZÁÉÍÓÚÃÕÂÊÔÇ]")
_UI_JUNK_RE = re.compile(
    r"(?i)Check-Circle|Check-Square|Chevron-|Continuedeonde|Continue\s*de\s*onde|"
    r"Voltaràquest|LIST-UL|BOOKMARK|Arrow-Left|Arrow-Right"
)
_GLUED_PHRASE_RE = re.compile(
    r"(?i)AnáliseDetalhada|PontosdeAten|SistemasOperacionais|TecnologiadaInforma|"
    r"LinguaPortuguesa|Acentua[cç][aã]oGr[aá]fica|dedados|dapessoa|naturalou|"
    r"Aalternativa|Gerenciamentode|Endere[cç]amentoIP|deacordo|emrela[cç][aã]o|"
    r"pormeio|atrav[eé]sde|nosentido"
)


def monitoring_disabled() -> bool:
    return bool(getattr(_tls, "skip", False))


@contextmanager
def skip_text_monitor() -> Iterator[None]:
    """Evita loop quando o próprio monitor grava."""
    prev = getattr(_tls, "skip", False)
    _tls.skip = True
    try:
        yield
    finally:
        _tls.skip = prev


def texto_parece_sujo(text: str | None) -> bool:
    """Heurística rápida: camelCase grudado, tokens longos, lixo de UI/PDF."""
    if not text:
        return False
    sample = text[:4000]
    if _UI_JUNK_RE.search(sample):
        return True
    if _CAMEL_GLUE_RE.search(sample):
        return True
    if _GLUED_PHRASE_RE.search(sample):
        return True
    for tok in re.findall(r"\S+", sample):
        if len(tok) >= 22 and sum(1 for c in tok if c.isalpha()) >= 18:
            return True
    if re.search(r"(?i)lei\d|art\.?\d|n[º°]?\d{2,}", sample):
        return True
    if len(sample) > 80 and sample.count(" ") < max(2, len(sample) // 40):
        return True
    return False


def field_needs_clean(original: str | None, cleaned: str) -> bool:
    orig = original or ""
    return cleaned != orig or texto_parece_sujo(orig)


def heal_field(instance, field: str, cleaned: str) -> str:
    """
    Persiste `cleaned` em `instance.field` se o valor atual estiver sujo.
    Retorna sempre o texto limpo para a API.
    """
    current = getattr(instance, field, None) or ""
    if cleaned == current:
        return cleaned
    if monitoring_disabled():
        return cleaned
    with skip_text_monitor():
        setattr(instance, field, cleaned)
        try:
            instance.save(update_fields=[field])
        except Exception:  # noqa: BLE001
            pass
    return cleaned


def normalize_alternativa(alt: Alternativa, *, dry_run: bool = False) -> bool:
    new_t = clean_alternativa(alt.texto)
    if new_t == (alt.texto or ""):
        return False
    if not dry_run:
        with skip_text_monitor():
            alt.texto = new_t
            alt.save(update_fields=["texto"])
    return True


def normalize_alternativas(questao: Questao, *, dry_run: bool = False) -> int:
    return sum(
        1
        for alt in questao.alternativas.all()
        if normalize_alternativa(alt, dry_run=dry_run)
    )


def normalize_questao(questao: Questao, *, dry_run: bool = False, repair: bool = True) -> bool:
    """
    Aplica limpeza + reparo de estrutura. Retorna True se algo mudou (ou mudaria).
    """
    if monitoring_disabled() and not dry_run:
        return False

    def _run() -> bool:
        changed = False

        if repair and reparar_enunciado_em_alternativa(questao, dry_run=dry_run):
            changed = True
            if not dry_run:
                questao.refresh_from_db()

        new_enun = clean_enunciado(questao.enunciado)
        new_exp = clean_explicacao(questao.explicacao)
        new_trecho = clean_study_text(questao.trecho_referencia or "")
        doc_nome = ""
        if getattr(questao, "documento_id", None):
            try:
                doc_nome = questao.documento.nome if questao.documento else ""
            except Exception:  # noqa: BLE001
                doc_nome = ""
        new_banca = questao.banca or infer_banca(doc_nome, questao.origem)

        fields: list[str] = []
        if new_enun != (questao.enunciado or ""):
            fields.append("enunciado")
            if not dry_run:
                questao.enunciado = new_enun
        if new_exp != (questao.explicacao or ""):
            fields.append("explicacao")
            if not dry_run:
                questao.explicacao = new_exp
        if new_trecho != (questao.trecho_referencia or ""):
            fields.append("trecho_referencia")
            if not dry_run:
                questao.trecho_referencia = new_trecho
        if new_banca and new_banca != (questao.banca or ""):
            fields.append("banca")
            if not dry_run:
                questao.banca = new_banca

        if fields:
            changed = True
            if not dry_run:
                questao.save(update_fields=fields)

        if normalize_alternativas(questao, dry_run=dry_run):
            changed = True
        return changed

    if dry_run:
        return _run()
    with skip_text_monitor():
        return _run()


def scan_and_normalize(
    *,
    dry_run: bool = False,
    repair: bool = True,
    chunk_size: int = 100,
) -> dict[str, int]:
    """Varre o acervo e normaliza. Retorna estatísticas."""
    inspected = 0
    fixed = 0
    qs = Questao.objects.select_related("documento").prefetch_related("alternativas")
    for q in qs.iterator(chunk_size=chunk_size):
        inspected += 1
        dirty = (
            texto_parece_sujo(q.enunciado)
            or texto_parece_sujo(q.explicacao)
            or texto_parece_sujo(q.trecho_referencia)
            or any(texto_parece_sujo(a.texto) for a in q.alternativas.all())
            or field_needs_clean(q.enunciado, clean_enunciado(q.enunciado))
            or field_needs_clean(q.explicacao, clean_explicacao(q.explicacao))
            or any(
                field_needs_clean(a.texto, clean_alternativa(a.texto))
                for a in q.alternativas.all()
            )
            or (not (q.banca or "").strip())
        )
        if not dirty and not repair:
            continue
        # Com repair ligado, ainda tenta normalize (reparo estrutural é barato se não precisar)
        if dirty or repair:
            if normalize_questao(q, dry_run=dry_run, repair=repair):
                fixed += 1
    return {"inspected": inspected, "fixed": fixed}

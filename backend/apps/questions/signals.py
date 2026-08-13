"""Signals para normalizar textos grudados na gravação."""
from __future__ import annotations

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.questions.models import Alternativa, Questao
from apps.questions.text_cleanup import (
    clean_alternativa,
    clean_enunciado,
    clean_explicacao,
    clean_study_text,
)
from apps.questions.text_monitor import (
    field_needs_clean,
    monitoring_disabled,
    normalize_alternativa,
    normalize_questao,
    texto_parece_sujo,
)


def _questao_precisa_normalizar(questao: Questao) -> bool:
    if texto_parece_sujo(questao.enunciado) or texto_parece_sujo(questao.explicacao):
        return True
    if texto_parece_sujo(questao.trecho_referencia):
        return True
    if field_needs_clean(questao.enunciado, clean_enunciado(questao.enunciado)):
        return True
    if field_needs_clean(questao.explicacao, clean_explicacao(questao.explicacao)):
        return True
    if field_needs_clean(
        questao.trecho_referencia, clean_study_text(questao.trecho_referencia or "")
    ):
        return True
    if not (questao.banca or "").strip():
        return True
    return False


@receiver(post_save, sender=Questao)
def normalize_questao_on_save(sender, instance: Questao, **kwargs):
    if monitoring_disabled():
        return
    if not _questao_precisa_normalizar(instance):
        return
    normalize_questao(instance, dry_run=False, repair=False)


@receiver(post_save, sender=Alternativa)
def normalize_alternativa_on_save(sender, instance: Alternativa, **kwargs):
    if monitoring_disabled():
        return
    if not field_needs_clean(instance.texto, clean_alternativa(instance.texto)):
        return
    normalize_alternativa(instance, dry_run=False)

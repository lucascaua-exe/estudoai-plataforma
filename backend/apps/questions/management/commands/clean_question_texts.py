"""Limpa enunciados/explicações/alternativas já gravados."""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.questions.models import Alternativa, Questao
from apps.questions.text_cleanup import (
    clean_alternativa,
    clean_enunciado,
    clean_explicacao,
    clean_study_text,
)


class Command(BaseCommand):
    help = "Remove caracteres/lixo de PDF dos textos das questões."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Só conta alterações, não grava.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dry = options["dry_run"]
        q_changed = a_changed = 0

        for q in Questao.objects.iterator(chunk_size=200):
            new_enun = clean_enunciado(q.enunciado)
            new_exp = clean_explicacao(q.explicacao)
            new_trecho = clean_study_text(q.trecho_referencia or "")
            if (
                new_enun != q.enunciado
                or new_exp != q.explicacao
                or new_trecho != (q.trecho_referencia or "")
            ):
                q_changed += 1
                if not dry:
                    q.enunciado = new_enun
                    q.explicacao = new_exp
                    q.trecho_referencia = new_trecho
                    q.save(
                        update_fields=["enunciado", "explicacao", "trecho_referencia"]
                    )

        for alt in Alternativa.objects.iterator(chunk_size=500):
            new_t = clean_alternativa(alt.texto)
            if new_t != alt.texto:
                a_changed += 1
                if not dry:
                    alt.texto = new_t
                    alt.save(update_fields=["texto"])

        verb = "seriam" if dry else "foram"
        self.stdout.write(
            self.style.SUCCESS(
                f"OK — {q_changed} questões e {a_changed} alternativas {verb} limpas."
            )
        )

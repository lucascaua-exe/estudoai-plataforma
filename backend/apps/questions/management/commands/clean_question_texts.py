"""Limpa enunciados/explicações/alternativas e repara enunciado-como-alternativa."""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalog.models import Assunto
from apps.questions.banca import infer_banca
from apps.questions.models import Alternativa, Questao
from apps.questions.structure_repair import reparar_enunciado_em_alternativa
from apps.questions.text_cleanup import (
    clean_alternativa,
    clean_enunciado,
    clean_explicacao,
    clean_study_text,
)


class Command(BaseCommand):
    help = "Remove lixo de PDF, repara enunciados deslocados e preenche banca."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Só conta alterações, não grava.",
        )
        parser.add_argument(
            "--skip-repair",
            action="store_true",
            help="Não repara enunciado gravado como alternativa A.",
        )

    def handle(self, *args, **options):
        dry = options["dry_run"]
        skip_repair = options["skip_repair"]
        q_changed = a_changed = repaired = banca_filled = assuntos_fixed = 0

        with transaction.atomic():
            if not skip_repair:
                for q in Questao.objects.prefetch_related("alternativas").iterator(
                    chunk_size=100
                ):
                    if reparar_enunciado_em_alternativa(q, dry_run=dry):
                        repaired += 1
                        if not dry:
                            # Recarrega após delete/create
                            q.refresh_from_db()

            for q in Questao.objects.select_related("documento").iterator(chunk_size=200):
                new_enun = clean_enunciado(q.enunciado)
                new_exp = clean_explicacao(q.explicacao)
                new_trecho = clean_study_text(q.trecho_referencia or "")
                doc_nome = q.documento.nome if q.documento_id else ""
                new_banca = q.banca or infer_banca(doc_nome, q.origem)
                changed = (
                    new_enun != q.enunciado
                    or new_exp != q.explicacao
                    or new_trecho != (q.trecho_referencia or "")
                    or (new_banca and new_banca != q.banca)
                )
                if changed:
                    q_changed += 1
                    if new_banca and new_banca != q.banca:
                        banca_filled += 1
                    if not dry:
                        q.enunciado = new_enun
                        q.explicacao = new_exp
                        q.trecho_referencia = new_trecho
                        fields = ["enunciado", "explicacao", "trecho_referencia"]
                        if new_banca and new_banca != q.banca:
                            q.banca = new_banca
                            fields.append("banca")
                        q.save(update_fields=fields)

            for alt in Alternativa.objects.iterator(chunk_size=500):
                new_t = clean_alternativa(alt.texto)
                if new_t != alt.texto:
                    a_changed += 1
                    if not dry:
                        alt.texto = new_t
                        alt.save(update_fields=["texto"])

            for assunto in Assunto.objects.iterator(chunk_size=200):
                new_nome = clean_study_text(assunto.nome)
                if new_nome and new_nome != assunto.nome:
                    assuntos_fixed += 1
                    if not dry:
                        assunto.nome = new_nome
                        assunto.save(update_fields=["nome"])

            if dry:
                transaction.set_rollback(True)

        verb = "seriam" if dry else "foram"
        self.stdout.write(
            self.style.SUCCESS(
                f"OK — {repaired} reparos de estrutura; {q_changed} questões e "
                f"{a_changed} alternativas {verb} limpas; "
                f"{banca_filled} bancas preenchidas; {assuntos_fixed} assuntos normalizados."
            )
        )

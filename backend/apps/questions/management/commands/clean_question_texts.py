"""Limpa enunciados/explicações/alternativas e repara enunciado-como-alternativa.

Compatível com o build; a lógica vive em text_monitor.normalize_questao /
monitor_question_texts.
"""
from __future__ import annotations

from django.core.management import call_command
from django.core.management.base import BaseCommand


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
        argv = ["--once"]
        if options["dry_run"]:
            argv.append("--dry-run")
        if options["skip_repair"]:
            argv.append("--skip-repair")
        call_command("monitor_question_texts", *argv, stdout=self.stdout, stderr=self.stderr)

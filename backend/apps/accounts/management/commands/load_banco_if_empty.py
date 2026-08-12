"""
Carrega fixture do banco se ainda não houver questões.
Roda no boot do Render (sem Shell).
"""
from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand

from apps.questions.models import Questao


class Command(BaseCommand):
    help = "Se o banco estiver vazio, carrega fixtures/banco.json (se existir)."

    def handle(self, *args, **options):
        if Questao.objects.exists():
            self.stdout.write("Questões já existem — skip loaddata.")
            return

        fixture = Path(settings.BASE_DIR) / "fixtures" / "banco.json"
        if not fixture.exists():
            self.stdout.write(
                self.style.WARNING(
                    f"Sem {fixture.name} e banco vazio. "
                    "Rode ingest localmente e gere a fixture (ver README)."
                )
            )
            return

        self.stdout.write(f"Carregando {fixture}…")
        call_command("loaddata", "banco", verbosity=1)
        self.stdout.write(self.style.SUCCESS(f"OK — {Questao.objects.count()} questões."))
        call_command("clean_question_texts")

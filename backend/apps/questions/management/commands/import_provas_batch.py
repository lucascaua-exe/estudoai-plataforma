"""Importa lote de provas (CONAB, Exército, TJ/PA, Marinha, DPE)."""
from __future__ import annotations

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Extrai e cadastra questões dos PDFs de provas em data/pdfs/"

    def handle(self, *args, **options):
        from scripts.import_provas_batch import run

        stats = run()
        self.stdout.write(
            self.style.SUCCESS(
                f"Batch: {stats.get('total_extracted', 0)} extraídas "
                f"(+{stats.get('created', 0)} / ~{stats.get('updated', 0)})"
            )
        )

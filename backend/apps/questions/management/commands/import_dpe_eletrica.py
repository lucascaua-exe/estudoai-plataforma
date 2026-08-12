"""Importa Q41–70 de Engenharia Elétrica (DPE/RS) a partir do PDF/JSON."""
from __future__ import annotations

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        "Extrai/cadastra questões 41–70 (Engenharia Elétrica) da prova DPE "
        "com gabarito oficial e assuntos."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--ai",
            action="store_true",
            help="Gera explicações com IA (mais lento).",
        )
        parser.add_argument(
            "--from-json",
            action="store_true",
            help="Usa apenas o JSON (útil no Render se o PDF não estiver no deploy).",
        )

    def handle(self, *args, **options):
        # Import lazy para não carregar pdfplumber no boot do Django
        from scripts.import_dpe_eletrica import run

        stats = run(
            generate_ai=bool(options.get("ai")),
            from_json=bool(options.get("from_json")),
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Engenharia Elétrica: {stats['total']} questões "
                f"(+{stats['created']} / ~{stats['updated']})"
            )
        )

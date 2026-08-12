"""Importa Q31–60 EAOEAR 2026 (Engenharia Elétrica) com figuras."""
from __future__ import annotations

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Extrai/cadastra questões EAOEAR 2026 (elétrica) com imagens recortadas."

    def add_arguments(self, parser):
        parser.add_argument(
            "--from-json",
            action="store_true",
            help="Usa JSON + figuras já gerados (recomendado no Render).",
        )
        parser.add_argument(
            "--skip-render",
            action="store_true",
            help="Reusa JPEGs de páginas já renderizados.",
        )

    def handle(self, *args, **options):
        from scripts.import_eaoear_eletrica import run

        stats = run(
            from_json=bool(options.get("from_json")),
            skip_render=bool(options.get("skip_render")),
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"EAOEAR elétrica: {stats['total']} questões "
                f"(+{stats['created']} / ~{stats['updated']}, "
                f"{stats['with_images']} com figura)"
            )
        )

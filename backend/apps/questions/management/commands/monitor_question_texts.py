"""Varredura periódica (ou única) para limpar textos grudados nas questões."""
from __future__ import annotations

import os
import time

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalog.models import Assunto
from apps.questions.text_cleanup import clean_study_text
from apps.questions.text_monitor import scan_and_normalize


class Command(BaseCommand):
    help = (
        "Detecta e corrige textos grudados/lixo de PDF em questões. "
        "Use --once no build ou --loop em runtime (ver TEXT_MONITOR_LOOP no start.sh)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--once",
            action="store_true",
            help="Uma passagem e sai (padrão se --loop não for passado).",
        )
        parser.add_argument(
            "--loop",
            action="store_true",
            help="Loop contínuo até o processo ser encerrado.",
        )
        parser.add_argument(
            "--interval",
            type=int,
            default=int(os.environ.get("TEXT_MONITOR_INTERVAL", "300")),
            help="Intervalo em segundos entre passagens no --loop (default: 300).",
        )
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
        parser.add_argument(
            "--skip-assuntos",
            action="store_true",
            help="Não normaliza nomes de assuntos.",
        )

    def handle(self, *args, **options):
        loop = options["loop"]
        interval = max(30, int(options["interval"] or 300))
        dry = options["dry_run"]
        repair = not options["skip_repair"]
        skip_assuntos = options["skip_assuntos"]

        if loop and dry:
            self.stderr.write("Aviso: --dry-run com --loop só inspeciona; não grava.")

        while True:
            self._run_pass(dry=dry, repair=repair, skip_assuntos=skip_assuntos)
            if not loop:
                break
            self.stdout.write(f"Próxima varredura em {interval}s…")
            time.sleep(interval)

    def _run_pass(self, *, dry: bool, repair: bool, skip_assuntos: bool):
        with transaction.atomic():
            stats = scan_and_normalize(dry_run=dry, repair=repair)
            assuntos_fixed = 0
            if not skip_assuntos:
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
                f"OK — inspecionadas {stats['inspected']}; "
                f"{stats['fixed']} questões {verb} corrigidas; "
                f"{assuntos_fixed} assuntos normalizados."
            )
        )

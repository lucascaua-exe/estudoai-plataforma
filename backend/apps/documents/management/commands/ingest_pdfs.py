from django.core.management.base import BaseCommand

from apps.documents.ingest import ingest_all


class Command(BaseCommand):
    help = "Ingere os PDFs da pasta raiz e extrai questões/chunks"

    def add_arguments(self, parser):
        parser.add_argument("--only-questions", action="store_true")
        parser.add_argument("--max-pages", type=int, default=None)
        parser.add_argument("--force", action="store_true")

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Iniciando ingestão de PDFs..."))
        docs = ingest_all(
            stdout=self.stdout,
            only_questions=options["only_questions"],
            max_pages=options["max_pages"],
            force=options["force"],
        )
        self.stdout.write(self.style.SUCCESS(f"Concluído: {len(docs)} documento(s)."))

"""Remove imagens associadas à prova errada e restaura EAOEAR/DPE."""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db.models import Count

from apps.documents.models import Documento
from apps.questions.models import Questao


class Command(BaseCommand):
    help = (
        "Corrige figuras ligadas à questão errada (ex.: imagem EAOEAR em questão DPE) "
        "e reimporta EAOEAR do JSON."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Só lista o que seria feito.",
        )
        parser.add_argument(
            "--skip-reimport",
            action="store_true",
            help="Não reexecuta import_eaoear_eletrica --from-json.",
        )

    def handle(self, *args, **options):
        dry = options["dry_run"]
        cleared = 0
        deleted_dupes = 0

        eaoear_docs = list(
            Documento.objects.filter(nome__icontains="EAOEAR").values_list("id", flat=True)
        )
        dpe_docs = list(
            Documento.objects.filter(nome__icontains="DPE").values_list("id", flat=True)
        )

        # 1) Imagem EAOEAR em documento que não é EAOEAR → limpar
        mismatched = Questao.objects.filter(imagem__icontains="eaoear").exclude(
            documento_id__in=eaoear_docs or [-1]
        )
        for q in mismatched:
            self.stdout.write(
                f"  limpar imagem Q#{q.numero_origem} id={q.id} doc={q.documento_id} "
                f"file={q.imagem.name}"
            )
            if not dry:
                q.imagem.delete(save=False)
                q.imagem = None
                q.save(update_fields=["imagem"])
            cleared += 1

        # 2) Documento DPE nunca deve ter figura
        if dpe_docs:
            for q in Questao.objects.filter(documento_id__in=dpe_docs).exclude(imagem=""):
                if not q.imagem:
                    continue
                self.stdout.write(
                    f"  limpar imagem DPE Q#{q.numero_origem} id={q.id} file={q.imagem.name}"
                )
                if not dry:
                    q.imagem.delete(save=False)
                    q.imagem = None
                    q.save(update_fields=["imagem"])
                cleared += 1

        # 3) Duplicatas no mesmo documento + numero_origem (fica a mais antiga sem imagem estranha)
        dup_groups = (
            Questao.objects.exclude(documento_id=None)
            .exclude(numero_origem=None)
            .values("documento_id", "numero_origem")
            .annotate(n=Count("id"))
            .filter(n__gt=1)
        )
        for g in dup_groups:
            qs = list(
                Questao.objects.filter(
                    documento_id=g["documento_id"],
                    numero_origem=g["numero_origem"],
                ).order_by("id")
            )
            keep = qs[0]
            for extra in qs[1:]:
                self.stdout.write(
                    f"  remover duplicata id={extra.id} (mantém {keep.id}) "
                    f"doc={g['documento_id']} num={g['numero_origem']}"
                )
                if not dry:
                    extra.delete()
                deleted_dupes += 1

        # 4) Reimporta EAOEAR para restaurar enunciados + figuras corretas
        if not options["skip_reimport"] and not dry:
            from django.core.management import call_command

            self.stdout.write("Reimportando EAOEAR (--from-json)…")
            call_command("import_eaoear_eletrica", from_json=True)
            # Reaplica DPE sem colidir
            try:
                call_command("import_dpe_eletrica", from_json=True)
            except Exception as exc:  # noqa: BLE001
                self.stdout.write(self.style.WARNING(f"DPE reimport avisou: {exc}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"OK — imagens limpas: {cleared}; duplicatas removidas: {deleted_dupes}"
                + (" (dry-run)" if dry else "")
            )
        )

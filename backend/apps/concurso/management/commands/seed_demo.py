from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from apps.concurso.models import Concurso, MetaEstudo
from apps.gamification.services import ensure_achievements

User = get_user_model()


class Command(BaseCommand):
    help = "Cria usuário demo e seed do concurso Araguaína"

    def handle(self, *args, **options):
        ensure_achievements()
        user, created = User.objects.get_or_create(
            email="lucas@estudos.local",
            defaults={"name": "Lucas"},
        )
        if created:
            user.set_password("lucas1234")
            user.save()
            self.stdout.write("Usuário demo criado: lucas@estudos.local / lucas1234")
        else:
            self.stdout.write("Usuário demo já existe.")

        Concurso.objects.update_or_create(
            user=user,
            defaults={
                "nome": "Prefeitura de Araguaína — TO 2026",
                "orgao": "Prefeitura Municipal de Araguaína",
                "cargo": "Analista de Tecnologia da Informação",
                "banca": "IMPAR",
                "observacoes": "Base documental exclusiva dos PDFs IMPAR carregados na plataforma.",
            },
        )
        MetaEstudo.objects.get_or_create(user=user)
        profile = user.profile
        profile.concurso_alvo = "Prefeitura de Araguaína — TO 2026"
        profile.cargo_alvo = "Analista de Tecnologia da Informação"
        profile.save()
        self.stdout.write(self.style.SUCCESS("Seed concluído."))

"""
Cria/atualiza superusuário a partir de variáveis de ambiente.
Usado no boot do Render (plano gratuito sem Shell).
"""
from __future__ import annotations

import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Garante superusuário ADMIN_EMAIL / ADMIN_PASSWORD (sem shell interativo)."

    def handle(self, *args, **options):
        email = (os.getenv("ADMIN_EMAIL") or "").strip().lower()
        password = os.getenv("ADMIN_PASSWORD") or ""
        name = (os.getenv("ADMIN_NAME") or "Administrador").strip()
        reset = (os.getenv("ADMIN_RESET_PASSWORD") or "false").lower() == "true"

        if not email or not password:
            self.stdout.write(
                self.style.WARNING(
                    "ADMIN_EMAIL/ADMIN_PASSWORD não definidos — pulando ensure_admin."
                )
            )
            return

        User = get_user_model()
        user = User.objects.filter(email__iexact=email).first()
        created = False
        if user is None:
            user = User.objects.create_superuser(email=email, password=password, name=name)
            created = True
        else:
            user.name = name or user.name
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            if reset or not user.has_usable_password():
                user.set_password(password)
            user.save()

        # Garante perfil com plano
        profile = getattr(user, "profile", None)
        if profile is not None and not profile.plano:
            profile.plano = "premium"
            profile.assinatura_status = "active"
            profile.save(update_fields=["plano", "assinatura_status", "updated_at"])

        action = "criado" if created else "atualizado"
        self.stdout.write(self.style.SUCCESS(f"Admin {action}: {user.email}"))

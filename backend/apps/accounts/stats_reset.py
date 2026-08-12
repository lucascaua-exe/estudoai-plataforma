"""Reset de estatísticas de estudo / gamificação."""
from __future__ import annotations

from django.db import transaction

from apps.accounts.models import User
from apps.gamification.models import UserConquista
from apps.performance.models import DominioAssunto, SessaoEstudo
from apps.questions.models import Tentativa


def reset_user_stats(user: User) -> dict[str, int]:
    """Zera tentativas, domínio, sessões, conquistas e pontos/sequência do perfil."""
    with transaction.atomic():
        n_tent = Tentativa.objects.filter(user=user).delete()[0]
        n_dom = DominioAssunto.objects.filter(user=user).delete()[0]
        n_ses = SessaoEstudo.objects.filter(user=user).delete()[0]
        n_conq = UserConquista.objects.filter(user=user).delete()[0]
        profile = getattr(user, "profile", None)
        if profile is not None:
            profile.pontos = 0
            profile.sequencia_dias = 0
            profile.save(update_fields=["pontos", "sequencia_dias"])
    return {
        "tentativas": n_tent,
        "dominios": n_dom,
        "sessoes": n_ses,
        "conquistas": n_conq,
    }


def reset_all_users_stats() -> dict[str, int]:
    totals = {"usuarios": 0, "tentativas": 0, "dominios": 0, "sessoes": 0, "conquistas": 0}
    for user in User.objects.all().iterator():
        r = reset_user_stats(user)
        totals["usuarios"] += 1
        for k in ("tentativas", "dominios", "sessoes", "conquistas"):
            totals[k] += r[k]
    return totals

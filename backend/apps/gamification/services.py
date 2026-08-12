from apps.gamification.models import Conquista, UserConquista
from apps.performance.models import DominioAssunto
from apps.questions.models import Tentativa


DEFAULT_ACHIEVEMENTS = [
    ("primeira_questao", "Primeira questão", "Respondeu a primeira questão", 10),
    ("100_questoes", "100 questões", "Resolveu 100 questões", 50),
    ("500_questoes", "500 questões", "Resolveu 500 questões", 100),
    ("7_dias", "7 dias consecutivos", "Estudou 7 dias seguidos", 40),
    ("primeiro_dominio", "Primeiro domínio", "Confirmou domínio em um assunto", 60),
    ("90_pct", "90% de aproveitamento", "Atingiu 90% de acerto geral (mín. 20 questões)", 80),
]


def ensure_achievements():
    for codigo, nome, desc, pts in DEFAULT_ACHIEVEMENTS:
        Conquista.objects.get_or_create(
            codigo=codigo,
            defaults={"nome": nome, "descricao": desc, "pontos": pts},
        )


def grant(user, codigo: str):
    ensure_achievements()
    conquista = Conquista.objects.filter(codigo=codigo).first()
    if not conquista:
        return
    _, created = UserConquista.objects.get_or_create(user=user, conquista=conquista)
    if created:
        profile = user.profile
        profile.pontos += conquista.pontos
        profile.save(update_fields=["pontos"])


def check_achievements(user):
    total = Tentativa.objects.filter(user=user).count()
    if total >= 1:
        grant(user, "primeira_questao")
    if total >= 100:
        grant(user, "100_questoes")
    if total >= 500:
        grant(user, "500_questoes")
    if user.profile.sequencia_dias >= 7:
        grant(user, "7_dias")
    if DominioAssunto.objects.filter(user=user, dominio_comprovado=True).exists():
        grant(user, "primeiro_dominio")
    if total >= 20:
        acertos = Tentativa.objects.filter(user=user, correta=True).count()
        if acertos / total >= 0.9:
            grant(user, "90_pct")

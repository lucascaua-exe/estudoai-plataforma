"""Serviços de cálculo de domínio e desempenho."""
from collections import defaultdict
from datetime import date, timedelta

from django.conf import settings
from django.db.models import Count, Q
from django.utils import timezone

from apps.performance.models import DominioAssunto
from apps.questions.models import Tentativa


def compute_nivel(total: int, percentual: float) -> str:
    min_eval = settings.MASTERY_MIN_QUESTIONS_EVAL
    min_confirm = settings.MASTERY_MIN_QUESTIONS_CONFIRM
    t_attn = settings.MASTERY_THRESHOLD_ATTENTION
    t_dev = settings.MASTERY_THRESHOLD_DEVELOPING
    t_good = settings.MASTERY_THRESHOLD_GOOD

    if total < min_eval:
        return DominioAssunto.Nivel.DADOS_INSUFICIENTES
    if total < min_confirm:
        return DominioAssunto.Nivel.EM_AVALIACAO
    if percentual < t_attn:
        return DominioAssunto.Nivel.PRECISA_ATENCAO
    if percentual < t_dev:
        return DominioAssunto.Nivel.EM_DESENVOLVIMENTO
    if percentual < t_good:
        return DominioAssunto.Nivel.BOM_DOMINIO
    return DominioAssunto.Nivel.DOMINIO_CONFIRMADO


def update_dominio_for_assunto(user, assunto_id: int) -> DominioAssunto | None:
    if not assunto_id:
        return None
    qs = Tentativa.objects.filter(user=user, questao__assunto_id=assunto_id)
    total = qs.count()
    acertos = qs.filter(correta=True).count()
    percentual = (acertos / total * 100) if total else 0.0
    nivel = compute_nivel(total, percentual)
    comprovado = nivel == DominioAssunto.Nivel.DOMINIO_CONFIRMADO

    dominio, _ = DominioAssunto.objects.update_or_create(
        user=user,
        assunto_id=assunto_id,
        defaults={
            "nivel": nivel,
            "total_respostas": total,
            "total_acertos": acertos,
            "percentual_acerto": round(percentual, 2),
            "dominio_comprovado": comprovado,
            "ultima_revisao": timezone.now(),
        },
    )
    if comprovado and not dominio.data_confirmacao:
        dominio.data_confirmacao = timezone.now()
        dominio.save(update_fields=["data_confirmacao"])
    return dominio


def update_streak_and_points(user, correta: bool, tempo_segundos: int = 0):
    profile = user.profile
    today = timezone.localdate()
    if profile.ultimo_estudo:
        delta = (today - profile.ultimo_estudo).days
        if delta == 1:
            profile.sequencia_dias += 1
        elif delta > 1:
            profile.sequencia_dias = 1
    else:
        profile.sequencia_dias = 1
    profile.ultimo_estudo = today
    profile.pontos += 10 if correta else 2
    profile.tempo_total_segundos += tempo_segundos
    profile.save()

    from apps.gamification.services import check_achievements

    check_achievements(user)


def dashboard_stats(user) -> dict:
    tentativas = Tentativa.objects.filter(user=user)
    total = tentativas.count()
    acertos = tentativas.filter(correta=True).count()
    erros = total - acertos
    percentual = round(acertos / total * 100, 1) if total else 0.0
    profile = user.profile

    dias_estudo = (
        tentativas.dates("created_at", "day").count() if total else 0
    )

    dominios_confirmados = DominioAssunto.objects.filter(
        user=user, dominio_comprovado=True
    ).count()
    pontos_atencao = DominioAssunto.objects.filter(
        user=user,
        nivel__in=[
            DominioAssunto.Nivel.PRECISA_ATENCAO,
            DominioAssunto.Nivel.EM_DESENVOLVIMENTO,
        ],
    ).count()

    semana_passada = timezone.now() - timedelta(days=14)
    semana_atual = timezone.now() - timedelta(days=7)
    antigas = tentativas.filter(created_at__gte=semana_passada, created_at__lt=semana_atual)
    recentes = tentativas.filter(created_at__gte=semana_atual)
    pct_antiga = (
        antigas.filter(correta=True).count() / antigas.count() * 100 if antigas.exists() else 0
    )
    pct_recente = (
        recentes.filter(correta=True).count() / recentes.count() * 100 if recentes.exists() else 0
    )
    evolucao_semana = round(pct_recente - pct_antiga, 1)

    recomendacao = (
        DominioAssunto.objects.filter(user=user)
        .exclude(nivel=DominioAssunto.Nivel.DOMINIO_CONFIRMADO)
        .exclude(nivel=DominioAssunto.Nivel.DADOS_INSUFICIENTES)
        .order_by("percentual_acerto", "-total_respostas")
        .select_related("assunto", "assunto__disciplina")
        .first()
    )
    rec_texto = None
    if recomendacao:
        rec_texto = {
            "disciplina": recomendacao.assunto.disciplina.nome,
            "assunto": recomendacao.assunto.nome,
            "percentual": recomendacao.percentual_acerto,
            "nivel": recomendacao.nivel,
        }

    from apps.questions.models import Questao
    from apps.catalog.models import Disciplina

    # Evolução diária (14 dias)
    since = timezone.now() - timedelta(days=14)
    by_day: dict[str, dict] = defaultdict(lambda: {"total": 0, "acertos": 0})
    for t in tentativas.filter(created_at__gte=since).only("created_at", "correta"):
        key = timezone.localtime(t.created_at).date().isoformat()
        by_day[key]["total"] += 1
        if t.correta:
            by_day[key]["acertos"] += 1
    evolucao_diaria = []
    for day in sorted(by_day.keys()):
        d = by_day[day]
        evolucao_diaria.append(
            {
                "data": day,
                "total": d["total"],
                "acertos": d["acertos"],
                "erros": d["total"] - d["acertos"],
                "percentual": round(d["acertos"] / d["total"] * 100, 1) if d["total"] else 0,
            }
        )

    # Desempenho por disciplina
    por_disciplina = []
    disc_rows = (
        tentativas.values("questao__disciplina__id", "questao__disciplina__nome")
        .annotate(
            total=Count("id"),
            acertos=Count("id", filter=Q(correta=True)),
        )
        .order_by("-total")
    )
    for r in disc_rows:
        nome = r["questao__disciplina__nome"]
        if not nome:
            continue
        tcount = r["total"]
        ac = r["acertos"]
        por_disciplina.append(
            {
                "id": r["questao__disciplina__id"],
                "nome": nome,
                "total": tcount,
                "acertos": ac,
                "erros": tcount - ac,
                "percentual": round(ac / tcount * 100, 1) if tcount else 0,
            }
        )

    # Cobertura do banco por disciplina
    banco_por_disciplina = []
    for d in Disciplina.objects.annotate(qtd=Count("questoes")).order_by("ordem", "nome"):
        if d.qtd:
            banco_por_disciplina.append({"id": d.id, "nome": d.nome, "questoes": d.qtd})

    # Distribuição de dificuldade respondida
    dist_dificuldade = []
    for row in (
        tentativas.values("questao__dificuldade")
        .annotate(total=Count("id"), acertos=Count("id", filter=Q(correta=True)))
        .order_by("questao__dificuldade")
    ):
        dif = row["questao__dificuldade"] or "nao_informado"
        tcount = row["total"]
        ac = row["acertos"]
        dist_dificuldade.append(
            {
                "dificuldade": dif,
                "total": tcount,
                "acertos": ac,
                "percentual": round(ac / tcount * 100, 1) if tcount else 0,
            }
        )

    nao_respondidas = Questao.objects.exclude(
        id__in=tentativas.values_list("questao_id", flat=True)
    ).count()

    return {
        "questoes_respondidas": total,
        "questoes_acertadas": acertos,
        "questoes_erradas": erros,
        "percentual_acerto": percentual,
        "pontuacao_total": profile.pontos,
        "dias_estudo": dias_estudo,
        "sequencia_atual": profile.sequencia_dias,
        "tempo_total_segundos": profile.tempo_total_segundos,
        "dominios_confirmados": dominios_confirmados,
        "pontos_atencao": pontos_atencao,
        "evolucao_semana": evolucao_semana,
        "revisao_recomendada": rec_texto,
        "total_questoes_banco": Questao.objects.count(),
        "questoes_nao_respondidas": nao_respondidas,
        "meta_questoes_dia": profile.meta_questoes_dia,
        "questoes_hoje": tentativas.filter(created_at__date=date.today()).count(),
        "evolucao_diaria": evolucao_diaria,
        "por_disciplina": por_disciplina,
        "banco_por_disciplina": banco_por_disciplina,
        "distribuicao_dificuldade": dist_dificuldade,
    }

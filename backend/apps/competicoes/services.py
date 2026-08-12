"""Regras de negócio da competição (timer, pontuação, transições)."""
from __future__ import annotations

from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone

from apps.questions.models import Questao
from apps.questions.text_cleanup import clean_alternativa, clean_enunciado

from .models import Participante, RespostaCompeticao, SalaCompeticao, SalaQuestao

# Pontuação estilo Kahoot:
# - Acerto: 500–1000 conforme a velocidade (mais rápido = mais pontos)
# - Erro / timeout: 0
# - Bônus de sequência (streak) a partir do 2º acerto seguido
PONTOS_MAX = 1000
PONTOS_MIN_ACERTO = 500
STREAK_BONUS = (0, 0, 100, 200, 300, 400, 500)  # índice = streak antes desta resposta


def calcular_pontos(
    correta: bool,
    tempo_ms: int,
    tempo_limite_s: int,
    streak_antes: int = 0,
) -> tuple[int, int, int]:
    """
    Retorna (total, base, bonus_streak).
    total = base + bonus; base ∈ [500, 1000] se correta.
    """
    if not correta:
        return 0, 0, 0

    limite_ms = max(int(tempo_limite_s), 1) * 1000
    t = min(max(int(tempo_ms), 0), limite_ms)
    # Curva Kahoot: 1000 em t=0, 500 em t=T
    base = int(round(PONTOS_MAX * (1.0 - (t / limite_ms) / 2.0)))
    base = max(PONTOS_MIN_ACERTO, min(PONTOS_MAX, base))

    idx = max(0, min(int(streak_antes), len(STREAK_BONUS) - 1))
    bonus = STREAK_BONUS[idx]
    return base + bonus, base, bonus


def obter_streak(participante: Participante, ordem_atual: int) -> int:
    """Acertos consecutivos imediatamente antes da questão atual."""
    if ordem_atual <= 0:
        return 0
    streak = 0
    respostas = {
        r.sala_questao.ordem: r
        for r in RespostaCompeticao.objects.filter(
            participante=participante,
            sala_questao__sala_id=participante.sala_id,
            sala_questao__ordem__lt=ordem_atual,
        ).select_related("sala_questao")
    }
    for ordem in range(ordem_atual - 1, -1, -1):
        resp = respostas.get(ordem)
        if resp and resp.correta:
            streak += 1
        else:
            break
    return streak


def sincronizar_totais(participante: Participante) -> Participante:
    """Recalcula pontos/acertos/tempo a partir das respostas (fonte da verdade)."""
    agg = RespostaCompeticao.objects.filter(participante=participante).aggregate(
        pts=Sum("pontos"),
        acertos=Count("id", filter=Q(correta=True)),
        tempo=Sum("tempo_ms"),
    )
    participante.pontos = int(agg["pts"] or 0)
    participante.acertos = int(agg["acertos"] or 0)
    participante.tempo_total_ms = int(agg["tempo"] or 0)
    participante.save(update_fields=["pontos", "acertos", "tempo_total_ms", "ultimo_ping"])
    return participante


def letra_esta_correta(questao: Questao, letra: str) -> bool:
    letra = (letra or "").upper()[:1]
    if not letra:
        return False
    gab = (questao.gabarito or "").upper().strip()
    if gab and letra == gab:
        return True
    return questao.alternativas.filter(letra=letra, correta=True).exists()


def filtrar_questoes(filtros: dict, quantidade: int) -> list[Questao]:
    qs = Questao.objects.all()
    disciplinas = filtros.get("disciplinas") or filtros.get("disciplina_ids") or []
    assuntos = filtros.get("assuntos") or filtros.get("assunto_ids") or []
    dificuldade = filtros.get("dificuldade")
    banca = filtros.get("banca")

    if disciplinas:
        qs = qs.filter(disciplina_id__in=disciplinas)
    if assuntos:
        qs = qs.filter(assunto_id__in=assuntos)
    if dificuldade:
        qs = qs.filter(dificuldade=dificuldade)
    if banca:
        qs = qs.filter(banca__iexact=banca)

    return list(qs.order_by("?")[:quantidade])


def ranking_payload(sala: SalaCompeticao, item: SalaQuestao | None = None) -> list[dict]:
    parts = list(
        sala.participantes.filter(ativo=True).order_by(
            "-pontos", "tempo_total_ms", "conectado_em"
        )
    )
    pontos_rodada: dict[int, int] = {}
    if item is not None:
        for rid, pts in RespostaCompeticao.objects.filter(sala_questao=item).values_list(
            "participante_id", "pontos"
        ):
            pontos_rodada[rid] = pts

    out = []
    for i, p in enumerate(parts, start=1):
        out.append(
            {
                "posicao": i,
                "id": p.id,
                "apelido": p.apelido,
                "pontos": p.pontos,
                "acertos": p.acertos,
                "is_host": p.is_host,
                "tempo_total_ms": p.tempo_total_ms,
                "pontos_rodada": pontos_rodada.get(p.id),
            }
        )
    return out


def questao_payload(item: SalaQuestao, *, reveal: bool) -> dict:
    q = item.questao
    alts = []
    for a in q.alternativas.all():
        row = {
            "id": a.id,
            "letra": a.letra,
            "texto": clean_alternativa(a.texto),
        }
        if reveal:
            row["correta"] = letra_esta_correta(q, a.letra)
        alts.append(row)

    data = {
        "ordem": item.ordem,
        "total": item.sala.itens.count(),
        "numero": item.ordem + 1,
        "enunciado": clean_enunciado(q.enunciado),
        "imagem_url": None,
        "alternativas": alts,
        "disciplina": q.disciplina.nome if q.disciplina_id else None,
        "assunto": q.assunto.nome if q.assunto_id else None,
    }
    if reveal:
        data["gabarito"] = (q.gabarito or "").upper()
        # Se gabarito vazio, deriva da alternativa marcada
        if not data["gabarito"]:
            correta = next((a for a in alts if a.get("correta")), None)
            if correta:
                data["gabarito"] = correta["letra"]
    return data


def segundos_restantes(sala: SalaCompeticao) -> int | None:
    if sala.status != SalaCompeticao.Status.QUESTION or not sala.fase_iniciada_em:
        return None
    elapsed = (timezone.now() - sala.fase_iniciada_em).total_seconds()
    left = sala.tempo_por_questao - elapsed
    return max(0, int(left))


def item_atual(sala: SalaCompeticao) -> SalaQuestao | None:
    return (
        sala.itens.select_related("questao", "questao__disciplina", "questao__assunto")
        .prefetch_related("questao__alternativas")
        .filter(ordem=sala.indice_atual)
        .first()
    )


@transaction.atomic
def promover_para_reveal_se_necessario(sala: SalaCompeticao) -> SalaCompeticao:
    """Se o timer acabou ou todos responderam, fecha a rodada."""
    sala = SalaCompeticao.objects.select_for_update().get(pk=sala.pk)
    if sala.status != SalaCompeticao.Status.QUESTION:
        return sala

    item = item_atual(sala)
    if not item:
        sala.status = SalaCompeticao.Status.FINISHED
        sala.finalizado_em = timezone.now()
        sala.save(update_fields=["status", "finalizado_em"])
        return sala

    ativos_qs = sala.participantes.filter(ativo=True)
    ativos = ativos_qs.count()
    respondidos = RespostaCompeticao.objects.filter(sala_questao=item).count()
    tempo_esgotou = segundos_restantes(sala) == 0

    if tempo_esgotou or (ativos > 0 and respondidos >= ativos):
        if tempo_esgotou:
            ja = set(
                RespostaCompeticao.objects.filter(sala_questao=item).values_list(
                    "participante_id", flat=True
                )
            )
            for p in ativos_qs:
                if p.id not in ja:
                    RespostaCompeticao.objects.create(
                        sala_questao=item,
                        participante=p,
                        letra="",
                        correta=False,
                        pontos=0,
                        tempo_ms=sala.tempo_por_questao * 1000,
                    )
                    sincronizar_totais(p)
        sala.status = SalaCompeticao.Status.REVEAL
        sala.fase_iniciada_em = timezone.now()
        sala.save(update_fields=["status", "fase_iniciada_em"])
    return sala


@transaction.atomic
def avancar_apos_reveal(sala: SalaCompeticao) -> SalaCompeticao:
    sala = SalaCompeticao.objects.select_for_update().get(pk=sala.pk)
    if sala.status != SalaCompeticao.Status.REVEAL:
        return sala

    total = sala.itens.count()
    if sala.indice_atual + 1 >= total:
        # Garante totais sincronizados no fim
        for p in sala.participantes.filter(ativo=True):
            sincronizar_totais(p)
        sala.status = SalaCompeticao.Status.FINISHED
        sala.finalizado_em = timezone.now()
        sala.save(update_fields=["status", "finalizado_em"])
    else:
        sala.indice_atual += 1
        sala.status = SalaCompeticao.Status.QUESTION
        sala.fase_iniciada_em = timezone.now()
        sala.save(update_fields=["indice_atual", "status", "fase_iniciada_em"])
    return sala


def montar_estado(sala: SalaCompeticao, participante: Participante | None) -> dict:
    sala = promover_para_reveal_se_necessario(sala)
    sala.refresh_from_db()
    if participante is not None:
        participante.refresh_from_db()

    item = item_atual(sala)
    ranking = ranking_payload(sala, item if sala.status != SalaCompeticao.Status.LOBBY else None)

    me = None
    minha_resposta = None
    streak = 0
    if participante:
        streak = obter_streak(participante, sala.indice_atual)
        me = {
            "id": participante.id,
            "apelido": participante.apelido,
            "is_host": participante.is_host,
            "pontos": participante.pontos,
            "acertos": participante.acertos,
            "streak": streak,
            "token": str(participante.token),
        }

    questao = None
    if item and sala.status in (
        SalaCompeticao.Status.QUESTION,
        SalaCompeticao.Status.REVEAL,
        SalaCompeticao.Status.FINISHED,
    ):
        reveal = sala.status in (
            SalaCompeticao.Status.REVEAL,
            SalaCompeticao.Status.FINISHED,
        )
        questao = questao_payload(item, reveal=reveal)
        if participante:
            resp = RespostaCompeticao.objects.filter(
                sala_questao=item, participante=participante
            ).first()
            if resp:
                minha_resposta = {
                    "letra": resp.letra,
                    "correta": resp.correta if reveal else None,
                    "pontos": resp.pontos if reveal else None,
                    "tempo_ms": resp.tempo_ms,
                    "respondida": True,
                }

    vencedor = ranking[0] if sala.status == SalaCompeticao.Status.FINISHED and ranking else None

    return {
        "id": sala.id,
        "codigo": sala.codigo,
        "modo": sala.modo,
        "status": sala.status,
        "quantidade": sala.quantidade,
        "tempo_por_questao": sala.tempo_por_questao,
        "filtros": sala.filtros,
        "indice_atual": sala.indice_atual,
        "segundos_restantes": segundos_restantes(sala),
        "fase_iniciada_em": sala.fase_iniciada_em.isoformat() if sala.fase_iniciada_em else None,
        "participantes": [
            {
                "id": p.id,
                "apelido": p.apelido,
                "is_host": p.is_host,
                "pontos": p.pontos,
                "acertos": p.acertos,
            }
            for p in sala.participantes.filter(ativo=True).order_by("conectado_em")
        ],
        "ranking": ranking,
        "questao": questao,
        "me": me,
        "minha_resposta": minha_resposta,
        "vencedor": vencedor,
        "pontuacao": {
            "max_por_questao": PONTOS_MAX,
            "min_acerto": PONTOS_MIN_ACERTO,
            "descricao": "Acerto rápido: até 1000 pts. Streak: +100 a +500. Erro/timeout: 0.",
        },
        "respondidos": (
            RespostaCompeticao.objects.filter(sala_questao=item).count() if item else 0
        ),
        "total_ativos": sala.participantes.filter(ativo=True).count(),
        "expires_at": sala.expires_at.isoformat() if sala.expires_at else None,
    }


@transaction.atomic
def iniciar_sala(sala: SalaCompeticao) -> SalaCompeticao:
    sala = SalaCompeticao.objects.select_for_update().get(pk=sala.pk)
    if sala.status != SalaCompeticao.Status.LOBBY:
        raise ValueError("A sala já foi iniciada.")

    ativos = sala.participantes.filter(ativo=True).count()
    if ativos < sala.min_jogadores:
        raise ValueError(f"É preciso pelo menos {sala.min_jogadores} jogadores.")
    if sala.modo == SalaCompeticao.Modo.X1 and ativos != 2:
        raise ValueError("No modo 1x1 é preciso exatamente 2 jogadores.")

    qtd = max(3, min(int(sala.quantidade or 10), 50))
    selected = filtrar_questoes(sala.filtros or {}, qtd)
    if len(selected) < min(3, qtd):
        raise ValueError(
            f"Poucas questões no filtro ({len(selected)}). Ajuste temas ou quantidade."
        )

    SalaQuestao.objects.filter(sala=sala).delete()
    for i, q in enumerate(selected):
        SalaQuestao.objects.create(sala=sala, questao=q, ordem=i)

    # Zera placar ao iniciar
    sala.participantes.filter(ativo=True).update(pontos=0, acertos=0, tempo_total_ms=0)

    sala.quantidade = len(selected)
    sala.indice_atual = 0
    sala.status = SalaCompeticao.Status.QUESTION
    sala.fase_iniciada_em = timezone.now()
    sala.iniciado_em = timezone.now()
    sala.save(
        update_fields=[
            "quantidade",
            "indice_atual",
            "status",
            "fase_iniciada_em",
            "iniciado_em",
        ]
    )
    return sala


@transaction.atomic
def registrar_resposta(
    sala: SalaCompeticao,
    participante: Participante,
    letra: str,
) -> RespostaCompeticao:
    """Registra resposta e soma pontos. Não promove antes — evita perder resposta no fim do timer."""
    sala = SalaCompeticao.objects.select_for_update().get(pk=sala.pk)
    participante = Participante.objects.select_for_update().get(pk=participante.pk)

    if sala.status != SalaCompeticao.Status.QUESTION:
        raise ValueError("Não há questão aberta para responder.")

    item = item_atual(sala)
    if not item:
        raise ValueError("Questão não encontrada.")

    if not sala.fase_iniciada_em:
        raise ValueError("Fase inválida.")

    tempo_ms = int((timezone.now() - sala.fase_iniciada_em).total_seconds() * 1000)
    limite_ms = sala.tempo_por_questao * 1000
    # Tolerância de rede: 2s além do limite
    if tempo_ms > limite_ms + 2000:
        promover_para_reveal_se_necessario(sala)
        raise ValueError("Tempo esgotado.")

    tempo_ms_cap = min(max(tempo_ms, 0), limite_ms)

    existing = RespostaCompeticao.objects.filter(
        sala_questao=item, participante=participante
    ).first()
    if existing:
        # Já respondeu (ou timeout placeholder) — não altera
        return existing

    letra = (letra or "").upper()[:1]
    correta = letra_esta_correta(item.questao, letra)
    streak = obter_streak(participante, item.ordem)
    pontos, _base, _bonus = calcular_pontos(
        correta, tempo_ms_cap, sala.tempo_por_questao, streak
    )

    resp = RespostaCompeticao.objects.create(
        sala_questao=item,
        participante=participante,
        letra=letra,
        correta=correta,
        pontos=pontos,
        tempo_ms=tempo_ms_cap if letra else limite_ms,
    )
    sincronizar_totais(participante)

    # Fecha a rodada se todos responderam ou o tempo acabou
    promover_para_reveal_se_necessario(sala)
    return resp

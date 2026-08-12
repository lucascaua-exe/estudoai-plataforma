"""Regras de negócio da competição (timer, pontuação, transições)."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.questions.models import Questao
from apps.questions.text_cleanup import clean_alternativa, clean_enunciado

from .models import Participante, RespostaCompeticao, SalaCompeticao, SalaQuestao


def calcular_pontos(correta: bool, tempo_ms: int, tempo_limite_s: int) -> int:
    if not correta:
        return 0
    limite_ms = max(tempo_limite_s, 1) * 1000
    # Kahoot-like: até 1000 pts; quanto mais rápido, mais pontos (mín. ~500 se no limite)
    ratio = min(max(tempo_ms, 0) / (limite_ms * 2), 0.5)
    return max(500, int(round(1000 * (1 - ratio))))


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


def ranking_payload(sala: SalaCompeticao) -> list[dict]:
    parts = list(
        sala.participantes.filter(ativo=True).order_by(
            "-pontos", "tempo_total_ms", "conectado_em"
        )
    )
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
            row["correta"] = bool(a.correta or (q.gabarito and a.letra == q.gabarito))
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
        data["gabarito"] = q.gabarito
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

    ativos = sala.participantes.filter(ativo=True).count()
    respondidos = RespostaCompeticao.objects.filter(sala_questao=item).count()
    tempo_esgotou = segundos_restantes(sala) == 0

    if tempo_esgotou or (ativos > 0 and respondidos >= ativos):
        # Timeout: cria respostas vazias para quem não respondeu
        if tempo_esgotou:
            ja = set(
                RespostaCompeticao.objects.filter(sala_questao=item).values_list(
                    "participante_id", flat=True
                )
            )
            for p in sala.participantes.filter(ativo=True):
                if p.id not in ja:
                    RespostaCompeticao.objects.create(
                        sala_questao=item,
                        participante=p,
                        letra="",
                        correta=False,
                        pontos=0,
                        tempo_ms=sala.tempo_por_questao * 1000,
                    )
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

    ranking = ranking_payload(sala)
    me = None
    minha_resposta = None
    if participante:
        me = {
            "id": participante.id,
            "apelido": participante.apelido,
            "is_host": participante.is_host,
            "pontos": participante.pontos,
            "token": str(participante.token),
        }

    questao = None
    item = item_atual(sala)
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

    qtd = max(5, min(int(sala.quantidade or 10), 30))
    selected = filtrar_questoes(sala.filtros or {}, qtd)
    if len(selected) < min(5, qtd):
        raise ValueError(
            f"Poucas questões no filtro ({len(selected)}). Ajuste temas ou quantidade."
        )

    SalaQuestao.objects.filter(sala=sala).delete()
    for i, q in enumerate(selected):
        SalaQuestao.objects.create(sala=sala, questao=q, ordem=i)

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
    sala = promover_para_reveal_se_necessario(sala)
    sala = SalaCompeticao.objects.select_for_update().get(pk=sala.pk)

    if sala.status != SalaCompeticao.Status.QUESTION:
        raise ValueError("Não há questão aberta para responder.")

    item = item_atual(sala)
    if not item:
        raise ValueError("Questão não encontrada.")

    existing = RespostaCompeticao.objects.filter(
        sala_questao=item, participante=participante
    ).first()
    if existing:
        return existing  # idempotente

    if not sala.fase_iniciada_em:
        raise ValueError("Fase inválida.")

    tempo_ms = int((timezone.now() - sala.fase_iniciada_em).total_seconds() * 1000)
    limite_ms = sala.tempo_por_questao * 1000
    if tempo_ms > limite_ms + 1500:  # pequena tolerância de rede
        raise ValueError("Tempo esgotado.")

    letra = (letra or "").upper()[:1]
    gab = (item.questao.gabarito or "").upper()
    correta = bool(letra and letra == gab)
    if not correta:
        alt = item.questao.alternativas.filter(letra=letra, correta=True).first()
        correta = bool(alt)

    pontos = calcular_pontos(correta, tempo_ms, sala.tempo_por_questao)
    resp = RespostaCompeticao.objects.create(
        sala_questao=item,
        participante=participante,
        letra=letra,
        correta=correta,
        pontos=pontos,
        tempo_ms=min(tempo_ms, limite_ms),
    )

    if pontos:
        participante.pontos += pontos
        participante.acertos += 1
    participante.tempo_total_ms += resp.tempo_ms
    participante.save(update_fields=["pontos", "acertos", "tempo_total_ms", "ultimo_ping"])

    # Se todos responderam, promove
    promover_para_reveal_se_necessario(sala)
    return resp

from django.db.models import Count
from django_filters import rest_framework as filters
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.performance.services import update_dominio_for_assunto, update_streak_and_points

from .models import Alternativa, Questao, QuestaoUsuarioMeta, Tentativa
from .serializers import AnswerSerializer, QuestaoDetailSerializer, QuestaoListSerializer


def _acertadas_ids(user):
    return (
        Tentativa.objects.filter(user=user, correta=True)
        .values_list("questao_id", flat=True)
        .distinct()
    )


class QuestaoFilter(filters.FilterSet):
    disciplina = filters.NumberFilter(field_name="disciplina_id")
    assunto = filters.NumberFilter(field_name="assunto_id")
    assuntos = filters.BaseInFilter(field_name="assunto_id", lookup_expr="in")
    excluir_assuntos = filters.CharFilter(method="filter_excluir_assuntos")
    dificuldade = filters.CharFilter(field_name="dificuldade")
    origem = filters.CharFilter(field_name="origem")
    banca = filters.CharFilter(field_name="banca", lookup_expr="iexact")
    status = filters.CharFilter(method="filter_status")
    excluir_acertadas = filters.BooleanFilter(method="filter_excluir_acertadas")

    class Meta:
        model = Questao
        fields = ["disciplina", "assunto", "dificuldade", "origem", "banca"]

    def filter_excluir_assuntos(self, queryset, name, value):
        if not value:
            return queryset
        ids = []
        for part in str(value).split(","):
            part = part.strip()
            if part.isdigit():
                ids.append(int(part))
        if not ids:
            return queryset
        return queryset.exclude(assunto_id__in=ids)

    def filter_excluir_acertadas(self, queryset, name, value):
        if not value:
            return queryset
        user = self.request.user
        if not user.is_authenticated:
            return queryset
        return queryset.exclude(id__in=_acertadas_ids(user))

    def filter_status(self, queryset, name, value):
        user = self.request.user
        answered_ids = Tentativa.objects.filter(user=user).values_list(
            "questao_id", flat=True
        )
        wrong_ids = Tentativa.objects.filter(user=user, correta=False).values_list(
            "questao_id", flat=True
        )
        fav_ids = QuestaoUsuarioMeta.objects.filter(user=user, favorita=True).values_list(
            "questao_id", flat=True
        )
        rev_ids = QuestaoUsuarioMeta.objects.filter(
            user=user, marcar_revisao=True
        ).values_list("questao_id", flat=True)
        acertadas = _acertadas_ids(user)

        if value == "respondidas":
            return queryset.filter(id__in=answered_ids)
        if value == "nao_respondidas":
            return queryset.exclude(id__in=answered_ids)
        if value in ("nao_acertadas", "pendentes"):
            # Não respondidas + erradas (nunca acertou)
            return queryset.exclude(id__in=acertadas)
        if value == "acertadas":
            return queryset.filter(id__in=acertadas)
        if value == "erradas":
            return queryset.filter(id__in=wrong_ids).exclude(id__in=acertadas)
        if value == "favoritas":
            return queryset.filter(id__in=fav_ids)
        if value == "revisao":
            return queryset.filter(id__in=rev_ids)
        return queryset


class QuestaoViewSet(viewsets.ReadOnlyModelViewSet):
    filterset_class = QuestaoFilter
    search_fields = ["enunciado", "assunto__nome", "disciplina__nome", "banca"]
    ordering_fields = ["id", "numero_origem", "dificuldade"]

    def get_queryset(self):
        return Questao.objects.select_related(
            "disciplina", "assunto", "documento"
        ).prefetch_related("alternativas")

    def filter_queryset(self, queryset):
        return super().filter_queryset(queryset)

    def get_serializer_class(self):
        if self.action == "retrieve":
            return QuestaoDetailSerializer
        return QuestaoListSerializer

    @action(detail=False, methods=["get"])
    def next(self, request):
        """Próxima questão do filtro atual (pula acertos por padrão)."""
        after = request.query_params.get("after")
        qs = self.filter_queryset(self.get_queryset()).order_by("id")
        if after and str(after).isdigit():
            nxt = qs.filter(id__gt=int(after)).first()
        else:
            nxt = qs.first()
        if not nxt:
            return Response({"id": None, "detail": "Não há próxima questão com esses filtros."})
        return Response({"id": nxt.id})

    @action(detail=False, methods=["get"])
    def bancas(self, request):
        values = (
            Questao.objects.exclude(banca="")
            .values_list("banca", flat=True)
            .distinct()
            .order_by("banca")
        )
        return Response(list(values))

    @action(detail=True, methods=["post"])
    def answer(self, request, pk=None):
        questao = self.get_object()
        serializer = AnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if data.get("alternativa_id"):
            alt = Alternativa.objects.filter(id=data["alternativa_id"], questao=questao).first()
        else:
            alt = Alternativa.objects.filter(
                questao=questao, letra=data["letra"].upper()
            ).first()
        if not alt:
            return Response({"detail": "Alternativa inválida."}, status=400)

        correta = alt.correta or (questao.gabarito and alt.letra == questao.gabarito)
        tempo = data.get("tempo_segundos") or 0
        tentativa = Tentativa.objects.create(
            user=request.user,
            questao=questao,
            alternativa=alt,
            letra_escolhida=alt.letra,
            correta=correta,
            tempo_segundos=tempo,
        )
        update_streak_and_points(request.user, correta, tempo)
        if questao.assunto_id:
            update_dominio_for_assunto(request.user, questao.assunto_id)

        alts_payload = [
            {
                "id": a.id,
                "letra": a.letra,
                "texto": a.texto,
                "correta": a.correta or a.letra == questao.gabarito,
            }
            for a in questao.alternativas.all()
        ]

        from apps.ai.rag import explain_question_answer
        from apps.questions.text_cleanup import explicacao_precisa_reescrever

        precisa_reescrever = explicacao_precisa_reescrever(questao.explicacao or "")
        explicacao = explain_question_answer(
            enunciado=questao.enunciado,
            alternativas=alts_payload,
            gabarito=questao.gabarito or "",
            letra_escolhida=alt.letra,
            correta=bool(correta),
            explicacao_existente=questao.explicacao or "",
            disciplina=questao.disciplina.nome if questao.disciplina else "",
            assunto=questao.assunto.nome if questao.assunto else "",
            force_rewrite=precisa_reescrever,
        )
        # Persiste resolução gerada/reescrita pela IA
        if explicacao and (
            precisa_reescrever
            or not questao.explicacao
            or len(questao.explicacao) < 80
            or explicacao != questao.explicacao
        ):
            questao.explicacao = explicacao
            questao.save(update_fields=["explicacao"])

        # Próxima com mesmos filtros da sessão
        next_id = None
        try:
            qs = self.filter_queryset(self.get_queryset())
            # Garante exclusão de acertos quando o cliente pediu status pendente
            filter_params = request.data.get("filters") if isinstance(request.data, dict) else None
            if isinstance(filter_params, dict):
                status_f = (filter_params.get("status") or "").strip()
                if status_f in ("", "nao_acertadas", "pendentes", "nao_respondidas"):
                    qs = qs.exclude(id__in=_acertadas_ids(request.user))
                if filter_params.get("disciplina"):
                    qs = qs.filter(disciplina_id=filter_params["disciplina"])
                if filter_params.get("assunto"):
                    qs = qs.filter(assunto_id=filter_params["assunto"])
                assuntos = filter_params.get("assuntos")
                if assuntos:
                    if isinstance(assuntos, str):
                        assuntos = [x for x in assuntos.split(",") if x.strip().isdigit()]
                    qs = qs.filter(assunto_id__in=assuntos)
                excl = filter_params.get("excluir_assuntos")
                if excl:
                    if isinstance(excl, str):
                        excl = [int(x) for x in excl.split(",") if x.strip().isdigit()]
                    qs = qs.exclude(assunto_id__in=excl)
                if filter_params.get("dificuldade"):
                    qs = qs.filter(dificuldade=filter_params["dificuldade"])
                if filter_params.get("banca"):
                    qs = qs.filter(banca__iexact=filter_params["banca"])
            else:
                qs = qs.exclude(id__in=_acertadas_ids(request.user))
            nxt = qs.filter(id__gt=questao.id).order_by("id").first()
            next_id = nxt.id if nxt else None
        except Exception:
            next_id = None

        return Response(
            {
                "correta": correta,
                "letra_escolhida": alt.letra,
                "gabarito": questao.gabarito,
                "explicacao": explicacao,
                "alternativas": alts_payload,
                "fonte": {
                    "documento": questao.documento.nome if questao.documento else None,
                    "pagina": questao.pagina,
                    "disciplina": questao.disciplina.nome if questao.disciplina else None,
                    "assunto": questao.assunto.nome if questao.assunto else None,
                    "origem": questao.origem,
                    "banca": questao.banca or None,
                },
                "tentativa_id": tentativa.id,
                "proxima_id": next_id,
            }
        )

    @action(detail=True, methods=["post"])
    def favorite(self, request, pk=None):
        questao = self.get_object()
        meta, _ = QuestaoUsuarioMeta.objects.get_or_create(
            user=request.user, questao=questao
        )
        meta.favorita = not meta.favorita
        meta.save()
        return Response({"favorita": meta.favorita})

    @action(detail=True, methods=["post"], url_path="mark-review")
    def mark_review(self, request, pk=None):
        questao = self.get_object()
        meta, _ = QuestaoUsuarioMeta.objects.get_or_create(
            user=request.user, questao=questao
        )
        meta.marcar_revisao = not meta.marcar_revisao
        meta.save()
        return Response({"marcar_revisao": meta.marcar_revisao})


class MeusErrosView(APIView):
    def get(self, request):
        disciplina = request.query_params.get("disciplina")
        assunto = request.query_params.get("assunto")

        wrong = (
            Tentativa.objects.filter(user=request.user, correta=False)
            .values("questao_id")
            .annotate(vezes=Count("id"))
            .order_by("-vezes")
        )
        ordem = request.query_params.get("ordem", "recorrentes")
        if ordem == "recentes":
            wrong = wrong.order_by("-vezes")  # still by count; refine below

        qids = [w["questao_id"] for w in wrong]
        vezes_map = {w["questao_id"]: w["vezes"] for w in wrong}
        # Não listar questões que o usuário já acertou depois
        acertadas = set(_acertadas_ids(request.user))
        qids = [qid for qid in qids if qid not in acertadas]
        qs = Questao.objects.filter(id__in=qids).select_related(
            "disciplina", "assunto", "documento"
        )
        if disciplina:
            qs = qs.filter(disciplina_id=disciplina)
        if assunto:
            qs = qs.filter(assunto_id=assunto)

        data = QuestaoListSerializer(qs, many=True, context={"request": request}).data
        for item in data:
            item["vezes_erro"] = vezes_map.get(item["id"], 0)
            item["ponto_atencao"] = item["vezes_erro"] >= 3
        if ordem == "recorrentes":
            data.sort(key=lambda x: x["vezes_erro"], reverse=True)
        return Response(data)

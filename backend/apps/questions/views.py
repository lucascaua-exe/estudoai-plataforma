from django.db.models import Count, Q
from django_filters import rest_framework as filters
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.performance.services import update_dominio_for_assunto, update_streak_and_points

from .models import Alternativa, Questao, QuestaoUsuarioMeta, Tentativa
from .serializers import AnswerSerializer, QuestaoDetailSerializer, QuestaoListSerializer


class QuestaoFilter(filters.FilterSet):
    disciplina = filters.NumberFilter(field_name="disciplina_id")
    assunto = filters.NumberFilter(field_name="assunto_id")
    dificuldade = filters.CharFilter(field_name="dificuldade")
    origem = filters.CharFilter(field_name="origem")
    status = filters.CharFilter(method="filter_status")

    class Meta:
        model = Questao
        fields = ["disciplina", "assunto", "dificuldade", "origem"]

    def filter_status(self, queryset, name, value):
        user = self.request.user
        answered_ids = Tentativa.objects.filter(user=user).values_list("questao_id", flat=True)
        wrong_ids = Tentativa.objects.filter(user=user, correta=False).values_list(
            "questao_id", flat=True
        )
        fav_ids = QuestaoUsuarioMeta.objects.filter(user=user, favorita=True).values_list(
            "questao_id", flat=True
        )
        rev_ids = QuestaoUsuarioMeta.objects.filter(
            user=user, marcar_revisao=True
        ).values_list("questao_id", flat=True)

        if value == "respondidas":
            return queryset.filter(id__in=answered_ids)
        if value == "nao_respondidas":
            return queryset.exclude(id__in=answered_ids)
        if value == "erradas":
            return queryset.filter(id__in=wrong_ids)
        if value == "favoritas":
            return queryset.filter(id__in=fav_ids)
        if value == "revisao":
            return queryset.filter(id__in=rev_ids)
        return queryset


class QuestaoViewSet(viewsets.ReadOnlyModelViewSet):
    filterset_class = QuestaoFilter
    search_fields = ["enunciado", "assunto__nome", "disciplina__nome"]
    ordering_fields = ["id", "numero_origem", "dificuldade"]

    def get_queryset(self):
        return Questao.objects.select_related(
            "disciplina", "assunto", "documento"
        ).prefetch_related("alternativas")

    def get_serializer_class(self):
        if self.action == "retrieve":
            return QuestaoDetailSerializer
        return QuestaoListSerializer

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

        explicacao = explain_question_answer(
            enunciado=questao.enunciado,
            alternativas=alts_payload,
            gabarito=questao.gabarito or "",
            letra_escolhida=alt.letra,
            correta=bool(correta),
            explicacao_existente=questao.explicacao or "",
            disciplina=questao.disciplina.nome if questao.disciplina else "",
            assunto=questao.assunto.nome if questao.assunto else "",
        )
        # Persiste explicação gerada se a questão não tinha
        if explicacao and (not questao.explicacao or len(questao.explicacao) < 80):
            questao.explicacao = explicacao
            questao.save(update_fields=["explicacao"])

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
                },
                "tentativa_id": tentativa.id,
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

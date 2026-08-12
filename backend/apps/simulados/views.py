from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import serializers

from apps.questions.models import Alternativa, Questao, Tentativa
from apps.questions.serializers import QuestaoDetailSerializer
from apps.performance.services import update_dominio_for_assunto, update_streak_and_points

from .models import Simulado, SimuladoQuestao


class SimuladoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Simulado
        fields = [
            "id",
            "titulo",
            "status",
            "quantidade",
            "filtros",
            "iniciado_em",
            "finalizado_em",
            "tempo_usado_segundos",
            "total_acertos",
            "total_erros",
            "percentual",
            "resultado",
            "created_at",
        ]
        read_only_fields = [
            "status",
            "iniciado_em",
            "finalizado_em",
            "tempo_usado_segundos",
            "total_acertos",
            "total_erros",
            "percentual",
            "resultado",
            "created_at",
        ]


class SimuladoViewSet(viewsets.ModelViewSet):
    serializer_class = SimuladoSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return Simulado.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        simulado = self.get_object()
        if simulado.status == Simulado.Status.FINALIZADO:
            return Response({"detail": "Simulado já finalizado."}, status=400)

        filtros = {**(simulado.filtros or {}), **(request.data or {})}
        qs = Questao.objects.all()
        disciplinas = filtros.get("disciplinas") or filtros.get("disciplina_ids")
        assuntos = filtros.get("assuntos") or filtros.get("assunto_ids")
        dificuldade = filtros.get("dificuldade")
        modo = filtros.get("modo", "geral")

        if disciplinas:
            qs = qs.filter(disciplina_id__in=disciplinas)
        if assuntos:
            qs = qs.filter(assunto_id__in=assuntos)
        if dificuldade:
            qs = qs.filter(dificuldade=dificuldade)

        answered = Tentativa.objects.filter(user=request.user).values_list(
            "questao_id", flat=True
        )
        wrong = Tentativa.objects.filter(user=request.user, correta=False).values_list(
            "questao_id", flat=True
        )

        if modo == "ineditas" or filtros.get("apenas_nao_respondidas"):
            qs = qs.exclude(id__in=answered)
        elif modo == "erradas" or filtros.get("apenas_erradas"):
            qs = qs.filter(id__in=wrong)

        quantidade = int(filtros.get("quantidade") or simulado.quantidade or 20)
        selected = list(qs.order_by("?")[:quantidade])
        if not selected:
            return Response(
                {"detail": "Nenhuma questão encontrada com os filtros informados."},
                status=400,
            )

        SimuladoQuestao.objects.filter(simulado=simulado).delete()
        for i, q in enumerate(selected):
            SimuladoQuestao.objects.create(simulado=simulado, questao=q, ordem=i)

        simulado.status = Simulado.Status.EM_ANDAMENTO
        simulado.iniciado_em = timezone.now()
        simulado.quantidade = len(selected)
        simulado.filtros = filtros
        simulado.save()

        items = []
        for item in simulado.itens.select_related(
            "questao", "questao__disciplina", "questao__assunto"
        ).prefetch_related("questao__alternativas"):
            qdata = QuestaoDetailSerializer(
                item.questao, context={"request": request}
            ).data
            # Hide gabarito during exam
            qdata.pop("explicacao", None)
            qdata["gabarito"] = None
            for alt in qdata.get("alternativas", []):
                alt.pop("correta", None)
            items.append(
                {
                    "ordem": item.ordem,
                    "questao": qdata,
                    "letra_escolhida": item.letra_escolhida,
                }
            )
        return Response({"simulado": SimuladoSerializer(simulado).data, "itens": items})

    @action(detail=True, methods=["post"])
    def answer(self, request, pk=None):
        simulado = self.get_object()
        questao_id = request.data.get("questao_id")
        letra = (request.data.get("letra") or "").upper()
        item = SimuladoQuestao.objects.filter(
            simulado=simulado, questao_id=questao_id
        ).first()
        if not item:
            return Response({"detail": "Questão não pertence ao simulado."}, status=400)
        item.letra_escolhida = letra
        item.respondida_em = timezone.now()
        item.save()
        return Response({"ok": True, "letra_escolhida": letra})

    @action(detail=True, methods=["post"])
    def finish(self, request, pk=None):
        simulado = self.get_object()
        tempo = int(request.data.get("tempo_usado_segundos") or 0)
        acertos = 0
        erros = 0
        por_disc = {}
        por_ass = {}

        for item in simulado.itens.select_related(
            "questao", "questao__disciplina", "questao__assunto"
        ):
            q = item.questao
            correta = bool(item.letra_escolhida) and item.letra_escolhida == q.gabarito
            item.correta = correta if item.letra_escolhida else False
            item.save(update_fields=["correta"])
            if item.letra_escolhida:
                if correta:
                    acertos += 1
                else:
                    erros += 1
                Tentativa.objects.create(
                    user=request.user,
                    questao=q,
                    letra_escolhida=item.letra_escolhida,
                    correta=correta,
                    tempo_segundos=0,
                )
                if q.assunto_id:
                    update_dominio_for_assunto(request.user, q.assunto_id)

            dname = q.disciplina.nome if q.disciplina else "Outros"
            aname = q.assunto.nome if q.assunto else "Outros"
            por_disc.setdefault(dname, {"total": 0, "acertos": 0})
            por_ass.setdefault(aname, {"total": 0, "acertos": 0, "disciplina": dname})
            if item.letra_escolhida:
                por_disc[dname]["total"] += 1
                por_ass[aname]["total"] += 1
                if correta:
                    por_disc[dname]["acertos"] += 1
                    por_ass[aname]["acertos"] += 1

        total = acertos + erros
        percentual = round(acertos / total * 100, 1) if total else 0
        fortes = sorted(
            [
                {"nome": k, **v, "percentual": round(v["acertos"] / v["total"] * 100, 1) if v["total"] else 0}
                for k, v in por_disc.items()
                if v["total"]
            ],
            key=lambda x: x["percentual"],
            reverse=True,
        )
        fracos = list(reversed(fortes))

        resultado = {
            "nota": percentual,
            "percentual": percentual,
            "total": total,
            "acertos": acertos,
            "erros": erros,
            "tempo_usado_segundos": tempo,
            "por_disciplina": fortes,
            "por_assunto": [
                {
                    "nome": k,
                    **v,
                    "percentual": round(v["acertos"] / v["total"] * 100, 1) if v["total"] else 0,
                }
                for k, v in por_ass.items()
                if v["total"]
            ],
            "pontos_fortes": [f["nome"] for f in fortes[:3] if f["percentual"] >= 70],
            "pontos_fracos": [f["nome"] for f in fracos[:3] if f["percentual"] < 70],
            "recomendacoes": [
                f"Revise {f['nome']} ({f['percentual']}%)"
                for f in fracos
                if f["percentual"] < 70
            ][:5],
        }

        simulado.status = Simulado.Status.FINALIZADO
        simulado.finalizado_em = timezone.now()
        simulado.tempo_usado_segundos = tempo
        simulado.total_acertos = acertos
        simulado.total_erros = erros
        simulado.percentual = percentual
        simulado.resultado = resultado
        simulado.save()
        update_streak_and_points(request.user, acertos > erros, tempo)
        return Response(resultado)

    @action(detail=True, methods=["get"])
    def result(self, request, pk=None):
        simulado = self.get_object()
        return Response(
            {
                "simulado": SimuladoSerializer(simulado).data,
                "resultado": simulado.resultado,
            }
        )

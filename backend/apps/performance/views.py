from collections import defaultdict
from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Disciplina
from apps.performance.models import DominioAssunto, SessaoEstudo
from apps.performance.services import dashboard_stats, update_dominio_for_assunto
from apps.questions.models import Questao, Tentativa
from apps.questions.serializers import QuestaoListSerializer


class DashboardView(APIView):
    def get(self, request):
        return Response(dashboard_stats(request.user))


class KnowledgeMapView(APIView):
    def get(self, request):
        # Recalculate lightly for assuntos with attempts
        assunto_ids = (
            Tentativa.objects.filter(user=request.user)
            .exclude(questao__assunto_id=None)
            .values_list("questao__assunto_id", flat=True)
            .distinct()
        )
        for aid in assunto_ids:
            update_dominio_for_assunto(request.user, aid)

        disciplinas = Disciplina.objects.prefetch_related("assuntos").all()
        dominios = {
            d.assunto_id: d
            for d in DominioAssunto.objects.filter(user=request.user).select_related("assunto")
        }
        result = []
        for disc in disciplinas:
            assuntos_data = []
            for ass in disc.assuntos.all():
                d = dominios.get(ass.id)
                assuntos_data.append(
                    {
                        "id": ass.id,
                        "nome": ass.nome,
                        "nivel": d.nivel if d else "dados_insuficientes",
                        "percentual_acerto": d.percentual_acerto if d else 0,
                        "total_respostas": d.total_respostas if d else 0,
                        "dominio_declarado": d.dominio_declarado if d else False,
                        "dominio_comprovado": d.dominio_comprovado if d else False,
                    }
                )
            if assuntos_data:
                result.append(
                    {"id": disc.id, "nome": disc.nome, "assuntos": assuntos_data}
                )
        return Response(result)


class MasteryView(APIView):
    def get(self, request):
        qs = DominioAssunto.objects.filter(user=request.user).filter(
            dominio_comprovado=True
        ) | DominioAssunto.objects.filter(user=request.user, dominio_declarado=True)
        qs = qs.select_related("assunto", "assunto__disciplina").distinct()
        data = [
            {
                "id": d.id,
                "disciplina": d.assunto.disciplina.nome,
                "assunto": d.assunto.nome,
                "assunto_id": d.assunto_id,
                "percentual_acerto": d.percentual_acerto,
                "total_questoes": d.total_respostas,
                "ultima_revisao": d.ultima_revisao,
                "data_confirmacao": d.data_confirmacao,
                "dominio_declarado": d.dominio_declarado,
                "dominio_comprovado": d.dominio_comprovado,
                "nivel": d.nivel,
            }
            for d in qs
        ]
        return Response(data)

    def post(self, request):
        """Marcar domínio declarado."""
        assunto_id = request.data.get("assunto_id")
        if not assunto_id:
            return Response({"detail": "assunto_id obrigatório"}, status=400)
        d = update_dominio_for_assunto(request.user, int(assunto_id))
        if not d:
            d, _ = DominioAssunto.objects.get_or_create(
                user=request.user, assunto_id=assunto_id
            )
        d.dominio_declarado = True
        d.save(update_fields=["dominio_declarado"])
        return Response({"detail": "Domínio declarado.", "id": d.id})


class ReviewRecommendedView(APIView):
    def get(self, request):
        dominios = (
            DominioAssunto.objects.filter(user=request.user)
            .exclude(nivel=DominioAssunto.Nivel.DOMINIO_CONFIRMADO)
            .select_related("assunto", "assunto__disciplina")
            .order_by("percentual_acerto", "-total_respostas")
        )
        alta, media, baixa = [], [], []
        for d in dominios:
            item = {
                "assunto_id": d.assunto_id,
                "assunto": d.assunto.nome,
                "disciplina": d.assunto.disciplina.nome,
                "percentual": d.percentual_acerto,
                "total": d.total_respostas,
                "nivel": d.nivel,
            }
            if d.nivel in (
                DominioAssunto.Nivel.PRECISA_ATENCAO,
                DominioAssunto.Nivel.EM_AVALIACAO,
            ) or d.percentual_acerto < 70:
                alta.append(item)
            elif d.percentual_acerto < 85:
                media.append(item)
            else:
                baixa.append(item)

        # Also recent wrong questions without dominio
        recent_wrong = (
            Tentativa.objects.filter(user=request.user, correta=False)
            .order_by("-created_at")[:20]
        )
        return Response(
            {
                "prioridade_alta": alta[:15],
                "prioridade_media": media[:15],
                "prioridade_baixa": baixa[:15],
                "erros_recentes": [
                    {
                        "questao_id": t.questao_id,
                        "assunto": t.questao.assunto.nome if t.questao.assunto else None,
                    }
                    for t in recent_wrong.select_related("questao__assunto")
                ],
            }
        )


class ReviewStartView(APIView):
    def post(self, request):
        per_assunto = int(request.data.get("por_assunto", 5))
        max_assuntos = int(request.data.get("max_assuntos", 4))
        dominios = (
            DominioAssunto.objects.filter(user=request.user)
            .exclude(nivel=DominioAssunto.Nivel.DOMINIO_CONFIRMADO)
            .order_by("percentual_acerto")[:max_assuntos]
        )
        plano = []
        questao_ids = []
        answered = set(
            Tentativa.objects.filter(user=request.user, correta=True).values_list(
                "questao_id", flat=True
            )
        )
        for d in dominios:
            qs = (
                Questao.objects.filter(assunto_id=d.assunto_id)
                .exclude(id__in=answered)
                .order_by("?")[:per_assunto]
            )
            ids = list(qs.values_list("id", flat=True))
            if len(ids) < per_assunto:
                extra = (
                    Questao.objects.filter(assunto_id=d.assunto_id)
                    .exclude(id__in=ids)
                    .order_by("?")[: per_assunto - len(ids)]
                )
                ids.extend(extra.values_list("id", flat=True))
            plano.append(
                {
                    "disciplina": d.assunto.disciplina.nome,
                    "assunto": d.assunto.nome,
                    "quantidade": len(ids),
                    "questao_ids": ids,
                }
            )
            questao_ids.extend(ids)

        if not questao_ids:
            # fallback: wrong questions
            wrong = (
                Tentativa.objects.filter(user=request.user, correta=False)
                .values_list("questao_id", flat=True)
                .distinct()[:20]
            )
            questao_ids = list(wrong)
            plano = [{"disciplina": "Erros", "assunto": "Questões erradas", "quantidade": len(questao_ids), "questao_ids": questao_ids}]

        sessao = SessaoEstudo.objects.create(
            user=request.user,
            tipo=SessaoEstudo.Tipo.REVISAO,
            questoes_ids=questao_ids,
            metadata={"plano": plano},
        )
        questoes = Questao.objects.filter(id__in=questao_ids).select_related(
            "disciplina", "assunto", "documento"
        )
        return Response(
            {
                "sessao_id": sessao.id,
                "plano": plano,
                "questoes": QuestaoListSerializer(
                    questoes, many=True, context={"request": request}
                ).data,
            }
        )


class EvolutionView(APIView):
    def get(self, request):
        periodo = request.query_params.get("periodo", "30")
        days = int(periodo)
        since = timezone.now() - timedelta(days=days)
        tentativas = Tentativa.objects.filter(user=request.user, created_at__gte=since)

        by_day = defaultdict(lambda: {"total": 0, "acertos": 0})
        for t in tentativas:
            key = t.created_at.date().isoformat()
            by_day[key]["total"] += 1
            if t.correta:
                by_day[key]["acertos"] += 1

        evolucao = []
        for day in sorted(by_day.keys()):
            d = by_day[day]
            pct = round(d["acertos"] / d["total"] * 100, 1) if d["total"] else 0
            evolucao.append(
                {
                    "data": day,
                    "total": d["total"],
                    "acertos": d["acertos"],
                    "percentual": pct,
                }
            )

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
            if not r["questao__disciplina__nome"]:
                continue
            total = r["total"]
            acertos = r["acertos"]
            por_disciplina.append(
                {
                    "id": r["questao__disciplina__id"],
                    "nome": r["questao__disciplina__nome"],
                    "total": total,
                    "acertos": acertos,
                    "percentual": round(acertos / total * 100, 1) if total else 0,
                }
            )

        return Response(
            {
                "evolucao_diaria": evolucao,
                "por_disciplina": por_disciplina,
            }
        )

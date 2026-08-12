import csv
import io

from django.db.models import Count, Q
from django.http import HttpResponse
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.performance.models import DominioAssunto
from apps.questions.models import Tentativa


class RelatorioGeralView(APIView):
    def get(self, request):
        user = request.user
        tentativas = Tentativa.objects.filter(user=user)
        total = tentativas.count()
        acertos = tentativas.filter(correta=True).count()
        erros = total - acertos
        percentual = round(acertos / total * 100, 1) if total else 0

        por_disc = (
            tentativas.values("questao__disciplina__nome")
            .annotate(
                total=Count("id"),
                acertos=Count("id", filter=Q(correta=True)),
            )
            .order_by("-total")
        )
        disciplinas = []
        for r in por_disc:
            nome = r["questao__disciplina__nome"] or "Sem disciplina"
            t = r["total"]
            a = r["acertos"]
            disciplinas.append(
                {
                    "nome": nome,
                    "total": t,
                    "acertos": a,
                    "erros": t - a,
                    "percentual": round(a / t * 100, 1) if t else 0,
                }
            )

        dominados = DominioAssunto.objects.filter(
            user=user, dominio_comprovado=True
        ).select_related("assunto", "assunto__disciplina")
        criticos = DominioAssunto.objects.filter(
            user=user, nivel=DominioAssunto.Nivel.PRECISA_ATENCAO
        ).select_related("assunto", "assunto__disciplina")

        mais_erradas = (
            tentativas.filter(correta=False)
            .values("questao_id", "questao__enunciado")
            .annotate(vezes=Count("id"))
            .order_by("-vezes")[:10]
        )

        data = {
            "total_questoes": total,
            "total_acertos": acertos,
            "total_erros": erros,
            "percentual_acerto": percentual,
            "disciplinas": disciplinas,
            "disciplinas_fortes": [d for d in disciplinas if d["percentual"] >= 80][:5],
            "disciplinas_fracas": [d for d in disciplinas if d["percentual"] < 70][:5],
            "assuntos_dominados": [
                {
                    "disciplina": d.assunto.disciplina.nome,
                    "assunto": d.assunto.nome,
                    "percentual": d.percentual_acerto,
                }
                for d in dominados[:20]
            ],
            "assuntos_criticos": [
                {
                    "disciplina": d.assunto.disciplina.nome,
                    "assunto": d.assunto.nome,
                    "percentual": d.percentual_acerto,
                }
                for d in criticos[:20]
            ],
            "questoes_mais_erradas": list(mais_erradas),
        }

        fmt = request.query_params.get("format")
        if fmt == "csv":
            buf = io.StringIO()
            writer = csv.writer(buf)
            writer.writerow(["Disciplina", "Total", "Acertos", "Erros", "Percentual"])
            for d in disciplinas:
                writer.writerow(
                    [d["nome"], d["total"], d["acertos"], d["erros"], d["percentual"]]
                )
            resp = HttpResponse(buf.getvalue(), content_type="text/csv")
            resp["Content-Disposition"] = 'attachment; filename="relatorio.csv"'
            return resp

        return Response(data)


class RelatorioDisciplinaView(APIView):
    def get(self, request, pk):
        tentativas = Tentativa.objects.filter(
            user=request.user, questao__disciplina_id=pk
        )
        total = tentativas.count()
        acertos = tentativas.filter(correta=True).count()
        por_assunto = (
            tentativas.values("questao__assunto__nome")
            .annotate(
                total=Count("id"),
                acertos=Count("id", filter=Q(correta=True)),
            )
            .order_by("-total")
        )
        return Response(
            {
                "disciplina_id": pk,
                "total": total,
                "acertos": acertos,
                "erros": total - acertos,
                "percentual": round(acertos / total * 100, 1) if total else 0,
                "assuntos": [
                    {
                        "nome": r["questao__assunto__nome"] or "—",
                        "total": r["total"],
                        "acertos": r["acertos"],
                        "percentual": round(r["acertos"] / r["total"] * 100, 1)
                        if r["total"]
                        else 0,
                    }
                    for r in por_assunto
                ],
            }
        )

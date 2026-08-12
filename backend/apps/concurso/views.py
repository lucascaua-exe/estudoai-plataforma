from rest_framework import serializers, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Assunto, Disciplina, Subassunto
from apps.concurso.models import Concurso, MetaEstudo
from apps.documents.models import Documento
from apps.gamification.models import Conquista, UserConquista
from apps.gamification.services import ensure_achievements
from apps.questions.models import Tentativa
from django.utils import timezone
from datetime import timedelta


class DisciplinaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Disciplina
        fields = ["id", "nome", "slug", "ordem"]


class AssuntoSerializer(serializers.ModelSerializer):
    disciplina_nome = serializers.CharField(source="disciplina.nome", read_only=True)

    class Meta:
        model = Assunto
        fields = ["id", "nome", "slug", "disciplina", "disciplina_nome", "ordem"]


class CatalogDisciplinasView(APIView):
    def get(self, request):
        disciplinas = Disciplina.objects.prefetch_related("assuntos").all()
        data = []
        for d in disciplinas:
            data.append(
                {
                    "id": d.id,
                    "nome": d.nome,
                    "assuntos": [
                        {"id": a.id, "nome": a.nome} for a in d.assuntos.all()
                    ],
                }
            )
        return Response(data)


class ConcursoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Concurso
        fields = [
            "id",
            "nome",
            "orgao",
            "cargo",
            "data_prova",
            "banca",
            "observacoes",
            "updated_at",
        ]


class ConcursoView(APIView):
    def get(self, request):
        obj, _ = Concurso.objects.get_or_create(
            user=request.user,
            defaults={
                "nome": "Prefeitura de Araguaína — TO 2026",
                "orgao": "Prefeitura Municipal de Araguaína",
                "cargo": "Analista de Tecnologia da Informação",
                "banca": "IMPAR",
            },
        )
        return Response(ConcursoSerializer(obj).data)

    def patch(self, request):
        obj, _ = Concurso.objects.get_or_create(user=request.user)
        ser = ConcursoSerializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)


class MetaSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetaEstudo
        fields = [
            "questoes_dia",
            "questoes_semana",
            "horas_estudo",
            "percentual_acerto_desejado",
            "disciplinas_prioritarias",
            "updated_at",
        ]


class GoalsView(APIView):
    def get(self, request):
        meta, _ = MetaEstudo.objects.get_or_create(user=request.user)
        hoje = timezone.localdate()
        inicio_semana = hoje - timedelta(days=hoje.weekday())
        q_hoje = Tentativa.objects.filter(user=request.user, created_at__date=hoje).count()
        q_semana = Tentativa.objects.filter(
            user=request.user, created_at__date__gte=inicio_semana
        ).count()
        data = MetaSerializer(meta).data
        data["progresso"] = {
            "questoes_hoje": q_hoje,
            "questoes_semana": q_semana,
            "meta_dia": meta.questoes_dia,
            "meta_semana": meta.questoes_semana,
        }
        return Response(data)

    def patch(self, request):
        meta, _ = MetaEstudo.objects.get_or_create(user=request.user)
        ser = MetaSerializer(meta, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(MetaSerializer(meta).data)


class DocumentsView(APIView):
    def get(self, request):
        docs = Documento.objects.all()
        return Response(
            [
                {
                    "id": d.id,
                    "nome": d.nome,
                    "tipo": d.tipo,
                    "status": d.status,
                    "progresso": d.progresso,
                    "total_paginas": d.total_paginas,
                    "questoes_extraidas": d.questoes_extraidas,
                    "mensagem_erro": d.mensagem_erro,
                }
                for d in docs
            ]
        )


class GamificationView(APIView):
    def get(self, request):
        ensure_achievements()
        conquistadas = set(
            UserConquista.objects.filter(user=request.user).values_list(
                "conquista_id", flat=True
            )
        )
        all_c = Conquista.objects.all()
        return Response(
            {
                "pontos": request.user.profile.pontos,
                "sequencia_dias": request.user.profile.sequencia_dias,
                "conquistas": [
                    {
                        "codigo": c.codigo,
                        "nome": c.nome,
                        "descricao": c.descricao,
                        "pontos": c.pontos,
                        "conquistada": c.id in conquistadas,
                    }
                    for c in all_c
                ],
            }
        )

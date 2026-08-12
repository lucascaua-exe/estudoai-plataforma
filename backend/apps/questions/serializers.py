from django.db.models import Count, Q
from rest_framework import serializers

from .models import Alternativa, Questao, QuestaoUsuarioMeta, Tentativa


class AlternativaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alternativa
        fields = ["id", "letra", "texto"]


class AlternativaReveladaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alternativa
        fields = ["id", "letra", "texto", "correta"]


class QuestaoListSerializer(serializers.ModelSerializer):
    disciplina_nome = serializers.CharField(source="disciplina.nome", default=None)
    assunto_nome = serializers.CharField(source="assunto.nome", default=None)
    documento_nome = serializers.CharField(source="documento.nome", default=None)
    respondida = serializers.SerializerMethodField()
    acertou = serializers.SerializerMethodField()
    favorita = serializers.SerializerMethodField()
    marcar_revisao = serializers.SerializerMethodField()

    class Meta:
        model = Questao
        fields = [
            "id",
            "numero_origem",
            "enunciado",
            "dificuldade",
            "origem",
            "pagina",
            "disciplina",
            "disciplina_nome",
            "assunto",
            "assunto_nome",
            "documento_nome",
            "respondida",
            "acertou",
            "favorita",
            "marcar_revisao",
            "gabarito",
        ]

    def _meta(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        cache = self.context.setdefault("_meta_cache", {})
        if obj.id not in cache:
            cache[obj.id] = QuestaoUsuarioMeta.objects.filter(
                user=request.user, questao=obj
            ).first()
        return cache[obj.id]

    def _last_tentativa(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        cache = self.context.setdefault("_tent_cache", {})
        if obj.id not in cache:
            cache[obj.id] = (
                Tentativa.objects.filter(user=request.user, questao=obj)
                .order_by("-created_at")
                .first()
            )
        return cache[obj.id]

    def get_respondida(self, obj):
        return self._last_tentativa(obj) is not None

    def get_acertou(self, obj):
        t = self._last_tentativa(obj)
        return t.correta if t else None

    def get_favorita(self, obj):
        m = self._meta(obj)
        return bool(m and m.favorita)

    def get_marcar_revisao(self, obj):
        m = self._meta(obj)
        return bool(m and m.marcar_revisao)


class QuestaoDetailSerializer(QuestaoListSerializer):
    alternativas = serializers.SerializerMethodField()
    fonte = serializers.SerializerMethodField()

    class Meta(QuestaoListSerializer.Meta):
        fields = QuestaoListSerializer.Meta.fields + [
            "explicacao",
            "trecho_referencia",
            "alternativas",
            "fonte",
        ]

    def get_alternativas(self, obj):
        request = self.context.get("request")
        reveal = self.context.get("reveal", False)
        last = None
        if request and request.user.is_authenticated:
            last = (
                Tentativa.objects.filter(user=request.user, questao=obj)
                .order_by("-created_at")
                .first()
            )
        if reveal or last:
            return AlternativaReveladaSerializer(obj.alternativas.all(), many=True).data
        return AlternativaSerializer(obj.alternativas.all(), many=True).data

    def get_fonte(self, obj):
        return {
            "documento": obj.documento.nome if obj.documento else None,
            "pagina": obj.pagina,
            "disciplina": obj.disciplina.nome if obj.disciplina else None,
            "assunto": obj.assunto.nome if obj.assunto else None,
            "origem": obj.origem,
        }


class AnswerSerializer(serializers.Serializer):
    alternativa_id = serializers.IntegerField(required=False)
    letra = serializers.CharField(required=False, max_length=1)
    tempo_segundos = serializers.IntegerField(required=False, default=0)

    def validate(self, attrs):
        if not attrs.get("alternativa_id") and not attrs.get("letra"):
            raise serializers.ValidationError("Informe alternativa_id ou letra.")
        return attrs

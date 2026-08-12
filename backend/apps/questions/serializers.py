from django.db.models import Count, Q
from rest_framework import serializers

from .models import Alternativa, Questao, QuestaoUsuarioMeta, Tentativa
from .text_cleanup import clean_alternativa, clean_enunciado, clean_explicacao


class AlternativaSerializer(serializers.ModelSerializer):
    texto = serializers.SerializerMethodField()

    class Meta:
        model = Alternativa
        fields = ["id", "letra", "texto"]

    def get_texto(self, obj):
        return clean_alternativa(obj.texto)


class AlternativaReveladaSerializer(serializers.ModelSerializer):
    texto = serializers.SerializerMethodField()

    class Meta:
        model = Alternativa
        fields = ["id", "letra", "texto", "correta"]

    def get_texto(self, obj):
        return clean_alternativa(obj.texto)


class QuestaoListSerializer(serializers.ModelSerializer):
    disciplina_nome = serializers.CharField(source="disciplina.nome", default=None)
    assunto_nome = serializers.CharField(source="assunto.nome", default=None)
    documento_nome = serializers.CharField(source="documento.nome", default=None)
    respondida = serializers.SerializerMethodField()
    acertou = serializers.SerializerMethodField()
    favorita = serializers.SerializerMethodField()
    marcar_revisao = serializers.SerializerMethodField()
    enunciado = serializers.SerializerMethodField()
    imagem_url = serializers.SerializerMethodField()

    class Meta:
        model = Questao
        fields = [
            "id",
            "numero_origem",
            "enunciado",
            "dificuldade",
            "origem",
            "banca",
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
            "imagem_url",
        ]

    def get_enunciado(self, obj):
        return clean_enunciado(obj.enunciado)

    def get_imagem_url(self, obj):
        if not getattr(obj, "imagem", None):
            return None
        try:
            url = obj.imagem.url
        except ValueError:
            return None
        if not url:
            return None

        # Base pública da API (Render / env) — evita URL apontar para o front (Netlify/Vite)
        from django.conf import settings

        public = (getattr(settings, "PUBLIC_API_URL", "") or "").strip().rstrip("/")
        if not public:
            host = (getattr(settings, "RENDER_EXTERNAL_HOSTNAME", "") or "").strip()
            if host:
                public = f"https://{host}"
        if public:
            return f"{public}{url if url.startswith('/') else '/' + url}"

        request = self.context.get("request")
        if request is not None:
            return request.build_absolute_uri(url)
        return url

    def _user_meta(self, obj):
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
        m = self._user_meta(obj)
        return bool(m and m.favorita)

    def get_marcar_revisao(self, obj):
        m = self._user_meta(obj)
        return bool(m and m.marcar_revisao)


class QuestaoDetailSerializer(QuestaoListSerializer):
    alternativas = serializers.SerializerMethodField()
    fonte = serializers.SerializerMethodField()
    explicacao = serializers.SerializerMethodField()
    trecho_referencia = serializers.SerializerMethodField()

    class Meta(QuestaoListSerializer.Meta):
        fields = QuestaoListSerializer.Meta.fields + [
            "explicacao",
            "trecho_referencia",
            "alternativas",
            "fonte",
        ]

    def get_explicacao(self, obj):
        return clean_explicacao(obj.explicacao)

    def get_trecho_referencia(self, obj):
        from .text_cleanup import clean_study_text

        return clean_study_text(obj.trecho_referencia or "")

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
            "banca": obj.banca or None,
        }


class AnswerSerializer(serializers.Serializer):
    alternativa_id = serializers.IntegerField(required=False)
    letra = serializers.CharField(required=False, max_length=1)
    tempo_segundos = serializers.IntegerField(required=False, default=0)

    def validate(self, attrs):
        if not attrs.get("alternativa_id") and not attrs.get("letra"):
            raise serializers.ValidationError("Informe alternativa_id ou letra.")
        return attrs

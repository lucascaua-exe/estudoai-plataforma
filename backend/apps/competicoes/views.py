from datetime import timedelta

from django.db import IntegrityError
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import serializers

from .models import Participante, SalaCompeticao
from .services import (
    avancar_apos_reveal,
    iniciar_sala,
    montar_estado,
    registrar_resposta,
)


class CriarSalaSerializer(serializers.Serializer):
    modo = serializers.ChoiceField(
        choices=SalaCompeticao.Modo.choices, default=SalaCompeticao.Modo.TODOS
    )
    quantidade = serializers.IntegerField(min_value=5, max_value=30, default=10)
    tempo_por_questao = serializers.IntegerField(min_value=10, max_value=60, default=20)

    def validate_tempo_por_questao(self, value):
        if value not in (10, 15, 20, 30):
            raise serializers.ValidationError("Use 10, 15, 20 ou 30 segundos.")
        return value
    apelido = serializers.CharField(max_length=32, required=False, allow_blank=True)
    filtros = serializers.DictField(required=False)


class EntrarSalaSerializer(serializers.Serializer):
    codigo = serializers.CharField(max_length=8)
    apelido = serializers.CharField(max_length=32)


def _normalizar_apelido(apelido: str) -> str:
    cleaned = " ".join((apelido or "").strip().split())
    if len(cleaned) < 2:
        raise serializers.ValidationError("Apelido deve ter pelo menos 2 caracteres.")
    if len(cleaned) > 32:
        cleaned = cleaned[:32]
    return cleaned


def _get_participante(sala: SalaCompeticao, token: str | None) -> Participante | None:
    if not token:
        return None
    return Participante.objects.filter(sala=sala, token=token, ativo=True).first()


class SalaCompeticaoViewSet(viewsets.GenericViewSet):
    queryset = SalaCompeticao.objects.all()
    lookup_field = "pk"

    def get_permissions(self):
        if self.action in ("entrar", "estado", "responder", "sair", "avancar"):
            return [AllowAny()]
        if self.action == "create":
            return [IsAuthenticated()]
        if self.action == "iniciar":
            return [AllowAny()]  # host autenticado via token de participante
        return [IsAuthenticated()]

    def create(self, request):
        ser = CriarSalaSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        user = request.user
        apelido = _normalizar_apelido(
            data.get("apelido") or getattr(user, "name", None) or user.email.split("@")[0]
        )
        tempo = int(data["tempo_por_questao"])
        filtros = data.get("filtros") or {}

        sala = SalaCompeticao.objects.create(
            host=user,
            modo=data["modo"],
            quantidade=data["quantidade"],
            tempo_por_questao=tempo,
            filtros=filtros,
            status=SalaCompeticao.Status.LOBBY,
            expires_at=timezone.now() + timedelta(hours=2),
        )
        part = Participante.objects.create(
            sala=sala,
            user=user,
            apelido=apelido,
            is_host=True,
        )
        return Response(
            {
                "id": sala.id,
                "codigo": sala.codigo,
                "token": str(part.token),
                "apelido": part.apelido,
                "estado": montar_estado(sala, part),
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"])
    def entrar(self, request):
        ser = EntrarSalaSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        codigo = ser.validated_data["codigo"].strip().upper()
        try:
            apelido = _normalizar_apelido(ser.validated_data["apelido"])
        except serializers.ValidationError as e:
            return Response({"detail": str(e.detail[0] if isinstance(e.detail, list) else e.detail)}, status=400)

        sala = SalaCompeticao.objects.filter(codigo=codigo).first()
        if not sala:
            return Response({"detail": "Sala não encontrada."}, status=404)
        if sala.expires_at and sala.expires_at < timezone.now():
            sala.status = SalaCompeticao.Status.CANCELADA
            sala.save(update_fields=["status"])
            return Response({"detail": "Sala expirada."}, status=400)
        if sala.status != SalaCompeticao.Status.LOBBY:
            return Response({"detail": "A partida já começou ou terminou."}, status=400)

        ativos = sala.participantes.filter(ativo=True).count()
        if ativos >= sala.max_jogadores:
            return Response({"detail": "Sala cheia."}, status=400)

        user = request.user if request.user.is_authenticated else None
        # Reentrar com mesmo user
        if user:
            existing = Participante.objects.filter(sala=sala, user=user, ativo=True).first()
            if existing:
                return Response(
                    {
                        "id": sala.id,
                        "codigo": sala.codigo,
                        "token": str(existing.token),
                        "apelido": existing.apelido,
                        "estado": montar_estado(sala, existing),
                    }
                )

        try:
            part = Participante.objects.create(
                sala=sala,
                user=user,
                apelido=apelido,
                is_host=False,
            )
        except IntegrityError:
            return Response(
                {"detail": "Esse apelido já está na sala. Escolha outro."},
                status=400,
            )

        return Response(
            {
                "id": sala.id,
                "codigo": sala.codigo,
                "token": str(part.token),
                "apelido": part.apelido,
                "estado": montar_estado(sala, part),
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"])
    def estado(self, request, pk=None):
        sala = self.get_object()
        token = request.query_params.get("token") or request.headers.get("X-Participant-Token")
        part = _get_participante(sala, token)
        if part:
            part.ultimo_ping = timezone.now()
            part.save(update_fields=["ultimo_ping"])
        return Response(montar_estado(sala, part))

    @action(detail=True, methods=["post"])
    def iniciar(self, request, pk=None):
        sala = self.get_object()
        token = request.data.get("token") or request.query_params.get("token")
        part = _get_participante(sala, token)
        if not part or not part.is_host:
            return Response({"detail": "Só o host pode iniciar."}, status=403)
        try:
            sala = iniciar_sala(sala)
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)
        return Response(montar_estado(sala, part))

    @action(detail=True, methods=["post"])
    def responder(self, request, pk=None):
        sala = self.get_object()
        token = request.data.get("token")
        letra = request.data.get("letra", "")
        part = _get_participante(sala, token)
        if not part:
            return Response({"detail": "Participante inválido."}, status=403)
        try:
            resp = registrar_resposta(sala, part, letra)
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)
        part.refresh_from_db()
        sala.refresh_from_db()
        return Response(
            {
                "ok": True,
                "letra": resp.letra,
                "estado": montar_estado(sala, part),
            }
        )

    @action(detail=True, methods=["post"])
    def avancar(self, request, pk=None):
        """Host avança do reveal para a próxima questão (ou fim). Também auto se timer do reveal."""
        sala = self.get_object()
        token = request.data.get("token") or request.query_params.get("token")
        part = _get_participante(sala, token)

        # Auto-promote question→reveal already happens in estado/responder
        if sala.status == SalaCompeticao.Status.QUESTION:
            from .services import promover_para_reveal_se_necessario

            sala = promover_para_reveal_se_necessario(sala)
            return Response(montar_estado(sala, part))

        if sala.status != SalaCompeticao.Status.REVEAL:
            return Response(montar_estado(sala, part))

        # Qualquer um pode pedir avanço se reveal > 5s; host sempre
        if part and not part.is_host:
            if sala.fase_iniciada_em:
                elapsed = (timezone.now() - sala.fase_iniciada_em).total_seconds()
                if elapsed < 4:
                    return Response(
                        {"detail": "Aguarde a revelação.", "estado": montar_estado(sala, part)},
                        status=400,
                    )
        elif not part:
            return Response({"detail": "Participante inválido."}, status=403)

        sala = avancar_apos_reveal(sala)
        return Response(montar_estado(sala, part))

    @action(detail=True, methods=["post"])
    def sair(self, request, pk=None):
        sala = self.get_object()
        token = request.data.get("token")
        part = _get_participante(sala, token)
        if not part:
            return Response({"detail": "Participante inválido."}, status=403)

        was_host = part.is_host
        part.ativo = False
        part.is_host = False
        part.save(update_fields=["ativo", "is_host"])

        if sala.status == SalaCompeticao.Status.LOBBY:
            ativos = list(sala.participantes.filter(ativo=True).order_by("conectado_em"))
            if was_host:
                if ativos:
                    novo = ativos[0]
                    novo.is_host = True
                    novo.save(update_fields=["is_host"])
                    sala.host = novo.user
                    sala.save(update_fields=["host"])
                else:
                    sala.status = SalaCompeticao.Status.CANCELADA
                    sala.save(update_fields=["status"])

        return Response({"ok": True, "estado": montar_estado(sala, None)})

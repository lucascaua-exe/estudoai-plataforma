import secrets
import string
import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


def gerar_codigo(length: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    # Evita confusão 0/O e 1/I
    alphabet = alphabet.replace("0", "").replace("O", "").replace("1", "").replace("I", "")
    return "".join(secrets.choice(alphabet) for _ in range(length))


class SalaCompeticao(models.Model):
    class Modo(models.TextChoices):
        X1 = "1x1", "1 contra 1"
        TODOS = "todos", "Todos contra todos"

    class Status(models.TextChoices):
        LOBBY = "lobby", "Lobby"
        QUESTION = "question", "Questão"
        REVEAL = "reveal", "Revelação"
        FINISHED = "finished", "Finalizada"
        CANCELADA = "cancelada", "Cancelada"

    codigo = models.CharField(max_length=8, unique=True, db_index=True)
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="salas_host",
    )
    modo = models.CharField(max_length=10, choices=Modo.choices, default=Modo.TODOS)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.LOBBY
    )
    quantidade = models.PositiveIntegerField(default=10)
    tempo_por_questao = models.PositiveIntegerField(default=20)
    filtros = models.JSONField(default=dict, blank=True)
    indice_atual = models.PositiveIntegerField(default=0)
    fase_iniciada_em = models.DateTimeField(null=True, blank=True)
    iniciado_em = models.DateTimeField(null=True, blank=True)
    finalizado_em = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "sala de competição"
        verbose_name_plural = "salas de competição"

    def __str__(self):
        return f"{self.codigo} ({self.status})"

    @property
    def max_jogadores(self) -> int:
        return 2 if self.modo == self.Modo.X1 else 20

    @property
    def min_jogadores(self) -> int:
        return 2

    def save(self, *args, **kwargs):
        if not self.codigo:
            for _ in range(20):
                code = gerar_codigo()
                if not SalaCompeticao.objects.filter(codigo=code).exists():
                    self.codigo = code
                    break
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=2)
        super().save(*args, **kwargs)


class Participante(models.Model):
    sala = models.ForeignKey(
        SalaCompeticao, on_delete=models.CASCADE, related_name="participantes"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="participacoes_competicao",
    )
    apelido = models.CharField(max_length=32)
    token = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    is_host = models.BooleanField(default=False)
    pontos = models.PositiveIntegerField(default=0)
    acertos = models.PositiveIntegerField(default=0)
    tempo_total_ms = models.PositiveIntegerField(default=0)
    conectado_em = models.DateTimeField(auto_now_add=True)
    ultimo_ping = models.DateTimeField(auto_now=True)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ["-pontos", "tempo_total_ms", "conectado_em"]
        unique_together = [("sala", "apelido")]
        verbose_name = "participante"
        verbose_name_plural = "participantes"

    def __str__(self):
        return f"{self.apelido} @ {self.sala.codigo}"


class SalaQuestao(models.Model):
    sala = models.ForeignKey(
        SalaCompeticao, on_delete=models.CASCADE, related_name="itens"
    )
    questao = models.ForeignKey(
        "questions.Questao",
        on_delete=models.CASCADE,
        related_name="competicao_itens",
    )
    ordem = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["ordem"]
        unique_together = [("sala", "ordem")]
        verbose_name = "questão da sala"
        verbose_name_plural = "questões da sala"

    def __str__(self):
        return f"{self.sala.codigo} Q{self.ordem + 1}"


class RespostaCompeticao(models.Model):
    sala_questao = models.ForeignKey(
        SalaQuestao, on_delete=models.CASCADE, related_name="respostas"
    )
    participante = models.ForeignKey(
        Participante, on_delete=models.CASCADE, related_name="respostas"
    )
    letra = models.CharField(max_length=1, blank=True, default="")
    correta = models.BooleanField(default=False)
    pontos = models.PositiveIntegerField(default=0)
    tempo_ms = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("sala_questao", "participante")]
        verbose_name = "resposta da competição"
        verbose_name_plural = "respostas da competição"

    def __str__(self):
        return f"{self.participante.apelido} → {self.letra} ({self.pontos}pts)"

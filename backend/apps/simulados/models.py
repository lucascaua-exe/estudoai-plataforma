from django.conf import settings
from django.db import models


class Simulado(models.Model):
    class Status(models.TextChoices):
        RASCUNHO = "rascunho", "Rascunho"
        EM_ANDAMENTO = "em_andamento", "Em andamento"
        FINALIZADO = "finalizado", "Finalizado"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="simulados"
    )
    titulo = models.CharField(max_length=255, default="Simulado")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.RASCUNHO
    )
    quantidade = models.PositiveIntegerField(default=20)
    filtros = models.JSONField(default=dict, blank=True)
    iniciado_em = models.DateTimeField(null=True, blank=True)
    finalizado_em = models.DateTimeField(null=True, blank=True)
    tempo_limite_segundos = models.PositiveIntegerField(null=True, blank=True)
    tempo_usado_segundos = models.PositiveIntegerField(default=0)
    total_acertos = models.PositiveIntegerField(default=0)
    total_erros = models.PositiveIntegerField(default=0)
    percentual = models.FloatField(default=0.0)
    resultado = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "simulado"
        verbose_name_plural = "simulados"

    def __str__(self):
        return f"{self.titulo} ({self.status})"


class SimuladoQuestao(models.Model):
    simulado = models.ForeignKey(
        Simulado, on_delete=models.CASCADE, related_name="itens"
    )
    questao = models.ForeignKey(
        "questions.Questao", on_delete=models.CASCADE, related_name="simulado_itens"
    )
    ordem = models.PositiveIntegerField(default=0)
    letra_escolhida = models.CharField(max_length=1, blank=True, default="")
    correta = models.BooleanField(null=True, blank=True)
    respondida_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["ordem"]
        unique_together = [("simulado", "questao")]
        verbose_name = "questão do simulado"
        verbose_name_plural = "questões do simulado"

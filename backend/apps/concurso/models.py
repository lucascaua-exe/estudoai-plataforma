from django.conf import settings
from django.db import models


class Concurso(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="concurso"
    )
    nome = models.CharField(max_length=255)
    orgao = models.CharField(max_length=255, blank=True, default="")
    cargo = models.CharField(max_length=255, blank=True, default="")
    data_prova = models.DateField(null=True, blank=True)
    banca = models.CharField(max_length=100, blank=True, default="")
    observacoes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "concurso"
        verbose_name_plural = "concursos"

    def __str__(self):
        return f"{self.nome} — {self.cargo}"


class MetaEstudo(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="metas"
    )
    questoes_dia = models.PositiveIntegerField(default=50)
    questoes_semana = models.PositiveIntegerField(default=250)
    horas_estudo = models.DecimalField(max_digits=4, decimal_places=1, default=2.0)
    percentual_acerto_desejado = models.PositiveIntegerField(default=80)
    disciplinas_prioritarias = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "meta"
        verbose_name_plural = "metas"

    def __str__(self):
        return f"Metas de {self.user}"

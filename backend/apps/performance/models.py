from django.conf import settings
from django.db import models


class DominioAssunto(models.Model):
    class Nivel(models.TextChoices):
        DADOS_INSUFICIENTES = "dados_insuficientes", "Dados insuficientes"
        EM_AVALIACAO = "em_avaliacao", "Em avaliação"
        PRECISA_ATENCAO = "precisa_atencao", "Precisa de atenção"
        EM_DESENVOLVIMENTO = "em_desenvolvimento", "Em desenvolvimento"
        CONHECIMENTO_INTERMEDIARIO = "conhecimento_intermediario", "Conhecimento intermediário"
        BOM_DOMINIO = "bom_dominio", "Bom domínio"
        DOMINIO_CONFIRMADO = "dominio_confirmado", "Domínio confirmado"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="dominios"
    )
    assunto = models.ForeignKey(
        "catalog.Assunto", on_delete=models.CASCADE, related_name="dominios"
    )
    nivel = models.CharField(
        max_length=40, choices=Nivel.choices, default=Nivel.DADOS_INSUFICIENTES
    )
    total_respostas = models.PositiveIntegerField(default=0)
    total_acertos = models.PositiveIntegerField(default=0)
    percentual_acerto = models.FloatField(default=0.0)
    dominio_declarado = models.BooleanField(default=False)
    dominio_comprovado = models.BooleanField(default=False)
    data_confirmacao = models.DateTimeField(null=True, blank=True)
    ultima_revisao = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("user", "assunto")]
        verbose_name = "domínio"
        verbose_name_plural = "domínios"

    def __str__(self):
        return f"{self.user} — {self.assunto} ({self.nivel})"


class SessaoEstudo(models.Model):
    class Tipo(models.TextChoices):
        LIVRE = "livre", "Livre"
        REVISAO = "revisao", "Revisão inteligente"
        ERROS = "erros", "Meus erros"
        SIMULADO = "simulado", "Simulado"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sessoes"
    )
    tipo = models.CharField(max_length=20, choices=Tipo.choices, default=Tipo.LIVRE)
    iniciada_em = models.DateTimeField(auto_now_add=True)
    finalizada_em = models.DateTimeField(null=True, blank=True)
    questoes_ids = models.JSONField(default=list, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-iniciada_em"]
        verbose_name = "sessão"
        verbose_name_plural = "sessões"

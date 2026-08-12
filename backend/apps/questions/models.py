from django.conf import settings
from django.db import models


class Questao(models.Model):
    class Dificuldade(models.TextChoices):
        FACIL = "facil", "Fácil"
        MEDIO = "medio", "Médio"
        DIFICIL = "dificil", "Difícil"
        NAO_INFORMADO = "nao_informado", "Não informado"

    class Origem(models.TextChoices):
        PDF = "pdf", "PDF"
        AI_GENERATED = "ai_generated", "Gerada por IA"

    disciplina = models.ForeignKey(
        "catalog.Disciplina",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="questoes",
    )
    assunto = models.ForeignKey(
        "catalog.Assunto",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="questoes",
    )
    subassunto = models.ForeignKey(
        "catalog.Subassunto",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="questoes",
    )
    documento = models.ForeignKey(
        "documents.Documento",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="questoes",
    )
    numero_origem = models.PositiveIntegerField(null=True, blank=True)
    pagina = models.PositiveIntegerField(null=True, blank=True)
    enunciado = models.TextField()
    dificuldade = models.CharField(
        max_length=20, choices=Dificuldade.choices, default=Dificuldade.NAO_INFORMADO
    )
    gabarito = models.CharField(max_length=1, blank=True, default="")
    explicacao = models.TextField(blank=True, default="")
    origem = models.CharField(
        max_length=20, choices=Origem.choices, default=Origem.PDF
    )
    trecho_referencia = models.TextField(blank=True, default="")
    hash_conteudo = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["disciplina", "assunto", "numero_origem"]
        verbose_name = "questão"
        verbose_name_plural = "questões"
        indexes = [
            models.Index(fields=["dificuldade"]),
            models.Index(fields=["origem"]),
        ]

    def __str__(self):
        return f"Q{self.numero_origem or self.pk}: {self.enunciado[:60]}"


class Alternativa(models.Model):
    questao = models.ForeignKey(
        Questao, on_delete=models.CASCADE, related_name="alternativas"
    )
    letra = models.CharField(max_length=1)
    texto = models.TextField()
    correta = models.BooleanField(default=False)

    class Meta:
        ordering = ["letra"]
        unique_together = [("questao", "letra")]
        verbose_name = "alternativa"
        verbose_name_plural = "alternativas"

    def __str__(self):
        return f"{self.letra}) {self.texto[:40]}"


class Tentativa(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tentativas"
    )
    questao = models.ForeignKey(
        Questao, on_delete=models.CASCADE, related_name="tentativas"
    )
    alternativa = models.ForeignKey(
        Alternativa, on_delete=models.SET_NULL, null=True, blank=True
    )
    letra_escolhida = models.CharField(max_length=1)
    correta = models.BooleanField()
    tempo_segundos = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "tentativa"
        verbose_name_plural = "tentativas"
        indexes = [
            models.Index(fields=["user", "questao"]),
            models.Index(fields=["user", "correta"]),
        ]

    def __str__(self):
        status = "acerto" if self.correta else "erro"
        return f"{self.user} — Q{self.questao_id} ({status})"


class QuestaoUsuarioMeta(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="questao_metas"
    )
    questao = models.ForeignKey(
        Questao, on_delete=models.CASCADE, related_name="user_metas"
    )
    favorita = models.BooleanField(default=False)
    marcar_revisao = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("user", "questao")]
        verbose_name = "meta da questão"
        verbose_name_plural = "metas das questões"

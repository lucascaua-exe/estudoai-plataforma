from django.db import models


class Documento(models.Model):
    class Tipo(models.TextChoices):
        QUESTOES_BASICO = "questoes_basico", "Questões — Básico"
        QUESTOES_ESPECIFICO = "questoes_especifico", "Questões — Específico"
        TEORIA_BASICO = "teoria_basico", "Teoria — Básico"
        TEORIA_ESPECIFICO = "teoria_especifico", "Teoria — Específico"
        RESUMO_BASICO = "resumo_basico", "Resumo — Básico"
        RESUMO_ESPECIFICO = "resumo_especifico", "Resumo — Específico"
        OUTRO = "outro", "Outro"

    class Status(models.TextChoices):
        PENDENTE = "pendente", "Pendente"
        PROCESSANDO = "processando", "Processando"
        CONCLUIDO = "concluido", "Concluído"
        ERRO = "erro", "Erro"

    nome = models.CharField(max_length=500)
    arquivo = models.FileField(upload_to="pdfs/", blank=True)
    caminho_origem = models.CharField(max_length=1000, blank=True, default="")
    tipo = models.CharField(max_length=40, choices=Tipo.choices, default=Tipo.OUTRO)
    hash_arquivo = models.CharField(max_length=64, blank=True, default="", db_index=True)
    total_paginas = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDENTE
    )
    progresso = models.PositiveIntegerField(default=0)
    mensagem_erro = models.TextField(blank=True, default="")
    questoes_extraidas = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["tipo", "nome"]
        verbose_name = "documento"
        verbose_name_plural = "documentos"

    def __str__(self):
        return self.nome


class PaginaDocumento(models.Model):
    documento = models.ForeignKey(
        Documento, on_delete=models.CASCADE, related_name="paginas"
    )
    numero = models.PositiveIntegerField()
    texto = models.TextField(blank=True, default="")

    class Meta:
        unique_together = [("documento", "numero")]
        ordering = ["numero"]
        verbose_name = "página"
        verbose_name_plural = "páginas"

    def __str__(self):
        return f"{self.documento.nome} p.{self.numero}"


class DocumentoChunk(models.Model):
    documento = models.ForeignKey(
        Documento, on_delete=models.CASCADE, related_name="chunks"
    )
    pagina = models.ForeignKey(
        PaginaDocumento,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chunks",
    )
    indice = models.PositiveIntegerField(default=0)
    texto = models.TextField()
    disciplina = models.CharField(max_length=255, blank=True, default="")
    assunto = models.CharField(max_length=500, blank=True, default="")
    embedding_id = models.CharField(max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["documento", "indice"]
        verbose_name = "chunk"
        verbose_name_plural = "chunks"

    def __str__(self):
        return f"Chunk {self.indice} — {self.documento.nome}"

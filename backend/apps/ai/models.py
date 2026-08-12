from django.conf import settings
from django.db import models


class ConversaIA(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="conversas_ia"
    )
    titulo = models.CharField(max_length=255, blank=True, default="Nova conversa")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "conversa IA"
        verbose_name_plural = "conversas IA"

    def __str__(self):
        return self.titulo


class MensagemIA(models.Model):
    class Role(models.TextChoices):
        USER = "user", "Usuário"
        ASSISTANT = "assistant", "Assistente"
        SYSTEM = "system", "Sistema"

    conversa = models.ForeignKey(
        ConversaIA, on_delete=models.CASCADE, related_name="mensagens"
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    conteudo = models.TextField()
    fontes = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "mensagem IA"
        verbose_name_plural = "mensagens IA"

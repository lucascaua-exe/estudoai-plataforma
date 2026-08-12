from django.conf import settings
from django.db import models


class Conquista(models.Model):
    codigo = models.CharField(max_length=50, unique=True)
    nome = models.CharField(max_length=150)
    descricao = models.TextField(blank=True, default="")
    icone = models.CharField(max_length=50, blank=True, default="award")
    pontos = models.PositiveIntegerField(default=10)

    class Meta:
        verbose_name = "conquista"
        verbose_name_plural = "conquistas"

    def __str__(self):
        return self.nome


class UserConquista(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="conquistas"
    )
    conquista = models.ForeignKey(
        Conquista, on_delete=models.CASCADE, related_name="usuarios"
    )
    conquistada_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user", "conquista")]
        verbose_name = "conquista do usuário"
        verbose_name_plural = "conquistas do usuário"

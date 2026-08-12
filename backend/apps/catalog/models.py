from django.db import models


class Disciplina(models.Model):
    nome = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True)
    ordem = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["ordem", "nome"]
        verbose_name = "disciplina"
        verbose_name_plural = "disciplinas"

    def __str__(self):
        return self.nome


class Assunto(models.Model):
    disciplina = models.ForeignKey(
        Disciplina, on_delete=models.CASCADE, related_name="assuntos"
    )
    nome = models.CharField(max_length=500)
    slug = models.SlugField(max_length=500)
    ordem = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["ordem", "nome"]
        unique_together = [("disciplina", "slug")]
        verbose_name = "assunto"
        verbose_name_plural = "assuntos"

    def __str__(self):
        return f"{self.disciplina.nome} — {self.nome}"


class Subassunto(models.Model):
    assunto = models.ForeignKey(
        Assunto, on_delete=models.CASCADE, related_name="subassuntos"
    )
    nome = models.CharField(max_length=500)
    slug = models.SlugField(max_length=500)
    ordem = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["ordem", "nome"]
        unique_together = [("assunto", "slug")]
        verbose_name = "subassunto"
        verbose_name_plural = "subassuntos"

    def __str__(self):
        return self.nome

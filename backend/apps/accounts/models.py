from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("O e-mail é obrigatório")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser precisa de is_staff=True")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser precisa de is_superuser=True")
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    username = None
    email = models.EmailField("e-mail", unique=True)
    name = models.CharField("nome", max_length=150)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    objects = UserManager()

    class Meta:
        verbose_name = "usuário"
        verbose_name_plural = "usuários"

    def __str__(self):
        return self.name or self.email


class UserProfile(models.Model):
    THEME_CHOICES = [("light", "Claro"), ("dark", "Escuro"), ("system", "Sistema")]
    PLAN_CHOICES = [
        ("free", "Free"),
        ("pro", "Pro"),
        ("premium", "Premium"),
    ]
    STATUS_CHOICES = [
        ("active", "Ativa"),
        ("canceling", "Cancelamento agendado"),
        ("canceled", "Cancelada"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    concurso_alvo = models.CharField(max_length=255, blank=True, default="")
    cargo_alvo = models.CharField(max_length=255, blank=True, default="")
    data_prova = models.DateField(null=True, blank=True)
    meta_questoes_dia = models.PositiveIntegerField(default=50)
    meta_horas_estudo = models.DecimalField(max_digits=4, decimal_places=1, default=2.0)
    tema = models.CharField(max_length=10, choices=THEME_CHOICES, default="light")
    pontos = models.PositiveIntegerField(default=0)
    sequencia_dias = models.PositiveIntegerField(default=0)
    ultimo_estudo = models.DateField(null=True, blank=True)
    tempo_total_segundos = models.PositiveIntegerField(default=0)
    plano = models.CharField(max_length=20, choices=PLAN_CHOICES, default="free")
    assinatura_status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="active"
    )
    periodo_inicio = models.DateTimeField(null=True, blank=True)
    periodo_fim = models.DateTimeField(null=True, blank=True)
    cancelado_em = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "perfil"
        verbose_name_plural = "perfis"

    def __str__(self):
        return f"Perfil de {self.user}"


class Invoice(models.Model):
    STATUS_CHOICES = [
        ("paid", "Paga"),
        ("open", "Em aberto"),
        ("void", "Anulada"),
        ("refunded", "Reembolsada"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="invoices")
    number = models.CharField(max_length=32)
    plan = models.CharField(max_length=20)
    description = models.CharField(max_length=255)
    amount_cents = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="paid")
    issued_at = models.DateTimeField()
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-issued_at"]
        verbose_name = "fatura"
        verbose_name_plural = "faturas"

    def __str__(self):
        return f"{self.number} · {self.user}"

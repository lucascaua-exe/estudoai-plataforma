from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import UserProfile

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    tema = serializers.CharField(source="profile.tema", required=False)
    pontos = serializers.IntegerField(source="profile.pontos", read_only=True)
    sequencia_dias = serializers.IntegerField(source="profile.sequencia_dias", read_only=True)
    meta_questoes_dia = serializers.IntegerField(
        source="profile.meta_questoes_dia", required=False
    )
    concurso_alvo = serializers.CharField(source="profile.concurso_alvo", required=False)
    cargo_alvo = serializers.CharField(source="profile.cargo_alvo", required=False)
    data_prova = serializers.DateField(
        source="profile.data_prova", required=False, allow_null=True
    )
    data_cadastro = serializers.DateTimeField(source="date_joined", read_only=True)
    plano = serializers.CharField(source="profile.plano", read_only=True)
    assinatura_status = serializers.CharField(
        source="profile.assinatura_status", read_only=True
    )

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "email",
            "tema",
            "pontos",
            "sequencia_dias",
            "meta_questoes_dia",
            "concurso_alvo",
            "cargo_alvo",
            "data_prova",
            "data_cadastro",
            "plano",
            "assinatura_status",
        ]
        read_only_fields = [
            "id",
            "email",
            "pontos",
            "sequencia_dias",
            "data_cadastro",
            "plano",
            "assinatura_status",
        ]

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        instance.name = validated_data.get("name", instance.name)
        instance.save()
        profile = instance.profile
        for key, value in profile_data.items():
            setattr(profile, key, value)
        profile.save()
        return instance


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    plan = serializers.ChoiceField(
        choices=["free", "pro", "premium"], required=False, default="free"
    )

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Já existe uma conta com este e-mail.")
        return value.lower()

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "As senhas não coincidem."})
        validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        from datetime import timedelta

        from django.utils import timezone

        from .billing_views import PLAN_LABELS, PLAN_PRICES, _next_invoice_number
        from .models import Invoice

        plan = validated_data.pop("plan", "free") or "free"
        validated_data.pop("password_confirm")
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            name=validated_data["name"],
        )
        from apps.concurso.models import Concurso, MetaEstudo

        Concurso.objects.get_or_create(
            user=user,
            defaults={
                "nome": "Prefeitura de Araguaína — TO 2026",
                "orgao": "Prefeitura Municipal de Araguaína",
                "cargo": "Analista de Tecnologia da Informação",
                "banca": "IMPAR",
            },
        )
        MetaEstudo.objects.get_or_create(user=user)
        now = timezone.now()
        profile = user.profile
        profile.concurso_alvo = "Prefeitura de Araguaína — TO 2026"
        profile.cargo_alvo = "Analista de Tecnologia da Informação"
        profile.plano = plan
        profile.assinatura_status = "active"
        profile.periodo_inicio = now
        profile.periodo_fim = now + timedelta(days=30)
        profile.save()

        amount = PLAN_PRICES.get(plan, 0)
        Invoice.objects.create(
            user=user,
            number=_next_invoice_number(user),
            plan=plan,
            description=(
                f"Ativação plano {PLAN_LABELS.get(plan, plan)}"
                if amount
                else "Ativação plano Free"
            ),
            amount_cents=amount,
            status="paid",
            issued_at=now,
            paid_at=now,
        )
        return user


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.EMAIL_FIELD

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField()
    new_password = serializers.CharField()

    def validate_new_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["current_password"]):
            raise serializers.ValidationError({"current_password": "Senha atual incorreta."})
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save()
        return user

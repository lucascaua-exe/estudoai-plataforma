from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from django import forms

from .models import Invoice, User, UserProfile


class CustomUserCreationForm(UserCreationForm):
    class Meta:
        model = User
        fields = ("email", "name")

    def clean_email(self):
        email = self.cleaned_data["email"].lower().strip()
        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("Já existe um usuário com este e-mail.")
        return email


class CustomUserChangeForm(UserChangeForm):
    class Meta:
        model = User
        fields = (
            "email",
            "name",
            "is_active",
            "is_staff",
            "is_superuser",
            "groups",
            "user_permissions",
        )


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    extra = 0
    fk_name = "user"
    fields = (
        "plano",
        "assinatura_status",
        "periodo_inicio",
        "periodo_fim",
        "concurso_alvo",
        "cargo_alvo",
        "meta_questoes_dia",
        "tema",
        "pontos",
        "sequencia_dias",
    )


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ["email"]
    list_display = ["email", "name", "is_staff", "is_superuser", "is_active", "date_joined"]
    list_filter = ["is_staff", "is_superuser", "is_active"]
    search_fields = ["email", "name"]
    form = CustomUserChangeForm
    add_form = CustomUserCreationForm
    inlines = [UserProfileInline]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Informações", {"fields": ("name",)}),
        (
            "Permissões",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Datas", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "name", "password1", "password2", "is_staff", "is_superuser"),
            },
        ),
    )
    filter_horizontal = ("groups", "user_permissions")

    def get_inline_instances(self, request, obj=None):
        # Perfil é criado pelo signal no save; inline só na edição
        if obj is None:
            return []
        return super().get_inline_instances(request, obj)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "plano", "assinatura_status", "pontos", "sequencia_dias", "tema"]
    list_filter = ["plano", "assinatura_status"]
    search_fields = ["user__email", "user__name"]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ["number", "user", "plan", "amount_cents", "status", "issued_at"]
    list_filter = ["status", "plan"]
    search_fields = ["number", "user__email"]

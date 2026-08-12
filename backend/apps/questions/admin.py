from django.contrib import admin, messages

from .models import Alternativa, Questao, QuestaoUsuarioMeta, Tentativa
from apps.accounts.stats_reset import reset_all_users_stats, reset_user_stats


class AlternativaInline(admin.TabularInline):
    model = Alternativa
    extra = 0


@admin.register(Questao)
class QuestaoAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "numero_origem",
        "disciplina",
        "assunto",
        "banca",
        "dificuldade",
        "origem",
        "gabarito",
        "has_image",
    ]
    list_filter = ["dificuldade", "origem", "banca", "disciplina"]
    search_fields = ["enunciado", "banca"]
    inlines = [AlternativaInline]

    @admin.display(boolean=True, description="Figura")
    def has_image(self, obj):
        return bool(obj.imagem)


@admin.register(Tentativa)
class TentativaAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "questao", "letra_escolhida", "correta", "created_at"]
    list_filter = ["correta", "created_at"]
    search_fields = ["user__email", "questao__enunciado"]
    actions = ["reset_stats_for_attempt_users", "reset_stats_global"]

    @admin.action(description="Resetar estatísticas dos usuários destas tentativas")
    def reset_stats_for_attempt_users(self, request, queryset):
        users = {t.user_id: t.user for t in queryset.select_related("user")}
        for user in users.values():
            reset_user_stats(user)
        self.message_user(
            request,
            f"Estatísticas resetadas para {len(users)} usuário(s).",
            messages.SUCCESS,
        )

    @admin.action(description="⚠ Resetar estatísticas de TODOS os usuários (global)")
    def reset_stats_global(self, request, queryset):
        result = reset_all_users_stats()
        self.message_user(
            request,
            (
                f"Reset global: {result['usuarios']} usuários, "
                f"{result['tentativas']} tentativas removidas."
            ),
            messages.WARNING,
        )


admin.site.register(QuestaoUsuarioMeta)

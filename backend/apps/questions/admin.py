from django.contrib import admin

from .models import Alternativa, Questao, QuestaoUsuarioMeta, Tentativa


class AlternativaInline(admin.TabularInline):
    model = Alternativa
    extra = 0


@admin.register(Questao)
class QuestaoAdmin(admin.ModelAdmin):
    list_display = ["id", "numero_origem", "disciplina", "assunto", "dificuldade", "origem", "gabarito", "has_image"]
    list_filter = ["dificuldade", "origem", "disciplina"]
    search_fields = ["enunciado"]
    inlines = [AlternativaInline]

    @admin.display(boolean=True, description="Figura")
    def has_image(self, obj):
        return bool(obj.imagem)


admin.site.register(Tentativa)
admin.site.register(QuestaoUsuarioMeta)

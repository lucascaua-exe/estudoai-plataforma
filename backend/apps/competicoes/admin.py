from django.contrib import admin

from .models import Participante, RespostaCompeticao, SalaCompeticao, SalaQuestao


class ParticipanteInline(admin.TabularInline):
    model = Participante
    extra = 0
    readonly_fields = ["token", "pontos", "acertos"]


class SalaQuestaoInline(admin.TabularInline):
    model = SalaQuestao
    extra = 0


@admin.register(SalaCompeticao)
class SalaCompeticaoAdmin(admin.ModelAdmin):
    list_display = ["codigo", "modo", "status", "quantidade", "host", "created_at"]
    list_filter = ["status", "modo"]
    search_fields = ["codigo"]
    inlines = [ParticipanteInline, SalaQuestaoInline]


@admin.register(Participante)
class ParticipanteAdmin(admin.ModelAdmin):
    list_display = ["apelido", "sala", "is_host", "pontos", "acertos", "ativo"]
    list_filter = ["is_host", "ativo"]
    search_fields = ["apelido", "sala__codigo"]


admin.site.register(RespostaCompeticao)

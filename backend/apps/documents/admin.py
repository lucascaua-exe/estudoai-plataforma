from django.contrib import admin

from .models import Documento, DocumentoChunk, PaginaDocumento


@admin.register(Documento)
class DocumentoAdmin(admin.ModelAdmin):
    list_display = ["nome", "tipo", "status", "questoes_extraidas", "total_paginas"]


admin.site.register(PaginaDocumento)
admin.site.register(DocumentoChunk)

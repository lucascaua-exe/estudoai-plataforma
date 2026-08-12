# Generated manually for Questao.imagem

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("questions", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="questao",
            name="imagem",
            field=models.ImageField(
                blank=True,
                help_text="Figura/esquema associado ao enunciado (quando houver).",
                null=True,
                upload_to="questoes/%Y/",
            ),
        ),
    ]

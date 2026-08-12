import hashlib

from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai.models import ConversaIA, MensagemIA
from apps.ai.rag import chat, generate_questions, ai_available
from apps.catalog.models import Assunto, Disciplina
from apps.documents.parser import normalize_spaces
from apps.questions.models import Alternativa, Questao


class ChatView(APIView):
    def post(self, request):
        message = (request.data.get("message") or "").strip()
        if not message:
            return Response({"detail": "Mensagem vazia."}, status=400)

        conversa_id = request.data.get("conversation_id")
        if conversa_id:
            conversa = ConversaIA.objects.filter(id=conversa_id, user=request.user).first()
            if not conversa:
                return Response({"detail": "Conversa não encontrada."}, status=404)
        else:
            titulo = message[:60]
            conversa = ConversaIA.objects.create(user=request.user, titulo=titulo)

        MensagemIA.objects.create(
            conversa=conversa, role=MensagemIA.Role.USER, conteudo=message
        )
        history = [
            {"role": m.role, "content": m.conteudo}
            for m in conversa.mensagens.exclude(role=MensagemIA.Role.SYSTEM).order_by(
                "created_at"
            )[:-1]
        ]
        result = chat(message, history=history)
        msg = MensagemIA.objects.create(
            conversa=conversa,
            role=MensagemIA.Role.ASSISTANT,
            conteudo=result["conteudo"],
            fontes=result.get("fontes") or [],
        )
        return Response(
            {
                "conversation_id": conversa.id,
                "message": {
                    "id": msg.id,
                    "role": msg.role,
                    "conteudo": msg.conteudo,
                    "fontes": msg.fontes,
                },
                "ai_enabled": ai_available(),
            }
        )


class GenerateQuestionsView(APIView):
    def post(self, request):
        assunto_id = request.data.get("assunto_id")
        quantidade = min(int(request.data.get("quantidade") or 3), 10)
        assunto = Assunto.objects.filter(id=assunto_id).select_related("disciplina").first()
        if not assunto:
            return Response({"detail": "Assunto não encontrado."}, status=400)

        raw = generate_questions(assunto.nome, assunto.disciplina.nome, quantidade)
        created = []
        for item in raw:
            enunciado = normalize_spaces(item.get("enunciado") or "")
            if not enunciado:
                continue
            alts = item.get("alternativas") or {}
            if isinstance(alts, list):
                alt_map = {}
                for a in alts:
                    if isinstance(a, dict):
                        alt_map[str(a.get("letra", "")).upper()] = a.get("texto", "")
                    else:
                        continue
            else:
                alt_map = {str(k).upper(): v for k, v in alts.items()}

            gabarito = (item.get("gabarito") or "").upper()[:1]
            trecho = item.get("trecho_referencia") or ""
            h = hashlib.sha256(
                f"ai|{enunciado}|{assunto.id}".encode()
            ).hexdigest()
            if Questao.objects.filter(hash_conteudo=h).exists():
                continue
            q = Questao.objects.create(
                disciplina=assunto.disciplina,
                assunto=assunto,
                enunciado=enunciado,
                gabarito=gabarito,
                explicacao=item.get("justificativa") or "",
                origem=Questao.Origem.AI_GENERATED,
                trecho_referencia=trecho,
                hash_conteudo=h,
                dificuldade="medio",
            )
            for letra in "ABCDE":
                texto = alt_map.get(letra) or ""
                if texto:
                    Alternativa.objects.create(
                        questao=q,
                        letra=letra,
                        texto=str(texto),
                        correta=letra == gabarito,
                    )
            created.append(
                {
                    "id": q.id,
                    "enunciado": q.enunciado,
                    "origem": q.origem,
                    "badge": "Questão gerada com base na sua base de estudos.",
                }
            )

        if not created and not ai_available():
            return Response(
                {
                    "detail": "Configure GEMINI_API_KEY (ou OPENAI_API_KEY) para gerar questões com IA.",
                    "questoes": [],
                },
                status=503,
            )
        if not created:
            return Response(
                {
                    "detail": "Não encontrei informações suficientes sobre este assunto na sua base de estudos.",
                    "questoes": [],
                }
            )
        return Response({"questoes": created})


class ConversasListView(APIView):
    def get(self, request):
        conversas = ConversaIA.objects.filter(user=request.user)[:30]
        return Response(
            [
                {
                    "id": c.id,
                    "titulo": c.titulo,
                    "updated_at": c.updated_at,
                }
                for c in conversas
            ]
        )

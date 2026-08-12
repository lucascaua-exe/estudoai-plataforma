"""
10 testes principais da arquitetura EstudoAI (API + billing + estudo).
"""
from __future__ import annotations

import uuid

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import Invoice
from apps.catalog.models import Assunto, Disciplina
from apps.questions.models import Alternativa, Questao, Tentativa

User = get_user_model()

PASSWORD = "SenhaForte1!"


class CorePlatformAPITests(APITestCase):
    """Cobre auth, billing, catálogo, questões, dashboard e simulados."""

    @classmethod
    def setUpTestData(cls):
        cls.disciplina = Disciplina.objects.create(
            nome="Informática",
            slug=f"informatica-{uuid.uuid4().hex[:8]}",
            ordem=1,
        )
        cls.assunto = Assunto.objects.create(
            disciplina=cls.disciplina,
            nome="Redes",
            slug=f"redes-{uuid.uuid4().hex[:8]}",
        )
        cls.questoes = []
        for i in range(3):
            q = Questao.objects.create(
                enunciado=f"Questão de teste número {i + 1}?",
                hash_conteudo=uuid.uuid4().hex,
                disciplina=cls.disciplina,
                assunto=cls.assunto,
                gabarito="A",
                dificuldade="medio",
                origem="pdf",
                explicacao="Explicação de fixture.",
            )
            Alternativa.objects.create(
                questao=q, letra="A", texto="Resposta correta", correta=True
            )
            Alternativa.objects.create(
                questao=q, letra="B", texto="Resposta incorreta", correta=False
            )
            cls.questoes.append(q)

    def _auth(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def _create_user(self, email="aluno@teste.local", plan=None):
        payload = {
            "name": "Aluno Teste",
            "email": email,
            "password": PASSWORD,
            "password_confirm": PASSWORD,
        }
        if plan:
            payload["plan"] = plan
        res = self.client.post("/api/auth/register/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.content)
        return res

    # 1 — Cadastro com plano
    def test_01_register_with_plan_creates_user_tokens_and_invoice(self):
        res = self._create_user(email="reg@teste.local", plan="pro")
        body = res.json()
        self.assertIn("access", body)
        self.assertIn("refresh", body)
        self.assertEqual(body["user"]["email"], "reg@teste.local")
        self.assertEqual(body["user"]["plano"], "pro")
        self.assertEqual(body["user"]["assinatura_status"], "active")
        user = User.objects.get(email="reg@teste.local")
        self.assertTrue(Invoice.objects.filter(user=user, plan="pro").exists())
        self.assertEqual(user.profile.plano, "pro")

    # 2 — Login por e-mail
    def test_02_login_returns_jwt_and_user(self):
        User.objects.create_user(
            email="login@teste.local", password=PASSWORD, name="Login User"
        )
        res = self.client.post(
            "/api/auth/login/",
            {"email": "login@teste.local", "password": PASSWORD},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.content)
        body = res.json()
        self.assertIn("access", body)
        self.assertEqual(body["user"]["email"], "login@teste.local")

    # 3 — Perfil autenticado (me)
    def test_03_me_requires_auth_and_returns_profile(self):
        denied = self.client.get("/api/auth/me/")
        self.assertEqual(denied.status_code, status.HTTP_401_UNAUTHORIZED)

        user = User.objects.create_user(
            email="me@teste.local", password=PASSWORD, name="Me User"
        )
        self._auth(user)
        res = self.client.get("/api/auth/me/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.json()["email"], "me@teste.local")
        self.assertIn("plano", res.json())

    # 4 — Billing overview
    def test_04_billing_overview_lists_subscription_and_plans(self):
        user = User.objects.create_user(
            email="bill@teste.local", password=PASSWORD, name="Bill User"
        )
        user.profile.plano = "free"
        user.profile.assinatura_status = "active"
        user.profile.save()
        self._auth(user)

        res = self.client.get("/api/billing/")
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.content)
        body = res.json()
        self.assertEqual(body["subscription"]["plano"], "free")
        self.assertEqual(len(body["plans"]), 3)
        self.assertIn("invoices", body)
        self.assertFalse(body["subscription"]["pode_cancelar"])

    # 5 — Troca de plano gera fatura
    def test_05_change_plan_to_premium_creates_paid_invoice(self):
        user = User.objects.create_user(
            email="upgrade@teste.local", password=PASSWORD, name="Upgrade"
        )
        self._auth(user)

        res = self.client.post(
            "/api/billing/change-plan/", {"plano": "premium"}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.content)
        body = res.json()
        self.assertEqual(body["subscription"]["plano"], "premium")
        self.assertEqual(body["subscription"]["status"], "active")
        self.assertTrue(
            Invoice.objects.filter(
                user=user, plan="premium", amount_cents=5990, status="paid"
            ).exists()
        )

    # 6 — Cancelamento agendado e reativação
    def test_06_cancel_schedules_then_reactivate(self):
        user = User.objects.create_user(
            email="cancel@teste.local", password=PASSWORD, name="Cancel"
        )
        user.profile.plano = "pro"
        user.profile.assinatura_status = "active"
        user.profile.save()
        self._auth(user)

        res = self.client.post("/api/billing/cancel/", {"immediate": False}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.content)
        self.assertEqual(res.json()["subscription"]["status"], "canceling")
        self.assertEqual(res.json()["subscription"]["plano"], "pro")

        res2 = self.client.post("/api/billing/reactivate/", {}, format="json")
        self.assertEqual(res2.status_code, status.HTTP_200_OK, res2.content)
        self.assertEqual(res2.json()["subscription"]["status"], "active")

        # cancelar Free deve falhar
        user.profile.plano = "free"
        user.profile.assinatura_status = "active"
        user.profile.save()
        res3 = self.client.post("/api/billing/cancel/", {}, format="json")
        self.assertEqual(res3.status_code, status.HTTP_400_BAD_REQUEST)

    # 7 — Catálogo de disciplinas
    def test_07_catalog_disciplinas_returns_hierarchy(self):
        user = User.objects.create_user(
            email="cat@teste.local", password=PASSWORD, name="Cat"
        )
        self._auth(user)
        res = self.client.get("/api/catalog/disciplinas/")
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.content)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertTrue(any(d["nome"] == "Informática" for d in data))
        info = next(d for d in data if d["nome"] == "Informática")
        self.assertTrue(any(a["nome"] == "Redes" for a in info["assuntos"]))

    # 8 — Listar e responder questão
    def test_08_list_and_answer_question(self):
        user = User.objects.create_user(
            email="q@teste.local", password=PASSWORD, name="Q User"
        )
        self._auth(user)

        listed = self.client.get("/api/questions/")
        self.assertEqual(listed.status_code, status.HTTP_200_OK, listed.content)
        results = listed.json()["results"]
        self.assertGreaterEqual(len(results), 3)

        questao = self.questoes[0]
        alt_ok = questao.alternativas.get(letra="A")
        ans = self.client.post(
            f"/api/questions/{questao.id}/answer/",
            {"alternativa_id": alt_ok.id, "tempo_segundos": 12},
            format="json",
        )
        self.assertEqual(ans.status_code, status.HTTP_200_OK, ans.content)
        body = ans.json()
        self.assertTrue(body["correta"])
        self.assertEqual(body["letra_escolhida"], "A")
        self.assertTrue(
            Tentativa.objects.filter(user=user, questao=questao, correta=True).exists()
        )

    # 9 — Dashboard após tentativa
    def test_09_dashboard_reflects_answered_questions(self):
        user = User.objects.create_user(
            email="dash@teste.local", password=PASSWORD, name="Dash"
        )
        self._auth(user)
        questao = self.questoes[1]
        alt = questao.alternativas.get(letra="A")
        self.client.post(
            f"/api/questions/{questao.id}/answer/",
            {"alternativa_id": alt.id, "tempo_segundos": 8},
            format="json",
        )

        res = self.client.get("/api/dashboard/")
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.content)
        body = res.json()
        self.assertGreaterEqual(body["questoes_respondidas"], 1)
        self.assertGreaterEqual(body["questoes_acertadas"], 1)
        self.assertIn("percentual_acerto", body)
        self.assertIn("banco_por_disciplina", body)
        self.assertGreaterEqual(body["total_questoes_banco"], 3)

    # 10 — Ciclo de simulado (criar → iniciar → responder → finalizar)
    def test_10_simulado_lifecycle(self):
        user = User.objects.create_user(
            email="sim@teste.local", password=PASSWORD, name="Sim"
        )
        self._auth(user)

        created = self.client.post(
            "/api/simulados/",
            {
                "titulo": "Simulado unitário",
                "quantidade": 2,
                "filtros": {"disciplinas": [self.disciplina.id]},
            },
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.content)
        sim_id = created.json()["id"]

        started = self.client.post(f"/api/simulados/{sim_id}/start/", {}, format="json")
        self.assertEqual(started.status_code, status.HTTP_200_OK, started.content)
        items = started.json().get("itens") or started.json().get("questions") or []
        # API pode retornar itens no root
        if not items and "itens" not in started.json():
            # fallback: estrutura com lista em chave conhecida
            payload = started.json()
            items = payload.get("items") or []
        self.assertTrue(items, msg=f"Start sem itens: {started.json()}")

        first = items[0]
        questao_id = first.get("questao", {}).get("id") or first.get("questao_id")
        if isinstance(first.get("questao"), int):
            questao_id = first["questao"]
        self.assertIsNotNone(questao_id)

        answered = self.client.post(
            f"/api/simulados/{sim_id}/answer/",
            {"questao_id": questao_id, "letra": "A"},
            format="json",
        )
        self.assertEqual(answered.status_code, status.HTTP_200_OK, answered.content)

        finished = self.client.post(
            f"/api/simulados/{sim_id}/finish/",
            {"tempo_usado_segundos": 90},
            format="json",
        )
        self.assertEqual(finished.status_code, status.HTTP_200_OK, finished.content)
        result_body = finished.json()
        self.assertTrue(
            "resultado" in result_body
            or "percentual" in result_body
            or "nota" in result_body
            or "simulado" in result_body,
            msg=result_body,
        )

        result_get = self.client.get(f"/api/simulados/{sim_id}/result/")
        self.assertEqual(result_get.status_code, status.HTTP_200_OK, result_get.content)

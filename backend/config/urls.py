from django.contrib import admin
from django.urls import include, path, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.views.static import serve as media_serve
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.billing_views import (
    BillingOverviewView,
    CancelSubscriptionView,
    ChangePlanView,
    ReactivateSubscriptionView,
)
from apps.accounts.urls import urlpatterns as auth_urls
from apps.questions.views import MeusErrosView, QuestaoViewSet
from apps.performance.views import (
    DashboardView,
    EvolutionView,
    KnowledgeMapView,
    MasteryView,
    ReviewRecommendedView,
    ReviewStartView,
)
from apps.simulados.views import SimuladoViewSet
from apps.competicoes.views import SalaCompeticaoViewSet
from apps.ai.views import ChatView, ConversasListView, GenerateQuestionsView
from apps.reports.views import RelatorioDisciplinaView, RelatorioGeralView
from apps.concurso.views import (
    CatalogDisciplinasView,
    ConcursoView,
    DocumentsView,
    GamificationView,
    GoalsView,
)

router = DefaultRouter()
router.register(r"questions", QuestaoViewSet, basename="questions")
router.register(r"simulados", SimuladoViewSet, basename="simulados")
router.register(r"competicoes", SalaCompeticaoViewSet, basename="competicoes")


def health(_request):
    return JsonResponse({"status": "ok", "service": "estudoai-api"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health),
    path("api/auth/", include(auth_urls)),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("api/dashboard/", DashboardView.as_view()),
    path("api/errors/", MeusErrosView.as_view()),
    path("api/review/recommended/", ReviewRecommendedView.as_view()),
    path("api/review/start/", ReviewStartView.as_view()),
    path("api/mastery/", MasteryView.as_view()),
    path("api/knowledge-map/", KnowledgeMapView.as_view()),
    path("api/evolution/", EvolutionView.as_view()),
    path("api/goals/", GoalsView.as_view()),
    path("api/concurso/", ConcursoView.as_view()),
    path("api/catalog/disciplinas/", CatalogDisciplinasView.as_view()),
    path("api/documents/", DocumentsView.as_view()),
    path("api/gamification/", GamificationView.as_view()),
    path("api/ai/chat/", ChatView.as_view()),
    path("api/ai/generate-questions/", GenerateQuestionsView.as_view()),
    path("api/ai/conversations/", ConversasListView.as_view()),
    path("api/reports/geral/", RelatorioGeralView.as_view()),
    path("api/reports/disciplina/<int:pk>/", RelatorioDisciplinaView.as_view()),
    path("api/billing/", BillingOverviewView.as_view()),
    path("api/billing/change-plan/", ChangePlanView.as_view()),
    path("api/billing/cancel/", CancelSubscriptionView.as_view()),
    path("api/billing/reactivate/", ReactivateSubscriptionView.as_view()),
    path("api/", include(router.urls)),
]

# Media sempre disponível (DEBUG=false no Render; static() do Django só ativa em DEBUG)
urlpatterns += [
    re_path(
        r"^media/(?P<path>.*)$",
        media_serve,
        {"document_root": str(settings.MEDIA_ROOT)},
    ),
]
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

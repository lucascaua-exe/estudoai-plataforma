from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Invoice

PLAN_PRICES = {
    "free": 0,
    "pro": 2990,
    "premium": 5990,
}

PLAN_LABELS = {
    "free": "Free",
    "pro": "Pro",
    "premium": "Premium",
}


def _ensure_period(profile):
    now = timezone.now()
    if not profile.periodo_inicio:
        profile.periodo_inicio = now
    if not profile.periodo_fim:
        profile.periodo_fim = now + timedelta(days=30)
    profile.save(update_fields=["periodo_inicio", "periodo_fim", "updated_at"])


def _next_invoice_number(user):
    count = Invoice.objects.filter(user=user).count() + 1
    return f"EST-{user.id:04d}-{count:04d}"


def _serialize_subscription(user):
    profile = user.profile
    _ensure_period(profile)
    return {
        "plano": profile.plano,
        "plano_nome": PLAN_LABELS.get(profile.plano, profile.plano),
        "status": profile.assinatura_status,
        "periodo_inicio": profile.periodo_inicio.isoformat() if profile.periodo_inicio else None,
        "periodo_fim": profile.periodo_fim.isoformat() if profile.periodo_fim else None,
        "cancelado_em": profile.cancelado_em.isoformat() if profile.cancelado_em else None,
        "preco_centavos": PLAN_PRICES.get(profile.plano, 0),
        "pode_cancelar": profile.plano != "free" and profile.assinatura_status == "active",
        "pode_reativar": profile.assinatura_status == "canceling",
    }


def _serialize_invoice(inv: Invoice):
    return {
        "id": inv.id,
        "number": inv.number,
        "plan": inv.plan,
        "plan_nome": PLAN_LABELS.get(inv.plan, inv.plan),
        "description": inv.description,
        "amount_cents": inv.amount_cents,
        "amount_label": f"R$ {Decimal(inv.amount_cents) / 100:.2f}".replace(".", ","),
        "status": inv.status,
        "issued_at": inv.issued_at.isoformat(),
        "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
    }


class BillingOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        invoices = Invoice.objects.filter(user=request.user)[:24]
        return Response(
            {
                "subscription": _serialize_subscription(request.user),
                "invoices": [_serialize_invoice(i) for i in invoices],
                "plans": [
                    {"id": "free", "name": "Free", "price_cents": 0},
                    {"id": "pro", "name": "Pro", "price_cents": 2990},
                    {"id": "premium", "name": "Premium", "price_cents": 5990},
                ],
            }
        )


class ChangePlanView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        new_plan = (request.data.get("plano") or "").strip().lower()
        if new_plan not in PLAN_PRICES:
            return Response({"detail": "Plano inválido."}, status=status.HTTP_400_BAD_REQUEST)

        profile = request.user.profile
        _ensure_period(profile)
        old_plan = profile.plano

        if old_plan == new_plan and profile.assinatura_status == "active":
            return Response({"detail": "Você já está neste plano."}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        profile.plano = new_plan
        profile.assinatura_status = "active"
        profile.cancelado_em = None
        profile.periodo_inicio = now
        profile.periodo_fim = now + timedelta(days=30)
        profile.save()

        amount = PLAN_PRICES[new_plan]
        if amount > 0:
            Invoice.objects.create(
                user=request.user,
                number=_next_invoice_number(request.user),
                plan=new_plan,
                description=f"Assinatura {PLAN_LABELS[new_plan]} · ciclo mensal",
                amount_cents=amount,
                status="paid",
                issued_at=now,
                paid_at=now,
            )
        elif old_plan != "free":
            Invoice.objects.create(
                user=request.user,
                number=_next_invoice_number(request.user),
                plan="free",
                description="Downgrade para Free · sem cobrança",
                amount_cents=0,
                status="paid",
                issued_at=now,
                paid_at=now,
            )

        return Response(
            {
                "subscription": _serialize_subscription(request.user),
                "message": f"Plano alterado para {PLAN_LABELS[new_plan]}.",
            }
        )


class CancelSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = request.user.profile
        _ensure_period(profile)

        if profile.plano == "free":
            return Response(
                {"detail": "O plano Free não possui assinatura paga para cancelar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        immediate = bool(request.data.get("immediate"))
        now = timezone.now()

        if immediate:
            profile.plano = "free"
            profile.assinatura_status = "canceled"
            profile.cancelado_em = now
            profile.periodo_fim = now
            profile.save()
            message = "Assinatura cancelada. Você voltou ao plano Free."
        else:
            profile.assinatura_status = "canceling"
            profile.cancelado_em = now
            profile.save()
            message = (
                "Cancelamento agendado. Você mantém o plano atual até o fim do período já pago."
            )

        return Response(
            {
                "subscription": _serialize_subscription(request.user),
                "message": message,
            }
        )


class ReactivateSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = request.user.profile
        if profile.assinatura_status != "canceling":
            return Response(
                {"detail": "Não há cancelamento agendado para reativar."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        profile.assinatura_status = "active"
        profile.cancelado_em = None
        profile.save(update_fields=["assinatura_status", "cancelado_em", "updated_at"])
        return Response(
            {
                "subscription": _serialize_subscription(request.user),
                "message": "Assinatura reativada. O cancelamento agendado foi removido.",
            }
        )

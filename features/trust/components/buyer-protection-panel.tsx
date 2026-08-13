"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DisputeReason } from "@prisma/client";
import { AlertTriangle, Check, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buyerConfirmOrderAction,
  buyerReportIssueAction,
} from "@/features/trust/actions";
import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { ROUTES } from "@/lib/constants";
import type { OrderTrustContext } from "@/lib/trust/types";
import { DISPUTE_REASON_LABELS } from "@/lib/trust/types";
import { toastError } from "@/lib/toasts";

type BuyerProtectionPanelProps = {
  trust: OrderTrustContext;
};

export function BuyerProtectionPanel({ trust }: BuyerProtectionPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [reason, setReason] = useState<DisputeReason>("NOT_AS_DESCRIBED");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (trust.canConfirm || trust.canReportIssue) {
      trackEvent({
        event: ANALYTICS_EVENTS.ORDER_CONFIRMATION_VIEW,
        route: `${ROUTES.ORDERS}/${trust.orderId}`,
        entityId: trust.orderId,
      });
    }
  }, [trust.canConfirm, trust.canReportIssue, trust.orderId]);

  if (trust.orderStatus === "DISPUTE_OPEN" && trust.activeDispute) {
    return (
      <section
        className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 sm:p-5"
        data-testid="buyer-dispute-status"
      >
        <p className="font-medium">Спор открыт</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Причина: {DISPUTE_REASON_LABELS[trust.activeDispute.reason]}. Ожидайте
          решения администратора.
        </p>
      </section>
    );
  }

  if (!trust.canConfirm && !trust.canReportIssue) {
    return null;
  }

  function confirm() {
    startTransition(async () => {
      const res = await buyerConfirmOrderAction(trust.orderId);
      if (res.ok) {
        toast.success("Спасибо! Заказ завершён");
        router.refresh();
      } else {
        toastError(res.error ?? "Ошибка");
      }
    });
  }

  function reportIssue() {
    startTransition(async () => {
      const res = await buyerReportIssueAction({
        orderId: trust.orderId,
        reason,
        description,
      });
      if (res.ok) {
        toast.success("Спор создан — мы свяжемся с вами");
        router.refresh();
      } else {
        toastError(res.error ?? "Ошибка");
      }
    });
  }

  return (
    <section
      className="rounded-2xl border border-border bg-surface/40 p-4 sm:p-5"
      data-testid="buyer-protection-panel"
    >
      <div className="flex gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 className="font-heading text-base font-medium">
              Получили товар?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Подтвердите получение — тогда продавец получит оплату. Оплата
              удерживается до вашего подтверждения.
            </p>
            {trust.protectionEndsAt ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Период защиты до{" "}
                {new Date(trust.protectionEndsAt).toLocaleDateString("ru-RU")}
              </p>
            ) : null}
          </div>

          {!showIssueForm ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={pending}
                onClick={confirm}
                data-testid="buyer-confirm-order"
              >
                <Check data-icon="inline-start" aria-hidden />
                Всё хорошо
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => setShowIssueForm(true)}
                data-testid="buyer-report-issue"
              >
                <AlertTriangle data-icon="inline-start" aria-hidden />
                Есть проблема
              </Button>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="space-y-2">
                <Label htmlFor={`dispute-reason-${trust.orderId}`}>Причина</Label>
                <select
                  id={`dispute-reason-${trust.orderId}`}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  value={reason}
                  onChange={(e) => setReason(e.target.value as DisputeReason)}
                >
                  {(
                    Object.entries(DISPUTE_REASON_LABELS) as [
                      DisputeReason,
                      string,
                    ][]
                  ).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`dispute-desc-${trust.orderId}`}>Описание</Label>
                <Textarea
                  id={`dispute-desc-${trust.orderId}`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Опишите проблему"
                  rows={3}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Фото можно приложить позже — загрузка в разработке.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={reportIssue}
                  data-testid="buyer-submit-dispute"
                >
                  Отправить спор
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setShowIssueForm(false)}
                >
                  Отмена
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DisputeReason } from "@/lib/trust-safety/disputes";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buyerConfirmWithTrustAction,
  createDisputeAction,
} from "@/lib/trust-safety/actions";
import { DISPUTE_REASON_LABELS, DISPUTE_REASONS } from "@/lib/trust-safety";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { toastError } from "@/lib/toasts";

type BuyerTrustActionsProps = {
  orderId: string;
  canConfirm: boolean;
  canDispute: boolean;
};

export function BuyerTrustActions({
  orderId,
  canConfirm,
  canDispute,
}: BuyerTrustActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<DisputeReason>("ITEM_NOT_MATCH");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  if (!canConfirm && !canDispute) return null;

  return (
    <div className="flex flex-col gap-3" data-testid="buyer-trust-actions">
      <div className="flex flex-wrap gap-2">
        {canConfirm ? (
          <Button
            size="sm"
            disabled={pending}
            data-testid="buyer-got-item"
            onClick={() => {
              startTransition(async () => {
                trackEvent({
                  event: ANALYTICS_EVENTS.BUYER_CONFIRMATION,
                  entityId: orderId,
                });
                const res = await buyerConfirmWithTrustAction(orderId);
                if (res.ok) {
                  toast.success("Получение подтверждено");
                  router.refresh();
                } else {
                  toastError(res.error ?? "Ошибка");
                }
              });
            }}
          >
            Получил товар
          </Button>
        ) : null}
        {canDispute ? (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            data-testid="buyer-has-problem"
            onClick={() => setOpen((v) => !v)}
          >
            Есть проблема
          </Button>
        ) : null}
      </div>

      {open ? (
        <div className="rounded-xl border border-border bg-surface/50 p-4">
          <Label htmlFor="dispute-reason">Причина</Label>
          <select
            id="dispute-reason"
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value as DisputeReason)}
          >
            {DISPUTE_REASONS.map((r) => (
              <option key={r} value={r}>
                {DISPUTE_REASON_LABELS[r]}
              </option>
            ))}
          </select>
          <Label htmlFor="dispute-desc" className="mt-3 block">
            Описание
          </Label>
          <Textarea
            id="dispute-desc"
            className="mt-1"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button
            className="mt-3"
            size="sm"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const res = await createDisputeAction({
                  orderId,
                  reason,
                  description,
                });
                if (res.ok) {
                  trackEvent({
                    event: ANALYTICS_EVENTS.DISPUTE_CREATED,
                    entityId: orderId,
                  });
                  toast.success("Спор создан — разберём ситуацию");
                  setOpen(false);
                  router.refresh();
                } else {
                  toastError(res.error ?? "Не удалось создать спор");
                }
              });
            }}
          >
            Открыть спор
          </Button>
        </div>
      ) : null}
    </div>
  );
}

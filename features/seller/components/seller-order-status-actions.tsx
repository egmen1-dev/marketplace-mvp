"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateSellerOrderStatusAction } from "@/features/seller/actions";
import { getAllowedOrderTransitions } from "@/features/seller/lib/order-transitions";
import { ORDER_STATUS_LABELS } from "@/features/orders/lib/status";
import { TOAST, toastError } from "@/lib/toasts";

type SellerOrderStatusActionsProps = {
  orderId: string;
  status: OrderStatus;
  role: UserRole;
};

export function SellerOrderStatusActions({
  orderId,
  status,
  role,
}: SellerOrderStatusActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmTo, setConfirmTo] = useState<OrderStatus | null>(null);
  const next = getAllowedOrderTransitions(status, role);

  if (next.length === 0) return null;

  function apply(to: OrderStatus) {
    startTransition(async () => {
      const result = await updateSellerOrderStatusAction(orderId, to);
      if (result.ok) {
        toast.success(TOAST.ORDER_STATUS_CHANGED);
        setConfirmTo(null);
        router.refresh();
      } else {
        toastError(result.error);
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-1">
        {next.map((to) => (
          <Button
            key={to}
            size="sm"
            variant={to === "CANCELLED" ? "destructive" : "outline"}
            disabled={pending}
            onClick={() => setConfirmTo(to)}
          >
            {ORDER_STATUS_LABELS[to]}
          </Button>
        ))}
      </div>

      <Dialog
        open={confirmTo != null}
        onOpenChange={(open) => {
          if (!open && !pending) setConfirmTo(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Сменить статус заказа?</DialogTitle>
            <DialogDescription>
              {confirmTo
                ? `Новый статус: ${ORDER_STATUS_LABELS[confirmTo]}. Изменение запишется в историю.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={pending} />}>
              Отмена
            </DialogClose>
            <Button
              variant={confirmTo === "CANCELLED" ? "destructive" : "default"}
              disabled={pending || !confirmTo}
              onClick={() => {
                if (confirmTo) apply(confirmTo);
              }}
            >
              {pending ? "Сохраняем…" : "Подтвердить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

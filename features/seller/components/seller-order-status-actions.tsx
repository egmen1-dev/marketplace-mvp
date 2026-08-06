"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { updateSellerOrderStatusAction } from "@/features/seller/actions";
import { getAllowedOrderTransitions } from "@/features/seller/lib/order-transitions";
import { ORDER_STATUS_LABELS } from "@/features/orders/lib/status";
import { UserRole } from "@prisma/client";

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
  const next = getAllowedOrderTransitions(status, role);

  if (next.length === 0) return null;

  function apply(to: OrderStatus) {
    startTransition(async () => {
      const result = await updateSellerOrderStatusAction(orderId, to);
      if (result.ok) router.refresh();
      else alert(result.error ?? "Ошибка");
    });
  }

  return (
    <div className="flex flex-wrap gap-1">
      {next.map((to) => (
        <Button
          key={to}
          size="sm"
          variant={to === "CANCELLED" ? "destructive" : "outline"}
          disabled={pending}
          onClick={() => apply(to)}
        >
          {ORDER_STATUS_LABELS[to]}
        </Button>
      ))}
    </div>
  );
}

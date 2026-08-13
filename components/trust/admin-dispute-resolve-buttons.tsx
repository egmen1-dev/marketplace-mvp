"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { adminResolveDisputeAction } from "@/lib/trust-safety/actions";
import { toastError } from "@/lib/toasts";

type AdminDisputeResolveButtonsProps = {
  disputeId: string;
};

export function AdminDisputeResolveButtons({
  disputeId,
}: AdminDisputeResolveButtonsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function resolve(toStatus: "RESOLVED_BUYER" | "RESOLVED_SELLER") {
    startTransition(async () => {
      const res = await adminResolveDisputeAction({ disputeId, toStatus });
      if (res.ok) {
        toast.success(
          toStatus === "RESOLVED_BUYER"
            ? "Спор закрыт в пользу покупателя"
            : "Спор закрыт в пользу продавца",
        );
        router.refresh();
      } else {
        toastError(res.error ?? "Ошибка");
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => resolve("RESOLVED_BUYER")}
      >
        В пользу покупателя
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => resolve("RESOLVED_SELLER")}
      >
        В пользу продавца
      </Button>
    </div>
  );
}

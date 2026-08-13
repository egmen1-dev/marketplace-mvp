import Link from "next/link";
import { RotateCcw, ShieldCheck } from "lucide-react";

import { TrustBlockViewTracker } from "@/components/trust/trust-block-view-tracker";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type CheckoutTrustNoteProps = {
  className?: string;
};

export function CheckoutTrustNote({ className }: CheckoutTrustNoteProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border bg-surface/50 px-4 py-3 text-sm",
        className,
      )}
      data-testid="checkout-trust-note"
    >
      <TrustBlockViewTracker blockId="checkout" route={ROUTES.CHECKOUT} />
      <p className="flex items-center gap-2 font-medium text-foreground">
        <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden />
        Безопасная оплата
      </p>
      <p className="text-muted-foreground">
        Безопасная сделка: оплата удерживается до подтверждения получения.
        Данные карты не передаются продавцу.
      </p>
      <Link
        href={ROUTES.TERMS}
        className="inline-flex items-center gap-1.5 text-xs text-primary underline-offset-4 hover:underline"
      >
        <RotateCcw className="size-3.5" aria-hidden />
        Условия возврата
      </Link>
    </div>
  );
}

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { TrustBlockViewTracker } from "@/components/trust/trust-block-view-tracker";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type CartTrustNoteProps = {
  className?: string;
};

export function CartTrustNote({ className }: CartTrustNoteProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-primary/5 px-3 py-2.5 text-xs text-muted-foreground",
        className,
      )}
      data-testid="cart-trust-note"
    >
      <TrustBlockViewTracker blockId="cart" route={ROUTES.CART} />
      <p className="flex items-start gap-2">
        <ShieldCheck
          className="mt-0.5 size-3.5 shrink-0 text-primary"
          aria-hidden
        />
        <span>
          Оплата через защищённый сервис.{" "}
          <Link
            href={ROUTES.TERMS}
            className="text-primary underline-offset-4 hover:underline"
          >
            Условия возврата
          </Link>
        </span>
      </p>
    </div>
  );
}

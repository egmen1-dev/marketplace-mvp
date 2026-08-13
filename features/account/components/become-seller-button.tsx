"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { becomeSellerAction } from "@/features/auth";
import { ROUTES } from "@/lib/constants";
import { toastError } from "@/lib/toasts";
import { cn } from "@/lib/utils";

type BecomeSellerButtonProps = {
  label?: string;
  redirectTo?: string;
  className?: string;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "cta";
};

/**
 * Promotes BUYER → SELLER (creates SellerProfile) then opens product create.
 */
export function BecomeSellerButton({
  label = "Продать товар",
  redirectTo = ROUTES.ACCOUNT_PRODUCTS_NEW,
  className,
  variant = "default",
  size = "default",
}: BecomeSellerButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const result = await becomeSellerAction();
      if (!result.ok) {
        const msg = result.error ?? "Не удалось открыть продажи";
        setError(msg);
        toastError(msg);
        return;
      }
      router.push(result.redirectTo ?? redirectTo);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn(className)}
        disabled={pending}
        onClick={onClick}
        data-testid="become-seller"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Store className="size-4" aria-hidden />
        )}
        {pending ? "Открываем…" : label}
      </Button>
      {error ? (
        <p className="px-1 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

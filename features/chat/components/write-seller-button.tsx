"use client";

import Link from "next/link";
import { useTransition } from "react";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { startConversationAction } from "@/features/chat/actions";
import { ROUTES } from "@/lib/constants";
import { toastError } from "@/lib/toasts";
import { cn } from "@/lib/utils";

type Props = {
  productId: string;
  /** Hide for own listings */
  hidden?: boolean;
  className?: string;
  variant?: "default" | "secondary" | "outline";
  size?: "default" | "sm" | "cta" | "lg";
};

export function WriteSellerButton({
  productId,
  hidden,
  className,
  variant = "outline",
  size = "cta",
}: Props) {
  const [pending, start] = useTransition();

  if (hidden) return null;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("w-full sm:w-auto", className)}
      disabled={pending}
      data-testid="pdp-write-seller"
      aria-busy={pending}
      onClick={() =>
        start(async () => {
          const res = await startConversationAction(productId);
          if (res && !res.ok) toastError(res.error);
        })
      }
    >
      <MessageCircle data-icon="inline-start" />
      {pending ? "Открываем…" : "Написать продавцу"}
    </Button>
  );
}

/** Server-rendered fallback link when JS off / for unauthenticated redirect via action. */
export function WriteSellerSignInLink({
  productId,
  className,
}: {
  productId: string;
  className?: string;
}) {
  const callback = `${ROUTES.PRODUCT}/${productId}`;
  return (
    <Button
      variant="outline"
      size="cta"
      className={cn("w-full sm:w-auto", className)}
      nativeButton={false}
      render={
        <Link
          href={`${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(callback)}`}
          data-testid="pdp-write-seller"
        />
      }
    >
      <MessageCircle data-icon="inline-start" />
      Написать продавцу
    </Button>
  );
}

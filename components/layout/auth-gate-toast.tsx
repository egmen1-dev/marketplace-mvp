"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const MESSAGES: Record<string, string> = {
  seller_required:
    "Раздел продавца доступен только с профилем продавца. Зарегистрируйтесь как продавец или войдите в другой аккаунт.",
  admin_forbidden: "Этот раздел доступен только администраторам.",
};

/** Surfaces auth/role gate redirects as user-friendly toasts, then cleans the URL. */
export function AuthGateToast() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const code = searchParams.get("error");
    if (!code) return;
    const message = MESSAGES[code];
    if (!message) return;

    toast.error(message);

    const next = new URLSearchParams(searchParams.toString());
    next.delete("error");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, router, searchParams]);

  return null;
}

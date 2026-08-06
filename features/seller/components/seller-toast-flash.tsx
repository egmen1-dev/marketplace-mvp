"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { TOAST } from "@/lib/toasts";

const FLASH: Record<string, string> = {
  saved: TOAST.PRODUCT_SAVED,
  stock: TOAST.STOCK_UPDATED,
  status: TOAST.ORDER_STATUS_CHANGED,
};

/** Shows a one-shot toast from `?toast=` then strips the query. */
export function SellerToastFlash() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const key = searchParams.get("toast");

  useEffect(() => {
    if (!key || !FLASH[key]) return;
    toast.success(FLASH[key]);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("toast");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [key, pathname, router, searchParams]);

  return null;
}

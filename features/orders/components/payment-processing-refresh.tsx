"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Soft-refresh while webhook may still be catching up after Stripe redirect. */
export function PaymentProcessingRefresh({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const t1 = window.setTimeout(() => router.refresh(), 2000);
    const t2 = window.setTimeout(() => router.refresh(), 5000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [active, router]);

  return null;
}

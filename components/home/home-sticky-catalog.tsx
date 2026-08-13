"use client";

import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Mobile-only sticky catalog CTA after scrolling past hero. */
export function HomeStickyCatalog() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 420);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 transition-all duration-300 md:hidden",
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0",
      )}
      aria-hidden={!visible}
    >
      <Button
        size="lg"
        className="pointer-events-auto h-12 rounded-full px-6 shadow-card-hover"
        nativeButton={false}
        render={<Link href={ROUTES.CATALOG} />}
        data-testid="home-sticky-catalog"
      >
        <LayoutGrid data-icon="inline-start" aria-hidden />
        Каталог
      </Button>
    </div>
  );
}

"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { ROUTES } from "@/lib/constants";

type HomeProductGridProps = {
  children: ReactNode;
  section: "popular" | "new";
};

/** Wraps product grid to track popular_product_click on card link taps. */
export function HomeProductGrid({ children, section }: HomeProductGridProps) {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
      onClick={(e) => {
        const anchor = (e.target as HTMLElement).closest("a[href^='/product/']");
        if (!anchor) return;
        const href = anchor.getAttribute("href") ?? "";
        const id = href.replace("/product/", "").split("?")[0] ?? "";
        if (!id) return;
        trackEvent({
          event: ANALYTICS_EVENTS.POPULAR_PRODUCT_CLICK,
          route: ROUTES.HOME,
          entityId: `${section}:${id}`,
        });
      }}
    >
      {children}
    </div>
  );
}

/** Tracked category link for homepage tiles. */
export function HomeCategoryLink({
  href,
  slug,
  className,
  style,
  children,
}: {
  href: string;
  slug: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      style={style}
      onClick={() =>
        trackEvent({
          event: ANALYTICS_EVENTS.CATEGORY_CLICK,
          route: ROUTES.HOME,
          entityId: slug,
        })
      }
    >
      {children}
    </Link>
  );
}

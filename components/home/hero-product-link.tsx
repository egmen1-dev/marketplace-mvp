"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { ROUTES } from "@/lib/constants";

type HeroProductLinkProps = {
  href: string;
  productId: string;
  className?: string;
  children: ReactNode;
};

export function HeroProductLink({
  href,
  productId,
  className,
  children,
}: HeroProductLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() =>
        trackEvent({
          event: ANALYTICS_EVENTS.HERO_PRODUCT_CLICK,
          route: ROUTES.HOME,
          entityId: productId,
        })
      }
    >
      {children}
    </Link>
  );
}

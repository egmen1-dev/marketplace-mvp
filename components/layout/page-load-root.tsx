"use client";

import { usePathname } from "next/navigation";

import { PageLoadObserver } from "@/components/layout/page-load-observer";

/** Per-route client telemetry + boot splash teardown. */
export function PageLoadRoot() {
  const pathname = usePathname();
  return <PageLoadObserver route={pathname} />;
}

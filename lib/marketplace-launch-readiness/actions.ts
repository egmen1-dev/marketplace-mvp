"use server";

import { requireAdminSession } from "@/features/auth";

import { trackLaunchAuditStarted, trackProductionHealthView } from "./analytics";
import { isMarketplaceLaunchReadinessEnabled } from "./flags";

export async function trackLaunchAuditViewAction(): Promise<void> {
  if (!isMarketplaceLaunchReadinessEnabled()) return;
  await requireAdminSession();
  trackLaunchAuditStarted();
}

export async function trackProductionHealthViewAction(): Promise<void> {
  if (!isMarketplaceLaunchReadinessEnabled()) return;
  await requireAdminSession();
  trackProductionHealthView();
}

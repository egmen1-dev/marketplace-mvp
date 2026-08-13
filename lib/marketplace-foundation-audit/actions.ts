"use server";

import { requireAdminSession } from "@/features/auth";

import { trackFoundationAuditView } from "./analytics";
import { isMarketplaceFoundationAuditEnabled } from "./flags";

export type FoundationAuditActionState = { ok: boolean; error?: string };

export async function trackFoundationAuditViewAction(): Promise<FoundationAuditActionState> {
  if (!isMarketplaceFoundationAuditEnabled()) {
    return { ok: false, error: "MARKETPLACE_FOUNDATION_AUDIT_ENABLED=false" };
  }
  const admin = await requireAdminSession();
  trackFoundationAuditView(admin.id);
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/features/auth";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/constants";
import { resolveRiskEvent, type ResolutionAction } from "./risk-event-service";
import { scanProductRisks } from "./scan";

async function requireAdmin() {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

/** Admin resolves a risk event (form-friendly server action). */
export async function adminResolveRiskEvent(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;
  const riskEventId = String(formData.get("riskEventId") ?? "");
  const action = String(formData.get("action") ?? "") as ResolutionAction;
  const note = String(formData.get("note") ?? "") || undefined;
  if (
    !riskEventId ||
    !["reviewed", "dismiss", "confirm", "note", "escalate"].includes(action)
  ) {
    return;
  }
  await resolveRiskEvent(prisma, {
    adminUserId: admin.id,
    riskEventId,
    action,
    note,
  });
  revalidatePath(ROUTES.ADMIN_RISK);
}

/** Admin triggers a risk scan (analysis only; never mutates products/orders). */
export async function adminScanRisks(): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;
  await scanProductRisks(prisma, { limit: 400 });
  revalidatePath(ROUTES.ADMIN_RISK);
}
